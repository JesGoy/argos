#!/usr/bin/env node
/**
 * Motor de sincronización del estándar Visebit.
 *
 * Lo corre el propio repositorio del proyecto —por CI o a mano— para contrastarse
 * contra el último release del ecosistema y actualizarse según la política que
 * declara en `standard.policy`. El desarrollador deja de ser el mecanismo de
 * distribución: el repo pide su actualización solo.
 *
 *   node .visebit/sincronizar-estandar.mjs                        último release (necesita GITHUB_TOKEN)
 *   node .visebit/sincronizar-estandar.mjs --desde-dir <eco>      ecosistema local, sin red
 *   node .visebit/sincronizar-estandar.mjs --dry-run              decide y explica, sin escribir
 *
 * **Vive dentro del proyecto, no en el ecosistema**, y a propósito: así el
 * workflow de CI no necesita permiso de checkout sobre el repo privado del
 * ecosistema — le basta un token que pueda leer sus releases. Se actualiza solo,
 * porque está en el `lock` como cualquier otro archivo del estándar.
 *
 * No hace git ni abre PRs: decide, escribe los archivos y emite la decisión en
 * JSON. Las operaciones de git y `gh` viven en el workflow, que es donde se
 * pueden auditar sin leer código.
 *
 * Especificación: docs/standards/contrato-estandar.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve, join, dirname, sep } from 'node:path';

// --- Argumentos ---------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (nombre) => {
  const i = argv.indexOf(nombre);
  return i >= 0 ? argv[i + 1] : null;
};
const flag = (nombre) => argv.includes(nombre);

// Por defecto, la raíz del repo es el padre de .visebit/ — igual que el verificador.
const { fileURLToPath, pathToFileURL } = await import('node:url');
const REPO = resolve(arg('--repo') ?? resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const DESDE_DIR = arg('--desde-dir') ? resolve(arg('--desde-dir')) : null;
const DRY = flag('--dry-run');
const TOKEN = process.env.GITHUB_TOKEN ?? process.env.VISEBIT_STANDARDS_TOKEN ?? '';

// --- Salida estructurada ------------------------------------------------------

const salida = {
  decision: 'sin-cambios', // sin-cambios | pr | pr-vacio | issue | congelado | error
  motivo: '',
  bump: null,              // major | minor | patch
  desde: null,
  hasta: null,
  archivos: [],
  politica: null,
  base: null,       // rama de integracion del proyecto (workflow.branches.base)
};

function emitir(codigo = 0) {
  console.log(JSON.stringify(salida, null, 2));
  if (process.env.GITHUB_OUTPUT) {
    const kv = [
      `decision=${salida.decision}`,
      `bump=${salida.bump ?? ''}`,
      `desde=${salida.desde ?? ''}`,
      `hasta=${salida.hasta ?? ''}`,
      `archivos=${salida.archivos.length}`,
      `politica=${salida.politica ?? ''}`,
      `base=${salida.base ?? ''}`,
    ].join('\n');
    appendFileSync(process.env.GITHUB_OUTPUT, kv + '\n');
  }
  process.exit(codigo);
}

function abortar(motivo) {
  salida.decision = 'error';
  salida.motivo = motivo;
  emitir(1);
}

// --- SemVer -------------------------------------------------------------------

const partes = (v) => String(v).trim().split('.').map(Number);

function comparar(a, b) {
  const [aM, am, ap] = partes(a);
  const [bM, bm, bp] = partes(b);
  return aM - bM || am - bm || ap - bp;
}

function tipoDeSalto(desde, hasta) {
  const [aM, am] = partes(desde);
  const [bM, bm] = partes(hasta);
  if (bM > aM) return 'major';
  if (bm > am) return 'minor';
  return 'patch';
}

// --- Hash: importado del verificador del propio proyecto ----------------------
// Una sola implementación del algoritmo en todo el ecosistema.

const rutaVerificador = join(REPO, '.visebit', 'verificar-estandar.mjs');
if (!existsSync(rutaVerificador)) {
  abortar('Este repo no tiene .visebit/verificar-estandar.mjs. Corre /visebit-dev:visebit-adopt primero.');
}
// pathToFileURL, no `file://` + ruta: en Windows la ruta trae `C:` y barras
// invertidas, y ninguna de las dos formas peladas es una URL válida.
const { hashDeTexto } = await import(pathToFileURL(rutaVerificador).href);

// --- Manifiesto del proyecto --------------------------------------------------

const rutaManifiesto = join(REPO, 'visebit.json');
if (!existsSync(rutaManifiesto)) abortar('No hay visebit.json en el repositorio.');

let proyecto;
try { proyecto = JSON.parse(readFileSync(rutaManifiesto, 'utf8')); }
catch (e) { abortar(`visebit.json no es JSON válido: ${e.message}`); }

const std = proyecto.standard;
if (!std) abortar('visebit.json no tiene bloque "standard". Corre /visebit-dev:visebit-adopt primero.');

salida.politica = std.policy ?? 'assisted';
salida.desde = std.version;

// La rama contra la que se abre el PR sale del contrato operativo, no del default
// del repositorio: en un proyecto con `qa` de integracion y `main` de produccion,
// un PR de actualizacion del estandar contra `main` va directo a produccion
// saltandose la integracion. Ver docs/standards/contrato-workflow.md.
salida.base = proyecto.workflow?.branches?.base ?? null;

// Regla dura: un proyecto congelado no se toca. Es lo primero que se comprueba,
// antes de gastar una llamada a la API — y antes de que cualquier bug de más
// abajo pueda escribirle un archivo.
if (std.policy === 'frozen') {
  salida.decision = 'congelado';
  salida.motivo = std.frozen?.reason
    ? `Congelado el ${std.frozen.at}: ${std.frozen.reason}`
    : 'Proyecto congelado.';
  emitir(0);
}

const rutaEstandares = proyecto.standardsPath ?? 'docs/standards';

// --- Origen del estándar ------------------------------------------------------

const cabeceras = () => ({
  Accept: 'application/vnd.github+json',
  'User-Agent': 'visebit-standards-sync',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
});

// Toda la red pasa por aquí: un fallo de DNS o de conectividad debe salir como
// una decisión de error legible, no como un stack trace de undici. Pasa más de
// lo que parece — un runner sin salida a internet, un proxy corporativo, una
// caída momentánea de la API.
async function traer(url, opciones = {}) {
  try {
    return await fetch(url, opciones);
  } catch (e) {
    abortar(
      `No se pudo alcanzar ${new URL(url).host}: ${e.cause?.code ?? e.message}.\n` +
        '  El entorno donde corre esto no tiene salida a internet, o la API no responde.\n' +
        '  Para contrastar sin red, contra una copia local del ecosistema:\n' +
        '      node .visebit/sincronizar-estandar.mjs --desde-dir <ruta-al-ecosistema>'
    );
  }
}

async function api(ruta, { tolerar404 = false } = {}) {
  const r = await traer(`https://api.github.com${ruta}`, { headers: cabeceras() });
  if (r.status === 404 && tolerar404) return null;
  if (r.status === 401) {
    abortar('La credencial no es válida (401). Si es un token de GitHub App, quizá expiró: duran una hora.');
  }
  if (!r.ok) abortar(`La API de GitHub respondió ${r.status} en ${ruta}`);
  return r.json();
}

/**
 * Un 404 en `/releases/latest` tiene dos causas que no se parecen en nada:
 * el repositorio no se alcanza, o se alcanza pero todavía no publicó ningún
 * release. Confundirlas manda a revisar permisos cuando lo que falta es un tag.
 * Se distinguen preguntando por el repositorio mismo.
 */
async function diagnosticarOrigen(origen) {
  const repo = await api(`/repos/${origen}`, { tolerar404: true });

  if (repo === null) {
    abortar(
      `No se alcanza el repositorio del ecosistema (${origen}): 404.\n` +
        '  · Si usas una GitHub App, comprueba que esté instalada TAMBIÉN sobre ese repositorio ' +
        '(Install App → All repositories), no solo sobre este.\n' +
        '  · Si usas un PAT, revisa que su "Resource owner" sea la organización y no tu cuenta.\n' +
        '  · Si este proyecto se movió a otra organización, declara el origen real en ' +
        'standard.source, o desactiva la sincronización: un sync huérfano fallando cada mes ' +
        'no es información, es ruido.'
    );
  }

  abortar(
    `El ecosistema (${origen}) se alcanza sin problema, pero no tiene ningún release publicado.\n` +
      '  La credencial está bien: lo que falta es publicar.\n' +
      '  Un `git push` no crea el release — lo crea el tag. En el ecosistema:\n' +
      '      .\\bootstrap\\publicar-plugin.ps1 -Push -Tag\n' +
      '  Comprueba también que .github/workflows/publicar-estandar.yml esté en el repositorio: ' +
      'sin él, el tag no dispara nada.\n' +
      '  Ojo: un release marcado como draft o pre-release no cuenta como "latest".'
  );
}

const origen = std.source ?? 'visebit-tech/Visebit';
let versionRemota;
let leerDelOrigen;    // (rutaDeArchivo)  => Promise<string|null>
let listarDelOrigen;  // (rutaDeCarpeta)  => Promise<string[]>  (nombres, sin ruta)

if (DESDE_DIR) {
  versionRemota = readFileSync(join(DESDE_DIR, 'VERSION'), 'utf8').trim();
  leerDelOrigen = async (ruta) => {
    const abs = join(DESDE_DIR, ruta.split('/').join(sep));
    return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  };
  listarDelOrigen = async (dir) => {
    const abs = join(DESDE_DIR, dir.split('/').join(sep));
    if (!existsSync(abs)) return [];
    const { readdirSync, statSync } = await import('node:fs');
    return readdirSync(abs).filter((n) => statSync(join(abs, n)).isFile());
  };
} else {
  const release = await api(`/repos/${origen}/releases/latest`, { tolerar404: true });
  if (release === null) await diagnosticarOrigen(origen);

  versionRemota = String(release.tag_name ?? '').replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+$/.test(versionRemota)) {
    abortar(
      `El último release de ${origen} no tiene un tag SemVer: "${release.tag_name}". ` +
        'Se publica con bootstrap/publicar-plugin.ps1 -Push -Tag.'
    );
  }
  const tag = `v${versionRemota}`;

  // Se lee del árbol del repositorio en el tag, no del asset del release ni de
  // `dist/` — `dist/` está en .gitignore, así que no existe en el árbol. El tag
  // es igual de inmutable y no obliga a commitear artefactos de build.
  leerDelOrigen = async (ruta) => {
    const r = await traer(`https://raw.githubusercontent.com/${origen}/${tag}/${ruta}`, {
      headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
    });
    return r.ok ? r.text() : null;
  };
  listarDelOrigen = async (dir) => {
    const r = await traer(`https://api.github.com/repos/${origen}/contents/${dir}?ref=${tag}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'visebit-standards-sync',
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
    });
    if (!r.ok) return [];
    const entradas = await r.json();
    return Array.isArray(entradas) ? entradas.filter((e) => e.type === 'file').map((e) => e.name) : [];
  };
}

salida.hasta = versionRemota;

// --- ¿Hay salto? --------------------------------------------------------------

const orden = comparar(std.version, versionRemota);

if (orden >= 0) {
  salida.decision = 'sin-cambios';
  salida.motivo = orden === 0
    ? `Ya está en la última versión (${versionRemota}).`
    : `El proyecto declara ${std.version}, más nueva que el último release (${versionRemota}). No se toca.`;
  if (!DRY) {
    std.checkedAt = new Date().toISOString().slice(0, 10);
    writeFileSync(rutaManifiesto, JSON.stringify(proyecto, null, 2) + '\n', 'utf8');
  }
  emitir(0);
}

salida.bump = tipoDeSalto(std.version, versionRemota);

// Un MAJOR invalida código conforme al estándar anterior: por definición implica
// revisar y posiblemente reescribir lo que ya está. Eso es una decisión con costo
// —a veces facturable— y no la toma un cron. Se abre un issue, no un PR.
if (salida.bump === 'major') {
  salida.decision = 'issue';
  salida.motivo =
    `Salto MAJOR ${std.version} → ${versionRemota}: una regla nueva invalida código conforme ` +
    'al estándar anterior. Requiere revisar el código existente y decidir cuándo entra.';
  emitir(0);
}

// --- Qué archivos consume este proyecto ---------------------------------------
// El diff se restringe a lo que este repo usa de verdad. Sin esto, agregar el
// anexo de un stack nuevo —un MINOR— dispararía un PR en TODOS los repos,
// incluidos los que no lo consumen. Ese ruido es lo que hace que un equipo
// termine apagando la sincronización.

function aRutaDelEcosistema(rutaProyecto) {
  if (rutaProyecto === '.visebit/verificar-estandar.mjs') return 'templates/proyecto/verificar-estandar.mjs';
  if (rutaProyecto === '.visebit/sincronizar-estandar.mjs') return 'templates/proyecto/sincronizar-estandar.mjs';
  if (rutaProyecto.startsWith('.claude/skills/visebit-code-review/')) {
    return 'skills/' + rutaProyecto.slice('.claude/skills/'.length);
  }
  if (rutaProyecto === `${rutaEstandares}/system-prompt-visebit.md`) return 'agente/system-prompt-visebit.md';
  if (rutaProyecto.startsWith(`${rutaEstandares}/stacks/`)) {
    return 'estandares/stacks/' + rutaProyecto.slice(`${rutaEstandares}/stacks/`.length);
  }
  if (rutaProyecto.startsWith(`${rutaEstandares}/`)) {
    return 'estandares/' + rutaProyecto.slice(`${rutaEstandares}/`.length);
  }
  return null;
}

function aRutaDelProyecto(rutaEco) {
  if (rutaEco === 'templates/proyecto/verificar-estandar.mjs') return '.visebit/verificar-estandar.mjs';
  if (rutaEco === 'templates/proyecto/sincronizar-estandar.mjs') return '.visebit/sincronizar-estandar.mjs';
  if (rutaEco.startsWith('skills/visebit-code-review/')) return '.claude/skills/' + rutaEco.slice('skills/'.length);
  if (rutaEco === 'agente/system-prompt-visebit.md') return `${rutaEstandares}/system-prompt-visebit.md`;
  if (rutaEco.startsWith('estandares/stacks/')) return `${rutaEstandares}/stacks/${rutaEco.slice('estandares/stacks/'.length)}`;
  if (rutaEco.startsWith('estandares/') && rutaEco.endsWith('.md')) {
    return `${rutaEstandares}/${rutaEco.slice('estandares/'.length)}`;
  }
  return null;
}

// Anexos de stack que consume este repo. Se leen del lock, no del campo `stack`:
// un monorepo puede tener instalado más de uno, y el lock dice lo que hay de verdad.
const stacksDelRepo = Object.keys(std.lock ?? {})
  .filter((r) => r.startsWith(`${rutaEstandares}/stacks/`))
  .map((r) => r.slice(`${rutaEstandares}/stacks/`.length));

if (stacksDelRepo.length === 0 && proyecto.stack) stacksDelRepo.push(`${proyecto.stack}.md`);

// Conjunto objetivo: lo que el repo ya tiene, más los documentos que el estándar
// haya agregado desde entonces. Un archivo nuevo en `estandares/` es parte del
// estándar aunque este repo todavía no lo tenga — es justo el caso de un proyecto
// que viene de varias versiones atrás.
//
// Los anexos de stack NO se descubren listando: solo se traen los que este repo
// ya consume. Traerlos todos convertiría cada stack nuevo en ruido para todos.
const objetivo = new Set(Object.keys(std.lock ?? {}));

const documentosDelEstandar = (await listarDelOrigen('estandares')).filter((n) => n.endsWith('.md'));
for (const nombre of documentosDelEstandar) objetivo.add(`${rutaEstandares}/${nombre}`);

objetivo.add(`${rutaEstandares}/system-prompt-visebit.md`);
objetivo.add('.visebit/verificar-estandar.mjs');
objetivo.add('.visebit/sincronizar-estandar.mjs');

for (const nombre of await listarDelOrigen('skills/visebit-code-review')) {
  objetivo.add(`.claude/skills/visebit-code-review/${nombre}`);
}
for (const stack of stacksDelRepo) objetivo.add(`${rutaEstandares}/stacks/${stack}`);

// --- Comparar ------------------------------------------------------------------

const cambios = [];

for (const rutaProy of [...objetivo].sort()) {
  const rutaEco = aRutaDelEcosistema(rutaProy);
  if (!rutaEco) continue;

  const remoto = await leerDelOrigen(rutaEco);
  if (remoto === null) {
    // El archivo dejó de existir en el estándar. No se borra nada del proyecto
    // automáticamente: borrar es destructivo y una ausencia puede ser un error
    // de empaquetado. Se reporta y decide una persona.
    cambios.push({ ruta: rutaProy, tipo: 'ausente-en-el-estandar', contenido: null });
    continue;
  }

  const abs = join(REPO, rutaProy.split('/').join(sep));
  const local = existsSync(abs) ? readFileSync(abs, 'utf8') : null;

  if (local === null) { cambios.push({ ruta: rutaProy, tipo: 'nuevo', contenido: remoto }); continue; }
  if (hashDeTexto(local) !== hashDeTexto(remoto)) {
    cambios.push({ ruta: rutaProy, tipo: 'modificado', contenido: remoto });
  }
}

const aEscribir = cambios.filter((c) => c.contenido !== null);
salida.archivos = cambios.map((c) => `${c.tipo}: ${c.ruta}`);

// --- Decidir y escribir --------------------------------------------------------

// Actualización vacía: subió la versión del ecosistema pero nada de lo que este
// repo consume cambió. Caso típico: se agregó el anexo de otro stack. Se sube el
// número y ya — un PR de una línea que se mergea sin pensar.
if (aEscribir.length === 0) {
  salida.decision = 'pr-vacio';
  salida.motivo =
    `${std.version} → ${versionRemota} no cambia ningún archivo que este proyecto consuma. ` +
    'Solo sube el número de versión.';
} else {
  salida.decision = 'pr';
  salida.motivo = `${std.version} → ${versionRemota} (${salida.bump}): ${aEscribir.length} archivo(s) del estándar cambian.`;
}

if (DRY) emitir(0);

for (const c of aEscribir) {
  const abs = join(REPO, c.ruta.split('/').join(sep));
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, c.contenido, 'utf8');
}

std.version = versionRemota;
std.checkedAt = new Date().toISOString().slice(0, 10);

// El lock se repuebla con las rutas objetivo y se sella con el verificador —el
// que acaba de escribirse, si venía en el cambio—, nunca calculando los hashes acá.
const lockNuevo = {};
for (const ruta of [...objetivo].sort()) {
  if (existsSync(join(REPO, ruta.split('/').join(sep)))) lockNuevo[ruta] = '';
}
std.lock = lockNuevo;

writeFileSync(rutaManifiesto, JSON.stringify(proyecto, null, 2) + '\n', 'utf8');

const { execFileSync } = await import('node:child_process');
execFileSync(process.execPath, [rutaVerificador, '--seal'], { cwd: REPO, stdio: 'pipe' });

emitir(0);
