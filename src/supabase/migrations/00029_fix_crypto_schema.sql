-- PT-FIX-019: Calificar explícitamente el schema de pgcrypto.
-- pgcrypto se instala en el schema 'extensions' en supabase/postgres:15.x.
-- PostgREST v12 establece search_path = public por transacción; las funciones
-- SECURITY DEFINER heredan ese contexto y no encuentran pgp_sym_encrypt/decrypt.
-- Solución: prefijo extensions. en todas las llamadas a funciones de pgcrypto.

-- 1. save_payment_credentials — cifra credenciales con AES-256
CREATE OR REPLACE FUNCTION public.save_payment_credentials(
  p_vendor_id   UUID,
  p_gateway     payment_gateway,
  p_credentials JSONB
) RETURNS VOID AS $$
DECLARE
  v_key       TEXT;
  v_encrypted BYTEA;
BEGIN
  v_key := current_setting('app.settings.encryption_key', true);

  IF v_key IS NULL OR length(v_key) < 32 THEN
    RAISE EXCEPTION 'ENCRYPTION_KEY_NOT_CONFIGURED: La clave debe tener al menos 32 caracteres';
  END IF;

  v_encrypted := extensions.pgp_sym_encrypt(
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

-- 2. get_payment_credentials — descifra credenciales (solo service_role)
CREATE OR REPLACE FUNCTION public.get_payment_credentials(
  p_gateway payment_gateway
) RETURNS JSONB AS $$
DECLARE
  v_key       TEXT;
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

  v_decrypted := extensions.pgp_sym_decrypt(v_encrypted, v_key);
  RETURN v_decrypted::JSONB;

EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Preservar permisos explícitamente (OR REPLACE no los restaura automáticamente)
REVOKE ALL ON FUNCTION public.get_payment_credentials(payment_gateway) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_credentials(payment_gateway) TO service_role;
