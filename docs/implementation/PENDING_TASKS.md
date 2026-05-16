# Tareas Pendientes — Micro-Store Arch

**Corte:** 2026-05-15 (sesión 3 · turno 7)
**Estado general del proyecto:** Sprints 0-5 completos · PT-001–PT-019 cerradas · Sin tareas activas de alta prioridad

---

## ~~PT-FIX-019 · Calificación explícita de schema `extensions` en funciones de pgcrypto~~ ✅ COMPLETADO 2026-05-15

- Creada `supabase/migrations/00029_fix_crypto_schema.sql` — OR REPLACE de `save_payment_credentials`
  y `get_payment_credentials` con `extensions.pgp_sym_encrypt(...)` y `extensions.pgp_sym_decrypt(...)`.
- REVOKE/GRANT reproducidos explícitamente al final (OR REPLACE vacía permisos preexistentes).
- `save_gateway_credentials_secure` (00028) no requirió cambio — no invoca pgcrypto directamente.
- Smoke test: `docker compose down -v && up` → `db-migrate ExitCode=0` · `00029 CREATE FUNCTION ×2` ✅
  · `db-seed admin@tienda.com` ✅.
- **Verificación funcional pendiente (manual):** abrir `admin.localhost/settings` → guardar
  credenciales de pasarela → DevTools Network: exactamente 1 POST → HTTP 200.

**Bugs anotados (no resolver en esta PT):**
- `wall clock duration warning` en login/change-password/setup-totp — artefacto de Edge Runtime
  local matando isolates post-respuesta. Sin acción requerida.
- Inconsistencia documental: SRS RNF-07 y SDD Capa 4 especifican `pgsodium` pero la
  implementación usa `pgcrypto`. Alinear en documentación en sesión futura (no afecta funcionalidad).

---

### ~~PT-FIX-016 · Restauración de integridad de DB local~~ ✅ COMPLETADO 2026-05-15
- **016a:** Schema ya existía (migraciones habían corrido antes). vendor_whitelist tenía 1 fila.
  Creado admin@tienda.com vía GoTrue Admin API (HTTP 200). Trigger handle_new_user disparó →
  profiles con role=vendor creado. Diagnóstico final: 5/5 ✅.
- **016b:** docker-compose.yml — healthcheck de supabase-db añade `SELECT 1 FROM auth.users`
  (garantiza entrypoint terminado antes de db-migrate). db-migrate añade `set -e` +
  `-v ON_ERROR_STOP=on` (elimina falso positivo service_completed_successfully).
- **Bonus diagnose-admin.sh:** corregidos 2 bugs: `-U postgres`→`-U supabase_admin`,
  y `-d postgres` añadido al helper psql_q (sin esto fallaba silenciosamente).

---

## ~~PT-FIX-018 · 3× POST 500 en manage-payment-gateways (H1–H4)~~ ✅ COMPLETADO 2026-05-15

- **018c:** `.env.example` — añadida `PAYMENT_ENCRYPTION_KEY` con nota de producción.
  `docker-compose.yml` — variable añadida al servicio `supabase-functions`.
- **018a:** `supabase/migrations/00028_save_credentials_with_key.sql` (nuevo) — función
  `save_gateway_credentials_secure` inyecta la clave vía `set_config` transaction-local y llama
  a `save_payment_credentials` en la misma transacción PL/pgSQL. `manage-payment-gateways/index.ts` —
  lee `PAYMENT_ENCRYPTION_KEY` de Deno.env, valida ≥32 chars, llama a la nueva función, y
  reemplaza `throw error` por `throw new Error(error.message)` (H4).
- **018b:** `settings/index.astro` — guardia `_toggling` en `toggleGateway` (H1); `is_enabled`
  hardcodeado eliminado en `saveCredentials` (H2). `products/index.astro` — misma guardia en
  `toggleVisibility` (H1).
- Smoke test: `docker compose down -v && up` → `db-migrate ExitCode=0` · `00028 CREATE FUNCTION` ✅
  · `db-seed admin@tienda.com` ✅.

---

## PRIORIDAD MEDIA — Producción / Operativas (abiertas)

### PT-006 · Configurar variables de entorno de producción en Supabase
- **Contexto:** `ENCRYPTION_KEY`, `RESEND_API_KEY`, `LOGFLARE_API_KEY` y secretos de pasarelas
  no están configurados en el proyecto Supabase de producción (solo en `.env` local).
- **Acción manual:** `supabase secrets set --env-file .env.production` una vez que `.env.production` esté completo.

### PT-009 · Actualizar graphify tras cada sprint / sesión
- **Acción:** Ejecutar `/graphify . --update` al inicio de cada sesión. Hábito operativo — no es cambio de código.

---

## Completadas esta sesión (2026-05-15 sesión 2)

### ~~PT-FIX-017 · `auth.jwt()` + `storage.buckets` + `db-seed` idempotency~~ ✅ COMPLETADO 2026-05-15
- `supabase/migrations/00000b_auth_helpers.sql` (nuevo) — define `auth.jwt()` con `OR REPLACE`
  antes de `00001_initial_schema.sql`. Orden lexicográfico verificado en contenedor.
- `supabase/migrations/00015_storage_hardening.sql` — eliminada columna `public` del INSERT en
  `storage.buckets` (no existe en `supabase/postgres:15.8.1.032`; acceso público via RLS).
- `docker-compose.yml` (db-seed) — reemplazado `grep -c ... || echo "0"` por `grep -q` booleano.
  Bug: `grep -c` con 0 matches producía `EXISTING="0\n0"` → condición siempre false → usuario
  nunca se creaba en arranques limpios.
- Smoke test validado: `docker compose down -v && up` → `db-migrate ExitCode=0` · `db-seed`
  crea admin · `diagnose-admin.sh` 5/5 ✅.

### ~~PT-FIX-015 · Corrección de nombre de contenedor en diagnose-admin.sh~~ ✅ COMPLETADO 2026-05-15
- `scripts/dev/diagnose-admin.sh` — `microstore-postgres` → `microstore-supabase-db` (nombre real
  del compose). Añadida auto-detección fallback: si el nombre canónico no está corriendo, busca
  cualquier contenedor con `*supabase-db*` o `*postgres*` e informa cuál usó. Si no detecta
  ninguno, lista todos los contenedores activos para diagnóstico manual.

### ~~PT-FIX-013 · Script de diagnóstico y recuperación de admin local~~ ✅ COMPLETADO 2026-05-15
- `scripts/dev/diagnose-admin.sh` creado con guard de producción, diagnóstico read-only en 5 secciones
  (auth.users · profiles · vendor_whitelist · rate_limits · totp_secret) y recuperación opt-in
  con flags `--reset-password` (vía GoTrue Admin API Kong `:8000`) y `--reset-totp` (psql directo).
- Limpia rate limits activos automáticamente al resetear contraseña.

### ~~PT-AUDIT-014 · Optimización de requests en vendor-admin (126 → <10)~~ ✅ COMPLETADO 2026-05-15
- `astro.config.mjs` — eliminado `@astrojs/react`, añadido `vite.optimizeDeps.include`
  para `@supabase/supabase-js` y `@micro-store/core`, y `manualChunks` con chunk `vendor-supabase`.
- `package.json` — eliminadas 5 dependencias React sin uso: `@astrojs/react`, `react`,
  `react-dom`, `@types/react`, `@types/react-dom`. Verificado: 0 referencias React en `src/`.
- `npm install` ejecutado — lockfile actualizado, 747 packages, build limpia.
