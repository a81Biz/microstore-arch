-- Micro-Store Arch: Fix Payment Encryption
-- Elimina el fallback a plaintext en save_payment_credentials.
-- Si pgsodium no está configurado correctamente, la función falla explícitamente
-- en lugar de guardar credenciales sin encriptar silenciosamente.

BEGIN;

CREATE OR REPLACE FUNCTION public.save_payment_credentials(
  p_vendor_id UUID,
  p_gateway payment_gateway,
  p_credentials JSONB
)
RETURNS VOID AS $$
DECLARE
  v_encrypted BYTEA;
  v_key TEXT;
BEGIN
  -- Obtener clave de encriptación — falla explícitamente si no está configurada
  v_key := current_setting('app.encryption_key', false);

  IF v_key IS NULL OR length(v_key) = 0 THEN
    RAISE EXCEPTION 'ENCRYPTION_KEY_NOT_CONFIGURED: app.encryption_key debe estar configurada antes de guardar credenciales de pago';
  END IF;

  -- Encriptar con pgsodium usando clave maestra — sin fallback a plaintext
  v_encrypted := pgsodium.crypto_secretbox(
    p_credentials::TEXT::BYTEA,
    pgsodium.crypto_secretbox_noncegen(),
    v_key::BYTEA
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
  'Guarda credenciales de pasarela encriptadas con pgsodium. '
  'Falla explícitamente si app.encryption_key no está configurada. '
  'No tiene fallback a plaintext — falla ruidosamente para evitar exposición silenciosa.';

COMMIT;
