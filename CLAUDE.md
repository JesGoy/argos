# Argos — Reglas de desarrollo

## Antes de escribir código

Lee, en este orden:

1. `docs/standards/system-prompt-visebit.md` — cómo razonar y decidir como agente de Visebit (cuándo preguntar, postura de seguridad, honestidad técnica). Aplica siempre, en cualquier proyecto.
2. `docs/standards/estandares-desarrollo-visebit.md` — estándar base de Visebit (arquitectura, SOLID, código limpio, seguridad). **No negociable.**
3. `docs/standards/stacks/nextjs-typescript.md` — convenciones concretas de este stack.
4. Este archivo — lo que es propio de Argos y no aplica a otros proyectos.

Si algo de este archivo contradice al estándar base, **manda el estándar base** — y avisa, porque significa que hay que corregir uno de los dos.

Versión del estándar consumida: ver `visebit.json`. Si está desactualizada respecto al ecosistema, revisa el `CHANGELOG.md` del ecosistema antes de sincronizar.

Este archivo es la **única** fuente de reglas propias de Argos. No se reintroducen archivos paralelos por herramienta (`.cursorrules`, `.windsurfrules` y similares): dos fuentes se desincronizan, y la que quede atrás miente con la misma autoridad que la correcta. Cursor lee `AGENTS.md`, que apunta aquí.

## Stack del proyecto

- **Framework**: Next.js 16.1.1 (App Router, Server Actions) sobre React 19.2
- **Lenguaje**: TypeScript 5 (strict), alias `@/*` → `src/*`
- **Base de datos**: PostgreSQL — Neon serverless (`@neondatabase/serverless` 1.0)
- **ORM / acceso a datos**: Drizzle ORM 0.44 + drizzle-kit 0.31
- **Autenticación**: JWT propio con `jose` 6.1 + `bcryptjs` 3.0 (sesión en cookie, sin proveedor externo)
- **Estilos**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Validación**: Zod 4.1 (esquemas en `src/infra/validation/`)
- **Testing**: Vitest 2.1 (tests colocados junto al caso de uso, `*.test.ts`)
- **IA**: Vercel AI SDK 5 (`ai`) con `@ai-sdk/openai` 2
- **Formularios**: react-hook-form 7.68
- **Deploy**: Vercel — cron declarado en `vercel.json` (`/api/cron/retry-dtes`, cada 5 minutos)

## Dominio del proyecto

**Qué hace Argos**: sistema multi-tenant de control de inventario y punto de venta para PyMEs chilenas —food service y retail—, con asistente de IA integrado sobre el propio inventario, emisión de documentos tributarios electrónicos al SII y suscripciones por plan.

**Entidades reales del dominio**: `Organization`, `User`, `Product`, `RecipeComponent`, `Supplier`, `Customer`, `Sale`, `SaleItem`, `StockTransaction`, `Conversation`, `Message`, `Subscription`, `DteConfig`, `DteDocument`.

**Reglas de negocio críticas**:

- **Multi-tenant por `organizationId`.** Toda fila de negocio referencia `Organization` con `onDelete: cascade`. Los identificadores de cara al usuario son únicos **por organización, no globalmente**: `Product.sku` (`product_org_sku_idx`) y `Sale.saleNumber` (`sale_org_number_idx`). Una consulta sin filtro de organización es una fuga entre inquilinos.
- **El stock no se almacena.** `Product` no tiene columna de stock; el stock vigente se calcula sumando `StockTransaction.quantity` (`getCurrentStock` / `getCurrentStockBatch`). Las vistas que lo necesitan usan `ProductWithStock`.
- **"Stock bajo" tiene una sola definición**: `isLowStock(currentStock, reorderPoint)` en `src/core/domain/services/InventoryRules.ts`. No comparar esos campos a mano en otra capa.
- **Dinero en centavos enteros** en todo el dominio (`Product.unitCost`/`sellingPrice`, `Sale.totalAmount`, `SaleItem.unitPrice`/`subtotal`, `Customer.creditLimit`/`currentDebt`). Los formularios capturan unidades mayores y convierten con `toCents` en el borde de validación; las vistas renderizan con `formatMoney` pasando la moneda de la organización (`src/config/money.ts`).
- **Excepción DTE**: el SII exige pesos CLP enteros, sin decimales. `centsToClp` / `splitIva` en `src/core/domain/services/TaxRules.ts` son el **único** punto de conversión centavos→pesos, y ocurre solo al convertir una `Sale` en un `DteDocument`.
- **Productos compuestos**: un `Product` con `isComposite = true` es un producto terminado armado desde sus `RecipeComponent`. Venderlo descuenta el stock de sus ingredientes, no el suyo. Solo aplica a `business_type = 'food_service'`.
- **DTE es opt-in por organización** (`DteConfig.enabled = false` por defecto): hay negocios que ya cumplen por otra vía. `DteDocument` es un **outbox** — una fila por documento pretendido, creada una vez y actualizada en sitio a través de los reintentos, protegida por `idempotencyKey`. El cron de Vercel reintenta los pendientes.
- **La API key del proveedor DTE se guarda cifrada** (`DteConfig.apiKeyEncrypted`, con `DTE_ENCRYPTION_KEY` vía `src/infra/security/ApiKeyCipher.ts`). Nunca en claro, nunca en logs.
- **Límites por plan** (`free` / `pro` / `business`) en `src/core/domain/constants/BillingConstants.ts`, aplicados por `EnforcePlanLimit`. El contador `aiCallsUsedThisPeriod` rota de forma perezosa al leer, cuando `currentPeriodEnd` ya pasó.

**Roles / perfiles de usuario**: `admin`, `warehouse_manager`, `operator`, `viewer` (`userRoleEnum`). Ortogonal al rol, `User.status` es `'active' | 'suspended'`: un usuario suspendido conserva sus datos pero no puede iniciar sesión.

## Esquema vigente (AUTORITATIVO)

Fuente: `src/infra/db/schema.ts`. Cuando el código y los ejemplos de este archivo discrepen, manda esta sección; actualízala en el mismo commit en que cambies el esquema.

**Enums Postgres**: `unit` (pcs, kg, liter, meter, box) · `message_role` (user, assistant, system) · `user_role` (admin, warehouse_manager, operator, viewer) · `payment_method` (cash, card, transfer, mixed) · `sale_status` (pending, completed, cancelled) · `transaction_type` (sale, purchase, adjustment, return, waste) · `business_type` (food_service, retail).

| Tabla | Rol en el dominio | Lo que no se ve en el nombre |
|---|---|---|
| `Organization` | Tenant | `businessType`, `currency` (default CLP), `timezone` (America/Santiago) |
| `User` | Usuarios del sistema | `username`/`email` únicos globalmente; `status` es texto, no enum |
| `Product` | Catálogo | Sin columna de stock. `isComposite`, `defaultSupplierId`; SKU único por organización |
| `RecipeComponent` | BOM / receta | Auto-join sobre `Product`: producto terminado ← ingredientes, con `quantityPerUnit` |
| `Supplier` | Proveedores | `leadTimeDays` (default 7) |
| `Customer` | Clientes | `creditLimit` / `currentDebt` en centavos |
| `Sale` | Venta | `saleNumber` único por organización; `completedAt` separado de `createdAt` |
| `SaleItem` | Línea de venta | Desnormaliza `sku` y `productName` para conservar el histórico |
| `StockTransaction` | Libro mayor de stock | La única fuente del stock. `wasteReason`, `perUnitCost` (solo compras), enlaces opcionales a `Sale` y `Supplier` |
| `Conversation` / `Message` | Chat con la IA | `Message.metadata` es `jsonb` |
| `Subscription` | Plan y uso | 1:1 con `Organization`. Periodo alineado a mes calendario |
| `DteConfig` | Configuración SII por organización | 1:1 con `Organization`. `provider` (openfactura), `environment` (certificacion/produccion), datos del emisor |
| `DteDocument` | Outbox SII | `type` 39 boleta afecta / 41 exenta / 61 nota de crédito. Auto-referencia `referencesDocumentId` (la NC apunta a su boleta). Montos en **pesos enteros**, no centavos |

## Decisiones propias de este proyecto

- **Los enums todavía en evolución se guardan como `text`, no como `pgEnum`** (`User.status`, `Subscription.plan`/`status`, `DteConfig.provider`/`environment`, `DteDocument.status`). Motivo: evitar un paso `ALTER TYPE` en cada migración mientras el conjunto de valores se sigue moviendo. Los conjuntos estables sí son `pgEnum`. El precedente que fijó la regla fue agregar `'waste'` a `transaction_type`.
- **`DteDocument.pdfBase64` vive en una columna `text` de Postgres** (~190 KB por documento, estimación del propio proveedor). Aceptable para el volumen del MVP; mover a object storage es una optimización futura, no un requisito de correctitud.
- **Command services como patrón de paridad de canal**: `ProductCommandService`, `StockCommandService` y `SalesCommandService` existen para que la UI y el asistente de IA ejecuten exactamente la misma operación de negocio, en vez de dos caminos que divergen con el tiempo.
- **`StubBillingProvider` es la implementación vigente de `BillingProvider`**: los cambios de plan se registran en base de datos y no hay pasarela de pago conectada. El puerto está definido para que enchufar una no toque los casos de uso.
- **Se eliminó `.cursorrules`** en el bootstrap del estándar Visebit (2026-08-28). Había derivado a describir un esquema anterior —negaba `Organization`, `Supplier`, `RecipeComponent`, billing y `waste`, que ya existían— y un agente que lo leyera partía de un modelo falso del dominio. Su contenido válido está en este archivo.

## Comandos

```bash
npm run dev              # desarrollo
npm run build            # build de producción
npm run test             # tests (Vitest)
npm run lint             # linting (ESLint 9 + eslint-config-next)
npm run drizzle:generate # generar migración desde schema.ts
npm run drizzle:migrate  # aplicar migraciones
npm run drizzle:studio   # inspeccionar la base
```

No existe script de `typecheck`: la verificación de tipos ocurre dentro de `npm run build`. Si se agrega uno, declararlo también en `workflow.commands` de `visebit.json`.

## Roadmap / no implementado todavía

No asumas que estas piezas existen — no están en el código:

- **Pasarela de pago real**: `BillingProvider` solo tiene `StubBillingProvider`.
- **Recuperación de contraseña**: implementada en la rama `SCRUM-11-Crear-recuperacion-de-contraseña` (forgot/reset password, entidad `PasswordReset`, `NodemailerEmailService`), **sin mergear** a `develop`.
- **Multi-bodega**: no existe entidad `Warehouse`. El stock es único por producto y organización — `warehouse_manager` es un rol, no una bodega.
- **Lotes y caducidad**: `StockTransaction` no registra lote ni fecha de vencimiento.
- **Órdenes de compra formales**: una compra es hoy un `StockTransaction` de tipo `purchase`, sin documento de orden ni recepción parcial.

---

**Este archivo debe ser leído por cualquier agente de IA (Claude Code, opencode, Cursor u otro) antes de generar o modificar código en este repositorio.**
