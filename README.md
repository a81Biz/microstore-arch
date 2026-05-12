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

**Flujo de primer ingreso** (obligatorio, en este orden):

1. **Ingresar** con las credenciales anteriores.
2. **Cambiar contraseña** — el sistema lo exige antes de continuar (mínimo 12 caracteres, mayúsculas, números y símbolos).
3. **Configurar Google Authenticator** — escanear el QR que aparece e ingresar el código de 6 dígitos.

A partir del segundo ingreso solo se piden email, contraseña nueva y el código TOTP.

> **Producción:** no usar estas credenciales. Crear el usuario desde Supabase Studio → Authentication → Users → Add user, con una contraseña fuerte y distinta.

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

---

## CI/CD

- **`ci.yml`**: push/PR → check arquitectura → lint → typecheck → tests core → migraciones Supabase
- **`deploy.yml`**: push a `main` → build apps → deploy Cloudflare Pages → deploy Edge Functions

---

© 2026 Alberto Jacinto Martínez Torres
