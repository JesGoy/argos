# Anexo de Stack — Next.js + TypeScript + Drizzle

**Aplica sobre**: `estandares-desarrollo-visebit.md` (léelo primero — este documento solo traduce esas reglas a este stack).
**Basado en**: patrones ya validados en producción en `argos` y `expertooh-app`.

## Stack de referencia

- **Framework**: Next.js (App Router)
- **Lenguaje**: TypeScript, modo `strict`
- **Base de datos**: PostgreSQL (Neon serverless u otro proveedor)
- **ORM**: Drizzle ORM
- **Auth**: JWT (`jose`) + gestión de sesión propia vía cookie `httpOnly`
- **Estilos**: Tailwind CSS (v3 o v4 según proyecto)
- **Validación**: Zod
- **Hashing**: bcryptjs

Estas son las herramientas por defecto para nuevos proyectos Next.js de Visebit. Un proyecto puede justificar una variación (otro ORM, otro validador), pero la estructura de capas de abajo no es negociable.

## Estructura de carpetas

```
src/
  core/
    domain/
      entities/        # Entidades del dominio (Product.ts, User.ts, ...)
      errors/           # Errores de dominio (ProductErrors.ts, AuthErrors.ts, ...)
      constants/        # Constantes de dominio tipadas (roles, estados, ...)
    application/
      ports/            # Interfaces de repositorios/servicios ({Entidad}Repository.ts)
      usecases/         # Casos de uso, agrupados por entidad en subcarpetas
  infra/
    repositories/       # Implementaciones Drizzle de los puertos (*RepositoryDrizzle.ts)
    db/
      client.ts         # Conexión a la base de datos
      schema.ts         # Esquema Drizzle (fuente de verdad)
    security/            # Hash, JWT, sesión
    validation/          # Esquemas Zod (uno por concepto de dominio)
    container/           # Factories de inyección de dependencias, organizados por dominio
  lib/
    utils.ts             # Helpers genéricos (ej. cn()) — una sola fuente
    routes.ts             # Constantes de rutas (ROUTES, API_ROUTES)
  styles/
    theme.ts              # Tokens de tema (fuente de las variables CSS)
  app/
    (auth)/                # Rutas públicas de autenticación
    (dashboard)/ o (protected)/   # Rutas protegidas
    api/                    # Route handlers
  components/
    ui/                     # Primitivos presentacionales
```

## Reglas por capa

### Dominio (`src/core/domain/`)
- Cero imports desde `infra`, `app` o cualquier librería de framework.
- Entidades como `interface`/`type` de TypeScript, simples y enfocadas en estructura de datos.
- Errores de dominio extienden `Error`, con `name` descriptivo y, cuando aplique, un código.

```typescript
// ✅ Bien
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
}

export class ProductNotFoundError extends Error {
  constructor(productId: string) {
    super(`Producto no encontrado: ${productId}`);
    this.name = 'ProductNotFoundError';
  }
}

// ❌ Mal — importar de infra en el dominio
import { productTable } from '@/infra/db/schema';
```

### Aplicación (`src/core/application/`)
- **Puertos**: interfaces puras, un archivo por entidad, naming `{Entidad}Repository.ts`.
- **Casos de uso**: una clase por operación, inyección de dependencias por constructor vía objeto `deps`, naming `{Acción}{Entidad}.ts`.

```typescript
// ✅ Bien — Puerto
export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  create(product: Omit<Product, 'id'>): Promise<Product>;
}

// ✅ Bien — Caso de uso
export class CreateProduct {
  constructor(private readonly deps: { products: ProductRepository }) {}

  async execute(input: CreateProductInput): Promise<Product> {
    const existing = await this.deps.products.findBySku(input.sku);
    if (existing) throw new DuplicateSkuError(input.sku);
    return this.deps.products.create(input);
  }
}

// ❌ Mal — importar la DB directo en el caso de uso
import { db } from '@/infra/db/client';
```

### Infraestructura (`src/infra/`)
- Repositorios: implementan el puerto, naming `{Entidad}RepositoryDrizzle.ts`, mapean fila → entidad de dominio explícitamente.
- `?? undefined` en vez de `|| null` para campos opcionales.
- Condiciones de `where` tipadas como `SQL[]` (nunca `any[]`).
- Validación: un archivo Zod por concepto, exportando esquema + tipo inferido (`z.infer<...>`).
- Contenedor: factories `make{CasoDeUso}()`, agrupadas por dominio en `container/{dominio}.ts`.

```typescript
// ✅ Bien
export class ProductRepositoryDrizzle implements ProductRepository {
  async findById(id: string): Promise<Product | null> {
    const db = getDb();
    const rows = await db.select().from(productTable).where(eq(productTable.id, Number(id))).limit(1);
    const row = rows[0];
    if (!row) return null;
    return { id: String(row.id), sku: row.sku, name: row.name, category: row.category };
  }
}

export function makeCreateProduct() {
  return new CreateProduct({ products: new ProductRepositoryDrizzle() });
}
```

### Presentación (`src/app/`, `src/components/`)
- **Server Actions** (`actions.ts`): siempre `'use server';` al inicio; validan con Zod; llaman al caso de uso vía factory del contenedor; capturan errores de dominio y devuelven `{ error?: string; success?: boolean; data?: T }`; usan `redirect()`/`revalidatePath()` tras mutaciones.
- **Pages**: Server Components por defecto; obtienen sesión y redirigen si no existe; llaman casos de uso vía contenedor; pasan datos como props a Client Components.
- **Client Components**: `'use client';` solo para interactividad; sin lógica de negocio — esa vive en los casos de uso.

```typescript
// ✅ Bien — Server Action
'use server';
export async function createProductAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session) redirect(ROUTES.LOGIN);

  const parsed = createProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const product = await makeCreateProduct().execute(parsed.data);
    revalidatePath(ROUTES.PRODUCTS);
    return { success: true, data: product };
  } catch (err) {
    if (err instanceof DuplicateSkuError) return { error: err.message };
    return { error: 'Error al crear producto' };
  }
}
```

## Base de datos (Drizzle)

- Esquema único en `src/infra/db/schema.ts`.
- `pgTable`/`pgEnum` para tablas y enums; nombre de variable en PascalCase (`productTable`), nombre SQL sin el sufijo `Table` (`'Product'`).
- Foreign keys explícitas con `onDelete` definido.
- `index()`/`uniqueIndex()` para toda restricción de unicidad o búsqueda frecuente.
- `createdAt`/`updatedAt` en toda tabla auditable.
- Flujo de migración: editar `schema.ts` → `drizzle-kit generate` → revisar SQL generado → `drizzle-kit push`/`migrate` → commitear schema + migración juntos.
- Nunca URLs de base de datos hardcodeadas; siempre `process.env.DATABASE_URL`.

## Sesión y autenticación

Flujo estándar:
1. Formulario de login → Server Action → valida con Zod → llama caso de uso `LoginUser`.
2. El caso de uso verifica credenciales vía `UserRepository` + `HashService`.
3. Éxito → `createSession({...})` genera JWT.
4. JWT en cookie `httpOnly`, `secure` en producción.
5. Rutas protegidas llaman `getSession()` para verificar el JWT y obtener los datos de sesión.

Control de acceso por rol/perfil: **siempre desde constantes tipadas** (`USER_ROLES`, `USER_ROLE.ADMIN`), nunca strings literales (`'admin'`) sueltos en páginas, acciones o componentes.

## Estilos y UI

- Tokens de tema en `src/styles/theme.ts`, inyectados como variables CSS en el layout raíz — fuente única de verdad para colores de marca.
- Prohibido `#hex` literal en componentes; usar tokens de Tailwind o las variables CSS.
- Mobile-first (`sm:`, `md:`, `lg:`).
- Un helper `cn()` único en `src/lib/utils.ts`.

## TypeScript y linting

- `strict: true` en `tsconfig.json`.
- Prohibido `any`; usar `unknown` + narrowing o tipos específicos.
- Interfaces para contratos públicos (puertos), `type` para uso interno.
- ESLint: config de Next.js + regla `no-explicit-any`.

## Errores comunes a evitar

- Importar `infra` desde el dominio.
- Lógica de negocio en repositorios o en componentes (esa lógica va en el caso de uso).
- `any` para "salir del paso".
- Retornar `null` en vez de `undefined` en repositorios nuevos.
- Exportar helpers desde un archivo `'use server'`.
- Omitir la verificación de sesión en una ruta protegida nueva.
- Olvidar `revalidatePath()`/`redirect()` tras una mutación.
- Registrar tools/funciones de un agente de IA que llaman repositorios directo en vez de pasar por el caso de uso compartido con la UI manual (ver principio de "paridad de canal" del estándar general).

## Checklist de arranque de un proyecto nuevo con este stack

- [ ] `tsconfig.json` en modo `strict`.
- [ ] Estructura de carpetas `core/domain`, `core/application`, `infra`, `app` creada desde el día uno.
- [ ] `schema.ts` como única fuente de verdad de la base de datos.
- [ ] `.env.example` versionado, `.env.local` en `.gitignore`.
- [ ] Contenedor de DI (`container/`) desde el primer caso de uso, no como refactor posterior.
- [ ] Sesión JWT + cookie `httpOnly` configurada antes de escribir la primera ruta protegida.
