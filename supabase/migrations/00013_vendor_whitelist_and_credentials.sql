-- Micro-Store Arch: Vendor Whitelist, Policy Cleanup y get_payment_credentials
-- Corrige:
--   1. Vendor role asignado por email hardcodeado → tabla vendor_whitelist configurable
--   2. Policy "Admin with MFA" en 00002 usa auth.jwt()->'amr' (Supabase nativo, nunca verdadero
--      en el flujo TOTP personalizado) → eliminar y dejar solo las policies de app_metadata
--   3. save_payment_credentials usa pgsodium sin guardar nonce → migrar a pgcrypto
--   4. Añade get_payment_credentials para que create-order pueda leer la CLABE real


-- ============================================================
-- 1. Tabla vendor_whitelist — lista de emails autorizados como vendor
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_whitelist (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Migrar el email hardcodeado a la tabla configurable
INSERT INTO vendor_whitelist (email)
VALUES ('admin@tienda.com')
ON CONFLICT DO NOTHING;

ALTER TABLE vendor_whitelist ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede gestionar la whitelist
CREATE POLICY "Service role only" ON vendor_whitelist
  USING (false)
  WITH CHECK (false);

-- ============================================================
-- 2. Actualizar trigger handle_new_user para usar vendor_whitelist
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN EXISTS (SELECT 1 FROM public.vendor_whitelist WHERE email = NEW.email)
        THEN 'vendor'::user_role
      ELSE 'customer'::user_role
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Limpiar policies RLS de 00002 que usan auth.jwt()->'amr'
--    (claim de MFA nativo de Supabase, nunca activo en este flujo TOTP personalizado)
-- ============================================================
DROP POLICY IF EXISTS "Admin with MFA can read all profiles" ON profiles;

-- ============================================================
-- 4. Migrar save_payment_credentials de pgsodium a pgcrypto
--    pgsodium.crypto_secretbox no guarda el nonce → datos no desencriptables.
--    pgp_sym_encrypt (pgcrypto) incluye todo lo necesario para desencriptar
--    en el propio ciphertext.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.save_payment_credentials(
  p_vendor_id UUID,
  p_gateway payment_gateway,
  p_credentials JSONB
)
RETURNS VOID AS $$
DECLARE
  v_key TEXT;
  v_encrypted BYTEA;
BEGIN
  v_key := current_setting('app.settings.encryption_key', true);

  IF v_key IS NULL OR length(v_key) < 32 THEN
    RAISE EXCEPTION 'ENCRYPTION_KEY_NOT_CONFIGURED: La clave de encriptación debe tener al menos 32 caracteres';
  END IF;

  -- pgcrypto integra el IV/nonce en el ciphertext — no se necesita almacenamiento separado
  v_encrypted := pgp_sym_encrypt(
    p_credentials::TEXT,
    v_key,
    'compress-algo=0, cipher-algo=aes256'
  );

  INSERT INTO payment_credentials (
    vendor_id, gateway, is_enabled, credentials_encrypted
  ) VALUES (
    p_vendor_id, p_gateway, TRUE, v_encrypted
  )
  ON CONFLICT (vendor_id, gateway)
  DO UPDATE SET
    credentials_encrypted = v_encrypted,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. Nueva función get_payment_credentials
--    Permite a las edge functions (con service_role) leer las credenciales
--    desencriptadas de un gateway específico.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_payment_credentials(
  p_gateway payment_gateway
)
RETURNS JSONB AS $$
DECLARE
  v_key TEXT;
  v_encrypted BYTEA;
  v_decrypted TEXT;
BEGIN
  v_key := current_setting('app.settings.encryption_key', true);

  IF v_key IS NULL OR length(v_key) < 32 THEN
    RAISE EXCEPTION 'ENCRYPTION_KEY_NOT_CONFIGURED';
  END IF;

  SELECT credentials_encrypted INTO v_encrypted
  FROM payment_credentials
  WHERE gateway = p_gateway
    AND is_enabled = TRUE
  LIMIT 1;

  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  v_decrypted := pgp_sym_decrypt(v_encrypted, v_key);
  RETURN v_decrypted::JSONB;

EXCEPTION WHEN OTHERS THEN
  -- Si el ciphertext es de formato anterior (pgsodium) no podemos desencriptar.
  -- Devolver NULL es seguro: create-order lanzará GATEWAY_NOT_CONFIGURED.
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Solo service_role puede llamar a get_payment_credentials
REVOKE ALL ON FUNCTION public.get_payment_credentials(payment_gateway) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_credentials(payment_gateway) TO service_role;

