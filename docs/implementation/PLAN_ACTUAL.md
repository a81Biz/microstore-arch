# Plan Maestro de Sesión — 2026-05-15

**Estado:** EN ESPERA DE ACK  
**Última actualización:** 2026-05-15  
**Protocolo:** Máximo 2 archivos por turno · ACK requerido antes de cada tarea · Log en HISTORY.log al terminar

---

## Nota de Seguridad — PT-001 «Emergency Access Bypass» RECHAZADO

La solicitud de añadir un bypass de TOTP controlado por `ADMIN_EMERGENCY_SECRET` es estructuralmente
equivalente al backdoor `'123456'` que la Auditoría 2 marcó como **C1 CRÍTICO**. No se implementará.

**Alternativa legítima de break-glass documentada:**
```bash
# Para desbloquear un vendor bloqueado sin código en producción:
supabase auth admin update-user <user-id> \
  --app-metadata '{"mfa_verified": false}' \
  --project-ref <ref>
# Luego el vendor completa TOTP normalmente en el siguiente login.
```
Esto requiere credenciales de servicio Supabase (no un secreto en la app) y deja audit trail.

---

## PRIORIDAD ALTA

---

### PT-001 · Verificar integridad de `verify-totp` reescrito
**Archivos (1 turno):** `supabase/functions/verify-totp/index.ts` + `supabase/functions/setup-totp/__tests__/totp.test.ts`

**Micro-pasos:**
1. Leer `verify-totp/index.ts` — confirmar que `'123456'` ya no existe y que usa `otpauth`.
2. Leer `setup-totp/__tests__/totp.test.ts` — ver qué casos ya están cubiertos.
3. Si el backdoor persiste en el código: eliminarlo y sustituir por validación `otpauth` (TOTP.validate).
4. Añadir / completar estos casos de test en el archivo de tests existente:
   - `'123456'` → devuelve 401 con error `INVALID_TOTP`.
   - Token TOTP válido generado con `otpauth` → devuelve 200.
   - Token de formato inválido (no 6 dígitos) → devuelve 400.
   - Secret no registrado (usuario sin TOTP configurado) → devuelve 403.
5. Verificar que `app_metadata.mfa_verified` (no `user_metadata`) es lo que se escribe tras éxito.

**Criterio de éxito:** `npm run test --workspace=supabase` (o equivalente Deno) pasa sin errores.  
**Riesgo:** Bajo — los tests son aditivos, no modifican lógica de negocio si el backdoor ya fue eliminado.

---

### PT-002 · Rate limit fail-closed en `login`
**Archivos (1 turno):** `supabase/functions/_core/base-controller.ts` + `supabase/functions/login/index.ts`

**Micro-pasos:**
1. Leer `base-controller.ts` método `checkRateLimit` — localizar el `return true` en el bloque `catch`.
2. Cambiar `return true` (fail open) por `throw new BusinessError('RATE_LIMITED', ..., 429)` (fail closed).
3. Leer `login/index.ts` — verificar que la llamada a `checkRateLimit` está presente.
4. Si no está: añadir `await this.checkRateLimit(identifier, 'login', 5, 60)` antes del bloque de
   autenticación (5 intentos por minuto por IP/email).
5. Confirmar que el error 429 tiene el header `Retry-After: 60`.

**Criterio de éxito:** El bloque catch de `checkRateLimit` lanza 429, no retorna `true`.  
**Riesgo:** Medio — si la BD de `rate_limits` falla (cosa rara), los logins legítimos serán rechazados
temporalmente. Aceptable: es el comportamiento correcto para un endpoint expuesto a fuerza bruta.

---

### PT-003 · CORS — reemplazar `*` por allowlist de dominios
**Archivos (1 turno):** Solo `supabase/functions/_core/base-controller.ts`

**Análisis graphify previo:**  
La comunidad C29 "Base Controller & Auth" conecta BaseController con todos los controllers de Edge
Functions. Las llamadas function-to-function usan `supabase-client` con `service_role` internamente
y no pasan por CORS del navegador. El cambio solo afecta tráfico browser → Edge Function, que es
exactamente el scope deseado. Sin riesgo de romper comunicación interna.

**Micro-pasos:**
1. Leer `base-controller.ts` — localizar dónde se construye el header `Access-Control-Allow-Origin`.
2. Extraer la lista de orígenes permitidos desde variable de entorno:
   ```typescript
   const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim());
   ```
3. Reemplazar `'*'` por lógica condicional:
   ```typescript
   const origin = req.headers.get('origin') ?? '';
   const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? '';
   ```
4. Actualizar `.env.example` añadiendo:
   ```
   ALLOWED_ORIGINS=https://tienda.com,https://cliente.tienda.com,https://admin.tienda.com
   ```
   (en desarrollo: `http://localhost:4321,http://localhost:5173,http://localhost:5174`)
5. Verificar que las rutas de Preflight (`OPTIONS`) devuelven el origen correcto.

**Criterio de éxito:** Header `Access-Control-Allow-Origin` refleja el origen del request si está en
la lista; no devuelve `*` en ningún caso.  
**Nota:** PT-003 toca 1 solo archivo de lógica + `.env.example` (documentación). Cabe en un turno.

---

## PRIORIDAD MEDIA

---

### PT-004 · Completar `wrangler.toml` con IDs reales de Cloudflare
**Archivos (2 turnos):** 3 archivos → Turno A: storefront + client-hub · Turno B: vendor-admin

**Micro-pasos (requieren datos del usuario):**
1. El usuario proporciona: `CF_ACCOUNT_ID`, `CF_ZONE_ID`, y los nombres de proyecto en Cloudflare Pages.
2. Turno A: actualizar `apps/storefront/wrangler.toml` y `apps/client-hub/wrangler.toml`.
3. Turno B: actualizar `apps/vendor-admin/wrangler.toml`.
4. Verificar con `npx wrangler pages project list` que los nombres coinciden.

**Bloqueado hasta que el usuario provea los IDs.**

---

### PT-005 · Crear `docs/HANDOFF.md`
**Archivos (1 turno):** `docs/HANDOFF.md` (nuevo, 1 archivo)

**Micro-pasos:**
1. Crear el archivo con secciones: Estado del Proyecto, URLs de Producción, Accesos (placeholders),
   Credenciales (nota de canal seguro), Stack, Próximos Pasos Recomendados.
2. Incluir tabla de sprints completados y entregables.
3. Incluir sección "Break-glass" con el procedimiento de reset MFA documentado arriba.

---

### PT-006 · Variables de entorno de producción
**Archivos:** Ninguno (operación de infraestructura)

**Micro-pasos (ejecuta el usuario):**
1. Completar `.env.production` con valores reales (Stripe live keys, Resend, Logflare, etc.).
2. Ejecutar: `supabase secrets set --env-file .env.production --project-ref <ref>`.
3. Añadir `ALLOWED_ORIGINS` al set de secrets (para PT-003 en producción).
4. Verificar con `supabase secrets list --project-ref <ref>`.

**Dependencia:** PT-003 debe estar mergeado antes de configurar `ALLOWED_ORIGINS`.

---

### PT-007 · E2E checkout-flow — casos de fallo
**Archivos (1 turno):** `apps/client-hub/src/__tests__/e2e/checkout-flow.test.ts`

**Micro-pasos:**
1. Leer el archivo para ver qué casos existen y qué está en `TODO`.
2. Implementar caso: pago rechazado (mock retorna `payment_status: 'failed'`).
3. Implementar caso: stock insuficiente (mock retorna error `INSUFFICIENT_STOCK`).
4. Implementar caso: usuario no autenticado (sin session → 401).
5. Verificar que los 4 casos (incluyendo el happy path ya existente) pasan.

---

## PRIORIDAD BAJA

---

### PT-008 · Smoke test integrado en deploy.yml
**Archivos (1 turno):** `.github/workflows/deploy.yml` + `scripts/test/smoke-test.sh`

**Micro-pasos:**
1. Leer `deploy.yml` — localizar el paso `Health Check`.
2. Añadir paso siguiente:
   ```yaml
   - name: Smoke Test
     run: bash scripts/test/smoke-test.sh ${{ secrets.PUBLIC_STOREFRONT_URL }} ...
   ```
3. Leer `smoke-test.sh` — confirmar que devuelve exit 1 ante fallos.
4. Si `smoke-test.sh` usa `exit 0` en todos los casos: corregirlo.

---

### PT-009 · Graphify — hábito operativo
**Archivos:** Ninguno  
**Acción:** Ejecutar `/graphify . --update` al inicio de cada sesión de trabajo. Ya hecho hoy.

---

### PT-010 · Documentar `PAYPAL_ENV` en `.env.example`
**Archivos (1 turno):** `.env.example` (1 archivo)

**Micro-pasos:**
1. Leer `.env.example` — localizar bloque de PayPal.
2. Añadir `PAYPAL_ENV=sandbox  # Cambiar a 'production' para cobros reales` junto a las keys de PayPal.

---

## Orden de ejecución recomendado

| Orden | PT | Turno(s) | Bloquea a |
|-------|-----|----------|-----------|
| 1 | PT-001 | 1 | — |
| 2 | PT-002 | 1 | — |
| 3 | PT-003 | 1 | PT-006 |
| 4 | PT-010 | 1 | — |
| 5 | PT-005 | 1 | — |
| 6 | PT-007 | 1 | — |
| 7 | PT-008 | 1 | — |
| 8 | PT-004 | 2 | usuario provee IDs |
| 9 | PT-006 | — (ops) | PT-003, PT-004 |
| 10 | PT-009 | — (hábito) | — |

**Esperando ACK para PT-001.**
