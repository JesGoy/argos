# Estándares de Desarrollo — Visebit

**Versión**: 1.0
**Alcance**: Aplica a todo proyecto de software desarrollado por Visebit, sin importar el cliente o el stack tecnológico. Es la base sobre la que se construyen los anexos por stack, los skills y los system prompts de los agentes de IA que trabajen en el código.

**Origen**: Este documento consolida y generaliza las reglas ya validadas en producción en los proyectos `argos` y `expertooh-app` (Next.js/TypeScript/Drizzle), extrayendo lo que es independiente del stack y del dominio de negocio de cada cliente.

---

## 1. Principios generales

1. **Clean Architecture**: separación estricta en capas (Dominio → Aplicación → Infraestructura → Presentación). Las dependencias siempre apuntan hacia adentro; el dominio no conoce nada de fuera.
2. **SOLID** aplicado de forma pragmática, no dogmática:
   - *Single Responsibility*: cada caso de uso resuelve una operación; cada repositorio gestiona una entidad.
   - *Open/Closed*: la lógica depende de interfaces (puertos), no de implementaciones concretas.
   - *Liskov Substitution*: las implementaciones de un puerto son intercambiables.
   - *Interface Segregation*: interfaces pequeñas y enfocadas, no "god interfaces".
   - *Dependency Inversion*: la lógica de negocio depende de abstracciones; un contenedor/factory conecta las piezas.
3. **DRY sin sobre-ingeniería**: extraer duplicación real (≥3 repeticiones), no abstraer prematuramente.
4. **KISS**: preferir composición sobre herencia, funciones pequeñas y explícitas sobre "magia".
5. **Paridad de canal**: si una capacidad de negocio se puede ejecutar desde una UI manual y también desde un agente de IA (asistente, automatización), ambos caminos deben converger en el mismo caso de uso o servicio de aplicación compartido. Nunca debe existir lógica de negocio duplicada entre el canal humano y el canal IA.
6. **El código se explica solo**: comentarios solo cuando la regla de negocio no es obvia. No se comenta código muerto "por si acaso" — se elimina (git lo recuerda).

## 2. Capas de arquitectura (Clean Architecture)

Esta estructura es agnóstica de stack. Cada anexo de stack (ver sección 9) traduce estos nombres de carpeta a la convención del lenguaje/framework correspondiente.

### 2.1 Capa de Dominio
**Propósito**: lógica de negocio pura, sin dependencias externas ni de framework.

Reglas:
- Cero imports desde infraestructura, aplicación o frameworks.
- Contiene entidades (estructuras de datos del negocio) y errores de dominio.
- Los errores de dominio son clases con nombre y código significativos, no strings sueltos.

### 2.2 Capa de Aplicación
**Propósito**: casos de uso (operaciones de negocio) y puertos (contratos).

Reglas:
- **Puertos**: interfaces puras (repositorios, servicios). Sin detalles de implementación. Un archivo por interfaz, nombrado `{Entidad}Repository`.
- **Casos de uso**: una clase por operación. Inyección de dependencias por constructor (vía objeto de dependencias, no globals). El método de ejecución retorna entidades de dominio o lanza errores de dominio. Nunca importa DB ni framework directamente. Naming: `{Acción}{Entidad}` (ej. `CreateProduct`, `RegisterStockIn`).
- Los casos de uso se agrupan por entidad/dominio en subcarpetas, no en un único archivo plano.

### 2.3 Capa de Infraestructura
**Propósito**: implementaciones concretas de los puertos, acceso a datos, servicios externos.

Reglas:
- Los repositorios implementan los puertos de aplicación usando el ORM/driver del stack.
- Mapean filas/registros de la fuente de datos a entidades de dominio explícitamente (nunca se expone el tipo del ORM hacia arriba).
- Prefieren `undefined` sobre `null` en los tipos de retorno cuando el stack lo permite.
- La validación de entrada vive aquí (un esquema por concepto de dominio), exportando tanto el esquema como el tipo inferido.
- Un contenedor de inyección de dependencias (factories `make{CasoDeUso}()`) ensambla repositorios + servicios y los entrega listos para usar. Organizado por dominio, no en un archivo monolítico.

### 2.4 Capa de Presentación
**Propósito**: UI, endpoints, controladores, acciones — el punto de entrada del usuario o de otros sistemas.

Reglas:
- Nunca contiene lógica de negocio; solo orquesta: valida entrada → llama al caso de uso vía el contenedor → traduce el resultado/error a una respuesta para el usuario.
- Verificación de sesión/autenticación y de rol/permiso en todo punto de entrada protegido, antes de tocar cualquier dato.
- Los errores de dominio se capturan y se traducen a mensajes entendibles para el usuario final; nunca se filtran stack traces ni mensajes técnicos internos.

## 3. Convenciones de nomenclatura

- Entidades, clases de caso de uso, componentes de UI: PascalCase.
- Funciones y variables: camelCase (o snake_case si el stack lo exige por convención del lenguaje, ej. Python).
- Rutas/endpoints: kebab-case.
- Nombres de negocio (labels de UI, mensajes de error visibles): en el idioma del usuario final del proyecto. Identificadores de código: en inglés, siempre.
- Repositorios: `{Entidad}Repository` (puerto) / `{Entidad}Repository{Tecnología}` (implementación, ej. `ProductRepositoryDrizzle`, `ProductRepositoryPrisma`).
- Casos de uso: `{Acción}{Entidad}` (verbo + sustantivo, ej. `CreateProduct`, `LoginUser`).
- Factories del contenedor: `make{CasoDeUso}()`.

## 4. Código limpio — reglas duras

**Sin strings ni números mágicos**:
- Todo valor de negocio repetido (roles, estados, tipos, límites) se extrae a una constante tipada, no se escribe literal en comparaciones (`=== 'admin'`).
- Rutas/endpoints: constantes centralizadas, nunca strings literales dispersos.
- Los tipos se derivan de las constantes (`typeof CONST[number]`), nunca se duplican a mano.

**Sin colores/valores de diseño hardcodeados**:
- Prohibido escribir `#hex` u otros valores de diseño sueltos en componentes. Deben venir de tokens del sistema de diseño o variables centralizadas.

**Límites de tamaño** (señal para refactorizar, no regla absoluta):
- Funciones: máx. ~40 líneas.
- Componentes de UI: máx. ~150 líneas (extraer subcomponentes).
- Archivos: a partir de ~300 líneas, evaluar dividir.
- Máximo 3 niveles de anidación; preferir *early returns* sobre `if/else` anidado.

**DRY**:
- Un helper utilitario compartido por función (ej. concatenación de clases), no reimplementado en cada archivo.
- Un string/clase repetido ≥3 veces se extrae.
- Bloques de UI casi idénticos se convierten en un componente parametrizado.

**Código muerto**:
- No se deja código comentado ni handlers placeholder (`alert()`, `TODO` sin ticket).
- Eliminar una feature implica eliminar sus casos de uso, puertos, repositorios y dependencias asociadas — no dejar restos.

**Tipado estricto** (en stacks tipados):
- Modo estricto siempre activo.
- Prohibido `any` (o equivalente); usar `unknown` + narrowing o tipos específicos.
- Preferir interfaces para contratos públicos (puertos), tipos para uso interno.

## 5. Seguridad — checklist base

Aplicable a cualquier proyecto con autenticación y datos de usuario:

- [ ] Contraseñas hasheadas con algoritmo moderno (bcrypt/argon2), nunca en texto plano ni con hash débil.
- [ ] Tokens de sesión con expiración explícita.
- [ ] Cookies de sesión `httpOnly` + `secure` en producción.
- [ ] Validación de sesión en el servidor en cada ruta protegida (nunca confiar solo en el estado del cliente).
- [ ] Control de acceso basado en rol/perfil (RBAC), verificado en el servidor, no solo ocultando UI.
- [ ] Validación de toda entrada externa con un validador de esquemas antes de ejecutar lógica de negocio.
- [ ] Queries parametrizadas siempre (ORM o prepared statements) — cero concatenación de SQL.
- [ ] Variables de entorno para todo secreto/credencial; nunca hardcodeadas ni commiteadas. `.env.example` siempre actualizado, `.env*` real en `.gitignore`.
- [ ] Rate limiting en endpoints sensibles (login, recuperación de contraseña).
- [ ] Protección CSRF cuando el framework no la da por defecto.
- [ ] Log de auditoría para operaciones destructivas o sensibles.
- [ ] Acciones destructivas disparadas por un agente de IA requieren confirmación explícita — nunca solo la interpretación del prompt.

## 6. Manejo de errores

- Errores de dominio: clases propias con código, no `Error` genérico ni strings sueltos.
- Los casos de uso lanzan errores de dominio; nunca devuelven `null`/`false` para representar un fallo de negocio.
- La capa de presentación captura errores de dominio conocidos y los traduce a mensajes de usuario; cualquier error no reconocido se trata como error genérico (sin filtrar detalles internos) y se registra para diagnóstico.

## 7. Base de datos

- El esquema vive en un único lugar versionado (ej. `schema.ts`, `models/`), fuente de verdad.
- Toda migración se genera, se revisa manualmente antes de aplicar, y se commitea junto con el cambio de esquema que la origina.
- Nunca se aplican cambios de esquema directo a producción sin pasar por migración versionada.
- Índices únicos para toda restricción de unicidad de negocio (no solo validarla en aplicación).
- Agregaciones (sumas, conteos, agrupaciones) se resuelven en la base de datos, no trayendo filas crudas para agregar en el lenguaje de la aplicación.

## 8. Testing

- Casos de uso: test unitario mockeando los puertos.
- Repositorios: test de integración contra una base de datos de prueba.
- Flujos críticos (login, operaciones de negocio irreversibles): test end-to-end.
- Casos borde obligatorios: valores en cero/negativos, entidades inexistentes, actualizaciones concurrentes.

## 9. Anexos por stack

Este documento es la capa común. Cada stack tecnológico que use Visebit tiene un anexo que traduce estas reglas a convenciones concretas de carpetas, herramientas y ejemplos de código:

- **Next.js + TypeScript + Drizzle** — ver `stacks/nextjs-typescript.md` (basado en `argos` y `expertooh-app`).
- **Medusa v2 + Next.js (monorepo de ecommerce)** — ver `stacks/medusa-nextjs.md`. Anexo **parcial**: las convenciones internas del backend Medusa quedan pendientes hasta que el primer proyecto del stack llegue a producción.
- **Librería TypeScript reutilizable (monorepo pnpm)** — ver `stacks/typescript-libreria.md`. Para los paquetes de capacidad que Visebit reutiliza entre clientes, sin framework. Generaliza las secciones 3 a 5 y 7 de `medusa-nextjs.md` para que no dependan de Medusa; su sección de empaquetado y publicación está marcada como pendiente de respaldo en producción.
- **Astro + Tailwind + Cloudflare Pages (landing / sitio de marketing)** — ver `stacks/astro-landing.md`. Para sitios sin dominio de negocio ni autenticación: landing pages, sitios institucionales, portfolios. Explicita por qué no usa Clean Architecture completa (§1-2 no aplican a un sitio sin estado) y la traduce a contenido tipado + islas de interactividad mínimas. Primer proyecto de referencia: `visebit.cl`.
- *(Próximos anexos se agregan aquí a medida que Visebit trabaje con otros stacks: mobile, Python/backend, etc.)*

## 10. Checklist previo a commit / PR

- [ ] ¿Respeté la separación de capas? (dominio no importa nada de fuera)
- [ ] ¿Hay lógica de negocio filtrada en un componente, acción o repositorio?
- [ ] ¿Usé `any` o equivalentes de escape de tipado?
- [ ] ¿Quedaron strings/números mágicos sin extraer?
- [ ] ¿Validé toda entrada externa antes de ejecutar el caso de uso?
- [ ] ¿Verifiqué sesión y rol en cada ruta/endpoint protegido nuevo?
- [ ] ¿Dejé código muerto, comentado o placeholders?
- [ ] Si expuse esta capacidad también a un agente de IA, ¿converge con el mismo caso de uso que la UI manual?
- [ ] ¿Generé y revisé la migración de base de datos si cambié el esquema?

## 11. Flujo de trabajo

El estándar define *qué* construir bien. El **flujo** define cómo se trabaja el día a día, y vive en las skills del ecosistema: arrancar una tarea (`visebit-start-task`), revisar antes de commitear (`visebit-code-review`), preparar las pruebas manuales (`visebit-test-plan`), explicar el cambio (`visebit-explain-changes`) y describir el PR (`visebit-pr`). Ninguna es obligatoria; la secuencia completa tiene sentido en una tarea de tamaño medio.

Todas leen el **contrato operativo del proyecto**: el bloque `workflow` de `visebit.json`, que declara lo que cambia de un repo a otro —gestor de tickets, rama base, comandos reales, mapa de rutas a capas— para que ninguna skill tenga que adivinarlo. Especificación en `contrato-workflow.md`; el contrato se actualiza en el mismo commit que cambia lo que describe.

Las normas transversales que salen de revisiones reales y no son ni arquitectura ni convención de lenguaje viven en `normas-de-codigo.md`, junto a la skill de revisión. Cuando la misma observación aparece en **dos proyectos distintos**, deja de ser un caso y se agrega ahí como norma del ecosistema.

Guías de onboarding del ecosistema, en `onboarding/`: una para quien se suma a un proyecto y otra para quien crea un repositorio nuevo.

---

**Este documento debe ser leído por cualquier agente de IA (Claude, opencode u otro) antes de generar o modificar código en un proyecto Visebit.**
