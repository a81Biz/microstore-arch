-- Micro-Store Arch: get_payment_credentials (solo service_role)
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
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.get_payment_credentials(payment_gateway) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_credentials(payment_gateway) TO service_role;
