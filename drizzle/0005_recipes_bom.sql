-- Fase 1.12: Recetas / BOM.
-- Marca productos compuestos (con receta) y crea la tabla de componentes de receta.
-- Ejecutar MANUALMENTE (o drizzle:push: estas sentencias son seguras sobre datos existentes).

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "is_composite" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "RecipeComponent" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "organization_id" integer NOT NULL REFERENCES "Organization"("id") ON DELETE cascade,
  "finished_product_id" integer NOT NULL REFERENCES "Product"("id") ON DELETE cascade,
  "ingredient_product_id" integer NOT NULL REFERENCES "Product"("id") ON DELETE restrict,
  "quantity_per_unit" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "recipe_component_finished_idx" ON "RecipeComponent" ("finished_product_id");
CREATE INDEX IF NOT EXISTS "recipe_component_organization_id_idx" ON "RecipeComponent" ("organization_id");
CREATE UNIQUE INDEX IF NOT EXISTS "recipe_component_unique_idx" ON "RecipeComponent" ("finished_product_id", "ingredient_product_id");
