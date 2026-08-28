# Normas de código transversales — Visebit

**Versión**: 1.0 · **Aplica desde**: estándar 1.8.0

Reglas que **no** están en el estándar base ni en los anexos de stack, porque no son arquitectura ni convención de un lenguaje: son los errores que aparecen una y otra vez en revisión de código. Se aplican **mientras se escribe**, no en una pasada de limpieza al final — casi todas son gratis al momento de escribir y caras de corregir después.

**Cómo crece este archivo**: cuando la misma observación de revisión aparece en **dos proyectos distintos**, deja de ser un caso y pasa a ser norma. Se agrega a este documento, sube MINOR en el ecosistema y queda en el CHANGELOG. Una regla que solo aplica a un cliente va en su `CLAUDE.md`, no aquí.

Quién lo usa: `visebit-code-review` lo revisa sobre el diff; `visebit-start-task` lo reproduce completo dentro del plan de la tarea (el plan se lee desde el worktree, donde este archivo no está a mano).

---

## A. Contratos y efectos

**A1 — Lo que se declara de solo lectura no escribe.** Antes de usar un helper `get*`/`find*` o un flag de conveniencia dentro de una consulta, abre su implementación: un `upsert`, un `create` o un `save` escondidos adentro son frecuentes. Si un flag dispara escritura, reemplázalo por un filtro equivalente. Una función cuyo nombre miente sobre lo que hace es hallazgo **bloqueante**, no cosmético.

**A2 — La promesa hacia afuera tiene que seguir siendo cierta.** Si un docstring, un `.md`, un `CLAUDE.md` o el contrato de un puerto dice "no modifica", "siempre X", "solo lectura", el cambio no puede contradecirlo. Ante el conflicto, **corrige el código antes que suavizar el texto**; si de verdad el efecto se mantiene, dilo explícito en la documentación y en el PR.

**A3 — Un `id` no se expone solo si algo que escribe lo va a consumir.** Documenta de qué entidad es y bajo qué condición cambia. Si resolverlo sin ambigüedad necesita otro campo (tipo, tenant, colección), el par es obligatorio. Ojo con los endpoints que resuelven un id contra varias entidades en cascada: aciertan contra la equivocada en silencio en vez de dar 404.

## B. Trabajo inútil

**B1 — No construyas lo que la rama en curso no va a leer.** Si un mapa, un queryset o una llamada externa se arma siempre pero hay caminos que nunca lo consultan, muévelo dentro de la condición. Revisa especialmente los helpers que se llaman al inicio de una función "por las dudas".

## C. Legibilidad

**C1 — Cero valores mágicos, y el dominio cerrado se documenta en el código.** El estándar base (§4) ya prohíbe el literal suelto; el matiz es dónde vive la explicación: si un campo solo acepta `'P' | 'A' | 'R'`, ese dominio va comentado **junto a la constante en el código**, aunque también esté en un markdown. El markdown lo lee el agente; el archivo lo lee quien mantiene.

**C2 — Texto visible al usuario, a constantes o al sistema de i18n.** Títulos, confirmaciones, mensajes de error. El motivo es concreto: para revisar cómo le hablamos al usuario, o para traducir, tienen que estar juntos y no repartidos función por función.

**C3 — Regla de negocio suelta dentro de una función → constante con nombre.** El nombre expresa **el criterio**, no el valor (`MONTO_MINIMO_ENVIO_GRATIS`, no `LIMITE_2`). Así el próximo caso especial sabe dónde va, en vez de encontrarse por casualidad.

**C4 — Las variables que contienen mapas se nombran `<valor>Por<clave>` / `<valor>By<clave>`.** `usage` no dice qué mapea; `usoPorProducto` sí, y ahorra media docstring. El nombre viaja también a los parámetros de las funciones que lo reciben. Se nota sobre todo cuando tres o cuatro conviven en el mismo scope.

**C5 — Sin códigos de ticket en el código fuente.** El ticket ya queda en el commit y en la descripción del PR, donde se puede seguir el hilo; en el código queda una sigla que dentro de un año nadie va a poder abrir. El conocimiento durable va a `CLAUDE.md` o a la documentación del módulo.

**C6 — Complejidad: se cuenta a ojo, con el criterio del estándar base.** Máximo ~40 líneas por función, ~3 niveles de anidación, *early return* antes que `if/else` anidado (§4). Para bajarla, en orden: **extraer el bloque a una función con nombre** · **invertir la guarda** con `return`/`continue` temprano · **combinar los checks que hacen lo mismo** en una sola condición.

> Visebit **no tiene hoy un gate automático de complejidad** (tipo SonarQube). Esto es criterio de revisión, no un número que rompe el pipeline: repórtalo como advertencia, no como bloqueante, y no inventes una métrica exacta. El día que haya un gate corriendo, esta nota se reemplaza por el umbral real.

⚠️ **Extraer no es refactorizar.** El comportamiento tiene que quedar idéntico, incluido el orden de los efectos (llamadas externas, logs, escrituras) y qué se evalúa y qué no. Si no puedes correr los tests, no declares la extracción equivalente: dilo.

## D. Imports

**D1 — Import local solo por ciclo real o módulo pesado.** Todo lo demás va arriba. Si algo queda adentro de una función a propósito, **el motivo va en comentario**: sin eso se lee como olvido y el próximo lo "arregla".

## E. Tests

**E1 — Sigue el patrón de nombres del archivo.** Antes de nombrar un test, mira los vecinos. Quedar como el único distinto entre veinte es una observación segura en revisión.

**E2 — Si el cambio no altera la salida, el test tiene que fijar el efecto.** Una query que se deja de hacer, una fila que ya no se crea, un parámetro que se propaga: eso no se ve en los datos. Se fija con un spy y `not.toHaveBeenCalled()`, contando queries, o consultando el estado después. Sin eso, el fix queda sin red y vuelve solo.

**E3 — Un test que no puede fallar no es un test.** Antes de darlo por bueno, rómpelo a propósito una vez y confirma que se pone rojo.

## F. Higiene del cambio

**F1 — El diff contiene solo lo que la tarea necesita.** Reformateos masivos, renombres de paso y "ya que estaba en el archivo" se van a otro commit: mezclados, esconden el cambio real y hacen imposible revisar.

**F2 — Nada de artefactos de trabajo commiteados.** Planes de tarea, informes generados, `.env` reales, salidas de build. Si el flujo los genera en la raíz del repo, van al `.gitignore` en el mismo commit que los introduce.
