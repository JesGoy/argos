-- Fase 0: precio y costo en Product (centavos enteros) + eliminar columna de stock fantasma.
-- El stock vigente se deriva de StockTransaction (getCurrentStock/getCurrentStockBatch),
-- por lo que current_stock dejaba de tener sentido como columna almacenada.
--
-- NOTA: drizzle/meta/0001_snapshot.json está malformado (problema preexistente), por lo que
-- `drizzle:generate` no puede diferenciar. Aplicar con `npm run drizzle:push` (compara schema.ts
-- contra la base directamente) o ejecutar este SQL manualmente.

ALTER TABLE "Product" ADD COLUMN "unit_cost" integer DEFAULT 0 NOT NULL;
ALTER TABLE "Product" ADD COLUMN "selling_price" integer DEFAULT 0 NOT NULL;
ALTER TABLE "Product" DROP COLUMN "current_stock";
