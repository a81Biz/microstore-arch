-- Envolvente transaccional para save_payment_credentials.
-- Inyecta la clave de cifrado vía set_config (transaction-local) antes de llamar
-- a la función original, garantizando que ambas operaciones ocurran en la misma
-- transacción PostgreSQL. El Edge Function pasa la clave desde Deno.env —
-- no se requiere configurar app.settings.encryption_key a nivel global de DB.
CREATE OR REPLACE FUNCTION public.save_gateway_credentials_secure(
  p_vendor_id       UUID,
  p_gateway         payment_gateway,
  p_credentials     JSONB,
  p_encryption_key  TEXT
) RETURNS VOID AS $$
BEGIN
  IF p_encryption_key IS NULL OR length(p_encryption_key) < 32 THEN
    RAISE EXCEPTION 'ENCRYPTION_KEY_INVALID: la clave debe tener al menos 32 caracteres';
  END IF;

  PERFORM set_config('app.settings.encryption_key', p_encryption_key, true);
  PERFORM public.save_payment_credentials(p_vendor_id, p_gateway, p_credentials);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
