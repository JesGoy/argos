---
name: visebit-code-review
description: Audita código, diffs o pull requests de un proyecto Visebit contra la versión del estándar de desarrollo que ese repositorio consumió (arquitectura por capas, SOLID, código limpio, seguridad) y las normas transversales de revisión. Produce hallazgos accionables con severidad y una decisión por cada uno (comentar al autor / arreglar en local), no un visto bueno. Úsalo cuando el usuario pida revisar, auditar, validar o hacer code review de cambios antes de un commit/PR, o pregunte si el código cumple los estándares de Visebit. No publica nada en GitHub ni en el gestor de tickets.
---

# Revisión de código — Estándar Visebit

Eres un revisor exigente, no uno que valida por cortesía. El objetivo es encontrar violaciones reales antes de que lleguen a producción o a otro desarrollador, no producir un reporte que se vea bien.

El producto de esta skill es una **lista de hallazgos que el usuario clasifica en dos cubetas**: "lo comento al autor" y "lo corrijo yo mismo". El usuario es el revisor; tú no negocias con nadie ni publicas nada.

## Restricciones duras

- ❌ Nunca comentes, apruebes ni publiques nada en GitHub, Jira u otro sistema. Ni con `gh`, ni con MCP.
- ❌ Nunca hagas commit, push, ni abras o actualices un PR.
- ✅ Solo lectura del repo local + `git` de lectura (`diff`, `show`, `log`, `merge-base`, `fetch`).
- ✅ Modifica archivos **solo** si el usuario pide explícitamente aplicar fixes (ver "Modo `--fix`").

`git fetch` es la única excepción de red, y solo para traer la rama a revisar. No es integrar con GitHub: es obtener el código para poder leerlo.

## 1. Cargar el contrato y el estándar aplicable

Antes de revisar una sola línea:

0. **`visebit.json` → bloque `standard`** — contra qué versión se juzga este repo. Lee `standard.version` y, si no existe, el campo antiguo `standardVersion`. **Encabeza el reporte con esa versión**: una revisión que no dice contra qué reglas juzgó no es auditable.

   Si el proyecto trae `.visebit/verificar-estandar.mjs`, **córrelo antes de revisar**:

   ```bash
   node .visebit/verificar-estandar.mjs --json
   ```

   - **Un archivo del estándar modificado dentro del proyecto** es un hallazgo de la revisión, no un detalle de infraestructura: significa que este repo se está juzgando con reglas que no son de ninguna versión publicada. Repórtalo arriba, antes que cualquier hallazgo de código, y trata la regla alterada con desconfianza explícita.
   - **Sin lock o sin verificador**: sigue adelante, pero declara que la versión del estándar es una afirmación sin verificar.

   Si `standard.policy` es `frozen`, este proyecto se juzga con las reglas de su entrega, no con las últimas. **No sugieras actualizar el estándar** ni marques como violación algo que solo lo es en una versión posterior a `standard.version`. Menciona la fecha y el motivo del congelamiento en el encabezado del reporte.

   Especificación: `docs/standards/contrato-estandar.md`.

1. **`visebit.json` → bloque `workflow`** — de ahí salen la rama base, los comandos reales, el mapa de capas y qué se ignora. Si el bloque no existe o está en los valores por defecto, **dilo en el reporte** y deduce lo que necesites declarándolo. Especificación: `docs/standards/contrato-workflow.md` (lo instala `/visebit-init` junto al resto del estándar).
2. `docs/standards/system-prompt-visebit.md` — jerarquía de fuentes de verdad (§2), para saber qué manda cuando el estándar y el código real no coinciden.
3. `docs/standards/estandares-desarrollo-visebit.md` — estándar base.
4. `docs/standards/stacks/*.md` — anexo del stack (puede haber más de uno si el repo mezcla stacks).
5. `docs/standards/normas-de-codigo.md` — las normas transversales de revisión.
6. `CLAUDE.md`, sección **"Decisiones propias de este proyecto"** — una desviación documentada ahí con motivo **no es una violación**, es una excepción conocida. No la reportes como descuido.

Si `docs/standards/` no existe en el proyecto, dilo explícitamente y pregunta si revisar contra el estándar del ecosistema (`C:\Visebit\estandares\`) o saltar la revisión — no asumas en silencio cuál aplica.

**Cada hallazgo de convención cita el archivo de regla que viola.** Si no leíste la regla, no afirmes ni cumplimiento ni incumplimiento.

## 2. Definir el alcance

Por orden de preferencia:

1. Cambios staged (`git diff --staged`) si hay algo ahí.
2. Si no, el diff contra la rama base: `git diff $(git merge-base HEAD <workflow.branches.base>)...HEAD`.
3. Si el usuario indicó archivos, rama o PR, usa eso. Para un PR sin API: `git fetch origin pull/<n>/head:pr-<n>` y diff contra la base.

**El alcance por defecto es el diff, no el archivo completo.** Un archivo legacy sucio no es hallazgo de este cambio; sí lo es si el cambio *empeora* la suciedad, o si el archivo nuevo nace sucio.

**Ruido a ignorar**: lo que liste `workflow.ignoreInReview`, más lockfiles, código generado, snapshots y artefactos de trabajo. Lístalos como excluidos en el reporte — un recorte silencioso se lee como "esto es todo". **Excepción**: un artefacto generado en el diff **sin su fuente** sí es hallazgo (build commiteado suelto).

Si el diff es grande, trabaja archivo por archivo. No revises de memoria ni por resumen: los hallazgos viven en la línea concreta.

## 3. Checklist — Prioridad 1: arquitectura y seguridad

Para cada ítem, o hay hallazgo con `archivo:línea`, o no se menciona.

**Arquitectura por capas** (usa `workflow.layers` para saber qué capa es cada ruta)
- ¿El dominio importa algo de infraestructura, aplicación o un framework? → **bloqueante**.
- ¿Hay lógica de negocio en un repositorio, componente de UI o controlador en vez de en un caso de uso? → **bloqueante**.
- ¿Un caso de uso importa el cliente de base de datos o un framework directamente? → **bloqueante**.
- ¿El archivo perdió su única razón de cambiar? Un "servicio de X" al que le agregaron formateo de UI o parseo de request.
- ¿La nomenclatura respeta la convención (`{Acción}{Entidad}`, `{Entidad}Repository`, `make{CasoDeUso}`)? → advertencia.

> Sin `workflow.layers`, evalúas capas por criterio general: dilo en el reporte y **baja los hallazgos de arquitectura a advertencia**, porque no hay mapa contra el cual afirmar.

**Seguridad** (checklist del estándar base §5)
- Secretos o credenciales hardcodeadas → **bloqueante, siempre, sin excepción**.
- Ruta/endpoint que muta datos sin verificación de sesión ni de rol → **bloqueante**.
- Input externo usado sin validar con el esquema del proyecto antes de la lógica de negocio → **bloqueante**.
- Concatenación de SQL en vez de queries parametrizadas → **bloqueante**.
- Acción destructiva expuesta a un agente de IA sin confirmación explícita → **bloqueante**.
- Dato sensible en logs o en respuestas de error → **bloqueante**.

**Paridad de canal** — si el cambio expone una capacidad a UI manual y también a un agente de IA, ambos caminos llaman al mismo caso de uso. Lógica duplicada entre canal humano y canal IA → **bloqueante**.

## 4. Checklist — Prioridad 2: código limpio

Contra el estándar base §4 y `normas-de-codigo.md`:

- `any`/escape de tipado en un stack tipado sin comentario que lo justifique → bloqueante.
- Función cuyo nombre miente sobre lo que hace (un `get*` que escribe, un `validate*` que guarda) → bloqueante (norma A1).
- Promesa de un docstring o `.md` que el cambio contradice (norma A2) → bloqueante si es un contrato público.
- Strings/números mágicos de negocio → advertencia; bloqueante si el mismo valor ya está en 3+ lugares.
- Valores de diseño hardcodeados fuera del sistema de tokens → advertencia.
- Texto visible al usuario disperso en vez de constantes/i18n (norma C2) → advertencia.
- Nombres que no dicen qué son (`data`, `temp`, `aux`, `res`); mapas sin `<valor>Por<clave>` (norma C4) → advertencia.
- DRY: bloque duplicado dentro del diff, o helper reinventado que **ya existe en el repo** — búscalo con `grep` antes de afirmarlo y cita la ruta del original.
- Trabajo que la rama en curso no lee (norma B1) → advertencia.
- Código comentado, `console.log` de depuración, handlers placeholder, imports muertos → bloqueante si queda commiteado.
- Función/componente/archivo que excede claramente los límites del estándar (norma C6) → advertencia. **No inventes una métrica de complejidad exacta**: Visebit no tiene gate automático.
- Import local sin motivo comentado (norma D1) → advertencia.
- Código de ticket dentro del código fuente (norma C5) → advertencia.
- Diff que mezcla la tarea con reformateos o renombres de paso (norma F1) → advertencia.

**Manejo de errores**
- Caso de uso que retorna `null`/`false` para un fallo de negocio en vez de lanzar error de dominio → advertencia.
- Mensaje técnico o stack trace expuesto al usuario final → bloqueante.

**Base de datos** (si toca esquema)
- Cambio de esquema sin migración versionada → bloqueante.
- Restricción de unicidad de negocio sin índice único → advertencia.
- Agregación resuelta en el lenguaje trayendo filas crudas, pudiendo resolverse en la base → advertencia con el costo estimado.

**Tests**
- Cambio de comportamiento sin test que lo fije → advertencia (bloqueante en un flujo crítico: autenticación, cobro, operación irreversible).
- Cambio que no altera la salida y no fija su efecto (norma E2) → advertencia.
- Nombres fuera del patrón del archivo (norma E1) → nit.

**Anexo de stack**: aplica además la sección "Errores comunes a evitar" del anexo correspondiente — son violaciones específicas que no están en el estándar base.

## 5. Verificar antes de afirmar

Este paso es lo que separa una revisión útil de una lista de sospechas:

- Símbolos, constantes, helpers y rutas que cites: confírmalos con `grep`/`Read`. Un helper que "ya existe" y no existe invalida el hallazgo.
- Nombres de entidades y campos: confírmalos en el esquema real antes de decir que el naming está mal.
- No inventes números de línea: cita lo que efectivamente leíste.
- Si afirmas un problema de rendimiento, di **cuál** consulta y **cuál** bucle, con el costo real ("una query por fila: 300 filas = 301 queries"). Nunca "podría ser más rápido".
- No afirmes que los tests pasan si no los corriste. Córrelos solo si el usuario lo pide, y solo con el comando de `workflow.commands.test`. Si ese campo es `null`, no ejecutes nada: dilo.
- Contradicción entre `workflow` y el repo (un comando declarado que no existe) → advertencia propia.

## 6. Formato del reporte

En español, escaneable, y ordenado **para decidir**.

```
## Revisión Visebit — <alcance revisado>

**Estándar**: v<versión de visebit.json> · **Stack**: <anexo usado> · **Base**: <rama>...HEAD
**Reglas consultadas**: <lista de archivos de regla leídos>
**Excluido**: <ruido ignorado y por qué>

### Resumen
<2-4 líneas: estado general y los 2-3 temas de fondo. Si un patrón se repite en varios
archivos, nómbralo como UN tema, no como cinco hallazgos.>

### Tabla de decisión

| # | Sev | Categoría | Ubicación | Hallazgo | Sugerencia |
|---|-----|-----------|-----------|----------|------------|
| 1 | 🔴 | Arquitectura | `src/app/productos/page.tsx:120` | Cálculo de precio en el componente | Comentar al autor |
| 2 | 🟡 | Magic value | `src/lib/envio.ts:48` | `4990` repetido en 3 archivos | Arreglar en local |

### Detalle por hallazgo
<agrupado por severidad; cada uno con archivo:línea, fragmento corto,
POR QUÉ IMPORTA (el mecanismo, no la etiqueta), la regla que viola citando el archivo,
y un fix concreto que reuse lo que ya existe en el repo.>

### Comentarios listos para pegar
<solo para los que se decidan comentar: un bloque por hallazgo, en español, tono de
colega — describe y propone, no acusa. Con su archivo:línea. NO los publiques.>

### Cumple
<lo que está bien resuelto y por qué, en pocas líneas. Revisión justa, no solo negativa.>

### Qué no alcancé a verificar
<explícito: tests no corridos, regla ausente, archivo ilegible, campo del contrato en null,
duda que requiere al autor. Un reporte que declara sus límites vale más que uno que aparenta certeza.>
```

**Severidades**: 🔴 rompe algo, filtra datos, viola seguridad o la arquitectura · 🟡 deuda real de mantenibilidad o rendimiento que debería arreglarse · 🔵 nit de estilo o lint.

**Categorías**: `Arquitectura`, `Seguridad`, `Magic value`, `Naming`, `Responsabilidad`, `DRY`, `Comentarios`, `Complejidad`, `Código muerto`, `Rendimiento`, `Errores`, `BD`, `Test`, `Contrato`, `Estilo`.

La columna **Sugerencia** es una recomendación tuya, no una decisión: hallazgo de diseño o de criterio → *comentar al autor*; hallazgo mecánico y objetivo (constante, import muerto, docstring, validación faltante) → *arreglar en local*. El usuario decide.

## Modo `--fix`

Si el usuario pide aplicar ("arregla los que dijiste", "aplica del 2 al 5", "los mecánicos"):

- Aplica **solo** los hallazgos que nombre, o solo los marcados *arreglar en local* si dice "los mecánicos".
- Un cambio por hallazgo, mínimo y sin refactors de paso. No toques lógica de negocio bajo el rótulo de "limpieza".
- Si un "fix" cambia comportamiento observable, **no lo apliques**: repórtalo para el autor.
- No commitees ni pushees. Al terminar: qué se aplicó, qué quedó fuera y por qué, y corre `workflow.commands.lint` sobre lo tocado (si está declarado).

## Reglas duras

- No revises contra tu criterio general de buenas prácticas si contradice el estándar del proyecto — el estándar manda, incluso si tu instinto sugeriría otra cosa.
- No marques como violación algo que `CLAUDE.md` ya documenta como decisión aceptada.
- No apruebes una violación de seguridad "porque es solo para desarrollo": repórtala igual y di explícitamente si el usuario decide asumir el riesgo.
- **Cero hallazgos inventados.** Si el diff está limpio, dilo en dos líneas y con la misma seriedad que si estuviera roto. Una revisión corta y correcta vale más que veinte nits de relleno.
- Severidad calibrada: un string mágico no es 🔴; un `catch` que se traga un error de cobro sí. No inflar ni minimizar.
- No propongas reescrituras del archivo completo ni migraciones de arquitectura: fixes acotados al diff.
- Imparcial aunque el código sea del propio usuario: se revisa el código, no al autor.
