-- Fase 4.26: Suscripciones (billing).
-- Crea Subscription (1:1 con Organization) y siembra una fila Free por mes en curso
-- para cada organización existente.
-- Ejecutar via `npx drizzle-kit push` (snapshot malformado: no usar generate).

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "organization_id" integer NOT NULL UNIQUE REFERENCES "Organization"("id") ON DELETE cascade,
  "plan" text NOT NULL DEFAULT 'free',
  "status" text NOT NULL DEFAULT 'active',
  "current_period_start" timestamp NOT NULL,
  "current_period_end" timestamp NOT NULL,
  "ai_calls_used_this_period" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "subscription_organization_id_idx" ON "Subscription" ("organization_id");

-- Backfill: cada org sin sub recibe Free, período = mes calendario actual UTC.
INSERT INTO "Subscription" (
  "organization_id", "plan", "status", "current_period_start", "current_period_end"
)
SELECT
  o."id",
  'free',
  'active',
  date_trunc('month', now()),
  (date_trunc('month', now()) + interval '1 month' - interval '1 millisecond')
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "Subscription" s WHERE s."organization_id" = o."id"
);
