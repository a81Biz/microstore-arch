# AUDITORÍA TÉCNICA PROFUNDA — Segunda Ronda
## Micro-Store Arch · Revisión Post-Remediación

**Fecha:** 2026-05-09  
**Auditores:** Equipo completo (Architect · Tech Lead · Staff · Security · DevOps · QA · Performance · DB · Clean Code · Test · Static Analysis)  
**Referencia previa:** `docs/audit/AUDITORÍA TÉCNICA PROFUNDA.md` + `docs/audit/REMEDIATION.md`  
**Rama:** main  
**Commits analizados:** fddccf7 (HEAD)

> Esta segunda auditoría es deliberadamente más estricta. El estándar para "apto para producción" requiere que los hallazgos previos estén **completamente resueltos**, no parcialmente. Cada corrección aplicada en la primera remediación fue verificada contra el código real.

---

## RESUMEN EJECUTIVO

El proyecto muestra una arquitectura sólida con patrones correctos (RLS, edge functions, pesimistic locking, enums tipados). Sin embargo, la primera remediación fue **incompleta**: corrigió `confirm-totp` pero dejó intacto `verify-totp` con el mismo backdoor de `'123456'`. El token de sesión sigue leyéndose desde `localStorage` en `checkout-client.ts` y en toda la página `settings/index.astro`. CORS es wildcard en todos los endpoints. El flujo de MFA tiene una **inconsistencia arquitectónica grave** donde `verify-totp` escribe en `user_metadata` pero `requireAdminMFA` ahora lee `app_metadata`, dejando el flujo de login completamente roto para vendors.

**Estado actual: NO APTO PARA PRODUCCIÓN.**

---

## SCORE GLOBAL

| Dimensión | Score | Anterior | Tendencia |
|-----------|-------|---------|-----------|
| Seguridad | 3/10 | 2/10 | +1 (regresión parcial) |
| Testing | 3/10 | 1/10 | +2 (tests añadidos, pero frágiles) |
| Calidad de código | 5/10 | 5/10 | = |
| Arquitectura | 6/10 | 7/10 | -1 (inconsistencias MFA descubiertas) |
| Performance | 5/10 | — | nuevo |
| Escalabilidad | 5/10 | — | nuevo |
| Mantenibilidad | 5/10 | — | nuevo |
| **General** | **4.6/10** | **3.75/10** | **+0.85** |

> La mejora es mínima porque la corrección más crítica (TOTP) está incompleta.

---

## HALLAZGOS CRÍTICOS (priorizados)

| # | Hallazgo | Archivo | Severidad | Estado |
|---|----------|---------|-----------|--------|
| C1 | Backdoor TOTP en verify-totp: `'123456'` | `supabase/functions/verify-totp/index.ts:13` | CRÍTICO | ❌ Sin corregir |
| C2 | MFA roto: verify-totp escribe `user_metadata` pero requireAdminMFA lee `app_metadata` | `verify-totp:58` + `base-controller:63` | CRÍTICO | ❌ Regresión |
| C3 | CLABE hardcodeada: todos los pagos Hey Banco van a CLABE de prueba | `create-order/index.ts:241` | CRÍTICO | ❌ Sin corregir |
| C4 | localStorage auth_token en checkout flow | `checkout-client.ts:32` | ALTO | ❌ Sin corregir |
| C5 | localStorage auth_token en 3 funciones de settings | `settings/index.astro:144,185,211` | ALTO | ❌ Sin corregir |
| C6 | CORS `*` en todos los endpoints | `base-controller.ts:97`, múltiples | ALTO | ❌ Sin corregir |
| C7 | Email hardcodeado para vendor role: `admin@tienda.com` | `00002_auth_triggers.sql:15` | ALTO | ❌ Sin corregir |
| C8 | Test de regresión que valida comportamiento que fue "corregido" pero no lo estaba | `auth-client.test.ts:55-63` | ALTO | ❌ Contradicción |
| C9 | PayPal apunta a sandbox en código de producción | `create-order/index.ts:158,170` | ALTO | ❌ Sin corregir |
| C10 | Rate limiting fail-open: si la BD falla, el acceso se permite | `base-controller.ts:83-86` | MEDIO | ❌ Sin corregir |

---

## HALLAZGOS POR ARCHIVO — ANÁLISIS DETALLADO

---

### `supabase/functions/verify-totp/index.ts`

**CRÍTICO — C1: Backdoor de autenticación no corregido**

```typescript
// Línea 8-14
async function verifyTOTPToken(secret: string, token: string): Promise<boolean> {
  // Simulación para desarrollo (en producción usar otplib o librería TOTP de Deno)
  if (!/^\d{6}$/.test(token)) {
    return false;
  }
  return token === '123456'; // ← BACKDOOR: cualquier usuario entra con '123456'
}
```

La primera auditoría corrigió `confirm-totp/index.ts` (setup de TOTP) pero **dejó intacto `verify-totp/index.ts`** (el flujo de login del vendor). Son dos funciones diferentes con el mismo bug. `confirm-totp` se usa una sola vez al configurar el dispositivo; `verify-totp` se usa en cada inicio de sesión. El backdoor está en el camino caliente de producción.

**CRÍTICO — C2: Inconsistencia MFA que rompe el flujo completo de vendor**

```typescript
// verify-totp/index.ts, línea 55-60
await supabaseAdmin.auth.admin.updateUserById(user.id, {
  user_metadata: { mfa_verified: true, mfa_verified_at: new Date().toISOString() }
  //              ↑ user_metadata — el usuario puede modificar esto desde el cliente
});

// base-controller.ts, línea 63
const isMfaVerified = user.app_metadata?.mfa_verified === true;
//                              ↑ app_metadata — solo service role puede escribir esto
```

Consecuencia: cuando un vendor inicia sesión y completa el segundo factor via `verify-totp`, el flag `mfa_verified` se escribe en `user_metadata`. Pero `requireAdminMFA` lo lee desde `app_metadata`. **El valor nunca coincide.** Resultado: **ningún vendor puede acceder al panel tras autenticarse**, porque aunque pasó el TOTP, `app_metadata.mfa_verified` jamás fue establecido por `verify-totp`.

Solo `confirm-totp` (el setup inicial) escribe en `app_metadata`. Es decir: un vendor puede acceder al panel únicamente en el mismo momento en que configura TOTP por primera vez, pero nunca más después.

**Solución requerida:**
```typescript
// verify-totp debe usar app_metadata, no user_metadata
await supabaseAdmin.auth.admin.updateUserById(user.id, {
  app_metadata: { mfa_verified: true, mfa_verified_at: new Date().toISOString() }
});
```

**Problema adicional: sin validación de role**

`verify-totp` no verifica que el usuario sea `vendor`. Un cliente normal que obtenga `totp_enabled = true` en su perfil (dato que podría manipularse via RLS faltante) podría llamar a esta función.

---

### `supabase/functions/create-order/index.ts`

**CRÍTICO — C3: CLABE hardcodeada para Hey Banco**

```typescript
// Líneas 233-244
private async createHeyBancoPayment(amount: number, orderId: string) {
  return {
    gateway: 'hey_banco',
    instructions: {
      amount: (amount / 100).toFixed(2),
      currency: 'MXN',
      reference: orderId,
      bank: 'Hey Banco',
      clabe: '012345678901234567'  // ← CLABE de prueba — todos los clientes pagan aquí
    }
  };
}
```

La CLABE `012345678901234567` es un valor de prueba. Cualquier cliente que seleccione Hey Banco realizará una transferencia a esta cuenta, no a la cuenta real del vendor. La función ignora completamente las credenciales configuradas por el vendor (donde se guardaría la CLABE real).

**Problema adicional: PayPal apunta a sandbox**

```typescript
// Líneas 158, 170
const authResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', { ... });
const orderResponse = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', { ... });
```

URLs de sandbox hardcodeadas. Los pagos PayPal en producción crearán órdenes en el entorno de sandbox y no capturarán dinero real.

**Problema adicional: fallback silencioso cuando faltan credenciales**

```typescript
// Líneas 123, 155, 199
if (!stripeKey) return { gateway: 'stripe', mode: 'manual_fallback', orderId };
if (!paypalClientId || !paypalSecret) return { gateway: 'paypal', mode: 'manual_fallback', orderId };
if (!mpAccessToken) return { gateway: 'mercadopago', mode: 'manual_fallback', orderId };
```

Si las variables de entorno de pago no están configuradas, la función retorna exitosamente con un `manual_fallback`. El cliente ve la orden como creada, pero no hay ningún payment intent real. Nadie es notificado de que el pago falló silenciosamente. La orden queda en estado `pending` permanentemente.

**Problema adicional: CORS wildcard**

```typescript
// Línea 96
headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
```

**Problema adicional: `order: any` y `createPaymentIntent` retorna `any`**

```typescript
// Líneas 102-104
private async createPaymentIntent(gateway: string, order: any, customerEmail: string): Promise<any>
```

El tipo de `order` es `any`, lo que desactiva el tipado estático en toda la función. Si `create_order_atomic` cambia su esquema de retorno, el error no se detecta en compilación.

---

### `supabase/functions/manage-orders/index.ts`

**ALTO: `filters` y `tracking` tipados como `any`**

```typescript
// Línea 63
async listOrders(authHeader: string, filters: any) { ... }

// Línea 100
async updateTracking(authHeader: string, orderId: string, tracking: any) { ... }
```

`tracking.trackingId` y `tracking.carrier` se pasan directamente a un RPC de base de datos sin validación de formato ni de valores permitidos. Un carrier inventado podría pasarse al RPC y podría fallar con un error de DB genérico, no una respuesta 400 limpia.

**MEDIO: Doble autenticación por request**

```typescript
// Línea 77-80
async getOrderDetail(authHeader: string, orderId: string) {
  const user = await this.authenticateUser(authHeader);  // → 1 llamada a getUser()
  const isAdmin = await this.isAdmin(authHeader);        // → 2ª llamada a getUser() dentro de isAdmin
```

`isAdmin` llama internamente a `authenticateUser`, que hace otra llamada a `supabase.auth.getUser()`. Cada endpoint que llama ambos realiza 2 llamadas de auth. En `getOrderDetail` además se hace otra query a `profiles`. Total: 3 queries de auth por request.

**MEDIO: CORS wildcard en cada Response**

```typescript
// Líneas 26, 38, 47, 56 — cada return tiene:
headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
```

Duplicado en cada respuesta. Debería centralizarse en `BaseController.start()`.

**BAJO: Email de notificación se dispara sin await del resultado**

```typescript
// Línea 112-114
await this.triggerEmail(orderId, 'shipping');
return data;
```

`triggerEmail` hace fetch a otra edge function y atrapa el error silenciosamente. No hay retry ni alerta si el email no se envía. El vendor no sabe que la notificación falló.

---

### `supabase/functions/manage-products/index.ts`

**ALTO: Sin validación de input en updateProduct**

```typescript
// Líneas 72-93
private async updateProduct(authHeader: string, productId: string, data: any) {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.price !== undefined) updateData.price = data.price;
  // ...
  const { data: product, error } = await this.dbAdmin
    .from('products')
    .update(updateData)
    .eq('id', productId)  // ← productId es el último segmento de URL, sin validación UUID
```

`productId` es el string que llega como último segmento de URL (`/manage-products/CUALQUIER_COSA`). No se valida que sea un UUID antes de la query. Si alguien envía `/manage-products/../../config`, el path parsing puede comportarse inesperadamente.

`data.price` podría ser `"free"` (string), `-999` (negativo), o cualquier valor. No hay Zod.

**MEDIO: `updateData: any` construido dinámicamente**

Al construir `updateData` con tipo `any`, TypeScript no puede verificar que las claves coincidan con el esquema de la tabla. Un refactor de la BD (renombrar `stock_quantity` a `quantity`) no causaría error de compilación.

**BAJO: BusinessError con argumentos transpuestos**

```typescript
// Línea 53
throw new BusinessError('Método no permitido', 405, 'METHOD_NOT_ALLOWED');
```

Comparar con otras invocaciones:
```typescript
// create-order/index.ts:37
throw new BusinessError('RATE_LIMITED', 'Demasiados pedidos...', 429);
```

El constructor de `BusinessError` hereda de `AppError(message, status, code)`. En manage-products el primer argumento es el mensaje en español, pero en otros archivos es el code. La API de error devuelve `{ error: 'Método no permitido', message: 405 }` — el campo `error` contiene texto en español y `message` contiene el status code numérico.

---

### `supabase/functions/_core/base-controller.ts`

**ALTO: CORS wildcard en handler de OPTIONS**

```typescript
// Líneas 95-101
if (req.method === 'OPTIONS') {
  return new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',  // ← Permite cualquier origen
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
```

Este handler está en el BaseController que todos los controllers heredan. Ningún endpoint restringe el origen. Cualquier dominio puede realizar peticiones autenticadas.

**MEDIO: Rate limiting fail-open**

```typescript
// Líneas 83-86
if (error) {
  console.error('Rate limit check failed:', error);
  return true;  // ← Si la BD falla, se permite el request
}
```

Fail-open es peligroso en seguridad. Si `check_rate_limit` falla por un problema de BD, el sistema permite todos los requests. En un ataque DDoS que también degrada la BD, el rate limiting se desactiva precisamente cuando más se necesita.

**MEDIO: Supabase client creado en constructor + otro en cada autenticación**

```typescript
constructor() {
  this.dbAdmin = createClient(url, key);  // service role — en constructor
}

protected async authenticateUser(authHeader: string) {
  const supabase = createClient(url, key);  // anon key — en cada request
  const { data: { user } } = await supabase.auth.getUser(token);
}
```

Cada request crea 2 clientes Supabase. En Deno, `createClient` es liviano, pero no hay reutilización. En `getOrderDetail`, que llama `authenticateUser()` y luego `isAdmin()` (que también llama `authenticateUser()`), se crean 3 clientes por request.

**BAJO: `console.error` para fallo de rate limit**

```typescript
// Línea 84
console.error('Rate limit check failed:', error);
```

Debería usar el logger estructurado (`createLogger`) que sí envía a Logflare en producción.

---

### `supabase/functions/_shared/error-handler.ts`

**MEDIO: `console.error(error)` expone stack traces en producción**

```typescript
// Línea 16
export const handleError = (error: any) => {
  console.error(error);  // ← stack trace completo en producción
```

En Deno/Supabase Edge Functions, `console.error` va a los logs del proyecto visibles en el dashboard. Un stack trace expone rutas de archivos, nombres de variables y estructura interna. Debería usar el logger estructurado con nivel `error` y omitir el stack en producción.

**MEDIO: `error: any` parámetro**

El tipo `any` aquí es especialmente problemático: cualquier código que llame `handleError` con un valor no-Error (ej. `handleError("texto")`) no generará error de compilación.

---

### `apps/client-hub/src/lib/checkout/checkout-client.ts`

**ALTO: localStorage auth_token no corregido**

```typescript
// Línea 31-33
function getAuthToken(): string {
  return localStorage.getItem('auth_token') || '';
}
```

Esta función se llama en `createOrder()` para añadir el header `Authorization`. La primera remediación eliminó el `setItem` del login pero **no eliminó este `getItem`**. El resultado es que checkout envía siempre un Bearer token vacío (`''`), porque el token nunca se guardó. Todos los intentos de checkout fallarán con 401.

**MEDIO: `shippingAddress: any`**

```typescript
// Línea 38
export async function createOrder(
  items: Array<{ productId: string; quantity: number; name?: string; price?: number }>,
  shippingAddress: any,  // ← tipo perdido
  paymentMethod: string
)
```

No hay validación de que `shippingAddress` tenga los campos requeridos antes de enviarlo.

---

### `apps/vendor-admin/src/pages/settings/index.astro`

**ALTO: localStorage en 3 lugares con manejo de errores silencioso**

```javascript
// Línea 144
const token = localStorage.getItem('auth_token');
// Línea 185
const token = localStorage.getItem('auth_token');
// Línea 211
const token = localStorage.getItem('auth_token');
```

Si el token es `null` (usuario no autenticado o Supabase gestiona la sesión internamente), las 3 peticiones van con `Authorization: Bearer null`. El servidor responderá 401, pero el usuario no verá ningún error en las funciones `loadGateways` y `toggleGateway`.

**ALTO: Error silencioso en toggleGateway**

```javascript
// Líneas 200-202
} catch (err) {
  console.error('Error toggling gateway:', err);
  // ← Sin actualización de UI. gateway.is_enabled se cambia en línea 199 antes del await
}
```

El toggle de UI se aplica **antes** del fetch:
```javascript
// Línea 199 — ANTES del await fetch:
gateway.is_enabled = !gateway.is_enabled;
```
Si el servidor rechaza el cambio, la UI muestra el estado incorrecto. El vendor cree que activó Stripe cuando en realidad la petición falló.

**MEDIO: Mock data hardcodeado como fallback**

```javascript
// Líneas 152-158
if (this.gateways.length === 0) {
  this.gateways = [
    { gateway: 'stripe', is_enabled: false },
    { gateway: 'paypal', is_enabled: false },
    { gateway: 'mercadopago', is_enabled: false },
    { gateway: 'hey_banco', is_enabled: false }
  ];
}
```

Si la API retorna un array vacío (ningún gateway configurado), se inicializa con un mock. Esto mezcla estado real con estado de UI hardcodeado, imposibilitando distinguir "no configurado" de "gateway recién instalado".

---

### `supabase/migrations/00002_auth_triggers.sql`

**ALTO: Vendor role concedido por email hardcodeado**

```sql
-- Línea 14-17
CASE
  WHEN NEW.email = 'admin@tienda.com' THEN 'vendor'::user_role
  ELSE 'customer'::user_role
END
```

Cualquiera que se registre con el email `admin@tienda.com` obtiene rol `vendor`. En muchos proveedores de email, la verificación de email puede bypassearse mediante alias (`admin+1@tienda.com` no funciona, pero si el dominio no está controlado, alguien puede registrar ese email). Es una configuración frágil para un privilegio tan crítico como el acceso al panel de administración.

**ALTO: RLS policy inconsistente con nueva arquitectura de MFA**

```sql
-- Líneas 93-102
CREATE POLICY "Admin with MFA can read all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'vendor'::user_role
        AND (auth.jwt()->>'amr')::jsonb ? 'mfa'  -- ← usa 'amr' de Supabase Auth nativo
    )
  );
```

Esta policy usa `auth.jwt()->>'amr'` (Authentication Methods References), que es el claim de MFA **nativo de Supabase** (para phone/authenticator app configurados via Supabase MFA). El sistema usa un TOTP **personalizado** almacenado en `profiles.totp_secret`, cuya verificación no escribe en el claim `amr`. Esta policy **nunca es verdadera** para el flujo de MFA actual. Los vendors nunca pueden leer profiles con esta policy.

Las migrations 00009 añadieron policies basadas en `app_metadata.mfa_verified`, pero esta policy en 00002 no fue eliminada. Hay policies contradictorias coexistiendo.

---

### `.github/workflows/deploy.yml`

**ALTO: No hay typecheck en el pipeline de deploy**

```yaml
# validate job:
- run: npm run lint
- run: npm run test:core  # Solo tests del core package
# ← Falta: npm run typecheck
```

El pipeline de CI (`ci.yml`) sí ejecuta `npm run typecheck`, pero el pipeline de deploy no. Es posible desplegar a producción código con errores de tipos que CI detectaría, si alguien hace push directo a main.

**MEDIO: Sleep hardcodeado antes del health check**

```yaml
- name: Health Check
  run: |
    sleep 10  # ← Arbitrario
    curl -f "${{ secrets.SUPABASE_URL }}/functions/v1/health" || exit 1
```

10 segundos puede ser insuficiente si las edge functions tienen cold start. Debería ser un retry con backoff (`curl --retry 5 --retry-delay 5`).

**MEDIO: No hay rollback automático**

Si el health check falla después del deploy, no hay mecanismo de rollback. Las edge functions quedan en el estado roto hasta intervención manual.

**BAJO: No hay SAST ni vulnerability scanning**

```yaml
# Falta en ci.yml:
# - uses: github/codeql-action/analyze@v3
# - run: npm audit --audit-level=high
```

Ningún workflow ejecuta CodeQL, `npm audit`, ni Dependabot está configurado.

---

### `docker/Dockerfile.astro` y `docker-compose.yml`

**MEDIO: Dockerfile corre como root**

```dockerfile
FROM node:22-alpine
WORKDIR /app
# ← Sin: USER node
```

El proceso Node dentro del container corre como root. Si hay una vulnerabilidad en el proceso, el atacante tiene root dentro del container.

**MEDIO: docker-compose usa tag `:latest` para Supabase CLI**

```yaml
supabase:
  image: supabase/cli:latest  # ← Flotante, no reproducible
```

Un `docker compose pull` puede traer una versión incompatible del CLI que rompa el ambiente de desarrollo sin advertencia. Debería pin a una versión específica (ej. `supabase/cli:1.176.9`).

**MEDIO: Dockerfile tiene fallback peligroso en install**

```dockerfile
RUN npm ci --ignore-scripts || npm install
```

`npm ci` falla si `package-lock.json` está desincronizado. El fallback a `npm install` puede instalar versiones de dependencias diferentes a las bloqueadas en el lockfile, introduciendo comportamientos no reproducibles en desarrollo.

---

### `packages/core/package.json`

**MEDIO: Exporta TypeScript raw sin compilar**

```json
{
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

Expone `.ts` directamente. Funciona porque los consumidores (Astro, Vite) tienen transpilación, pero no es estándar. Un consumer puro Node.js no puede importar este paquete. Si algún script Node del proyecto intenta usar `@micro-store/core` (ej. en un CLI), fallará.

---

### `supabase/functions/login/index.ts`

**MEDIO: Rate limit identifier mezcla IP y email con `:` sin escape**

Si el email contiene `:` (técnicamente inválido en SMTP pero posiblemente aceptado), el identifier `${ip}:${email}` puede generar colisiones con identificadores de otros usuarios. Menor, pero indica falta de sanitización del input.

---

## CÓDIGO DUPLICADO

### Esquemas Zod duplicados

`ShippingAddressSchema` y `CreateOrderPayloadSchema` están definidos en dos lugares:

1. `packages/core/src/schemas/order.schema.ts`
2. `supabase/functions/create-order/index.ts` (líneas 10-24)

El comentario en `create-order` dice: `"Re-definiendo esquemas localmente para evitar problemas de importación fuera de funciones en Supabase"`. Esto es válido porque Deno no puede importar npm packages fácilmente, pero genera deriva: si se modifica el schema en core, create-order no se actualiza.

**Impacto:** La validación del backend puede diferir de la del frontend. Ejemplo: si se añade un campo requerido en el schema del core, el frontend lo envía pero el backend no lo valida.

**Solución recomendada:** Usar imports de Deno con URLs especificadas (`https://deno.land/x/zod/`) y mantener un solo schema, o documentar explícitamente que estos schemas deben mantenerse sincronizados (con tests que lo verifiquen).

---

### Supabase client creado múltiples veces

`getSupabaseAdmin()` en `_shared/supabase-client.ts` crea un nuevo cliente en cada llamada. `BaseController` también crea uno en el constructor. Hay al menos 3 patrones de creación de cliente Supabase en el codebase:

1. `createClient()` directo en `verify-totp/index.ts:26`
2. `this.dbAdmin` via `BaseController` constructor
3. `getSupabaseAdmin()` de `_shared/supabase-client.ts`

No está claro cuál es el patrón canónico. Cada función standalone (las que no heredan BaseController) crea su propio cliente.

---

## CÓDIGO MUERTO

| Archivo | Código muerto | Razón |
|---------|--------------|-------|
| `apps/vendor-admin/src/lib/auth/auth-client.ts:87` | `localStorage.removeItem('auth_token')` | El `setItem` fue eliminado; el `removeItem` queda sin efecto |
| `checkout-client.ts:32` | `getAuthToken()` | Devuelve siempre `''` porque el `setItem` fue eliminado |
| `00002_auth_triggers.sql` policy `"Admin with MFA can read all profiles"` | Policy que usa `amr` claim nunca verdadero en este flujo | El flujo TOTP custom no escribe `amr` |
| Migrations 00009 policies | Policies duplicadas/contradictorias con 00002 | Ambas coexisten sin que 00002 sea alterada |

---

## ANÁLISIS DE TESTS

### Tests existentes y su calidad real

**`auth-client.test.ts` — Contradicción con la corrección aplicada**

```typescript
// Línea 55-63
describe('signOut', () => {
  it('debe limpiar el token del localStorage', async () => {
    localStorage.setItem('auth_token', 'test-token');
    const { signOut } = await import('../auth-client');
    await signOut();
    expect(localStorage.getItem('auth_token')).toBeNull();  // ← Esto FALLA
  });
});
```

La primera remediación eliminó `localStorage.removeItem('auth_token')` de `signOut()`. Este test ahora **falla** porque espera que se limpie el localStorage, pero ya no lo hace. O bien:
1. El test falla en CI y nadie lo notó (testing ignorado)
2. La corrección no se aplicó realmente y `signOut` sigue limpiando localStorage

Ninguna de las dos opciones es aceptable.

**`checkout-flow.test.ts` — No es E2E, es una prueba unitaria con fetch mockeado**

El nombre `e2e/checkout-flow.test.ts` es engañoso. No hay Playwright, Cypress ni ningún browser. Es un test unitario que mockea `global.fetch`. El test "pasa" aunque el formulario de checkout sea completamente inutilizable en un navegador real.

**Problema adicional:** El test no prueba que el token de autenticación sea enviado correctamente, no prueba el flujo de carrito desde localStorage, y no prueba ninguna validación de formulario.

**`supabase/functions/setup-totp/__tests__/totp.test.ts`**

Los 11 tests TOTP son correctos y de buena calidad. Sin embargo, prueban la librería `otpauth` en sí, no la edge function `setup-totp/index.ts`. No hay tests de integración que verifiquen el endpoint real.

**`supabase/functions/payment-webhook/__tests__/webhook.test.ts`**

Los 13 tests son de calidad aceptable. Prueban la lógica de verificación de firmas de forma aislada. Sin embargo, tampoco prueban el endpoint completo ni el flujo con base de datos.

### Tests críticos faltantes (prioridad alta)

| Test faltante | Riesgo si falta |
|--------------|-----------------|
| verify-totp rechaza '123456' (debería fallar, no pasar) | El backdoor no se detecta en CI |
| vendor no puede acceder a panel tras MFA exitoso | La inconsistencia MFA no se detecta |
| checkout falla con carrito sin token | El 401 silencioso pasa desapercibido |
| toggleGateway restaura UI si la API falla | Estado de UI incorrecto no detectado |
| createOrder con Hey Banco devuelve CLABE real | La CLABE de prueba pasa a producción |
| ProductController rechaza productId no-UUID | Seguridad en routing no verificada |
| confirm-totp + verify-totp en flujo completo | La inconsistencia cross-function no detectada |
| Deploy health check con función caída | Rollback no probado |

### Tests que deben eliminarse o corregirse

| Test | Razón |
|------|-------|
| `auth-client.test.ts:55-63` (signOut limpia localStorage) | Contradicción con corrección aplicada; debería probar que NO limpia localStorage |

---

## RIESGOS DE PRODUCCIÓN

### Riesgo 1: Flujo vendor completamente roto (CRÍTICO)

Secuencia de fallo en producción:
1. Vendor intenta iniciar sesión → OK
2. Sistema solicita código TOTP → vendor introduce código real del autenticador
3. `verify-totp` verifica contra `'123456'` → FALLO (código real ≠ '123456')
4. Login falla

O si el vendor conoce el backdoor:
1. Vendor introduce `'123456'` → Login "exitoso"
2. `verify-totp` escribe `user_metadata.mfa_verified = true`
3. Vendor accede al panel → `requireAdminMFA` lee `app_metadata.mfa_verified` → `false`
4. Todos los endpoints retornan 401

**El vendor admin es completamente inaccesible en producción.**

### Riesgo 2: Pérdida de dinero en Hey Banco (CRÍTICO)

Cualquier cliente que elija Hey Banco transferirá fondos a `012345678901234567`. El vendor real nunca recibirá el dinero. No hay forma de rastrear automáticamente esto. Las órdenes quedan en estado `pending` indefinidamente.

### Riesgo 3: Checkout 401 silencioso (ALTO)

`checkout-client.ts:getAuthToken()` retorna `''` porque el token nunca se guardó en localStorage. Todos los `createOrder()` fallan con 401. El usuario ve un error genérico "Error al crear orden". El negocio pierde ventas sin saberlo.

### Riesgo 4: Cualquiera se registra como vendor (ALTO)

Registrarse con `admin@tienda.com` → rol `vendor`. En muchos servicios de email, ese dominio no es del vendor sino del proveedor de hosting. Dependiendo del DNS, alguien externo podría registrar ese email.

### Riesgo 5: Estado de UI desincronizado en settings (MEDIO)

El toggle de gateway cambia la UI antes de confirmar la respuesta del servidor. En caso de error de red o 401, el vendor cree que desactivó Stripe pero está activo. Puede activar un gateway sin credenciales y los clientes lo seleccionarán sin que haya configuración real.

---

## ANÁLISIS DE PERFORMANCE

### Doble (o triple) autenticación por request

`getOrderDetail` realiza:
1. `authenticateUser()` → `supabase.auth.getUser()` (red)
2. `isAdmin()` → `authenticateUser()` internamente → `supabase.auth.getUser()` otra vez (red)
3. Query a `profiles` dentro de `isAdmin()`
4. Query principal a `orders`

**Latencia estimada:** 3 round-trips de red a Supabase Auth + 2 queries a BD por cada GET de detalle de orden.

**Solución:** Cachear el resultado de `authenticateUser` en el scope del request (pasar el `user` objeto en lugar del `authHeader` entre métodos privados).

### N+1 en order items

```typescript
// manage-orders:82-87
.select(`
  *,
  profiles(email),
  order_items(*, products(name, slug))
`)
```

Esta query usa las relaciones de PostgREST para hacer joins, lo cual **está bien** — PostgREST lo convierte en una sola query SQL con JOINs. No es un N+1.

### `select('*')` en listProducts

```typescript
// manage-products:110-111
.from('products').select('*')
```

Retorna todas las columnas incluyendo `last_stock_change`, `created_at`, `updated_at` que posiblemente no se necesitan en el listado. No es crítico con volumen bajo, pero escala mal si la tabla crece o se añaden columnas grandes (ej. descripción larga).

### Edge Function cold starts

No hay mecanismo de warm-up para edge functions. En producción con tráfico bajo, el primer request después de inactividad sufrirá latencia de cold start (típicamente 500ms-2s en Supabase). No hay health pings configurados.

---

## ANÁLISIS DE BASE DE DATOS

### Trigger de creación de vendor basado en email literal

```sql
WHEN NEW.email = 'admin@tienda.com' THEN 'vendor'::user_role
```

Este trigger no puede modificarse sin una migration nueva (las migrations ya ejecutadas no se rolan). Para cambiar el email del vendor, se requiere una migration que modifique el trigger. No hay UI para gestionar vendors.

**Escalabilidad cero:** Este sistema solo soporta un vendor (hardcoded por email). No hay forma de añadir un segundo vendor sin modificar el código.

### Policies RLS contradictorias coexistiendo

`00002_auth_triggers.sql` crea `"Admin with MFA can read all profiles"` usando `auth.jwt()->>'amr'`.  
`00009_fix_security_claims.sql` crea nuevas policies con `app_metadata.mfa_verified`.  
La policy de 00002 **no fue eliminada** por 00009.

PostgreSQL evalúa múltiples policies con OR entre ellas (para `PERMISSIVE`). Esto significa que si CUALQUIERA de las dos policies es verdadera, el acceso se concede. La policy de 00002 basada en `amr` sería verdadera para usuarios con MFA nativo de Supabase. Esto podría conceder acceso inesperado si alguien activa MFA nativo en su cuenta de customer.

### Falta de índice en `webhook_logs.status`

```sql
-- 00006_webhook_idempotency.sql
-- Solo tiene: UNIQUE constraint en event_id
-- Falta índice en status para queries de retry
```

La query de idempotencia busca por `event_id` (tiene unique index, OK). Pero si se añaden queries como "dame todos los webhooks en estado `failed` para reintentar", no hay índice en `status`.

### `check_rate_limit` RPC — sin análisis de implementación

La función `check_rate_limit` es referenciada desde múltiples lugares pero su implementación (migration 00008) no fue leída en detalle. Si usa `DELETE + INSERT` para implementar sliding window, puede generar contención de locks bajo carga alta. Sin análisis de la implementación, este riesgo es desconocido.

---

## ANÁLISIS DE DEPENDENCIAS

### Versión flotante de `deno.land/std`

```typescript
// verify-totp/index.ts:1, manage-orders/index.ts:1
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
```

La versión `0.177.0` está fijada, lo que es correcto. Sin embargo, `deno.land` puede tener outages que afecten el deploy. No hay cache de módulos Deno en el pipeline de CI.

### `https://esm.sh/@supabase/supabase-js@2`

Versión `@2` sin patch version fijada. Esto significa que una actualización de `supabase-js@2.x.x` se aplica automáticamente en el próximo deploy sin cambio de código. Si hay un breaking change dentro de `@2`, se despliega sin saberlo.

### `npm:otpauth` en Deno

```typescript
import { TOTP, Secret } from 'npm:otpauth';
```

Versión sin fijar. Se importa la última versión de otpauth en cada deploy. Este especificador `npm:` es una feature de Deno 1.28+; si la versión del runtime de Supabase Edge Functions es anterior, este import fallaría silenciosamente o con error de runtime.

---

## ANÁLISIS DE FRONTEND / UX

### Accesibilidad: ningún atributo ARIA en componentes interactivos

```html
<!-- settings/index.astro:35-40 -->
<button @click="toggleForm(gateway.gateway)" ...>Configurar</button>
<label class="switch">
  <input type="checkbox" :checked="gateway.is_enabled" @change="toggleGateway(gateway)" />
  <span class="slider"></span>
</label>
```

El `<span class="slider">` es el elemento visual del toggle, pero no tiene `role="switch"` ni `aria-checked`. Usuarios de screen readers no pueden determinar el estado del toggle.

### El toggle cambia estado antes de confirmar

Analizado en detalle arriba (C5). UX técnicamente rota.

### checkout/index.astro — cart de localStorage sin validación

```javascript
// checkout/index.astro:212 (aproximado)
const cart = JSON.parse(localStorage.getItem('cart') || '[]');
```

`JSON.parse` puede lanzar si el valor en localStorage está corrupto (ej. un script de terceros escribió en la misma key). No hay try/catch. La página entera falla.

---

## PLAN DE REMEDIACIÓN (orden exacto)

### Semana 1 — Incendios críticos (bloquean toda operación)

1. **`verify-totp/index.ts`**: Implementar verificación TOTP real con `otpauth` (igual que `confirm-totp`)
2. **`verify-totp/index.ts`**: Cambiar `user_metadata` → `app_metadata`
3. **`verify-totp/index.ts`**: Añadir verificación de `role === 'vendor'` antes de verificar TOTP
4. **`create-order/index.ts`**: Cargar CLABE desde credenciales encriptadas del vendor, no hardcodeada
5. **`create-order/index.ts`**: Cambiar URLs PayPal de sandbox a producción (leer de env var)
6. **`checkout-client.ts`**: Reemplazar `getAuthToken()` con `supabaseClient.auth.getSession()`
7. **`settings/index.astro`**: Reemplazar `localStorage.getItem('auth_token')` con sesión de Supabase

### Semana 2 — Seguridad alta

8. **`base-controller.ts`**: Cambiar CORS de `*` a lista de orígenes permitidos desde env
9. **`create-order/index.ts`**: Eliminar CORS `*` de la respuesta (centralizarlo en BaseController)
10. **`00002_auth_triggers.sql`**: Migration nueva que elimine la hardcoded de `admin@tienda.com` y use un campo configurable
11. **`00002_auth_triggers.sql`**: Migration que elimine la policy `"Admin with MFA can read all profiles"` basada en `amr`
12. **`base-controller.ts`**: Rate limiting fail-closed (denegar si la BD falla)
13. **`settings/index.astro`**: Mover cambio de `is_enabled` a DESPUÉS del fetch exitoso

### Semana 3 — Calidad y testing

14. **`manage-products/index.ts`**: Añadir validación Zod en `updateProduct` y `createProduct`
15. **`manage-products/index.ts`**: Validar UUID en `productId` antes de query
16. **`manage-orders/index.ts`**: Añadir tipos concretos a `filters` y `tracking`
17. **`error-handler.ts`**: Reemplazar `console.error` con logger estructurado
18. **`auth-client.test.ts`**: Corregir test de signOut para reflejar comportamiento actual
19. **Añadir tests**: Especialmente para el flujo verify-totp completo, checkout con auth real, toggleGateway con fallo

### Semana 4 — DevOps y deuda técnica

20. **`deploy.yml`**: Añadir `npm run typecheck`
21. **`deploy.yml`**: Añadir `npm audit --audit-level=high`
22. **`deploy.yml`**: Implementar retry en health check
23. **`docker-compose.yml`**: Pinear versión del CLI de Supabase
24. **`Dockerfile.astro`**: Añadir `USER node`, eliminar fallback `|| npm install`
25. **Dependencias Deno**: Pinear versiones exactas en todos los imports

---

## QUICK WINS (bajo esfuerzo, alto impacto)

| Cambio | Esfuerzo | Impacto |
|--------|---------|---------|
| `verify-totp:58` — cambiar `user_metadata` → `app_metadata` | 1 línea | Desbloquea acceso vendor |
| `base-controller.ts:85` — `return false` (fail-closed) | 1 línea | Rate limit seguro |
| `deploy.yml` — añadir `npm run typecheck` | 1 línea | Evita deploys con errores de tipo |
| `settings/index.astro:199` — mover `gateway.is_enabled = !gateway.is_enabled` después del await | 2 líneas | UI consistente |
| `checkout/index.astro:212` — `try { JSON.parse(...) } catch { [] }` | 3 líneas | Evita crash en página de checkout |
| `docker-compose.yml` — pinear versión supabase/cli | 1 línea | Reproducibilidad |

---

## DEUDA TÉCNICA

| Item | Severidad | Esfuerzo de corrección |
|------|-----------|----------------------|
| Sistema mono-vendor (un solo admin hardcoded) | Alta | 2 semanas (cambio de modelo de datos) |
| Sin API versioning | Media | 1 semana |
| Routing frágil en edge functions (sin router real) | Media | 3 días |
| Schema Zod duplicado (core vs create-order) | Media | 1 día |
| Supabase client sin pooling/reutilización | Media | 2 días |
| No hay Playwright/Cypress E2E real | Media | 1 semana |
| No hay mutation testing | Baja | 1 día de setup |
| Dependencias Deno sin lockfile (deno.lock ausente) | Media | 1 hora |
| No hay límite de tamaño en body de requests | Baja | 1 hora |

---

## CÓDIGO QUE ESTÁ BIEN (lo que no hay que tocar)

- **`packages/core`**: Enums, interfaces, schemas Zod — correctos, bien tipados, sin dependencias externas.
- **`base-controller.ts`**: La abstracción BaseController es una buena decisión arquitectónica. El problema es la implementación concreta (CORS, fail-open), no el patrón.
- **`create_order_atomic`** RPC: Uso correcto de `FOR UPDATE` para pesimistic locking. Buen diseño para consistencia de stock.
- **`confirm-totp/index.ts`**: Correctamente corregido con `otpauth`, validación de formato, `app_metadata`.
- **`check-architecture.sh`**: Las 5 reglas están bien elegidas y el script es robusto.
- **`payment-webhook/index.ts`**: Verificación HMAC correcta, idempotencia correcta, validación de monto implementada.
- **`_shared/logger.ts`**: Buena idea usar Logflare en producción. El patrón es correcto.
- **Migraciones 00009-00012**: Contenido correcto, aunque dejaron policies viejas sin limpiar en 00002.
- **`tsconfig.json`**: Modo strict completo con `noUnusedLocals`, `noImplicitAny`, etc.

---

## CONCLUSIÓN FINAL

La primera auditoría y su remediación resolvieron correctamente la mitad de los problemas críticos. Sin embargo, la corrección fue aplicada en el archivo equivocado (`confirm-totp`) mientras el archivo con el bug real en el flujo de login (`verify-totp`) quedó intacto. Esto es **más preocupante que el bug original**: indica que las correcciones no fueron verificadas contra el comportamiento real del sistema.

La consecuencia directa es que en producción:
- Ningún vendor puede iniciar sesión de forma legítima (TOTP real falla contra '123456')
- Los vendedores que conozcan el backdoor ingresan con '123456' pero aun así son bloqueados en todos los endpoints por la inconsistencia `user_metadata`/`app_metadata`
- Los pagos con Hey Banco van a una CLABE de prueba
- El checkout de clientes falla con 401 silencioso

El proyecto tiene una base arquitectónica correcta (RLS, edge functions, enums tipados, migrations, CI/CD). La deuda crítica es de implementación y verificación, no de diseño. Con 2 semanas de trabajo enfocado en los hallazgos C1-C10, el sistema puede estar en condiciones de producción reales.

**Decisión final: NO DESPLEGAR hasta resolver C1, C2, C3, C4 y C5 mínimamente.**
