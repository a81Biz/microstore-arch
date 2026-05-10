-- Micro-Store Arch: Eliminar policy AMR (auth.jwt()->'amr' nunca activo en flujo TOTP personalizado)
DROP POLICY IF EXISTS "Admin with MFA can read all profiles" ON profiles;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
