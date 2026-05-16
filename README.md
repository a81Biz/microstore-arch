# Micro-Store Arch

E-commerce Jamstack multivendedor. Stack completo en un solo `docker compose up`.

## Inicio rápido

### 1. Prerequisito — hosts (Windows, una sola vez)

Abrir **Bloc de notas como Administrador** y editar `C:\Windows\System32\drivers\etc\hosts`:

```
127.0.0.1  client.localhost
127.0.0.1  admin.localhost
127.0.0.1  api.localhost
```

> En macOS/Linux `*.localhost` resuelve automáticamente. No se necesita editar hosts.

### 2. Variables de entorno

```bash
cp .env.example .env
```

Para desarrollo local los valores por defecto del `.env.example` funcionan sin cambios.  
Los tokens JWT (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) ya están en `docker-compose.yml` como defaults y coinciden con el `JWT_SECRET` por defecto.

### 3. Levantar todo

```bash
docker compose up --build
```

Primera vez tarda ~5–8 min (descarga imágenes Docker, incluyendo el edge runtime). Las siguientes veces arranca en segundos.

---

## URLs de acceso

| URL | Descripción |
|-----|-------------|
| http://localhost | Storefront — catálogo público |
| http://localhost/cart | Storefront — carrito de compras |
| http://client.localhost | Client Hub — panel de cliente (auth, pedidos, checkout) |
| http://admin.localhost | Vendor Admin — panel de vendedor (productos, órdenes, config) |
| http://api.localhost | Supabase API Gateway — todas las APIs (Auth, REST, Realtime, Functions) |
| http://localhost:8000 | Supabase API Gateway (acceso directo, sin nginx) |
| http://localhost:8323 | Supabase Studio — administración de BD y usuarios |
| http://localhost:8025 | Inbucket — servidor de correo local (captura emails de auth) |

---

## Acceso al panel de vendedor (local)

La migración `00026_seed_admin_user.sql` crea automáticamente el usuario administrador al levantar el stack.

**Credenciales iniciales:**

| Campo | Valor |
|-------|-------|
| URL | http://admin.localhost |
| Email | `admin@tienda.com` |
| Contraseña | `Admin1234!` |
| Contraseña | `Admin1234!**` |

**Flujo de primer ingreso** (obligatorio, en este orden):

1. **Ingresar** con las credenciales anteriores.
2. **Cambiar contraseña** — el sistema lo exige antes de continuar (mínimo 12 caracteres, mayúsculas, números y símbolos).
3. **Configurar Google Authenticator** — escanear el QR que aparece e ingresar el código de 6 dígitos.

A partir del segundo ingreso solo se piden email, contraseña nueva y el código TOTP.

> **Producción:** no usar estas credenciales. Crear el usuario desde Supabase Studio → Authentication → Users → Add user, con una contraseña fuerte y distinta.

---

## Seguridad y MFA

### TOTP — Autenticación de dos factores basada en tiempo (RFC 6238)

El panel de vendedor (`vendor-admin`) implementa MFA obligatorio mediante **TOTP** (Time-based One-Time Password, [RFC 6238](https://datatracker.ietf.org/doc/html/rfc6238)). Los códigos de 6 dígitos son válidos durante 30 segundos y se generan a partir de un secret único por usuario combinado con la hora Unix actual. No requieren conexión a internet ni a los servidores del sistema.

El claim `app_metadata.mfa_verified: true` (inmutable para el usuario, solo modificable con `service_role`) es lo que desbloquea el acceso a recursos protegidos mediante RLS. La verificación ocurre en `verify-totp` y en cada llamada a `requireAdminMFA()` del `BaseController`.

### Entorno local — validación sin dispositivo físico

Durante el desarrollo, la librería [`otpauth`](https://www.npmjs.com/package/otpauth) permite generar y verificar tokens TOTP sin un dispositivo físico:

```typescript
import * as OTPAuth from 'otpauth';

// El secret se obtiene del QR que muestra setup-totp en el primer ingreso
const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret) });
const token = totp.generate(); // código válido ahora mismo
```

Para omitir el paso TOTP por completo en desarrollo (útil para scripts o CI):

```bash
# .env — solo en local, NUNCA en producción
DISABLE_TOTP=true
```

Con esta variable activa, `login` no exige TOTP ni para setup ni para verify. Cualquier valor distinto de `"true"` activa el flujo completo.

### Entorno de producción — Google Authenticator

En producción `DISABLE_TOTP` debe estar ausente o ser `false`. Los usuarios deben:

1. Instalar **Google Authenticator** (o cualquier app TOTP compatible: Authy, 1Password, Bitwarden).
2. Escanear el **código QR** que presenta el sistema en el flujo de primer acceso.
3. Introducir el código de 6 dígitos en cada inicio de sesión posterior.

El secret TOTP se almacena cifrado en la columna `totp_secret` de la tabla `profiles`. Nunca se expone fuera del backend.

### Flujo de primer acceso — credenciales de un solo uso

Las credenciales iniciales del vendor (`Admin1234!` en local, o las que el administrador genere en Supabase Studio en producción) son de **un solo uso**. El sistema aplica este orden de forma obligatoria:

```
Login con credenciales → Cambio de contraseña forzado → Configuración TOTP → Acceso completo
```

- **Cambio de contraseña:** se detecta por `profiles.password_changed_at IS NULL`. Hasta que no se completa, todas las rutas del vendor-admin redirigen al formulario de cambio.
- **Setup TOTP:** si `profiles.totp_enabled = false`, el login devuelve `next_step: 'setup_totp'` y el cliente redirige al flujo de QR.
- **Verify TOTP:** si `totp_enabled = true` pero `app_metadata.mfa_verified` no está activo en la sesión actual, el login devuelve `next_step: 'verify_totp'`.

Solo cuando los tres pasos están completos, el token lleva el claim `mfa_verified: true` y las políticas RLS permiten leer y escribir datos de vendor.

### Recuperación de cuenta — protocolo Break-glass

Si un vendor pierde acceso a su app de autenticación (dispositivo perdido, app desinstalada), **no existe bypass en el código**. El reset se hace mediante la CLI de Supabase con credenciales `service_role`, lo que garantiza trazabilidad en los logs de Supabase Auth.

Consulta el procedimiento completo en [`docs/HANDOFF.md` → §4 Protocolo Break-glass](docs/HANDOFF.md).

---

## Comandos de desarrollo

```bash
# Arrancar en background
docker compose up -d

# Ver logs de una app específica
docker compose logs -f storefront
docker compose logs -f client-hub
docker compose logs -f vendor-admin

# Ver logs de las edge functions
docker compose logs -f supabase-functions

# Ver logs de la BD
docker compose logs -f supabase-db

# Reiniciar nginx (recargar routing sin tocar las apps)
docker compose restart nginx

# Borrar todo y volver a empezar (borra la BD y recrea el usuario admin)
docker compose down -v && docker compose up --build

# Ejecutar comandos en la BD
docker compose exec supabase-db psql -U supabase_admin -d postgres
```

### Comandos npm (fuera de Docker)

```bash
# Validación de arquitectura (corre en CI)
bash scripts/check-architecture.sh

# Tests del paquete core
npm run test:core

# Linting y typecheck
npm run lint
npm run typecheck
```

### Obtener código TOTP local (solo desarrollo)

Cuando el stack Docker está corriendo y el flujo de primer acceso está completado
(cambio de contraseña + escaneo del QR), este script genera el código de 6 dígitos actual
sin necesidad de un dispositivo físico:

```bash
npx ts-node scripts/dev/get-local-otp.ts                    # admin@tienda.com (default)
npx ts-node scripts/dev/get-local-otp.ts otro@tienda.com    # otro vendor
```

> El script aborta automáticamente si `SUPABASE_URL` apunta a un proyecto cloud.
> Ver [`scripts/dev/get-local-otp.ts`](scripts/dev/get-local-otp.ts) y
> el protocolo de recuperación completo en [`docs/HANDOFF.md`](docs/HANDOFF.md) §4.

---

## Arquitectura

Monorepo con **npm workspaces** desplegado en Cloudflare Pages + Supabase.

### Apps (`apps/`)

| App | URL local | Framework | Puerto interno |
|-----|-----------|-----------|----------------|
| `storefront` | http://localhost | Astro 5 + Alpine.js | 4321 |
| `client-hub` | http://client.localhost | Astro 5 + React 18 + Alpine.js | 5173 |
| `vendor-admin` | http://admin.localhost | Astro 5 + React 18 + Alpine.js | 5174 |

Todas las apps usan el **patrón Astro + Islands**: Astro para markup estático/SSR, React para islands interactivos pesados, Alpine.js para interactividad ligera.

### Carrito de compras (storefront)

El storefront implementa un carrito persistente basado en **Alpine.js store** (`$store.cart`):

| Característica | Implementación |
|----------------|----------------|
| Persistencia | `localStorage` — sobrevive a recargas de página |
| Límite | 15 SKUs distintas por sesión |
| Cross-origin checkout | Items serializados en `?cart=encodeURIComponent(JSON.stringify(items))` para cruzar de `localhost` a `client.localhost` |
| Páginas | `/cart` (resumen + totales) · drawer lateral (confirmación rápida al añadir) |

El store se registra en `apps/storefront/src/lib/cart/cart-store.ts` y se carga en `BaseLayout.astro` via `document.addEventListener('alpine:init', ...)`. El checkout (`client-hub`) lee `?cart=` con prioridad sobre el flujo legado `?product=`.

### Galería de imágenes de producto (storefront + admin)

Cada producto soporta hasta **10 imágenes** gestionadas via tabla `product_images`:

| Capa | Implementación |
|------|----------------|
| DB | `product_images` (id, product_id FK CASCADE, url, sort_order, alt_text) · migración 00032 |
| API | `manage-products/{id}/images` POST/DELETE — valida max 10, sincroniza `products.image_url` |
| Admin | Modal de producto con galería de thumbnails (upload múltiple, delete individual, max indicator) |
| Storefront detalle | Galería Alpine: tira de miniaturas + imagen principal + lightbox fullscreen (Esc, ← →) |
| Storefront card | Sin cambio — `ProductCard` sigue usando `product.imageUrl` (imagen primaria) |

El campo `products.image_url` se mantiene como imagen primaria (sort_order=0) para compatibilidad con ProductCard, carrito y checkout existentes.

### Flujo del Cliente — Client Hub (`client.localhost`)

Autenticación, checkout, pedidos, perfil y direcciones del cliente final.

**Autenticación:**
- Email + contraseña con `signInWithEmail` / `signUpWithEmail`
- Google OAuth con `signInWithGoogle` (callback en `/auth/callback`)
- Sincronización de carrito post-login: `syncCartOnLogin()` en `auth-client.ts`

**Checkout (un solo paso):**
- Lee carrito desde `localStorage` (cross-origin via `?cart=` desde storefront)
- Si usuario autenticado con direcciones guardadas: selector de radio buttons en paso de envío
- Opción "Guardar esta dirección" crea entrada en `customer_addresses` via `manage-addresses`
- Orden creada via Edge Function `create-order` (sin cambios)

| Tabla | Descripción |
|-------|-------------|
| `customer_addresses` (00033) | Direcciones guardadas del cliente (home/office/other, max 1 predeterminada por trigger) |
| `cart_items` (00034) | Carrito persistente en DB: UPSERT `(user_id, product_id)`, sync desde localStorage al login |

**Edge Functions nuevas:**

| Función | Rol |
|---------|-----|
| `manage-addresses` | CRUD de direcciones: GET / POST / PUT/:id / DELETE/:id / PATCH/:id/default |
| `manage-cart` | Carrito DB: POST /sync (UPSERT desde localStorage), GET, DELETE/:product_id, DELETE (vaciar) |
| `send-delivery-email` | Email "pedido entregado" (Resend); hookeado en `manage-orders.triggerEmail` cuando status→delivered |

**Perfil del cliente (`/profile`):**
- Tres tabs: Datos Personales (nombre, teléfono) · Contraseña (`supabase.auth.updateUser`) · Mis Direcciones
- Gestión completa de direcciones: añadir, editar, eliminar, establecer predeterminada

**Emails transaccionales (Resend):**

| Email | Función | Trigger |
|-------|---------|---------|
| Pedido confirmado | `send-order-email` | `payment-webhook` post-pago |
| Pedido enviado | `send-shipping-email` | `manage-orders.updateTracking` |
| Pedido entregado | `send-delivery-email` | `manage-orders.updateStatus` → status=delivered |

### Paquetes compartidos (`packages/`)

- **`@micro-store/core`** — Interfaces TypeScript, enums (`OrderStatus`, `PaymentGateway`, `UserRole`), schemas Zod y utilidades. Testeado con Vitest.
- **`@micro-store/eslint-config`** — Config ESLint compartida.

### Backend: Supabase self-hosted (docker-compose)

| Servicio | Imagen | Rol |
|---------|--------|-----|
| `supabase-db` | `supabase/postgres:15.8.1.032` | PostgreSQL + migraciones |
| `supabase-auth` | `supabase/gotrue:v2.151.0` | Auth (JWT, signup, MFA) |
| `supabase-rest` | `postgrest/postgrest:v12.2.0` | API REST auto-generada |
| `supabase-realtime` | `supabase/realtime:v2.28.32` | WebSockets reactivos |
| `supabase-functions` | `supabase/edge-runtime:v1.67.4` | Edge Functions (Deno) en /functions/v1 |
| `supabase-kong` | `kong:2.8.1` | API Gateway en :8000 |
| `supabase-studio` | `supabase/studio:2026.04.13-sha-e95f1cc` | UI admin en :8323 |
| `inbucket` | `inbucket/inbucket:3.0.3` | Emails de prueba en :8025 |

### Estados del Pedido (`OrderStatus`)

| Valor DB | Etiqueta UI | Descripción |
|---|---|---|
| `pending` | Pago pendiente | Orden creada, pago no confirmado |
| `paid` | Pago confirmado | Pasarela confirmó el pago; stock reservado |
| `in_production` | Preparando pedido | Equipo reúne y prepara el pedido |
| `packaged` | Empaquetado | Pedido listo para entrega a paquetería |
| `shipped` | Enviado | Entregado a la paquetería |
| `in_transit` | En tránsito | En camino al cliente |
| `delivered` | Entregado | Cliente recibió el paquete |
| `cancelled` | Cancelado | Pedido cancelado |
| `refunded` | Reembolsado | Pago devuelto al cliente |

**TERMINAL_STATUSES** (no admiten cambio de estado ni tracking): `delivered`, `cancelled`, `refunded`.

### Tablas nuevas (PT-ADMIN-032)

| Tabla | Migración | Descripción |
|---|---|---|
| `order_status_history` | 00036 | Audit trail automático de cambios de estado (trigger en `orders.status`) |
| `order_payments` | 00037 | Registro de pago confirmado por orden (gateway, transaction_id, amount_cents) |
| `profiles.name` / `profiles.phone` | 00035 | Nombre y teléfono del cliente, sincronizados desde `auth.users.raw_user_meta_data` |

### Migraciones

Las migraciones en `supabase/migrations/` (archivos `000XX_*.sql`) se aplican automáticamente via el servicio `db-migrate` al levantar el stack. Para reaplicarlas desde cero:

```bash
docker compose down -v && docker compose up --build
```

---

## Reglas de arquitectura (verificadas en CI)

`scripts/check-architecture.sh` bloquea PRs que violen:

1. **Sin HTML en `.ts`** — markup solo en `.astro` o `.tsx`
2. **Sin estilos inline en `.astro`** — usar archivos `.css`
3. **Sin magic strings de estados** — importar siempre de `@micro-store/core`
4. **Sin escrituras directas a Supabase en frontend** — todas las mutaciones pasan por Edge Functions
5. **Pureza del paquete core** — `packages/core` no puede importar de `astro`, `react` o `supabase`

---

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_ANON_KEY` | JWT anon (default funciona en dev) |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT service_role (default funciona en dev) |
| `JWT_SECRET` | Secreto para firmar JWTs (mínimo 32 chars) |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL (default: `supabase123`) |
| `ENCRYPTION_KEY` | Clave AES-256 para credenciales de pago (mínimo 32 chars) |
| `ALLOWED_ORIGINS` | Lista separada por comas de dominios CORS permitidos |
| `RESEND_API_KEY` | API key de Resend para emails transaccionales (pedidos, envíos) |
| `EMAIL_FROM` | Dirección FROM verificada en Resend (ej. `noreply@tienda.com`) |
| `LOGFLARE_API_KEY` | API key de Logflare para logs estructurados en producción |

---

## CI/CD

- **`ci.yml`**: push/PR → check arquitectura → lint → typecheck → tests core → migraciones Supabase
- **`deploy.yml`**: push a `main` → build apps → deploy Cloudflare Pages → deploy Edge Functions

---

© 2026 Alberto Jacinto Martínez Torres
