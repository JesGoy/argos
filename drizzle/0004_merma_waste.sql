-- Fase 1.10: Merma (waste).
-- Agrega el valor 'waste' al enum transaction_type y la columna waste_reason a StockTransaction.
--
-- IMPORTANTE: ejecutar MANUALMENTE. `ALTER TYPE ... ADD VALUE` NO puede correr dentro de un
-- bloque de transacción explícito (BEGIN/COMMIT). El editor SQL de Neon ejecuta en autocommit,
-- así que correr ambas sentencias está bien; si usas un cliente que envuelve todo en una
-- transacción, ejecuta la primera sentencia por separado.

ALTER TYPE "transaction_type" ADD VALUE IF NOT EXISTS 'waste';

ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "waste_reason" varchar(50);
