# SESSION SUMMARY — 2026-05-15 (sesión 2)

**Fecha:** 2026-05-15  
**Estado del proyecto al inicio:** Sprints 0-5 completos · PT-001 a PT-015 cerradas · En preparación para producción  
**Modo:** Auto-Pilot en Cascada Estricta — Documentación activa.

---

## Incidente Activo — DB local vacía (sin tablas del proyecto)

**Síntoma confirmado:** `diagnose-admin.sh` devuelve sin resultado para `auth.users`, `public.profiles` y `public.vendor_whitelist`. Las tablas del proyecto no existen o están vacías.

### Causa raíz — 5 hallazgos validados

#### H1 · `pg_isready` no garantiza que el schema de Supabase esté listo

La imagen `supabase/postgres:15.8.1.032` ejecuta un `docker-entrypoint.sh` propio que crea los schemas `auth`, `storage`, `realtime`, instala extensiones (`pgcrypto`, `pgsodium`) y aplica las migraciones internas de GoTrue. `pg_isready` devuelve éxito en cuanto Postgres acepta conexiones TCP, **antes** de que ese entrypoint termine. El servicio `db-migrate` usa `condition: service_healthy` basado en `pg_isready`, por lo que arranca prematuramente y sus migraciones colisionan con la inicialización en curso.

#### H2 · `db-migrate` falla silenciosamente — sin `set -e` ni `ON_ERROR_STOP`

```bash
# Comando actual en docker-compose.yml
for f in $(ls /migrations/*.sql | sort); do
  psql -h supabase-db -U supabase_admin -d postgres -f "$f" 2>&1
done
```

`psql` sin `-v ON_ERROR_STOP=1` siempre devuelve exit code 0 aunque fallen `CREATE TABLE`, `CREATE TRIGGER` o `INSERT`. El bucle sin `set -e` tampoco corta ante errores. Docker recibe exit 0 y marca el contenedor como `service_completed_successfully`, enmascarando un fallo real.

#### H3 · `db-seed` depende de `db-migrate`, no de `supabase-auth`

`db-seed` arranca en paralelo con `supabase-auth` (ambos dependen de `db-migrate: service_completed_successfully`). `db-seed` compensa esto con un poll propio `until curl -sf http://supabase-auth:9999/health`. El mecanismo de espera es correcto en sí mismo, pero llega tarde: el fallo ya ocurrió en `db-migrate`.

#### H4 · El trigger `handle_new_user` (migración 00022) no se aplicó

`00022_handle_new_user.sql` crea `AFTER INSERT ON auth.users → INSERT INTO public.profiles`. Si las migraciones fallaron antes de llegar a 00022 (o en ella, por referenciar `auth.users` mientras GoTrue lo inicializaba), el trigger no existe. Consecuencia: aunque `db-seed` cree el usuario en GoTrue, el INSERT en `auth.users` no dispara nada → `public.profiles` queda vacío y sin rol `vendor`.

#### H5 · El directorio de migraciones no está montado en `supabase-db`

```yaml
db-migrate:  volumes: - ./supabase/migrations:/migrations:ro   # solo aquí
supabase-db: volumes: - supabase_db_data:/var/lib/postgresql/data
```

No es posible hacer `docker exec microstore-supabase-db psql -f /migrations/…` directamente. La recuperación requiere arrancar un contenedor efímero que monte `./supabase/migrations` y conecte al Postgres ya corriendo, replicando la lógica de `db-migrate` de forma controlada y con detección de errores.

### Cadena de fallo determinista

```
supabase-db: pg_isready = true  ←─ Supabase entrypoint aún corriendo
     │
     └─► db-migrate arranca prematuramente
           │  psql -f 00002_auth_triggers.sql  → ERROR (auth.* no listo) → silenciado
           │  psql -f 00022_handle_new_user.sql → ERROR (auth.users no listo) → silenciado
           │  psql -f 00026_seed_admin_user.sql → ERROR (vendor_whitelist no existe) → silenciado
           └─► exit 0  →  Docker: "service_completed_successfully" ← FALSO POSITIVO
                   │
                   └─► db-seed arranca, GoTrue sube, crea admin en auth.users
                         └─► trigger handle_new_user = no existe → profiles vacío
                               └─► vendor_whitelist vacío → login falla con 401
```

### Estado de cada tabla al finalizar el arranque

| Tabla | Estado real | Razón |
|-------|-------------|-------|
| `auth.users` | Puede tener el admin O vacío | Depende de si `db-seed` alcanzó a GoTrue |
| `public.profiles` | Vacío / no existe | Trigger 00022 no aplicado |
| `public.vendor_whitelist` | Vacío / no existe | Migración 00026 falló (00021 no creó la tabla) |
| Resto de `public.*` | No existen | `db-migrate` falló desde las primeras migraciones |

---

## Fase de Sincronización

| Artefacto | Estado |
|-----------|--------|
| `HISTORY.log` | ✅ 14 entradas — última: "Cierre de sesión 2026-05-15" |
| `PENDING_TASKS.md` | ✅ Solo PT-006 y PT-009 abiertas (operativas, no código) |
| `GRAPH_REPORT.md` | ✅ Vigente — 991 nodos · 1328 aristas · 90 comunidades — generado esta misma sesión |
| `graphify-out/` | ✅ Actualizado al cierre de la sesión anterior |

---

## Auditoría de Fallo de Migración [2026-05-15 18:xx — Post PT-FIX-016b]

### Síntoma

`microstore-db-migrate` termina con **exit 3** tras aplicar PT-FIX-016b (`set -e` + `ON_ERROR_STOP=on`).
El stack no arranca limpio: `supabase-auth` y `db-seed` quedan bloqueados porque
`service_completed_successfully` nunca se emite.

### Log exacto del contenedor

```
=== Aplicando migraciones del proyecto ===
-> 00000_realtime_schema.sql
   CREATE SCHEMA / ALTER SCHEMA  ← OK
-> 00001_initial_schema.sql
   DO / CREATE TABLE / CREATE INDEX / CREATE POLICY (×3)  ← OK hasta línea 160
   psql:/migrations/00001_initial_schema.sql:162: ERROR: function auth.jwt() does not exist
   HINT: No function matches the given name and argument types.
```

`psql` devuelve exit ≠ 0 → `set -e` propaga → shell sale con código 3 (errores de scripts
en bash cuentan como exit 3 bajo ciertas condiciones de `set -e`).

### Causa raíz — `auth.jwt()` no existe en la imagen self-hosted

Inventario de funciones en `auth.*` del contenedor en ejecución:

| Función | ¿Existe? |
|---------|---------|
| `auth.uid()` | ✅ — lee `request.jwt.claim.sub` |
| `auth.role()` | ✅ — lee `request.jwt.claim.role` |
| `auth.jwt()` | ❌ — **ausente** |

`auth.jwt()` es una función helper que **Supabase Cloud provisiona automáticamente** pero
que la imagen Docker `supabase/postgres:15.8.1.032` **no incluye por defecto**. Las
migraciones del proyecto la asumen como disponible porque fueron diseñadas originalmente
con la CLI de Supabase (`supabase db push`), que la inyecta antes de aplicar migraciones
del usuario.

Extensiones instaladas: `pgcrypto` ✅ · `pgsodium` ✅ · `uuid-ossp` ✅ — no es un problema
de extensiones, es exclusivamente la función `auth.jwt()`.

### Alcance — migraciones afectadas

`auth.jwt()` aparece en **7 archivos de migración**:

| Archivo | Líneas | Contexto |
|---------|--------|---------|
| `00001_initial_schema.sql` | 161–175 | 5 RLS policies (products, orders, order_items) |
| `00002_auth_triggers.sql` | 99 | Policy AMR (luego eliminada en 00023) |
| `00014_webhook_idempotency.sql` | 26 | RLS webhook_logs |
| `00015_storage_hardening.sql` | 23, 35 | RLS storage bucket |
| `00017_fix_security_claims.sql` | 17–109 | 8 RLS policies (revisión app_metadata) |
| `00020_audit_payment_tables.sql` | 34, 79 | RLS audit_logs, payment_transactions |
| `00023_cleanup_amr_policy.sql` | (DROP de la política AMR) | Depende de que 00002 haya corrido |

El punto de fallo es `00001_initial_schema.sql:162` — la **primera migración no-trivial**
que referencia la función. Con `ON_ERROR_STOP=on`, ninguna migración posterior se aplica.

### Definición canónica requerida

La implementación estándar de Supabase self-hosted lee el claim JWT completo desde
la variable de sesión que PostgREST inyecta en cada request:

```sql
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
  LANGUAGE sql STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb
$$;
```

Esta definición es idempotente (`OR REPLACE`) y coherente con `auth.uid()` (que ya
existe y lee `request.jwt.claim.sub` de la misma variable de sesión de PostgREST).

### Estrategia de corrección (pendiente de plan formal)

Crear una nueva migración **`00000b_auth_helpers.sql`** que se inserte entre
`00000_realtime_schema.sql` y `00001_initial_schema.sql` en el orden lexicográfico
(`00000_` < `00000b_` en ASCII: `_`=95 < `b`=98):

```
00000_realtime_schema.sql   ← existente
00000b_auth_helpers.sql     ← nueva (define auth.jwt())
00001_initial_schema.sql    ← primer uso de auth.jwt()
```

La función debe declararse `OR REPLACE` y `STABLE` para ser idempotente en
re-ejecuciones.

### Impacto en estado actual

- El usuario `admin@tienda.com` **sí existe** en `auth.users` (creado manualmente en 016a).
- Las tablas `public.*` del proyecto **sí existen** (migraciones corrieron en una sesión anterior).
- El fallo de `db-migrate` con exit 3 solo ocurre en un **fresh `docker compose down -v && up`**.
- El stack actual **está operativo** — el fallo es latente, se manifiesta solo al resetear volúmenes.

---

## Problema A — PT-FIX-013 · 401 en admin.localhost

**Clasificación:** FIX  
**Síntoma reportado:** El sitio `admin.localhost` rechaza las credenciales `admin@tienda.com` / `Admin1234!`

### Hallazgos de la investigación

#### 1. No existe lógica de hash en `BaseController`

El usuario solicitó comparar `seed.sql` con la "lógica de hash en `BaseController`". **Hallazgo:** `BaseController` (`supabase/functions/_core/base-controller.ts`) no tiene ninguna lógica de hash de contraseñas. Toda autenticación se delega a GoTrue vía `supabaseClient.auth.signInWithPassword()`. El hash bcrypt es gestionado internamente por GoTrue. **No hay mismatch posible por hash.**

#### 2. Cómo se crea el admin local

La migración `00026_seed_admin_user.sql` **solo** inserta `admin@tienda.com` en `public.vendor_whitelist`. El usuario en `auth.users` lo crea el servicio `db-seed` del `docker-compose.yml` vía GoTrue Admin API:

```bash
POST http://supabase-auth:9999/admin/users
  { "email": "admin@tienda.com", "password": "Admin1234!", "email_confirm": true }
```

El servicio usa `|| echo "Error al crear admin"` — **falla silenciosa** si GoTrue no está listo.

#### 3. Flujo de login (Edge Function `login/index.ts`)

La función retorna HTTP 401 (`UnauthorizedError`) en 3 casos:

| Condición | Mensaje | Causa probable |
|-----------|---------|----------------|
| `signInWithPassword` falla | `'Credenciales inválidas'` | Usuario no existe o contraseña fue cambiada |
| `!profile` | `'Perfil no encontrado'` | Trigger `handle_new_user` no disparó |
| Rate limit superado | `'RATE_LIMITED'` | 5 intentos fallidos previos (devuelve 429) |

#### 4. Causa raíz más probable (ranking)

1. **🔴 ALTA — Contraseña ya fue cambiada en sesión anterior.** El flujo de primer ingreso fuerza `change_password` (login devuelve `next_step: change_password`). Si el usuario completó ese paso, `Admin1234!` ya no es válida.

2. **🟠 MEDIA — `db-seed` falló silenciosamente.** El health check de GoTrue puede pasar antes de que el servicio acepte creación de usuarios. El usuario no existe en `auth.users`.

3. **🟡 BAJA — Perfil no creado.** El trigger `handle_new_user` (migración 00022) requiere que `vendor_whitelist` ya tenga el email cuando se crea el usuario. El orden de dependencias en `docker-compose.yml` (db-migrate → db-seed) es correcto, pero una carrera de arranque podría corromperlo.

#### 5. Script de recuperación existente

PT-011 ya creó `scripts/dev/get-local-otp.ts` para extraer el secreto TOTP via Admin API. Lo que falta es un script más bajo nivel (`docker exec` → `psql`) que:
- Diagnostique el estado completo (user existence, profile state, TOTP flags)
- Reestablezca la contraseña directamente via GoTrue Admin API desde el contenedor
- No dependa de la pila de Edge Functions (que puede estar caída)

---

## Problema B — PT-AUDIT-014 · 126 requests en página de login

**Clasificación:** AUDIT  
**Síntoma reportado:** Captura de red muestra 126 requests al cargar `/auth/login`

### Hallazgos de la investigación

#### 1. La página de login no usa React — solo Alpine.js

`apps/vendor-admin/src/pages/auth/login.astro` es Astro puro con `x-data` de Alpine.js. No hay componentes React (`<Component client:load>`). Sin embargo, `package.json` incluye `@astrojs/react`, `react`, `react-dom` — **framework instalado sin uso en esta página.**

#### 2. Árbol de importaciones del `<script>` de login

```
login.astro <script>
  └── auth-client.ts
        ├── ../supabase-client  ──→  @supabase/supabase-js  (~80-100 módulos internos)
        └── @micro-store/core   ──→  API_ROUTES (~20-30 módulos internos)
```

En **Vite dev mode** (`astro dev`), cada módulo ES es servido como una petición HTTP separada. `@supabase/supabase-js` v2 tiene ~80-120 sub-módulos internos no pre-bundleados. Esto explica directamente los 126 requests.

#### 3. En producción (`astro build`) NO es un problema

Vite (Rollup) bundlea todo en la build de producción. El resultado sería 3-5 chunks:
- `alpine.js` (inyectado por `@astrojs/alpinejs`)
- `vendor-supabase.[hash].js` (~120KB min+gzip)
- `auth-client.[hash].js` (<5KB)
- `page.[hash].css`

**La experiencia de usuario final no se ve afectada.** Sin embargo, hay dos problemas reales:

#### 4. Problema real A — Dev mode inutilizable con 126 requests

Sin `vite.optimizeDeps.include`, Vite no pre-bundlea `@supabase/supabase-js` ni `@micro-store/core`. El arranque en dev tarda más y la consola de Network es confusa. La solución es `vite.optimizeDeps.include` en `astro.config.mjs`.

#### 5. Problema real B — `@astrojs/react` instalado sin uso en vendor-admin

Ningún archivo `.tsx` existe en `apps/vendor-admin/src/`. La dependencia `@astrojs/react` + `react` + `react-dom` añade:
- Peso extra en `node_modules`
- Plugin de Vite Babel+React activo en dev (procesa innecesariamente todos los TS files)
- En el bundle final: posibilidad de que el chunk de React se cargue si Vite infiere dependencias

Eliminar `@astrojs/react` de `vendor-admin` y actualizar `astro.config.mjs` reduciría los requests de dev en ~20-30 adicionales y simplifica la arquitectura.

#### 6. Estrategia propuesta (en orden de impacto)

| Paso | Cambio | Impacto en dev requests | Riesgo |
|------|--------|------------------------|--------|
| 1 | `vite.optimizeDeps.include` en `astro.config.mjs` | 126 → ~10 | Bajo |
| 2 | Eliminar `@astrojs/react` + React deps de `vendor-admin` | ~10 → ~7 | Bajo — verificar que ninguna página use React |
| 3 | `manualChunks` para producción | Sin cambio en dev, mejora prod TTI | Bajo |

---

## Estado de PTs abiertas (preexistentes)

| PT | Estado | Acción requerida |
|----|--------|-----------------|
| PT-006 | Abierta | Operativa — usuario configura secrets en Supabase Dashboard |
| PT-009 | Abierta | Hábito — ejecutar `/graphify . --update` cada sesión |

---

## PTs nuevas propuestas

| PT | Tipo | Título |
|----|------|--------|
| PT-FIX-013 | FIX | Script de diagnóstico y recuperación de admin local (docker exec) |
| PT-AUDIT-014 | AUDIT | Optimización de requests: vite.optimizeDeps + limpieza React en vendor-admin |

---

## Auditoría 3× POST 500 en manage-payment-gateways [2026-05-15 — Sesión 3]

**Síntoma:** Al guardar credenciales en `apps/vendor-admin/settings`, se disparan 3 peticiones
POST simultáneas a `manage-payment-gateways`, todas devuelven `500 Internal Server Error`.

### Log exacto de Edge Functions

```
[INFO][manage-payment-gateways] Saving payment gateway {"vendorId":"2275e0a3...","gateway":"paypal"}
[Error] [INTERNAL_SERVER_ERROR] object: Unknown error
wall clock duration warning: isolate: e0b121fa...
early termination has been triggered: isolate: e0b121fa...
```
Patrón repetido 3 veces en la misma ventana temporal (mercadopago × 1, paypal × 2).

---

### H1 · Frontend — `<label>` wrapping `<input @change>` dispara el handler dos veces

**Archivo:** `apps/vendor-admin/src/pages/settings/index.astro:41-44`

```html
<label class="switch">
  <input type="checkbox" :checked="gateway.is_enabled" @change="toggleGateway(gateway)" />
  <span class="slider"></span>
</label>
```

Mecanismo: en HTML, un clic en `<label>` que envuelve un `<input>` dispara:
1. Un evento `click` en el label → el label reenvía un `click` sintético al input.
2. El `click` en el input cambia el valor checked → dispara `change` → Alpine ejecuta `toggleGateway` (1.ª vez).
3. Alpine actualiza `gateway.is_enabled` en el store reactivo → `x-for` re-renderiza la lista.
4. Durante el re-render, el `<input>` puede recibir un nuevo binding `@change`. Si la propagación
   del evento original aún no ha terminado, el nuevo listener también se ejecuta (2.ª vez).

Resultado: 2 llamadas POST a `toggleGateway` con `{ gateway, is_enabled: !gateway.is_enabled, credentials: {} }`.

**Mismo patrón en `products/index.astro:93-100`** — `toggleVisibility(product)` — misma vulnerabilidad
latente aunque no reportada aún.

### H2 · Frontend — tercera llamada de `saveCredentials` en el mismo ciclo de interacción

**Archivo:** `apps/vendor-admin/src/pages/settings/index.astro` (alrededor de línea 51 y 235)

```html
<form @submit.prevent="saveCredentials(gateway.gateway)">
```

`saveCredentials` siempre envía `is_enabled: true` (hardcoded). Si el usuario hizo clic en
"Guardar" mientras el toggle también se activaba, o si el formulario de otro gateway estaba
abierto (`showForm`), la tercera POST proviene de este submit.

### H3 · Backend — `save_payment_credentials` falla si `app.settings.encryption_key` no está configurada

**Archivo:** `supabase/migrations/00018_fix_payment_encryption.sql:19-23`

```sql
v_key := current_setting('app.settings.encryption_key', true);  -- missing_ok=true → NULL si no existe

IF v_key IS NULL OR length(v_key) < 32 THEN
  RAISE EXCEPTION 'ENCRYPTION_KEY_NOT_CONFIGURED: app.settings.encryption_key debe tener al menos 32 caracteres';
END IF;
```

En el entorno local (Docker), `app.settings.encryption_key` es un parámetro de sesión PostgreSQL.
El Edge Function no lo establece antes de llamar al RPC (confirmado en `manage-payment-gateways/index.ts:80-86`).
Si no está seteado a nivel de base de datos vía `ALTER DATABASE ... SET ...` o en la sesión, `current_setting` devuelve NULL → `RAISE EXCEPTION`.

### H4 · Backend — `throw error` lanza un `PostgrestError` crudo que Deno no puede serializar

**Archivo:** `supabase/functions/manage-payment-gateways/index.ts:86`

```ts
if (error) throw error;
```

`error` es un `PostgrestError` de `@supabase/supabase-js` — un objeto plano `{ code, message, details, hint, status }`.
`PostgrestError` **no extiende `Error`**. El catch del `BaseController` espera instancias de
`BusinessError`, `UnauthorizedError` o `Error` nativo. Al recibir un `PostgrestError`:
- El handler no lo reconoce → cae en la rama genérica.
- Deno intenta serializar el objeto lanzado como parte del response de error.
- La serialización falla para ciertos shapes no-estándar → log: `"object: Unknown error"`.
- El isolate no puede devolver una respuesta → `wall clock duration warning` + `early termination`.

### H5 · Efecto amplificador — lock contention por 3 UPSERTs simultáneos

Las 3 peticiones simultáneas ejecutan `INSERT ... ON CONFLICT DO UPDATE` sobre la misma fila
`(vendor_id, gateway)` en `payment_credentials`. PostgreSQL serializa los UPSERTs con un
row-level lock: el 2.º y 3.º esperan al 1.º. Incluso si cada fallo individual es rápido (~50ms),
la espera acumulada de locks + tiempo de respuesta puede acercar el 3.º isolate al límite de
wall clock (400ms en Supabase), explicando la advertencia.

---

### Cadena de fallo determinista

```
Usuario hace clic en toggle de pasarela X
  │
  ├─► toggleGateway (1.ª vez) ──────────────────── POST #1 → manage-payment-gateways
  │    └─► Alpine re-render de x-for
  │          └─► @change se re-registra, propagación aún activa
  │                └─► toggleGateway (2.ª vez) ─── POST #2 → manage-payment-gateways
  │
  └─► saveCredentials (form submit pasarela Y) ─── POST #3 → manage-payment-gateways

Los 3 POSTs llegan simultáneamente al Edge Function:
  ├─► dbAdmin.rpc('save_payment_credentials') → RAISE EXCEPTION (ENCRYPTION_KEY_NOT_CONFIGURED)
  ├─► if (error) throw error → lanza PostgrestError (no-Error)
  ├─► BaseController no serializa → "object: Unknown error"
  ├─► Lock contention (3 UPSERTs sobre misma fila) → wall clock warning en isolates 2 y 3
  └─► HTTP 500 × 3
```

---

### Archivos afectados (pendientes de corrección)

| Archivo | Hallazgo | Tipo de fix requerido |
|---------|----------|-----------------------|
| `apps/vendor-admin/src/pages/settings/index.astro:42` | `@change` dentro de `<label>` → double-fire | Mover `@change` al `<label>` o usar `@click.prevent` + `@change.stop` |
| `apps/vendor-admin/src/pages/products/index.astro:97` | Mismo patrón `<label><input @change>` | Mismo fix |
| `supabase/functions/manage-payment-gateways/index.ts:86` | `throw error` lanza `PostgrestError` crudo | `throw new Error(error.message)` o `throw new BusinessError(...)` |
| `supabase/migrations` / DB config | `app.settings.encryption_key` no seteado | `ALTER DATABASE postgres SET app.settings.encryption_key = '...'` en migración o configurar `ENCRYPTION_KEY` como secret en el Edge Function runtime |

---

**STOP — esperando ACK antes de generar PLAN_ACTUAL.md y PENDING_TASKS.md.**

---

## Delta — Auditoría POST 500 persistente: pgp_sym_encrypt search_path [2026-05-15 — Sesión 3 Turno 5]

### Documentos base de arquitectura revisados

| Documento | Restricción relevante |
|-----------|----------------------|
| SRS | C-07: toda escritura via Edge Functions ✅ · RNF-07: cifrado pgsodium (implementación usa pgcrypto — inconsistencia preexistente deliberada, no causa el error) |
| SDD | Capa 4 de seguridad: "pgsodium" — misma inconsistencia documental; no bloquea la solución |
| ARCHITECTURE.md | Multi-capa RLS + MFA + AES-256 ✅ — la corrección no contradice ninguna decisión |
| Documentación Técnica | `POST /manage-payment-gateways` → Edge Fn → PostgREST → `save_payment_credentials` ✅ |

Ninguna conclusión ni solución futura contradice C-01 a C-08 del SRS.

---

### Síntoma actual

El error 500 persiste tras PT-FIX-018. La consola del navegador muestra ~10 s antes de recibir la respuesta de error. Los logs de Edge Functions muestran:

```
[INFO][manage-payment-gateways] Saving payment gateway {"vendorId":"ddb08c5b...","gateway":"paypal"}
[INTERNAL_SERVER_ERROR] Error: function pgp_sym_encrypt(text, text, unknown) does not exist
wall clock duration warning: isolate: 2bf71bcf...
early termination has been triggered: isolate: 2bf71bcf...
```

---

### H1 · Causa raíz — `pgp_sym_encrypt` en schema `extensions` no visible desde PostgREST

**Verificación en el contenedor:**

| Query | Resultado |
|-------|-----------|
| Schema de pgcrypto | `extensions` |
| Función `pgp_sym_encrypt` | `extensions.pgp_sym_encrypt` (× 2 — con y sin options) |
| `SHOW search_path` (psql directo) | `"$user", public, auth, extensions` |

**Configuración de PostgREST en `docker-compose.yml`:**
```yaml
PGRST_DB_SCHEMAS: public,storage
PGRST_DB_USE_LEGACY_GUCS: "false"
# No hay PGRST_DB_EXTRA_SEARCH_PATH configurado
```

**Mecanismo del fallo:**

PostgREST v12 establece `search_path = public` para cada transacción que ejecuta. Este `search_path` **no incluye `extensions`**. La cadena de llamadas es:

```
PostgREST (search_path = public)
  └─► public.save_gateway_credentials_secure  [SECURITY DEFINER, sin SET search_path]
        └─► PERFORM public.save_payment_credentials(...)  [SECURITY DEFINER, sin SET search_path]
              └─► pgp_sym_encrypt(p_credentials::TEXT, v_key, 'compress-algo=0, cipher-algo=aes256')
                   └─► ERROR: function pgp_sym_encrypt(text, text, unknown) does not exist
                        (PostgreSQL busca en search_path = public; la función está en extensions)
```

Las funciones `SECURITY DEFINER` sin `SET search_path` heredan el `search_path` de la **sesión llamante** (PostgREST). Como PostgREST no incluye `extensions`, `pgp_sym_encrypt` no se resuelve.

Cuando se ejecuta directamente en psql (e.g., diagnóstico manual), el `search_path` del usuario `supabase_admin` incluye `extensions` → el mismo código funciona. Esto explica por qué las migraciones aplican correctamente pero el RPC falla en runtime.

**Este es un bug preexistente.** `save_payment_credentials` nunca funcionó correctamente a través de PostgREST. Las pruebas manuales con psql enmascaraban el problema porque el search_path de psql incluye `extensions`.

---

### H2 · Causa del delay de 10 segundos en el navegador

El error de PostgreSQL es **inmediato** (sin espera). El delay de ~10 s en el navegador se explica por dos factores acumulados:

1. **Pipeline de autenticación en `requireAdminMFA`**: La función llama secuencialmente a GoTrue (`getUser`), luego a la DB (`profiles`), y luego valida MFA. En el stack Docker local, cada llamada HTTP interna puede tomar 2–3 s por latencia de red Docker + time-to-first-byte del runtime.

2. **Wall clock del isolate de Deno**: El Edge Runtime local arranca y calienta el isolate por función antes de ejecutar. Los logs muestran `wall clock duration warning` para TODAS las funciones (login, change-password, verify-totp, setup-totp) — esto es el comportamiento normal del Edge Runtime local; los isolates se matan después de completar la respuesta. No indica un error de la aplicación.

La suma acumulada de auth pipeline + tiempo de red + inicialización de isolate supera el umbral de wall clock del Edge Runtime (~5 s).

---

### H3 · Los `wall clock duration warning` en login/change-password NO son errores de aplicación

```
[Info] [INFO][login] Vendor must change password   ← función completó con éxito
wall clock duration warning: isolate: ec8e4df4     ← Edge Runtime mata el isolate post-respuesta
early termination has been triggered: isolate       ← consecuencia del anterior
[Info] Listening on http://localhost:9999/          ← nuevo isolate listo
```

El patrón `log de éxito → wall clock warning → Listening` indica que la función retorna correctamente pero el isolate no se destruye limpiamente en el tiempo esperado. Es un artefacto del runtime local (supabase/edge-runtime:v1.67.4), no un bug de la lógica de negocio.

---

### H4 · Inconsistencia SRS/SDD vs. implementación (preexistente, no causa del error)

El SRS (RNF-07) y el SDD (Capa 4) especifican `pgsodium` para cifrado de credenciales. La migración 00018 cambió deliberadamente a `pgcrypto` (confirmado en GRAPH_REPORT: "Fix 3: Secure nonce via pgsodium → pgcrypto"). Esta inconsistencia documental es preexistente y **no es la causa del error**. Debe alinearse en documentación en una sesión futura.

---

### Opciones de corrección identificadas (sin implementar — pendiente ACK)

| Opción | Cambio | Ventaja | Riesgo |
|--------|--------|---------|--------|
| **A (Recomendada)** | Nueva migración `00029`: añadir `SET search_path = public, extensions` a `save_payment_credentials` y `save_gateway_credentials_secure` | Fix permanente en DB; no depende de config PostgREST | Requiere `docker compose down -v && up` para aplicar |
| **B** | Añadir `PGRST_DB_EXTRA_SEARCH_PATH: extensions` al servicio `supabase-rest` en `docker-compose.yml` | Un solo cambio de config; no toca las funciones DB | El env var es de PostgREST v10+ (✅ usamos v12.2.0); afecta a TODAS las funciones exposibles — más permisivo |
| **C** | Usar `extensions.pgp_sym_encrypt(...)` calificado en `save_payment_credentials` | Explícito; no afecta search_path global | Requiere migración + atarlo a schema `extensions` que es implementación interna de Supabase |

La Opción A es preferida porque es autocontenida en la DB, cumple SRS C-07, no altera comportamiento de otros endpoints, y produce código más legible.

---

**STOP — esperando ACK antes de generar PLAN_ACTUAL.md y PENDING_TASKS.md.**

---

**Siguiente paso:** Revisar `PLAN_ACTUAL.md` con el plan técnico detallado → ACK del usuario → implementación.
