-- Micro-Store Arch: get_active_payment_methods
CREATE OR REPLACE FUNCTION public.get_active_payment_methods()
RETURNS TABLE (
  gateway payment_gateway,
  is_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
    SELECT pc.gateway, pc.is_enabled
    FROM payment_credentials pc
    WHERE pc.is_enabled = TRUE
    ORDER BY pc.gateway;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
