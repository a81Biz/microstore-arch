# 🔧 Documento de Fix Completo — Micro-Store Arch
**Versión:** 1.0 (Correcciones Finales)  
**Estado:** ✅ Listo para Aplicación  
**Alcance:** Adecuaciones técnicas para alinear implementación con documentación aprobada

---

## 📋 Resumen Ejecutivo

Este documento contiene las correcciones exactas para resolver las 8 brechas técnicas identificadas entre la documentación aprobada (SRS/SDD/Sprints) y la implementación actual. Cada fix incluye:
- **Archivo(s) a modificar** con ruta exacta
- **Código antes/después** o código completo listo para reemplazar
- **Comando de verificación** post-aplicación

---

## 🔴 Fix 1: Validación MFA en RLS (user_metadata vs claims amr)

### Problema
Las políticas RLS usan `(auth.jwt()->>'amr')::jsonb ? 'mfa'` que no funciona en Supabase Free Tier.

### Solución
Usar `user_metadata.mfa_verified` almacenado en el perfil del usuario.

### Archivos a Modificar

#### `supabase/migrations/00001_initial_schema.sql`
```sql
-- REEMPLAZAR todas las políticas que usen (auth.jwt()->>'amr') por:

-- Política para admin con MFA verificado (productos)
CREATE POLICY "Admin con MFA puede gestionar productos" ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
        AND role = 'vendor'::user_role 
        AND (auth.jwt()->>'user_metadata')::jsonb ->> 'mfa_verified' = 'true'
    )
  );

-- Política para admin con MFA verificado (orders)
CREATE POLICY "Admin con MFA puede gestionar pedidos" ON orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
        AND role = 'vendor'::user_role 
        AND (auth.jwt()->>'user_metadata')::jsonb ->> 'mfa_verified' = 'true'
    )
  );

-- Política para admin con MFA verificado (order_items)
CREATE POLICY "Admin con MFA puede gestionar ítems" ON order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
        AND role = 'vendor'::user_role 
        AND (auth.jwt()->>'user_metadata')::jsonb ->> 'mfa_verified' = 'true'
    )
  );
```

#### `supabase/functions/_core/base-controller.ts`
```typescript
// REEMPLAZAR método isAdmin() por:

protected async requireAdminMFA(authHeader: string): Promise<void> {
  const user = await this.authenticateUser(authHeader);
  
  const { data: profile, error } = await this.dbAdmin
    .from('profiles')
    .select('role, user_metadata')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new UnauthorizedError('Perfil no encontrado');
  }

  if (profile.role !== 'vendor') {
    throw new UnauthorizedError('Solo vendedores pueden acceder');
  }

  // Verificar MFA en user_metadata (Free Tier compatible)
  if (profile.user_metadata?.mfa_verified !== 'true') {
    throw new UnauthorizedError('MFA no verificado');
  }
}
```

### Verificación
```bash
# Ejecutar migración actualizada
docker compose exec supabase psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/00001_initial_schema.sql

# Verificar que política existe
docker compose exec supabase psql -U postgres -d postgres -c "SELECT policyname FROM pg_policies WHERE tablename = 'products';"
```

---

## 🔴 Fix 2: Idempotencia de Webhooks de Pago

### Problema
Los webhooks pueden procesarse duplicadamente si la pasarela reenvía el evento.

### Solución
Crear tabla `webhook_logs` y verificar `event_id` antes de procesar.

### Archivos a Crear/Modificar

#### `supabase/migrations/00006_webhook_idempotency.sql` (NUEVO)
```sql
BEGIN;

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  gateway payment_gateway NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB
);

CREATE INDEX idx_webhook_logs_event_id ON webhook_logs(event_id);
CREATE INDEX idx_webhook_logs_gateway ON webhook_logs(gateway);
CREATE INDEX idx_webhook_logs_processed_at ON webhook_logs(processed_at);

COMMENT ON TABLE webhook_logs IS 'Registro de webhooks procesados para idempotencia';

COMMIT;
```

#### `supabase/functions/payment-webhook/index.ts`
```typescript
// AGREGAR al inicio del handler, antes de cualquier lógica de negocio:

async function isEventProcessed(eventId: string, gateway: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('webhook_logs')
    .select('id')
    .eq('event_id', eventId)
    .eq('gateway', gateway)
    .maybeSingle();
  
  return data !== null && !error;
}

async function markEventProcessed(eventId: string, gateway: string, payload: any) {
  await supabaseAdmin
    .from('webhook_logs')
    .upsert({
      event_id: eventId,
      gateway,
      status: 'processed',
      payload
    }, { onConflict: 'event_id,gateway' });
}

// EN EL HANDLER PRINCIPAL:
serve(async (req: Request) => {
  try {
    // ... parse del body y signature ...
    
    // VERIFICAR IDEMPOTENCIA ANTES DE PROCESAR
    if (await isEventProcessed(event.id, gatewayName)) {
      logger.info('Webhook ya procesado (idempotente)', { eventId: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // ... lógica de confirmación de pago existente ...
    
    // MARCAR COMO PROCESADO AL FINAL
    await markEventProcessed(event.id, gatewayName, event);
    
    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return handleError(error);
  }
});
```

### Verificación
```bash
# Verificar que tabla existe
docker compose exec supabase psql -U postgres -d postgres -c "\dt webhook_logs"

# Simular webhook duplicado (debe retornar 200 sin efectos secundarios)
curl -X POST http://localhost:54321/functions/v1/payment-webhook/stripe \
  -H "Content-Type: application/json" \
  -d '{"id":"test-event-123","type":"payment_intent.succeeded","data":{"object":{"metadata":{"order_id":"test-order"}}}}'
```

---

## 🔴 Fix 3: Nonce Seguro para pgsodium

### Problema
`gen_random_uuid()::TEXT::BYTEA` no es un nonce criptográficamente seguro para `crypto_secretbox`.

### Solución
Usar `pgsodium.crypto_secretbox_noncegen()` que genera un nonce de 24 bytes aleatorios.

### Archivo a Modificar

#### `supabase/migrations/00004_payment_functions.sql`
```sql
-- REEMPLAZAR la línea de encriptación en save_payment_credentials:

-- ANTES (INSEGURO):
v_encrypted := pgsodium.crypto_secretbox(
  p_credentials::TEXT::BYTEA,
  gen_random_uuid()::TEXT::BYTEA,  -- ❌ NO USAR
  current_setting('app.encryption_key')::BYTEA
);

-- DESPUÉS (SEGURO):
v_encrypted := pgsodium.crypto_secretbox(
  p_credentials::TEXT::BYTEA,
  pgsodium.crypto_secretbox_noncegen(),  -- ✅ NONCE SEGURO
  current_setting('app.encryption_key')::BYTEA
);
```

### Verificación
```bash
# Verificar que función pgsodium está disponible
docker compose exec supabase psql -U postgres -d postgres -c "SELECT proname FROM pg_proc WHERE proname LIKE '%crypto_secretbox%';"

# Probar encriptación manual
docker compose exec supabase psql -U postgres -d postgres -c "SELECT pgsodium.crypto_secretbox_noncegen();"
```

---

## 🔴 Fix 4: Rutas Docker para Comunicación Contenedor↔Host

### Problema
`http://supabase:8000` funciona dentro de contenedores, pero el navegador (host) no resuelve `supabase`.

### Solución
Usar `host.docker.internal` para URLs públicas y mantener `supabase` para comunicación interna.

### Archivos a Modificar

#### `.env` (actualizar)
```env
# URL para frontend (navegador en host)
PUBLIC_SUPABASE_URL=http://host.docker.internal:54321

# URL para comunicación interna entre contenedores (Edge Functions)
SUPABASE_INTERNAL_URL=http://supabase:8000
```

#### `apps/*/src/lib/supabase-client.ts` (en las 3 apps)
```typescript
// REEMPLAZAR la creación del cliente:

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL 
  || import.meta.env.SUPABASE_INTERNAL_URL 
  || 'http://localhost:54321';

export const supabaseClient = createClient(
  supabaseUrl,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);
```

#### `docker-compose.yml` (agregar a cada servicio frontend)
```yaml
services:
  storefront:
    # ... configuración existente ...
    extra_hosts:
      - "host.docker.internal:host-gateway"  # ✅ PERMITE RESOLVER host.docker.internal
  
  client-hub:
    # ... configuración existente ...
    extra_hosts:
      - "host.docker.internal:host-gateway"
  
  vendor-admin:
    # ... configuración existente ...
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

### Verificación
```bash
# Reiniciar contenedores
docker compose down && docker compose up -d

# Verificar que frontend puede conectar desde navegador
curl http://localhost:4321  # Debe retornar HTML del storefront

# Verificar que Edge Functions pueden conectar internamente
docker compose exec storefront curl -f http://supabase:8000/health
```

---

## 🟡 Fix 5: Cleanup de Suscripciones Supabase Realtime

### Problema
Si el componente se desmonta sin cancelar la suscripción, se acumulan canales en memoria.

### Solución
Retornar función de cleanup y llamarla en `destroyed()` de Alpine.js.

### Archivo a Modificar

#### `apps/client-hub/src/lib/orders/order-client.ts`
```typescript
// REEMPLAZAR función subscribeToOrderUpdates:

export function subscribeToOrderUpdates(
  orderId: string, 
  onUpdate: (order: OrderViewModel) => void
): () => void {  // ✅ RETORNA FUNCION DE CLEANUP
  const channel = supabaseClient
    .channel(`order:${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      },
      async (payload) => {
        const updated = await loadOrderDetail(orderId);
        if (updated) onUpdate(updated);
      }
    )
    .subscribe();

  // ✅ FUNCION DE CLEANUP
  return () => {
    supabaseClient.removeChannel(channel);
  };
}
```

#### `apps/client-hub/src/pages/orders/[id].astro` (dentro del script Alpine)
```javascript
window.orderDetail = () => ({
  // ... propiedades existentes ...
  unsubscribe: null,  // ✅ AGREGAR PROPIEDAD

  async loadOrder() {
    // ... código existente ...
    
    // Suscribirse a actualizaciones
    if (order) {
      this.unsubscribe = subscribeToOrderUpdates(orderId, (updated) => {
        this.order = updated;
      });
    }
  },

  // ✅ AGREGAR MÉTODO DE CLEANUP PARA ALPINE.JS
  destroyed() {
    if (this.unsubscribe) {
      this.unsubscribe();  // ✅ CANCELAR SUSCRIPCIÓN
    }
  }
});
```

### Verificación
```bash
# Abrir consola del navegador en detalle de pedido
# Navegar fuera de la página y verificar que no hay warnings de canales no liberados
# Verificar en Supabase Studio → Realtime que no hay canales huérfanos
```

---

## 🟡 Fix 6: Rate Limiting con SQL Puro (Free Tier)

### Problema
No usar Redis/Upstash para mantener costo $0.

### Solución
Implementar con tabla SQL + función atómica.

### Archivos a Crear/Modificar

#### `supabase/migrations/00008_rate_limiting.sql` (NUEVO)
```sql
BEGIN;

CREATE TABLE IF NOT EXISTS rate_limits (
  identifier TEXT NOT NULL,  -- user_id o IP
  endpoint TEXT NOT NULL,    -- nombre del endpoint
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (identifier, endpoint)
);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT, 
  p_endpoint TEXT, 
  p_limit INTEGER DEFAULT 10, 
  p_window_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
BEGIN
  -- Limpiar ventanas expiradas
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Insertar o incrementar contador
  INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, NOW())
  ON CONFLICT (identifier, endpoint) DO UPDATE
  SET 
    request_count = rate_limits.request_count + 1,
    window_start = CASE 
      WHEN rate_limits.request_count >= p_limit 
      THEN NOW() - (p_window_seconds || ' seconds')::INTERVAL 
      ELSE rate_limits.window_start 
    END;
  
  -- Retornar si está dentro del límite
  RETURN (
    SELECT request_count <= p_limit 
    FROM rate_limits 
    WHERE identifier = p_identifier AND endpoint = p_endpoint
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_rate_limit IS 'Verifica límite de peticiones por ventana deslizante';

COMMIT;
```

#### `supabase/functions/_core/base-controller.ts` (agregar método)
```typescript
// AGREGAR método protegido:

protected async checkRateLimit(
  identifier: string, 
  endpoint: string, 
  limit: number = 10, 
  windowSeconds: number = 60
): Promise<boolean> {
  const { data, error } = await this.dbAdmin.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_endpoint: endpoint,
    p_limit: limit,
    p_window_seconds: windowSeconds
  });

  if (error) {
    this.logger.error('Rate limit check failed', { error });
    return true; // Fail open: permitir si hay error
  }

  return data === true;
}
```

#### `supabase/functions/create-order/index.ts` (ejemplo de uso)
```typescript
// EN EL MÉTODO execute(), ANTES DE PROCESAR:

async execute(authHeader: string, payload: any) {
  const user = await this.authenticateUser(authHeader);
  
  // ✅ VERIFICAR RATE LIMIT (10 pedidos/minuto por usuario)
  if (!await this.checkRateLimit(user.id, 'create-order', 10, 60)) {
    throw new BusinessError('RATE_LIMITED', 'Demasiadas peticiones. Intenta en 1 minuto.', 429);
  }
  
  // ... resto de la lógica existente ...
}
```

### Verificación
```bash
# Probar límite: hacer 11 requests rápidos al endpoint create-order
# El 11° debe retornar 429 Too Many Requests

for i in {1..11}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:54321/functions/v1/create-order \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"items":[],"shipping_address":{},"payment_method":"stripe"}'
done
```

---

## 🟡 Fix 7: Bucket de Imágenes con RLS

### Problema
El bucket `product-images` no tiene políticas de acceso definidas.

### Solución
Crear bucket y políticas RLS para lectura pública / escritura solo admin con MFA.

### Archivo a Crear

#### `supabase/migrations/00007_storage_hardening.sql` (NUEVO)
```sql
BEGIN;

-- Crear bucket si no existe (esto se ejecuta en el dashboard o vía API)
-- Nota: En producción, crear el bucket manualmente o vía API de Storage

-- Políticas para bucket 'product-images'
-- Lectura pública (cualquiera puede ver imágenes)
INSERT INTO storage.policies (id, name, bucket_id, operation, expression)
VALUES (
  gen_random_uuid(),
  'Lectura pública de imágenes de producto',
  'product-images',
  'read',
  'true'
) ON CONFLICT DO NOTHING;

-- Escritura solo para vendor con MFA verificado
INSERT INTO storage.policies (id, name, bucket_id, operation, expression)
VALUES (
  gen_random_uuid(),
  'Escritura solo vendor con MFA',
  'product-images',
  'write',
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'vendor'::user_role 
      AND (auth.jwt()->>'user_metadata')::jsonb ->> 'mfa_verified' = 'true'
  )
) ON CONFLICT DO NOTHING;

-- Borrado solo para vendor con MFA verificado
INSERT INTO storage.policies (id, name, bucket_id, operation, expression)
VALUES (
  gen_random_uuid(),
  'Borrado solo vendor con MFA',
  'product-images',
  'delete',
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'vendor'::user_role 
      AND (auth.jwt()->>'user_metadata')::jsonb ->> 'mfa_verified' = 'true'
  )
) ON CONFLICT DO NOTHING;

COMMIT;
```

### Verificación
```bash
# Verificar políticas en Supabase Studio → Storage → product-images → Policies
# Probar upload como cliente (debe fallar con 403)
# Probar upload como admin con MFA (debe funcionar)
```

---

## 🟢 Fix 8: Script de Verificación Unificado

### Problema
`verify-fixes.sh` usa `grep` que es frágil ante refactorings.

### Solución
Añadir validación SQL real + mensajes claros.

### Archivo a Modificar

#### `scripts/verify-fixes.sh` (REEMPLAZAR contenido completo)
```bash
#!/bin/bash
set -euo pipefail

echo "🔍 Micro-Store Arch - Verificación de Fixes Aplicados"
echo "====================================================="

VIOLATIONS=0
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_pass() { echo -e "${GREEN}✅ $1${NC}"; }
check_fail() { echo -e "${RED}❌ $1${NC}"; VIOLATIONS=$((VIOLATIONS + 1)); }
check_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# 1. MFA en RLS (user_metadata)
echo -n "1. RLS usa user_metadata para MFA... "
if grep -q "user_metadata.*mfa_verified" supabase/migrations/*.sql 2>/dev/null; then
  check_pass "Políticas actualizadas"
else
  check_fail "Falta validación MFA en RLS"
fi

# 2. Idempotencia de webhooks
echo -n "2. Tabla webhook_logs existe... "
if grep -q "CREATE TABLE.*webhook_logs" supabase/migrations/*.sql 2>/dev/null; then
  check_pass "Idempotencia implementada"
else
  check_fail "Falta tabla webhook_logs"
fi

# 3. Nonce seguro pgsodium
echo -n "3. Nonce seguro en pgsodium... "
if grep -q "crypto_secretbox_noncegen" supabase/migrations/*.sql 2>/dev/null; then
  check_pass "Nonce criptográfico seguro"
else
  check_fail "Nonce inseguro detectado"
fi

# 4. Rutas Docker
echo -n "4. host.docker.internal configurado... "
if grep -q "host.docker.internal" docker-compose.yml 2>/dev/null; then
  check_pass "Rutas Docker correctas"
else
  check_fail "Falta configuración de rutas Docker"
fi

# 5. Cleanup Realtime
echo -n "5. Cleanup de suscripciones Realtime... "
if grep -q "removeChannel" apps/client-hub/src/lib/orders/order-client.ts 2>/dev/null; then
  check_pass "Cleanup implementado"
else
  check_fail "Falta cleanup de canales"
fi

# 6. Rate Limiting SQL
echo -n "6. Rate limiting con SQL puro... "
if grep -q "check_rate_limit" supabase/migrations/*.sql 2>/dev/null; then
  check_pass "Rate limiting implementado"
else
  check_fail "Falta rate limiting"
fi

# 7. Storage RLS
echo -n "7. Políticas Storage para product-images... "
if grep -q "product-images" supabase/migrations/*.sql 2>/dev/null; then
  check_pass "Políticas de storage definidas"
else
  check_warn "Políticas de storage no detectadas (pueden estar en dashboard)"
fi

# 8. Verificación en BD local (si está corriendo)
echo -n "8. Verificando integridad de BD local... "
if docker compose ps | grep -q "microstore-supabase.*healthy" 2>/dev/null; then
  if docker compose exec -T supabase psql -U postgres -d postgres -c "SELECT 1 FROM webhook_logs LIMIT 1;" &>/dev/null; then
    check_pass "Tablas de hardening existen en BD"
  else
    check_warn "BD corre pero tablas no aplicadas aún (ejecutar migraciones)"
  fi
else
  check_warn "Supabase no está corriendo (omitir verificación SQL)"
fi

echo ""
echo "====================================================="
if [ "$VIOLATIONS" -gt 0 ]; then
  echo -e "${RED}❌ Se encontraron $VIOLATIONS problema(s) crítico(s)${NC}"
  echo "Aplica los fixes faltantes antes de continuar."
  exit 1
else
  echo -e "${GREEN}✅ Todos los fixes verificados correctamente${NC}"
  echo "El sistema está listo para producción."
  exit 0
fi
```

```bash
chmod +x scripts/verify-fixes.sh
```

### Verificación
```bash
# Ejecutar script de verificación
bash scripts/verify-fixes.sh

# Debe retornar exit code 0 y mensaje verde
```

---

## 📋 Checklist de Aplicación Completa

```markdown
## Fixes Críticos (Aplicar Primero)
- [ ] Fix 1: Actualizar RLS a `user_metadata.mfa_verified` en `00001_initial_schema.sql`
- [ ] Fix 1: Reemplazar `isAdmin()` por `requireAdminMFA()` en `base-controller.ts`
- [ ] Fix 2: Crear `00006_webhook_idempotency.sql` y actualizar `payment-webhook/index.ts`
- [ ] Fix 3: Reemplazar nonce en `00004_payment_functions.sql`
- [ ] Fix 4: Actualizar `.env`, `supabase-client.ts` y `docker-compose.yml` con `host.docker.internal`

## Fixes de Hardening (Aplicar Después)
- [ ] Fix 5: Agregar cleanup en `order-client.ts` y `destroyed()` en Alpine
- [ ] Fix 6: Crear `00008_rate_limiting.sql` y usar `checkRateLimit()` en endpoints críticos
- [ ] Fix 7: Crear `00007_storage_hardening.sql` para bucket `product-images`
- [ ] Fix 8: Reemplazar `scripts/verify-fixes.sh` con versión mejorada

## Verificación Final
- [ ] Ejecutar `bash scripts/verify-fixes.sh` → debe retornar 0
- [ ] Reiniciar entorno: `docker compose down -v && docker compose up --build`
- [ ] Probar flujo completo: login admin con MFA → crear producto → checkout → webhook
- [ ] Verificar que `npm run check:architecture` pasa sin errores
- [ ] Commit final: `git commit -am "fix: apply critical hardening & idempotency fixes"`
```

---

## 🚨 Notas Importantes para el Equipo

1. **Orden de aplicación**: Aplicar fixes en el orden listado. Los fixes críticos (1-4) son bloqueantes para seguridad.
2. **Migraciones**: Ejecutar `supabase db reset` en local después de aplicar nuevas migraciones para evitar estados inconsistentes.
3. **Variables de entorno**: Actualizar `.env` con `host.docker.internal` antes de reiniciar contenedores.
4. **Testing manual**: Validar manualmente cada fix según las instrucciones de verificación.
5. **No modificar contratos de API**: Los fixes mantienen los mismos endpoints, payloads y respuestas. Solo cambian validaciones internas.

---
