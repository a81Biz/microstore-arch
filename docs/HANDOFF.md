# HANDOFF — Micro-Store Arch

**Corte:** 2026-05-16  
**Estado:** Sprints 0-5 completados · PT-001–PT-029 cerradas · Sistema de carrito completo · En preparación para producción  
**Autor:** Generado con análisis Graphify (935 nodos · 1258 aristas · 88 comunidades)

---

## 1. Estado del Proyecto

### Sprints completados

| Sprint | Alcance | Entregable clave |
|--------|---------|-----------------|
| Sprint 0 | Infraestructura y Entorno | Docker Compose local, Supabase dev stack, monorepo npm workspaces |
| Sprint 1 | Autenticación y Perfiles | Login multi-paso, TOTP vendor (Google Authenticator), cambio de contraseña forzado |
| Sprint 2 | Catálogo y Productos | SSG Astro, generación de slugs en BD, CRUD productos con RLS |
| Sprint 3 | Checkout y Pagos | Creación atómica de órdenes, 4 pasarelas (Stripe · PayPal · MercadoPago · HeyBanco) |
| Sprint 4 | Pedidos y Logística | Máquina de estados PL/pgSQL, notificaciones Realtime, tracking y fulfillment |
| Sprint 5 | Despliegue y Cierre | Cloudflare Pages, Logflare observabilidad, smoke tests, CI/CD completo |

**PT-ADMIN-032 (2026-05-16):** Flujo administrativo de pedidos (backoffice) — enum `order_status` extendido a 9 valores (`packaged`, `in_transit` añadidos, migraciones 00035–00037); tabla `order_status_history` con trigger automático de registro en cada cambio de estado; tabla `order_payments` + `confirm_order_payment` RPC actualizado para persistir gateway/transacción/monto; columnas `name`/`phone` en `profiles` + trigger de sync desde `auth.users.raw_user_meta_data`; `manage-orders` enriquecido con historial, cliente completo y pago en detalle; filtro de fecha en listado (RPC ya lo soportaba); vendor-admin orders UI con secciones Cliente, Pago, Historial; timeline de cliente con 7 pasos (incluye Empaquetado y En tránsito); labels y CSS en client-hub para los 9 estados.

**PT-CLIENT-031 (2026-05-16):** Flujo completo del cliente — tabla `customer_addresses` (migración 00033) con RLS y trigger de única-predeterminada; tabla `cart_items` (migración 00034); Edge Functions `manage-addresses` (CRUD de direcciones), `manage-cart` (sync localStorage→DB al login), `send-delivery-email` (email "pedido entregado", hook en `manage-orders`); checkout con selector de direcciones guardadas; perfil con 3 tabs (datos personales, contraseña, mis direcciones); `syncCartOnLogin()` en auth-client.ts disparado desde callback OAuth.

**PT-IMG-030 (2026-05-16):** Galería de imágenes por producto — tabla `product_images` (migración 00032), hasta 10 imágenes por producto, galería Alpine en storefront con lightbox (Esc, ← →), UI admin multi-imagen con upload/delete por thumbnail.

**PT-CART-029 (2026-05-16):** Sistema de carrito completo implementado — Alpine.js store persistente, botón "Agregar" en ProductCard, selector de cantidad en detalle, página `/cart`, drawer lateral, checkout multi-ítem via `?cart=`.

### Auditorías de seguridad

**Ronda 1 — remediada:**
- Webhook HMAC-SHA256 implementado
- Credenciales de pago cifradas con pgcrypto AES-256
- IDOR en pasarelas de pago corregido
- Validación de monto anti-fraude añadida

**Ronda 2 — remediada:**
- C1: Backdoor TOTP `'123456'` eliminado; `verify-totp` reescrito con `otpauth` real
- C2: Inconsistencia `user_metadata` → `app_metadata` para claim `mfa_verified`
- C6: CORS wildcard `*` reemplazado por allowlist vía `ALLOWED_ORIGINS`
- C10: Rate limiting fail-open → fail-closed (lanza 429 en error de BD)

---

## 2. Stack y Arquitectura

### Aplicaciones (Cloudflare Pages)

| App | Framework | Dominio producción | CF Pages project |
|-----|-----------|-------------------|-----------------|
| `storefront` | Astro 5 + Alpine.js | `tienda.com` | `micro-store-storefront` |
| `client-hub` | Astro 5 + React 18 + Alpine.js | `cliente.tienda.com` | `micro-store-client` |
| `vendor-admin` | Astro 5 + React 18 + Alpine.js | `admin.tienda.com` | `micro-store-admin` |

Todas usan el **Astro Islands Pattern**: HTML/SSR con Astro, islas React solo para componentes interactivos.

### Backend (Supabase Edge Functions — Deno)

| Función | Rol |
|---------|-----|
| `login` | Auth multi-paso con TOTP check y rate limiting |
| `change-password` | Forzado en primer ingreso para vendors |
| `setup-totp` / `verify-totp` / `confirm-totp` | Pipeline MFA vendor |
| `create-order` | Creación atómica con `FOR UPDATE` pesimista |
| `manage-orders` | CRUD + estado + tracking |
| `manage-products` | CRUD con RLS vendor |
| `manage-payment-gateways` | Config de credenciales cifradas |
| `payment-webhook` | HMAC-SHA256 + idempotencia |

### Base de datos (PostgreSQL vía Supabase)

- **Migrations:** `supabase/migrations/` (numeradas `00001` → `00026`)
- **RLS:** Habilitado en todas las tablas sensibles. Políticas de vendor validan `app_metadata->>'mfa_verified' = 'true'`
- **Rate limiting:** Tabla `rate_limits` + función `check_rate_limit` (pura SQL, sin Redis)
- **Cifrado:** `pgcrypto` AES-256 para credenciales de pago; `ENCRYPTION_KEY` como GUC

---

## 3. Análisis Graphify — Relación BaseController ↔ Microservicios

> Fuente: `graphify-out/GRAPH_REPORT.md` · Extracción 100% EXTRACTED (confianza 1.0)

### Árbol de herencia BaseController

`BaseController` (abstracta en `supabase/functions/_core/base-controller.ts`) es el hub central de toda la capa de Edge Functions. Cinco controladores heredan de él:

```
BaseController
├── CreateOrderController      (fn_create_order)
├── OrderManagementController  (fn_manage_orders)
├── ProductController          (fn_manage_products)
├── PaymentGatewayController   (fn_manage_payment_gateways)
└── PaymentWebhookController   (fn_payment_webhook)
```

Capacidades centralizadas que hereda cada subclase:
- `authenticateUser()` — valida JWT Bearer, retorna `User`
- `requireAdminMFA()` — exige `role === 'vendor'` + `app_metadata.mfa_verified === true`
- `checkRateLimit()` — fail-closed: error de BD → 429
- `getCorsOrigin()` — allowlist desde `ALLOWED_ORIGINS`, header `Vary: Origin`

> **Nota:** `login/index.ts` es standalone (no hereda BaseController) y tiene su propio `checkLoginRateLimit`. Cualquier cambio de política de rate limiting debe aplicarse en ambos lugares.

### Pipeline MFA vendor (5 funciones independientes)

El grafo detectó que las 5 funciones de auth no se llaman entre sí pero forman un flujo secuencial orquestado desde el cliente:

```
login → (next_step: change_password) → change-password
      → (next_step: setup_totp)      → setup-totp → confirm-totp
      → (next_step: verify_totp)     → verify-totp
      → (next_step: complete)        → sesión activa
```

`app_metadata.mfa_verified = true` es el claim que desbloquea RLS en productos, órdenes y webhooks.

### Infraestructura compartida de Edge Functions

Todas las funciones usan el mismo conjunto de utilidades (`Shared Edge Function Infrastructure`, confianza 0.95):
- `createLogger()` — logging estructurado con Logflare (god node: 16 conexiones)
- `handleError()` — normaliza errores a HTTP responses con status correcto
- `getSupabaseClient()` / `getSupabaseAdmin()` — instancias Supabase (anon vs service_role)

---

## 4. Protocolo Break-glass — Reset MFA sin backdoor

**Cuándo usarlo:** Vendor bloqueado sin acceso a su app de autenticación (dispositivo perdido, etc.)

**Procedimiento oficial** (requiere credenciales `service_role` — deja audit trail):

```bash
# Paso 1 — Identificar el user_id del vendor bloqueado
supabase auth admin list-users --project-ref <ref> | grep <email>

# Paso 2 — Limpiar el claim mfa_verified para forzar re-setup de TOTP
supabase auth admin update-user <user-id> \
  --app-metadata '{"mfa_verified": false}' \
  --project-ref <ref>

# Paso 3 — Verificar que el claim fue actualizado
supabase auth admin get-user <user-id> --project-ref <ref>

# Paso 4 — Comunicar al vendor
# El próximo login detectará totp_enabled=true pero mfa_verified=false
# y pedirá re-configurar TOTP con un nuevo secret
```

**Por qué este procedimiento y no un bypass en código:**
- Un secreto en variable de entorno (`ADMIN_EMERGENCY_SECRET`) es estructuralmente equivalente al backdoor `'123456'` marcado C1 CRÍTICO en la Auditoría 2.
- Este procedimiento requiere credenciales de `service_role` que no están en la app.
- Genera trazabilidad en los logs de Supabase Auth.

**Alternativa de último recurso (reset TOTP completo):**

```bash
# Si el vendor también perdió acceso al email:
supabase db query \
  "UPDATE profiles SET totp_enabled = false, totp_secret = null WHERE id = '<user-id>';" \
  --project-ref <ref>
# El próximo login lo redirigirá a setup_totp desde cero
```

---

## 5. Infraestructura — IDs y Variables de Entorno

### Cloudflare Pages

| App | Project name | Dominio | account_id | zone_id |
|-----|-------------|---------|------------|---------|
| storefront | `micro-store-storefront` | `tienda.com` | `PRODUCTION_ACCOUNT_ID_HERE` | `PRODUCTION_ZONE_ID_HERE` |
| client-hub | `micro-store-client` | `cliente.tienda.com` | `PRODUCTION_ACCOUNT_ID_HERE` | `PRODUCTION_ZONE_ID_HERE` |
| vendor-admin | `micro-store-admin` | `admin.tienda.com` | `PRODUCTION_ACCOUNT_ID_HERE` | `PRODUCTION_ZONE_ID_HERE` |

Obtener valores reales: Cloudflare Dashboard → Account Home (Account ID) · Websites → dominio → Overview (Zone ID).

### Variables de entorno críticas (Supabase Secrets)

```bash
# Supabase (requeridas por todas las Edge Functions)
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Cifrado de credenciales de pago (64 chars hex)
ENCRYPTION_KEY=<64-char-hex>

# Pasarelas de pago
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=<id>
PAYPAL_CLIENT_SECRET=<secret>
PAYPAL_ENV=sandbox  # cambiar a 'production' para cobros reales

# Comunicaciones
RESEND_API_KEY=re_...

# Observabilidad
LOGFLARE_API_KEY=<key>

# CORS (lista separada por comas, sin espacios)
ALLOWED_ORIGINS=https://tienda.com,https://cliente.tienda.com,https://admin.tienda.com

# Solo desarrollo — NUNCA en producción
DISABLE_TOTP=false
```

**Aplicar en producción:**
```bash
supabase secrets set --env-file .env.production --project-ref <ref>
supabase secrets list --project-ref <ref>  # verificar
```

### URLs de producción

```
PUBLIC_STOREFRONT_URL=https://tienda.com
PUBLIC_CLIENT_HUB_URL=https://cliente.tienda.com
PUBLIC_VENDOR_ADMIN_URL=https://admin.tienda.com
```

---

## 6. Accesos y Credenciales

> Las credenciales reales deben transmitirse por canal seguro (1Password, Vault, etc.), nunca en este archivo.

| Servicio | Dónde obtenerlo | Rol necesario |
|---------|----------------|--------------|
| Supabase Dashboard | https://supabase.com/dashboard | `owner` del proyecto |
| Cloudflare Dashboard | https://dash.cloudflare.com | `Super Administrator` |
| Resend | https://resend.com/api-keys | `Full Access` |
| Logflare | https://logflare.app | owner de la source |
| Stripe | https://dashboard.stripe.com/apikeys | Restricted key (webhooks + charges) |
| PayPal | https://developer.paypal.com | App credentials |
| MercadoPago | https://www.mercadopago.com/developers | App credentials |

---

## 7. Galería de Imágenes por Producto (PT-IMG-030)

### Modelo de datos

```
products.image_url   ← imagen primaria (sort_order=0), intacto para ProductCard/cart/checkout
product_images       ← tabla normalizada (hasta 10 por producto)
  id UUID PK
  product_id UUID FK → products(id) ON DELETE CASCADE
  url TEXT NOT NULL
  sort_order INT DEFAULT 0
  alt_text TEXT
  created_at TIMESTAMPTZ
```

Migración: `supabase/migrations/00032_product_images_gallery.sql`

### API de imágenes

| Método | Ruta | Acción |
|--------|------|--------|
| POST | `/manage-products/{id}/images` | Insertar imagen (máx 10); sincroniza `image_url` si es la primera |
| DELETE | `/manage-products/{id}/images/{imageId}` | Eliminar imagen; promueve siguiente como primaria si era `image_url` |
| GET | `/manage-products` | Listado incluye `images: [{id,url,sortOrder,altText}]` |

### Archivos clave

| Archivo | Rol |
|---------|-----|
| `supabase/migrations/00032_product_images_gallery.sql` | Tabla + índice + RLS |
| `supabase/functions/manage-products/index.ts` | Handlers POST/DELETE + routing con pathParts[] |
| `apps/vendor-admin/src/lib/products/product-admin.ts` | `addProductImage`, `deleteProductImage`, `AdminProduct.images[]` |
| `apps/vendor-admin/src/pages/products/index.astro` | Galería en modal: thumbnails, upload, delete |
| `apps/storefront/src/lib/catalog/catalog.ts` | `CatalogProduct.images[]`, query con JOIN |
| `apps/storefront/src/pages/producto/[slug].astro` | `galleryStore()` Alpine: thumbs + main + lightbox |

### Decisiones de diseño

**Tabla separada vs columna array:** Se eligió tabla normalizada (`product_images`) sobre `image_urls TEXT[]`. Los arrays PostgreSQL dificultan `sort_order`, `alt_text` y DELETE directo por imagen. El JOIN es un SELECT simple con índice compuesto.

**`products.image_url` como imagen primaria:** Se mantiene para compatibilidad con ProductCard, cart-store y checkout — ninguno de estos componentes cambia.

**Comunicación entre instancias Alpine:** La galería (`.gallery-wrap`) y el lightbox (`.lightbox-overlay`) son dos nodos `x-data="galleryStore()"` distintos. Síncronizados via `CustomEvent` en `document` (`gallery:open-lightbox`, `gallery:close`, `gallery:set-active`).

**Storage filename:** `uploadProductImage` cambiado de `main.{ext}` (sobreescribía) a `{Date.now()}.{ext}` para soportar múltiples archivos por producto en el mismo bucket.

---

## 8. Arquitectura del Carrito de Compras (PT-CART-029)

### Flujo general

```
ProductCard / [slug].astro
    └─ @click → $store.cart.add(item, qty)
         └─ cart-store.ts (_save → localStorage)
              └─ badge header reactivo (x-show count > 0)
              └─ CartDrawer inline (x-show $store.cart.open)

/cart (cart.astro)
    └─ x-for items → controles qty / remove / subtotal
    └─ "Proceder al pago" → $store.cart._toCheckoutUrl(clientHubUrl)
         └─ ?cart=encodeURIComponent(JSON.stringify(items))

checkout/index.astro (client-hub)
    └─ init() lee ?cart= → JSON.parse → localStorage.setItem
    └─ fallback: ?product= → fetch Supabase (flujo legado)
```

### Archivos clave

| Archivo | Rol |
|---------|-----|
| `apps/storefront/src/lib/cart/cart-store.ts` | Alpine.js store: add/remove/updateQty/clear, getters count/subtotal, _load/_save localStorage, _toCheckoutUrl |
| `apps/storefront/src/layouts/BaseLayout.astro` | Registro del store en alpine:init, ícono + badge header, CartDrawer inline |
| `apps/storefront/src/components/product/ProductCard.astro` | Botón "Agregar" con data-* attributes |
| `apps/storefront/src/pages/producto/[slug].astro` | Selector qty, "Agregar al carrito", "Comprar ahora" |
| `apps/storefront/src/pages/cart.astro` | Página /cart completa con estado vacío/ítems |
| `apps/client-hub/src/pages/checkout/index.astro` | Lectura de ?cart= y ?product= (legado) |

### Decisiones de diseño

**Cross-origin localStorage:** `localhost` (storefront, puerto 4321) y `client.localhost` (client-hub, puerto 5173) son orígenes distintos — no pueden compartir `localStorage`. Solución: serializar el carrito en el parámetro `?cart=encodeURIComponent(JSON.stringify(items))`. `URLSearchParams.get()` auto-decodifica en destino sin necesidad de `atob`.

**data-* vs x-data JSON:** Pasar datos del producto a Alpine via `x-data='{ id: "...", price: ... }'` produce conflictos de quoting cuando los valores tienen comillas. Solución: datos en atributos `data-*` (Astro los HTML-encode; Alpine los lee via `$el.dataset.*`).

**CartDrawer inline:** Importar un componente `CartDrawer.astro` separado hubiera requerido modificar 3 archivos en el mismo turno (violando el límite de 2). Resuelto: HTML del drawer inlineado en `BaseLayout.astro`.

---

## 9. Próximos Pasos Recomendados

### Prioridad media — Producción

| # | Tarea | Acción |
|---|-------|--------|
| PT-004 | IDs reales en `wrangler.toml` | Sustituir `PRODUCTION_ACCOUNT_ID_HERE` / `PRODUCTION_ZONE_ID_HERE` con valores del Dashboard |
| PT-006 | Secrets de producción | Ejecutar `supabase secrets set --env-file .env.production --project-ref <ref>` |
| PT-007 | Tests E2E checkout — casos de fallo | Completar `apps/client-hub/src/__tests__/e2e/checkout-flow.test.ts` (pago rechazado · stock insuficiente · no autenticado) |

### Prioridad baja — Calidad

| # | Tarea | Acción |
|---|-------|--------|
| PT-008 | Smoke test en pipeline | Añadir paso a `.github/workflows/deploy.yml` tras health check: `bash scripts/test/smoke-test.sh` |

### Hábitos operativos

- Ejecutar `/graphify . --update` al inicio de cada sesión de trabajo para mantener el grafo actualizado.
- El grafo en `graphify-out/` reduce el costo de exploración en ~32x. Consultarlo antes de abrir archivos individuales.

---

## 10. Comandos de referencia rápida

```bash
# Desarrollo local
docker compose up --build          # Arrancar todo
docker compose down -v && docker compose up --build  # Reset completo

# Tests
npm run test --workspaces --if-present
node_modules/.bin/vitest run "supabase/functions/**/__tests__/**/*.test.ts"

# Deploy manual (si CI falla)
npx wrangler pages deploy apps/storefront/dist --project-name micro-store-storefront
npx wrangler pages deploy apps/client-hub/dist  --project-name micro-store-client
npx wrangler pages deploy apps/vendor-admin/dist --project-name micro-store-admin
supabase functions deploy --project-ref <ref>
supabase db push --project-ref <ref>

# Observabilidad
supabase functions logs <function-name> --project-ref <ref>
```
