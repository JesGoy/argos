# Contrato del estándar consumido — bloque `standard` de `visebit.json`

**Versión**: 1.1 · **Aplica desde**: estándar 1.10.0 · **Sincronización automática**: desde 1.12.0

## Por qué existe

`contrato-workflow.md` declara **cómo se trabaja** en este repo. Este contrato declara **con qué versión del estándar se juzga este repo, y si esa versión debe moverse o no**.

Son preguntas distintas y tienen respuestas distintas por proyecto:

- Un proyecto entregado sin mantención debe quedar clavado en la versión con la que se construyó. Actualizarlo no solo no aporta: lo perjudica, porque una regla escrita después de la entrega no puede ser un defecto del código entregado.
- Un proyecto con mantención vigente quiere subir de versión cuando convenga, con el costo a la vista.
- Un proyecto propio de Visebit debería ir lo más cerca posible de la última versión, porque es donde se prueban las reglas nuevas.

Hasta 1.9.0 esa diferencia existía solo en la cabeza de quien corría —o no corría— el instalador. Este bloque la vuelve explícita, verificable y leíble por una máquina.

## Forma

```jsonc
"standard": {
  "version": "1.10.0",              // versión del estándar que este repo consumió
  "policy": "assisted",             // frozen | assisted | tracking
  "source": "visebit-tech/Visebit", // de dónde sale el estándar
  "checkedAt": "2026-08-15",        // último contraste contra el ecosistema
  "frozen": null,                   // objeto solo cuando policy = frozen
  "lock": {
    "docs/standards/estandares-desarrollo-visebit.md": "sha256-…",
    "docs/standards/contrato-workflow.md":             "sha256-…",
    "docs/standards/contrato-estandar.md":             "sha256-…",
    "docs/standards/normas-de-codigo.md":              "sha256-…",
    "docs/standards/system-prompt-visebit.md":         "sha256-…",
    "docs/standards/stacks/nextjs-typescript.md":      "sha256-…",
    ".claude/skills/visebit-code-review/SKILL.md":     "sha256-…",
    ".visebit/verificar-estandar.mjs":                 "sha256-…"
  }
}
```

Reemplaza al campo suelto `standardVersion` de versiones anteriores. Durante un ciclo MINOR las skills leen **`standard.version` y, si no existe, `standardVersion`**, para no romper los proyectos que todavía no migraron. Desde 1.11.0 solo se lee `standard.version`.

---

## Campos

### `version`

La versión del estándar que este repositorio consumió. **No es la versión del proyecto** ni la del plugin instalado en la máquina del desarrollador: es la versión de las reglas que están dentro de `docs/standards/`.

Es el número contra el que se compara `VERSION` del ecosistema para saber si hay actualización pendiente, y el que aparece en el reporte de `visebit-code-review`.

### `policy`

Qué debe pasar cuando el ecosistema publica una versión nueva.

| Valor | Para qué proyecto | Qué significa |
|---|---|---|
| `frozen` | Entregado, sin contrato de mantención | **No se actualiza nunca.** Es una decisión tomada, no un olvido. |
| `assisted` | Cliente con mantención vigente | Se actualiza con revisión humana: cada salto se propone, se evalúa el impacto y alguien decide. |
| `tracking` | Producto propio de Visebit | Se mantiene cerca de la última versión. Los cambios que no pueden invalidar código entran solos. |

Traducido a comportamiento concreto de la sincronización automática:

| | `frozen` | `assisted` | `tracking` |
|---|---|---|---|
| Cadencia del contraste | — | mensual | semanal |
| **PATCH** (redacción, ejemplos) | — | PR | PR + auto-merge con CI verde |
| **MINOR** (regla nueva) | — | PR + informe de impacto | PR + informe de impacto |
| **MAJOR** (invalida código) | — | issue con plan de migración | issue con plan de migración |
| Actualización vacía | — | PR de una línea | auto-merge |
| Verificación de integridad en CI | sí | sí | sí |

Un MINOR nunca se auto-mergea, ni siquiera en `tracking`: por definición agrega una regla, y código que cumplía puede dejar de cumplir. Un PATCH sí, porque por definición no cambia ninguna regla.

**Degradación**: sin `policy`, se asume `assisted` y la skill lo declara en su salida. Es el valor menos peligroso de los tres: nunca cambia nada sin que alguien lo apruebe, y nunca deja atrás un proyecto en silencio.

Un proyecto **no** cambia de política solo. Pasar a `frozen` es un acto explícito de la entrega; volver de `frozen` a `assisted` implica revisar cuánto se movió el estándar mientras tanto y es una decisión consciente.

### `source`

El repositorio del ecosistema del que salió el estándar, en formato `owner/repo`. Por defecto `visebit-tech/Visebit`.

Existe para que un repo que cambió de dueño —el cliente se lo llevó a su propia organización— pueda declararlo, y para que las herramientas que contrasten versiones sepan dónde mirar en vez de asumir una ruta local.

Desde 1.11.0 la sincronización lee el **último release** de ese repositorio, no su rama principal. La diferencia importa: un release es inmutable y está atado a un tag, así que `standard.version` apunta a algo que existió exactamente así. Subir trabajo a medias al repo del ecosistema no le llega a nadie — publicar es taggear.

**Degradación**: ausente = `visebit-tech/Visebit`. Si el origen responde 404 —típicamente porque el repo se movió a la organización del cliente y el token ya no lo alcanza—, la sincronización **no reintenta ni falla en rojo cada mes**: informa que quedó huérfana. Un CI rojo recurrente que nadie puede arreglar deja de leerse.

### `checkedAt`

Fecha (`YYYY-MM-DD`) del último contraste real contra el ecosistema, se haya actualizado algo o no.

Es distinto de `bootstrappedAt`: ese dice cuándo nació el proyecto, este dice **hace cuánto que nadie mira si quedó atrás**. Un proyecto `assisted` con `checkedAt` de hace ocho meses es exactamente el que hay que revisar.

**Degradación**: ausente = nunca se contrastó desde el bootstrap.

### `frozen`

Presente solo cuando `policy` es `frozen`. `null` en cualquier otro caso.

```jsonc
"frozen": {
  "at": "2026-11-30",
  "reason": "Entrega final — sin contrato de mantención",
  "handoverDoc": "docs/ENTREGA.md"
}
```

| Campo | Qué es |
|---|---|
| `at` | Fecha del congelamiento |
| `reason` | Por qué. Texto libre, pero concreto: quien lo lea en dos años no estuvo en la reunión |
| `handoverDoc` | Ruta al documento de entrega, si existe. `null` si no |

Congelar sin motivo escrito es indistinguible de un proyecto abandonado. El campo `reason` es lo que separa una decisión de un olvido.

### `lock`

Hash de cada archivo del estándar tal como quedó instalado en este repositorio.

Su función no es seguridad —quien tenga permiso de escritura puede recalcularlo— sino **honestidad**: convierte `"version": "1.6.0"` de una afirmación en algo verificable. Detecta el caso que hoy es invisible: alguien editó a mano una norma dentro de un proyecto, y desde entonces ese repo se revisa contra reglas que no son las de ninguna versión publicada.

Para un proyecto congelado, el `lock` es además la prueba técnica de la entrega: no dice que se construyó contra 1.6.0, lo demuestra.

#### Cómo se calcula

Idéntico en cualquier herramienta que lo produzca o lo verifique:

1. Leer el archivo como bytes.
2. Quitar el BOM UTF-8 si está presente.
3. Normalizar los saltos de línea: `\r\n` → `\n`.
4. SHA-256 sobre el resultado.
5. Formato: `sha256-` + hexadecimal en minúsculas.

El paso 3 no es cosmético: sin él, el mismo archivo da hashes distintos según cómo git lo haya materializado en Windows o en Linux, y el chequeo falla en CI para todo el mundo sin que nadie haya tocado nada.

#### Qué entra

Todo lo que define las reglas con las que se juzga este repo:

- Los cinco documentos de `docs/standards/`
- Los anexos de stack instalados en `docs/standards/stacks/`
- `.claude/skills/visebit-code-review/SKILL.md` y lo que la acompañe
- `.visebit/verificar-estandar.mjs` y `.visebit/sincronizar-estandar.mjs`

**Las claves son rutas relativas a la raíz del repositorio, con `/` como separador** — también en Windows. Un archivo listado en el `lock` que no existe en el disco es un hallazgo, igual que uno modificado.

Qué **no** entra: `CLAUDE.md`, `AGENTS.md`, `opencode.json`, `.claude/settings.json` y el bloque `workflow`. Son contenido propio del proyecto y cambian legítimamente todo el tiempo — los dos archivos de configuración de agente, además, los edita cada equipo según las herramientas que use.

**Degradación**: sin `lock`, el verificador no falla — informa que el proyecto no está sellado y sugiere `--seal`. Un proyecto sin lock es un proyecto que no puede probar su versión, no un proyecto roto.

---

## Cómo se verifica

`.visebit/verificar-estandar.mjs` se instala en cada proyecto. Node puro, sin dependencias, sin red:

```bash
node .visebit/verificar-estandar.mjs           # verifica y falla con código 1 si hay drift
node .visebit/verificar-estandar.mjs --json    # misma verificación, salida para máquina
node .visebit/verificar-estandar.mjs --seal    # recalcula el lock (después de una actualización legítima)
```

Corre en CI en cada PR vía `.github/workflows/visebit-estandar.yml`. No necesita secrets ni acceso al ecosistema: solo compara el repo consigo mismo.

**`--seal` es deliberadamente manual.** Sellar es afirmar "estos archivos son los correctos para esta versión": si el verificador lo hiciera solo al detectar una diferencia, el chequeo no serviría para nada.

---

## Cómo se actualiza

`.visebit/sincronizar-estandar.mjs` contrasta el repo contra el último release del origen y aplica lo que corresponda según la política. Lo corre `.github/workflows/visebit-sync.yml` por cron, o una persona con `/visebit-dev:visebit-sync`.

```bash
node .visebit/sincronizar-estandar.mjs --dry-run            # decide y explica, sin escribir
node .visebit/sincronizar-estandar.mjs                      # aplica
node .visebit/sincronizar-estandar.mjs --desde-dir ~/Visebit  # contra un ecosistema local, sin red
```

**El script vive dentro del proyecto, no en el ecosistema.** Así el workflow no necesita permiso de checkout sobre el repositorio privado del ecosistema: le basta un token que pueda leer sus releases. Y se mantiene solo, porque está en el `lock` como cualquier otro archivo del estándar.

Decide, escribe archivos y emite JSON. **No hace git ni abre PRs**: eso vive en el workflow, donde se puede auditar sin leer código.

### El diff restringido

La sincronización compara **solo los archivos que este proyecto consume**: los de su `lock`, más los documentos del estándar que una versión nueva haya agregado, más los anexos de **sus** stacks.

Sin esto, agregar el anexo de un stack nuevo —que es un MINOR— dispararía un PR en todos los repositorios de la organización, incluidos los que no lo usan. Ese ruido es lo que hace que un equipo termine apagando la sincronización a los dos meses. Cuando el diff restringido queda vacío, la decisión es `pr-vacio`: sube el número de versión y nada más.

### Mapa entre el proyecto y el ecosistema

| En el proyecto | En el ecosistema |
|---|---|
| `<standardsPath>/system-prompt-visebit.md` | `agente/system-prompt-visebit.md` |
| `<standardsPath>/*.md` | `estandares/*.md` |
| `<standardsPath>/stacks/*.md` | `estandares/stacks/*.md` |
| `.claude/skills/visebit-code-review/*` | `skills/visebit-code-review/*` |
| `.visebit/verificar-estandar.mjs` | `templates/proyecto/verificar-estandar.mjs` |
| `.visebit/sincronizar-estandar.mjs` | `templates/proyecto/sincronizar-estandar.mjs` |

Un archivo que **desaparece** del estándar no se borra del proyecto automáticamente: se reporta. Borrar es destructivo y una ausencia puede ser un error de empaquetado.

### Qué nunca toca

`CLAUDE.md`, `AGENTS.md`, `opencode.json`, `.claude/settings.json` y el bloque `workflow`. En ningún salto, por ninguna vía. Si un PR de sincronización los modifica, es un bug: hay que reportarlo, no mergearlo.

---

## Regla para decidir dónde va algo

Extiende la regla de `contrato-workflow.md`:

- Si una skill lo necesita para **no adivinar cómo se trabaja** en este repo → `workflow`.
- Si describe **con qué reglas se juzga este repo y si deben moverse** → `standard`.
- Si es una regla de cómo escribir código → el estándar o el anexo de stack.
- Si es dominio de negocio → `CLAUDE.md`.
