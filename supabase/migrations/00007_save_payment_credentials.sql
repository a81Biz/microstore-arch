-- Micro-Store Arch: save_payment_credentials
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
    RAISE EXCEPTION 'ENCRYPTION_KEY_NOT_CONFIGURED: La clave debe tener al menos 32 caracteres';
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
