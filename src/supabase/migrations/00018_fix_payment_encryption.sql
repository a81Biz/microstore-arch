-- Micro-Store Arch: Fix Payment Encryption
-- Migra save_payment_credentials de pgsodium a pgcrypto.
-- pgp_sym_encrypt (pgcrypto) incluye IV en el ciphertext — sin almacenamiento externo de nonce.
-- Falla explícitamente si la clave no está configurada — sin fallback a plaintext.


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
    RAISE EXCEPTION 'ENCRYPTION_KEY_NOT_CONFIGURED: app.settings.encryption_key debe tener al menos 32 caracteres';
  END IF;

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
    last_rotated_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.save_payment_credentials IS
  'Guarda credenciales de pasarela encriptadas con pgcrypto (AES-256). '
  'Falla explícitamente si app.settings.encryption_key no está configurada. '
  'No tiene fallback a plaintext.';

