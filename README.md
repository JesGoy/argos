# Argos - Sistema de Control de Inventario

Sistema de gestión de inventario desarrollado con Next.js 16, TypeScript, Drizzle ORM y PostgreSQL (Neon), siguiendo Clean Architecture y principios SOLID.

## 🚀 Configuración Inicial

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar base de datos
Ya tienes configurada tu `DATABASE_URL` en `.env.local`. Las variables de entorno necesarias son:

```env
DATABASE_URL=postgresql://... # Tu conexión a Neon
JWT_SECRET=dev-secret-key-change-this-in-production-min-32-chars
NODE_ENV=development
```

### 3. Crear las tablas en la base de datos
Ejecuta el siguiente comando y **confirma con 'y'** cuando te lo pida:

```bash
npm run drizzle:push
```

Este comando creará:
- Enum `unit` (pcs, kg, liter, meter, box)
- Tabla `Product` con todos sus campos
- Índices para SKU, categoría y nombre

### 4. Iniciar el servidor de desarrollo
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Arquitectura del Proyecto

El proyecto sigue **Clean Architecture** con las siguientes capas:

### 🔷 Domain Layer (`src/core/domain/`)
Lógica de negocio pura, sin dependencias externas.
- **Entities**: `Product.ts` - Estructura de datos del producto
- **Errors**: `ProductErrors.ts` - Errores específicos del dominio

### 🔷 Application Layer (`src/core/application/`)
Casos de uso y contratos (interfaces).
- **Ports**: `ProductRepository.ts` - Interfaz del repositorio
- **Use Cases**: 
  - `CreateProduct.ts` - Crear producto
  - `GetProducts.ts` - Obtener lista de productos
  - `GetProductById.ts` - Obtener producto por ID
  - `UpdateProduct.ts` - Actualizar producto
  - `DeleteProduct.ts` - Eliminar producto

### 🔷 Infrastructure Layer (`src/infra/`)
Implementaciones concretas y servicios externos.
- **Repositories**: `ProductRepositoryDrizzle.ts` - Implementación con Drizzle ORM
- **DB**: Schema y cliente de base de datos
- **Validation**: Schemas de Zod para validación de datos
- **Container**: Factories para inyección de dependencias

### 🔷 Presentation Layer (`src/app/`)
UI con Next.js App Router.
- **Pages**: Server Components para renderizado
- **Actions**: Server Actions para mutaciones
- **Components**: Componentes de cliente para interactividad

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar producción
npm run start

# Linting
npm run lint

# Drizzle ORM
npm run drizzle:generate  # Generar migraciones
npm run drizzle:push      # Aplicar schema directamente
npm run drizzle:studio    # Abrir Drizzle Studio
```

## 📦 CRUD de Productos

### Entidad Product
```typescript
interface Product {
  id: string;
  sku: string;              // Código único (A-Z0-9-)
  name: string;             // Nombre del producto
  description?: string;     // Descripción opcional
  category: string;         // Categoría
  unit: 'pcs' | 'kg' | 'liter' | 'meter' | 'box';
  minStock: number;         // Stock mínimo
  reorderPoint: number;     // Punto de reorden
  createdAt: Date;
  updatedAt: Date;
}
```

### Reglas de Negocio
- ✅ SKU único (validado a nivel DB y aplicación)
- ✅ SKU solo acepta mayúsculas, números y guiones
- ✅ Stock mínimo y punto de reorden no pueden ser negativos
- ✅ Validación de campos con Zod antes de ejecutar casos de uso
- ✅ Errores de dominio personalizados

### Rutas de la UI
- `/products` - Listado de productos con búsqueda y filtros
- Formularios modales para crear/editar/eliminar productos

## 🏗️ Próximos Pasos

Una vez que la base de datos esté creada, podrás:

1. **Acceder a la UI de productos** en `/products`
2. **Crear productos** con el botón "Nuevo Producto"
3. **Buscar y filtrar** productos por nombre, SKU o categoría
4. **Editar/Eliminar** productos con los botones de acción

## 🔐 Seguridad

- Validación de entrada con Zod
- SQL injection prevenido por Drizzle ORM (queries parametrizadas)
- Índices únicos a nivel de base de datos
- TypeScript estricto habilitado

## 📚 Tecnologías

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript (strict mode)
- **Base de Datos**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Validación**: Zod
- **Estilos**: Tailwind CSS v4

## 🎯 Principios SOLID Aplicados

1. **Single Responsibility**: Cada clase/módulo tiene una única responsabilidad
2. **Open/Closed**: Casos de uso dependen de interfaces, no implementaciones
3. **Liskov Substitution**: Repositorios intercambiables
4. **Interface Segregation**: Interfaces pequeñas y enfocadas
5. **Dependency Inversion**: Dependencias de abstracciones, no concreciones

---

**Nota**: Consulta el archivo `.cursorrules` para las reglas de desarrollo completas.

## Learn More about Next.js

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

