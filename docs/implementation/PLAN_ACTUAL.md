# PLAN ACTUAL — 2026-05-15 (sesión 3 · turno 6)

**Task ID:** PT-FIX-019  
**Título:** Corrección de schema de pgcrypto en funciones de cifrado de credenciales  
**Estado:** Esperando ACK · Sin código escrito aún  
**Protocolo:** Cascada Estricta  

---

## Objetivo

Hacer que `pgp_sym_encrypt` y `pgp_sym_decrypt` se resuelvan correctamente cuando se llaman
desde una sesión PostgREST, cuyo `search_path` incluye únicamente `public` y no `extensions`.

La solución es calificar explícitamente todas las llamadas a funciones de pgcrypto con el prefijo
`extensions.` — sin tocar el `search_path` a ningún nivel.

---

## Contexto técnico

`pgcrypto` está instalado en el schema `extensions` (verificado: `SELECT nspname FROM pg_extension
WHERE extname = 'pgcrypto'` → `extensions`). PostgREST v12.2.0 establece `search_path = public`
por transacción. Las funciones `SECURITY DEFINER` sin `SET search_path` heredan ese contexto.
Resultado: `pgp_sym_encrypt` y `pgp_sym_decrypt` no se encuentran en runtime vía PostgREST.

**Restricciones de arquitectura (SRS C-01 a C-08):** ninguna es contradicha.  
**SRS C-07:** todas las escrituras siguen pasando por Edge Functions. ✅  
**SDD Capa 4:** la encriptación AES-256 se mantiene; solo se califica el schema. ✅

---

## Funciones afectadas (y sus callers)

| Función DB | Llamada pgcrypto | Caller Edge Function |
|------------|-----------------|----------------------|
| `public.save_payment_credentials` | `pgp_sym_encrypt(text, text, text)` | `manage-payment-gateways` vía `save_gateway_credentials_secure` |
| `public.get_payment_credentials` | `pgp_sym_decrypt(bytea, text)` | `create-order` (pago Hey Banco) |
| `public.save_gateway_credentials_secure` | ninguna directa (llama a `save_payment_credentials`) | — |

`save_gateway_credentials_secure` no requiere cambio porque no invoca pgcrypto directamente;
al corregir `save_payment_credentials`, la cadena queda completa.

---

## Sub-tarea única — PT-FIX-019 (1 archivo)

### Archivos (1):

1. `supabase/migrations/00029_fix_crypto_schema.sql` ← **NUEVO**

### Contenido de la migración

**`save_payment_credentials`** — reemplazar `pgp_sym_encrypt(...)` por `extensions.pgp_sym_encrypt(...)`:

```sql
CREATE OR REPLACE FUNCTION public.save_payment_credentials(
  p_vendor_id UUID,
  p_gateway   payment_gateway,
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
```

**`get_payment_credentials`** — reemplazar `pgp_sym_decrypt(...)` por `extensions.pgp_sym_decrypt(...)`,
conservar exactamente el resto (REVOKE/GRANT, EXCEPTION handler):

```sql
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
  WHERE gateway = p_gateway AND is_enabled = TRUE
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

REVOKE ALL ON FUNCTION public.get_payment_credentials(payment_gateway) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_credentials(payment_gateway) TO service_role;
```

---

## Verificación

```bash
# 1. Aplicar en stack limpio
docker compose down -v && docker compose up -d

# 2. Confirmar migración
docker logs microstore-db-migrate | tail -10
# Esperado: -> 00029_fix_crypto_schema.sql / CREATE FUNCTION (×2) / === Migraciones completadas ===

# 3. Test funcional desde el navegador
#    - Ir a admin.localhost/settings
#    - Guardar credenciales de una pasarela
#    - DevTools → Network: exactamente 1 POST → HTTP 200 (no 500)
```

---

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|-----------|
| `extensions.pgp_sym_encrypt` no existe (imagen con pgcrypto en otro schema) | Baja — verificado en el contenedor actual | Si falla, usar `pg_catalog.pgp_sym_encrypt` o re-verificar con `SELECT pronamespace::regnamespace FROM pg_proc WHERE proname='pgp_sym_encrypt'` |
| Datos cifrados previamente incompatibles con la nueva función | Ninguna — es la misma función, solo cambia la calificación de schema | — |
| `OR REPLACE` no preserva permisos de `get_payment_credentials` | Presente — por eso se repiten explícitamente los REVOKE/GRANT al final | ✅ incluido en el plan |

---

**STOP — esperando ACK antes de escribir PENDING_TASKS.md o cualquier línea de código.**
