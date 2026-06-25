-- PT-004: Encrypt TOTP secrets at rest using pgcrypto (same pattern as payment_credentials)
-- Migration is safe in pre-production: nullifies any existing plaintext secrets.
-- Enrolled vendors must re-setup TOTP after this migration.
-- In production with real users, run an out-of-band encryption step before this migration.

-- 1. Add new encrypted column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_secret_enc BYTEA;

-- 2. Nullify existing plaintext secrets (pre-production only — forces re-enrollment)
-- In production: replace this with an encrypted migration using save_totp_secret_secure
UPDATE profiles SET totp_secret_enc = NULL WHERE totp_secret IS NOT NULL;

-- 3. Drop old plaintext TEXT column
ALTER TABLE profiles DROP COLUMN IF EXISTS totp_secret;

-- 4. Rename encrypted column
ALTER TABLE profiles RENAME COLUMN totp_secret_enc TO totp_secret;

-- 5. Save function — encrypts secret via pgp_sym_encrypt (AES-256)
--    Accepts encryption key as parameter (set transaction-locally via set_config,
--    consistent with save_gateway_credentials_secure / migration 00028 pattern).
CREATE OR REPLACE FUNCTION public.save_totp_secret_secure(
  p_user_id       UUID,
  p_secret        TEXT,
  p_encryption_key TEXT
) RETURNS VOID AS $$
DECLARE
  v_encrypted BYTEA;
BEGIN
  IF p_encryption_key IS NULL OR length(p_encryption_key) < 32 THEN
    RAISE EXCEPTION 'ENCRYPTION_KEY_INVALID: la clave debe tener al menos 32 caracteres';
  END IF;

  PERFORM set_config('app.settings.encryption_key', p_encryption_key, true);

  v_encrypted := extensions.pgp_sym_encrypt(
    p_secret,
    p_encryption_key,
    'compress-algo=0, cipher-algo=aes256'
  );

  UPDATE profiles
  SET totp_secret = v_encrypted,
      totp_enabled = FALSE
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Get function — decrypts and returns plaintext BASE32 secret
CREATE OR REPLACE FUNCTION public.get_totp_secret_secure(
  p_user_id        UUID,
  p_encryption_key TEXT
) RETURNS TEXT AS $$
DECLARE
  v_encrypted BYTEA;
BEGIN
  IF p_encryption_key IS NULL OR length(p_encryption_key) < 32 THEN
    RAISE EXCEPTION 'ENCRYPTION_KEY_INVALID';
  END IF;

  SELECT totp_secret INTO v_encrypted FROM profiles WHERE id = p_user_id;

  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN extensions.pgp_sym_decrypt(v_encrypted, p_encryption_key);

EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Lock down permissions (service_role only — same as get_payment_credentials)
REVOKE ALL ON FUNCTION public.save_totp_secret_secure(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_totp_secret_secure(UUID, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.get_totp_secret_secure(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_totp_secret_secure(UUID, TEXT) TO service_role;
