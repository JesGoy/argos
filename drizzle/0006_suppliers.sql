-- Fase 3.19: Proveedores y compras.
-- Crea Supplier y agrega supplier_id / per_unit_cost en StockTransaction, y default_supplier_id en Product.
-- Ejecutar MANUALMENTE (o drizzle:push: estas sentencias son seguras sobre datos existentes).

CREATE TABLE IF NOT EXISTS "Supplier" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "organization_id" integer NOT NULL REFERENCES "Organization"("id") ON DELETE cascade,
  "name" varchar(200) NOT NULL,
  "phone" varchar(20),
  "email" varchar(100),
  "lead_time_days" integer NOT NULL DEFAULT 7,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "supplier_organization_id_idx" ON "Supplier" ("organization_id");
CREATE INDEX IF NOT EXISTS "supplier_name_idx" ON "Supplier" ("name");

ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "supplier_id" integer REFERENCES "Supplier"("id") ON DELETE SET NULL;
ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "per_unit_cost" integer;
CREATE INDEX IF NOT EXISTS "stock_transaction_supplier_id_idx" ON "StockTransaction" ("supplier_id");

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "default_supplier_id" integer REFERENCES "Supplier"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "product_default_supplier_id_idx" ON "Product" ("default_supplier_id");
