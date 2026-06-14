-- Fase 1: Multi-tenancy.
-- Crea la tabla Organization, agrega organization_id a todas las tablas de negocio,
-- hace backfill de las filas existentes a una organización por defecto (id = 1), y
-- cambia la unicidad de SKU y número de venta a "por organización".
--
-- IMPORTANTE: ejecutar este SQL MANUALMENTE (Neon SQL editor o psql). NO usar
-- `drizzle:push` para esta migración: push no puede sembrar la organización por
-- defecto ni hacer el backfill, y fallaría al poner NOT NULL sobre tablas con datos.
-- Es idempotente sólo de forma parcial; ejecutarlo una sola vez sobre la base actual.

-- 1) Enum + tabla Organization
CREATE TYPE "business_type" AS ENUM ('food_service', 'retail');

CREATE TABLE "Organization" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "name" varchar(200) NOT NULL,
  "business_type" "business_type" NOT NULL DEFAULT 'food_service',
  "currency" varchar(3) NOT NULL DEFAULT 'CLP',
  "timezone" varchar(64) NOT NULL DEFAULT 'America/Santiago',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 2) Organización por defecto para las filas existentes (recibe id = 1)
INSERT INTO "Organization" ("name") VALUES ('Mi Negocio');

-- 3) organization_id en cada tabla de negocio:
--    add (nullable) -> backfill a 1 -> NOT NULL -> FK -> índice

-- User
ALTER TABLE "User" ADD COLUMN "organization_id" integer;
UPDATE "User" SET "organization_id" = 1;
ALTER TABLE "User" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_organization_id_Organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE cascade;
CREATE INDEX "user_organization_id_idx" ON "User" ("organization_id");

-- Product
ALTER TABLE "Product" ADD COLUMN "organization_id" integer;
UPDATE "Product" SET "organization_id" = 1;
ALTER TABLE "Product" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "Product" ADD CONSTRAINT "Product_organization_id_Organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE cascade;
CREATE INDEX "product_organization_id_idx" ON "Product" ("organization_id");

-- Customer
ALTER TABLE "Customer" ADD COLUMN "organization_id" integer;
UPDATE "Customer" SET "organization_id" = 1;
ALTER TABLE "Customer" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organization_id_Organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE cascade;
CREATE INDEX "customer_organization_id_idx" ON "Customer" ("organization_id");

-- Conversation
ALTER TABLE "Conversation" ADD COLUMN "organization_id" integer;
UPDATE "Conversation" SET "organization_id" = 1;
ALTER TABLE "Conversation" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_organization_id_Organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE cascade;
CREATE INDEX "conversation_organization_id_idx" ON "Conversation" ("organization_id");

-- Sale
ALTER TABLE "Sale" ADD COLUMN "organization_id" integer;
UPDATE "Sale" SET "organization_id" = 1;
ALTER TABLE "Sale" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_organization_id_Organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE cascade;
CREATE INDEX "sale_organization_id_idx" ON "Sale" ("organization_id");

-- SaleItem
ALTER TABLE "SaleItem" ADD COLUMN "organization_id" integer;
UPDATE "SaleItem" SET "organization_id" = 1;
ALTER TABLE "SaleItem" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_organization_id_Organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE cascade;
CREATE INDEX "sale_item_organization_id_idx" ON "SaleItem" ("organization_id");

-- StockTransaction
ALTER TABLE "StockTransaction" ADD COLUMN "organization_id" integer;
UPDATE "StockTransaction" SET "organization_id" = 1;
ALTER TABLE "StockTransaction" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_organization_id_Organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE cascade;
CREATE INDEX "stock_transaction_organization_id_idx" ON "StockTransaction" ("organization_id");

-- 4) SKU único POR ORGANIZACIÓN (antes era global)
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_sku_unique";
DROP INDEX IF EXISTS "product_sku_idx";
CREATE UNIQUE INDEX "product_org_sku_idx" ON "Product" ("organization_id", "sku");

-- 5) Número de venta único POR ORGANIZACIÓN (antes era global)
ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "Sale_sale_number_unique";
DROP INDEX IF EXISTS "sale_number_idx";
CREATE UNIQUE INDEX "sale_org_number_idx" ON "Sale" ("organization_id", "sale_number");
