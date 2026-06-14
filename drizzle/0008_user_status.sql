-- Fase 4 #25: user suspension. Adds an access-state column to User.
-- Existing rows default to 'active'. Apply with `npx drizzle-kit push`.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';
