-- Migration: 0002_password_reset.sql
-- Añade la tabla PasswordReset para almacenar PINs de recuperación

-- Tipo enumerado para el flag 'used'
DO $$ BEGIN
    CREATE TYPE password_reset_used AS ENUM ('true','false');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "PasswordReset" (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  pin varchar(6) NOT NULL,
  expires_at timestamp NOT NULL,
  used password_reset_used NOT NULL DEFAULT 'false',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_user_id_idx ON "PasswordReset"(user_id);
CREATE INDEX IF NOT EXISTS password_reset_pin_idx ON "PasswordReset"(pin);
CREATE INDEX IF NOT EXISTS password_reset_created_at_idx ON "PasswordReset"(created_at);
