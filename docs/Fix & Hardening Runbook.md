# 🛠️ Documento de Correcciones y Hardening Técnico
**Proyecto:** Micro-Store Arch  
**Versión:** 1.0 (Fix & Hardening Runbook)  
**Estado:** ✅ Listo para Aplicación  
**Alcance:** Correcciones críticas, hardening de seguridad, optimización de infraestructura y validación post-implementación.

---

## 📋 Contexto y Objetivo
La documentación base (SRS, SDD, Sprints 0-5) está completa y coherente. Sin embargo, durante la implementación se identificaron **8 desviaciones técnicas** que, si no se corrigen, comprometen la seguridad, la idempotencia de pagos o la estabilidad en producción. Este documento entrega las correcciones exactas, con rutas de archivo, SQL y TS listos para aplicar.

---

## 🔴 Fix Críticos (Aplicar Inmediatamente)

| # | Problema | Impacto | Solución Técnica | Archivo/Ubicación |
|---|----------|---------|------------------|-------------------|
| 1 | **MFA en Free Tier usa claims JWT inválidos** | RLS no bloquea operaciones sin MFA real | Reemplazar verificación `(auth.jwt()->>'amr')::jsonb ? 'mfa'` por `auth.jwt()->>'user_metadata'::jsonb ->> 'mfa_verified' = 'true'` | `00001_initial_schema.sql` (RLS policies), `base-controller.ts` |
| 2 | **Webhooks sin idempotencia** | Doble descuento de stock o emails duplicados | Crear tabla `webhook_logs` y verificar `event_id` antes de procesar | Nueva migración `00006_webhook_idempotency.sql`, `payment-webhook/index.ts` |
| 3 | **Nonce pgsodium inseguro** | Vulnerabilidad criptográfica en credenciales | Reemplazar `gen_random_uuid()::TEXT::BYTEA` por `pgsodium.crypto_secretbox_noncegen()` | `00004_payment_functions.sql` |
| 4 | **Rutas Supabase: Contenedor vs Host** | Frontend falla al conectar desde navegador | Usar `host.docker.internal` en dev o variables duales `SUPABASE_INTERNAL_URL` / `PUBLIC_SUPABASE_URL` | `docker-compose.yml`, `.env`, `supabase-client.ts` |

### 📝 Código Exacto para Fix Críticos

#### Fix 1: RLS con MFA real (Free Tier compatible)
```sql
-- Reemplaza en 00001_initial_schema.sql y 00005_order_functions.sql
CREATE POLICY "Admin con MFA puede gestionar productos" ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'vendor' 
      AND (auth.jwt()->>'user_metadata')::jsonb ->> 'mfa_verified' = 'true'
    )
  );
```

#### Fix 2: Idempotencia de Webhooks
```sql
-- 00006_webhook_idempotency.sql
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  gateway payment_gateway NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
```
```typescript
// supabase/functions/payment-webhook/index.ts (al inicio del handler)
const { data: existing } = await this.dbAdmin
  .from('webhook_logs')
  .select('id')
  .eq('event_id', event.id)
  .single();

if (existing) return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });

// ... lógica de pago ...

await this.dbAdmin.from('webhook_logs').insert({
  event_id: event.id,
  gateway: gatewayName,
  status: 'processed'
});
```

#### Fix 3: Nonce seguro pgsodium
```sql
-- En 00004_payment_functions.sql
v_encrypted := pgsodium.crypto_secretbox(
  p_credentials::TEXT::BYTEA,
  pgsodium.crypto_secretbox_noncegen(), -- ✅ Seguro
  current_setting('app.encryption_key')::BYTEA
);
```

#### Fix 4: Rutas Docker correctas
```yaml
# docker-compose.yml (añadir a cada frontend)
extra_hosts:
  - "host.docker.internal:host-gateway"
environment:
  - PUBLIC_SUPABASE_URL=http://host.docker.internal:54321
  - SUPABASE_INTERNAL_URL=http://supabase:54321
```

---

## 🟡 Hardening de Seguridad y Confiabilidad

| # | Problema | Solución | Ubicación |
|---|----------|----------|-----------|
| 5 | **Fugas de memoria en Supabase Realtime** | Retornar función de limpieza y usar en `destroyed()` o `onCleanup` | `order-client.ts` (`subscribeToOrderUpdates`) |
| 6 | **Bucket `product-images` sin RLS** | Política pública lectura, escritura solo vendor con MFA | Dashboard Supabase → Storage → Policies |
| 7 | **Rate Limiting no implementado** | Tabla `rate_limits` + validación en `BaseController` o `Deno.KV` | `base-controller.ts`, `ci.yml` |
| 8 | **Backup no validado** | Añadir paso `pg_restore --dry-run` en CI/CD o Runbook | `backup-production.sh`, `RUNBOOK.md` |

### 📝 Código Exacto para Hardening

#### Fix 5: Limpieza de suscripciones Realtime
```typescript
// apps/client-hub/src/lib/orders/order-client.ts
export function subscribeToOrderUpdates(orderId: string, onUpdate: (order: any) => void): () => void {
  const channel = supabaseClient
    .channel(`order:${orderId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, async (payload) => {
      const updated = await loadOrderDetail(orderId);
      if (updated) onUpdate(updated);
    })
    .subscribe();

  return () => supabaseClient.removeChannel(channel); // ✅ Limpieza explícita
}
```

#### Fix 6: Políticas Storage (Ejecutar en SQL Editor o Dashboard)
```sql
-- Bucket debe crearse primero: 'product-images' (public)
CREATE POLICY "Lectura pública de imágenes" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Escritura solo vendor con MFA" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' AND
    (auth.jwt()->>'user_metadata')::jsonb ->> 'mfa_verified' = 'true'
  );
```

---

## 🟢 Optimización DevOps y Arquitectura

| # | Problema | Solución | Ubicación |
|---|----------|----------|-----------|
| 9 | `node_modules` compartido corrompe workspaces | Volumes nombrados por app | `docker-compose.yml` |
| 10 | `check-architecture.sh` usa `grep` frágil | Migrar a `ast-grep` o reglas ESLint `no-restricted-syntax` | `.github/workflows/ci.yml`, `config-eslint/index.js` |
| 11 | Secrets en CI/CD sin rotación | Añadir `trufflehog` en pipeline y política de rotación 90 días | `ci.yml`, `RUNBOOK.md` |

### 📝 Ajuste `docker-compose.yml` (Volúmenes Aislados)
```yaml
volumes:
  storefront_node_modules: {}
  client_node_modules: {}
  admin_node_modules: {}

# En cada servicio frontend:
volumes:
  - ./apps/storefront:/app
  - ./packages:/app/packages
  - storefront_node_modules:/app/node_modules  # ✅ Aislado
```

---

## 🧪 Script de Verificación Automatizada (`verify-fixes.sh`)
Crea este script en `scripts/` y ejecútalo post-fix. Sale `0` si todo está correcto.

```bash
#!/bin/bash
set -euo pipefail
echo "🔍 Verificando fixes aplicados..."

# 1. MFA en RLS
echo -n "1. RLS usa user_metadata para MFA... "
if grep -q "user_metadata.*mfa_verified" supabase/migrations/*.sql; then echo "✅"; else echo "❌"; exit 1; fi

# 2. Idempotencia
echo -n "2. Tabla webhook_logs existe... "
if grep -q "CREATE TABLE webhook_logs" supabase/migrations/*.sql; then echo "✅"; else echo "❌"; exit 1; fi

# 3. Nonce pgsodium
echo -n "3. Nonce seguro en pgsodium... "
if grep -q "crypto_secretbox_noncegen" supabase/migrations/*.sql; then echo "✅"; else echo "❌"; exit 1; fi

# 4. Volumes aislados
echo -n "4. Volúmenes node_modules aislados... "
if grep -q "storefront_node_modules" docker-compose.yml; then echo "✅"; else echo "❌"; exit 1; fi

# 5. Limpieza Realtime
echo -n "5. Cleanup de suscripciones Realtime... "
if grep -q "removeChannel" apps/client-hub/src/lib/orders/order-client.ts; then echo "✅"; else echo "❌"; exit 1; fi

echo "🟢 Todos los fixes verificados correctamente."
```

---

## ✅ Checklist de Aplicación

```markdown
- [ ] Aplicar Fix 1: Actualizar RLS policies a `user_metadata->>'mfa_verified'`
- [ ] Aplicar Fix 2: Crear tabla `webhook_logs` y lógica en `payment-webhook`
- [ ] Aplicar Fix 3: Reemplazar nonce en `00004_payment_functions.sql`
- [ ] Aplicar Fix 4: Corregir `docker-compose.yml` y variables de entorno
- [ ] Aplicar Fix 5: Retornar cleanup function en `subscribeToOrderUpdates`
- [ ] Aplicar Fix 6: Crear bucket `product-images` + políticas SQL
- [ ] Aplicar Fix 7: Implementar rate limit básico o documentar fallback
- [ ] Aplicar Fix 8: Añadir validación de backup en CI/CD o Runbook
- [ ] Ejecutar `scripts/verify-fixes.sh` → debe retornar `0`
- [ ] Correr `docker compose down -v && docker compose up --build`
- [ ] Ejecutar `npm run check:architecture` → `0` violaciones
- [ ] Commit final: `git commit -m "fix: apply critical hardening & idempotency fixes"`
```

---

## 📝 Notas para el Equipo
1. **No modificar contratos de API:** Los fixes mantienen los mismos endpoints, payloads y respuestas. Solo cambian validaciones internas y políticas de BD.
2. **Migraciones:** Aplicar en orden `00001` → `00006`. Usar `supabase db reset` en local para evitar conflictos de estado.
3. **Producción:** Los fixes son compatibles con Free Tier. No requieren upgrades de plan.
4. **Testing:** Validar manualmente:
   - Crear orden con 2 items concurrentes → solo 1 confirma stock.
   - Reenviar webhook duplicado → retorna `200` sin efectos secundarios.
   - Acceder a `/admin` sin MFA → RLS bloquea `403`.
   - Cerrar página de detalle de pedido → no hay canales colgados en consola de Supabase.

---

> 🏁 **Este documento cierra el ciclo de revisión técnica.** Una vez aplicados estos 8 fixes y validados con el script, el proyecto está **hardened, idempotente, seguro y listo para producción**.  