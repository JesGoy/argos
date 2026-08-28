#!/usr/bin/env node
/**
 * Verificador del estándar Visebit — integridad del bloque `standard` de visebit.json.
 *
 * Node puro, sin dependencias y sin red: compara el repositorio consigo mismo.
 * Contrasta los archivos de `docs/standards/` y la skill de revisión contra los
 * hashes sellados en `standard.lock`, y valida que el bloque esté bien formado.
 *
 *   node .visebit/verificar-estandar.mjs           verifica (código 1 si hay drift)
 *   node .visebit/verificar-estandar.mjs --json    salida para máquina
 *   node .visebit/verificar-estandar.mjs --seal    recalcula el lock
 *
 * Especificación: docs/standards/contrato-estandar.md
 * Este archivo se instala desde el ecosistema — no lo edites dentro del proyecto.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// --- Hash: la única implementación del algoritmo en todo el ecosistema --------
// Sin BOM y con saltos de línea normalizados, para que el mismo archivo dé el
// mismo hash en Windows y en Linux pase lo que pase con autocrlf de git.
//
// Se exporta a propósito: el empaquetador y la acción de sincronización lo
// importan desde acá en vez de reimplementarlo. Dos implementaciones del mismo
// algoritmo divergiendo en silencio es exactamente lo que el lock existe para
// detectar — no tiene sentido introducir ese riesgo en la herramienta misma.

export function hashDeTexto(texto) {
  let t = texto;
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  t = t.replace(/\r\n/g, '\n');
  return 'sha256-' + createHash('sha256').update(t, 'utf8').digest('hex');
}

export function hashDeArchivo(rutaAbsoluta) {
  return hashDeTexto(readFileSync(rutaAbsoluta, 'utf8'));
}

// Ejecutado como CLI o importado como módulo. Sin esta guarda, importar el
// hash correría la verificación completa y llamaría a process.exit().
const esCli =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (!esCli) {
  // Importado: solo se usan las funciones de hash exportadas arriba.
} else {

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFIESTO = resolve(RAIZ, 'visebit.json');
const POLITICAS = ['frozen', 'assisted', 'tracking'];

const args = new Set(process.argv.slice(2));
const modoJson = args.has('--json');
const modoSellar = args.has('--seal');

// --- Recolección de hallazgos -------------------------------------------------

const hallazgos = [];
const nota = (nivel, codigo, mensaje, archivo = null) =>
  hallazgos.push({ nivel, codigo, mensaje, archivo });

function salir() {
  const errores = hallazgos.filter((h) => h.nivel === 'error');
  const avisos = hallazgos.filter((h) => h.nivel === 'aviso');

  if (modoJson) {
    console.log(JSON.stringify({ ok: errores.length === 0, hallazgos }, null, 2));
  } else {
    for (const h of hallazgos) {
      const marca = h.nivel === 'error' ? '  [x]' : '  [!]';
      console.log(`${marca} ${h.mensaje}${h.archivo ? `  (${h.archivo})` : ''}`);
    }
    console.log('');
    if (errores.length === 0 && avisos.length === 0) {
      console.log('Estándar Visebit: sin desviaciones.');
    } else if (errores.length === 0) {
      console.log(`Estándar Visebit: ${avisos.length} aviso(s), sin errores.`);
    } else {
      console.log(`Estándar Visebit: ${errores.length} error(es), ${avisos.length} aviso(s).`);
      if (errores.some((h) => h.codigo === 'archivo-modificado')) {
        console.log('');
        console.log('Si los cambios en docs/standards/ son intencionales, no los selles a la ligera:');
        console.log('una norma editada dentro de un proyecto deja de estar en ninguna versión publicada.');
        console.log('Lo correcto es llevar el cambio al ecosistema y actualizar desde ahí.');
      }
    }
  }
  process.exit(errores.length > 0 ? 1 : 0);
}

// --- 1. Manifiesto ------------------------------------------------------------

if (!existsSync(MANIFIESTO)) {
  nota('error', 'sin-manifiesto', 'No existe visebit.json en la raíz del repositorio.');
  salir();
}

let manifiesto;
try {
  manifiesto = JSON.parse(readFileSync(MANIFIESTO, 'utf8'));
} catch (e) {
  nota('error', 'json-invalido', `visebit.json no es JSON válido: ${e.message}`);
  salir();
}

// --- 2. Bloque standard -------------------------------------------------------

const std = manifiesto.standard;

if (!std) {
  if (manifiesto.standardVersion) {
    nota(
      'aviso',
      'sin-bloque-standard',
      `Este proyecto declara standardVersion "${manifiesto.standardVersion}" pero no tiene bloque "standard". ` +
        'Corre /visebit-dev:visebit-adopt para migrarlo (agrega política y lock).'
    );
  } else {
    nota('error', 'sin-bloque-standard', 'visebit.json no declara ni "standard" ni "standardVersion".');
  }
  salir();
}

if (!std.version) {
  nota('error', 'sin-version', 'standard.version está vacío: el repo no declara contra qué versión se juzga.');
}

if (!std.policy) {
  nota('aviso', 'sin-policy', 'standard.policy ausente — se asume "assisted".');
} else if (!POLITICAS.includes(std.policy)) {
  nota('error', 'policy-invalida', `standard.policy "${std.policy}" no es válida. Esperado: ${POLITICAS.join(' | ')}.`);
}

const policy = POLITICAS.includes(std.policy) ? std.policy : 'assisted';

if (policy === 'frozen') {
  if (!std.frozen || typeof std.frozen !== 'object') {
    nota('error', 'frozen-sin-registro', 'policy es "frozen" pero falta el objeto standard.frozen (at, reason).');
  } else {
    if (!std.frozen.at) nota('error', 'frozen-sin-fecha', 'standard.frozen.at está vacío.');
    if (!std.frozen.reason || String(std.frozen.reason).trim().length < 10) {
      nota(
        'error',
        'frozen-sin-motivo',
        'standard.frozen.reason está vacío o es demasiado breve. Un congelamiento sin motivo escrito ' +
          'es indistinguible de un proyecto abandonado.'
      );
    }
  }
} else if (std.frozen) {
  nota('aviso', 'frozen-huerfano', `standard.frozen está presente con policy "${policy}". Debería ser null.`);
}

if (!std.checkedAt) {
  nota('aviso', 'sin-checked', 'standard.checkedAt ausente: nadie ha contrastado este repo contra el ecosistema.');
} else if (policy !== 'frozen') {
  const dias = Math.floor((Date.now() - Date.parse(std.checkedAt)) / 86_400_000);
  if (Number.isFinite(dias) && dias > 180) {
    nota('aviso', 'checked-antiguo', `Hace ${dias} días que no se contrasta contra el ecosistema (standard.checkedAt).`);
  }
}

// --- 3. Lock ------------------------------------------------------------------

const lock = std.lock;

if (modoSellar) {
  const objetivos = Object.keys(lock ?? {});
  if (objetivos.length === 0) {
    nota('error', 'sellar-sin-claves', 'No hay rutas que sellar: standard.lock está vacío. Corre visebit-adopt.');
    salir();
  }
  const nuevo = {};
  let faltantes = 0;
  for (const ruta of objetivos.sort()) {
    const abs = resolve(RAIZ, ruta.split('/').join(sep));
    if (!existsSync(abs)) {
      nota('error', 'sellar-falta-archivo', 'No se puede sellar: el archivo no existe.', ruta);
      faltantes++;
      continue;
    }
    nuevo[ruta] = hashDeArchivo(abs);
  }
  if (faltantes > 0) salir();

  std.lock = nuevo;
  std.checkedAt = new Date().toISOString().slice(0, 10);
  writeFileSync(MANIFIESTO, JSON.stringify(manifiesto, null, 2) + '\n', 'utf8');
  if (!modoJson) console.log(`Sellado: ${Object.keys(nuevo).length} archivo(s) en standard.lock.`);
  else console.log(JSON.stringify({ ok: true, sellados: Object.keys(nuevo) }, null, 2));
  process.exit(0);
}

if (!lock || Object.keys(lock).length === 0) {
  nota(
    'aviso',
    'sin-lock',
    'El proyecto no está sellado (standard.lock vacío): no puede probar contra qué versión del estándar se juzga. ' +
      'Corre: node .visebit/verificar-estandar.mjs --seal'
  );
  salir();
}

for (const [ruta, esperado] of Object.entries(lock)) {
  const abs = resolve(RAIZ, ruta.split('/').join(sep));
  if (!existsSync(abs)) {
    nota('error', 'archivo-faltante', 'Archivo del estándar declarado en el lock pero ausente del repo.', ruta);
    continue;
  }
  const real = hashDeArchivo(abs);
  if (real !== esperado) {
    nota(
      'error',
      'archivo-modificado',
      `Modificado respecto de la versión ${std.version} del estándar. Este repo ya no se revisa ` +
        'contra ninguna versión publicada.',
      ruta
    );
  }
}

salir();

}
