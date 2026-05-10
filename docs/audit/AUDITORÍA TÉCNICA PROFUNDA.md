# AUDITORÍA TÉCNICA PROFUNDA — MICRO-STORE ARCH

**Fecha**: 2026-05-09  
**Auditores**: Equipo de arquitectura senior (Software Architect, Tech Lead, Staff Engineer, Security Engineer, DevOps, QA, Performance, Database, Clean Code, Test Engineer, Static Analysis)  
**Alcance**: Repositorio completo — apps, supabase, packages, infra, CI/CD  
**Versión auditada**: Node 22 LTS + Astro 5.x

---

## RESUMEN EJECUTIVO

| Dimensión | Estado |
|-----------|--------|
| Estado general | **Prototipo técnico con estructura sólida pero inseguro para producción** |
| Nivel técnico | Junior-Intermedio en implementación, arquitectura de nivel medio-alto |
| Riesgos críticos | **5 vulnerabilidades críticas, 7 altas. Producción imposible.** |
| Deuda técnica | Alta: MFA falso, webhooks sin verificar, tests mínimos, sin pagos reales |
| Readiness producción | **0 % — NO desplegar hasta remediar hallazgos críticos** |

---

## SCORE GLOBAL

| Categoría | Score | Justificación |
|-----------|-------|---------------|
| Arquitectura | **7/10** | Monorepo bien estructurado, Islands pattern correcto, dominio separado. Falla en aislamiento de vendors y capas incompletas. |
| Seguridad | **2/10** | TOTP completamente roto, webhooks sin verificar, claim MFA incorrecto. Inaceptable en producción. |
| Testing | **1/10** | 4 archivos de test en todo el proyecto. Ninguno cubre rutas críticas de pago. |
| Mantenibilidad | **6/10** | Tipos bien definidos, código legible. Duplicación de clientes Supabase, magic strings, strings hardcodeados. |
| Performance | **5/10** | Sin caché, sin paginación cursor-based, sin connection pooling, sin optimización de imágenes. |
| Escalabilidad | **4/10** | Edge Functions escalan bien; BD sin estrategia de caching. Un solo vendor soportado en query crítico. |
| Calidad general | **4/10** | La estructura promete pero la implementación tiene fallas que invalidan el producto. |

---

## HALLAZGOS CRÍTICOS

### 🔴 CRÍTICO-1: TOTP/MFA Completamente Falso

**Archivos**: `supabase/functions/setup-totp/index.ts`, `supabase/functions/confirm-totp/index.ts`

```typescript
// setup-totp/index.ts ~línea 28
const secret = 'JBSWY3DPEHPK3PXP'; // Mismo secret para TODOS los usuarios

// confirm-totp/index.ts ~línea 39
if (totp_code !== '123456') {  // Código hardcodeado
    throw new UnauthorizedError('Código TOTP inválido');
}
```

**Impacto**: La autenticación multifactor es teatro. Cualquier atacante:
1. Entra con contraseña válida
2. Ingresa "123456" y obtiene acceso de vendor con MFA "verificado"
3. Todo el sistema de privilegios elevados está comprometido

**Solución**: Usar `otplib` (compatible con Deno vía `npm:`), generar secretos únicos por usuario almacenados encriptados en `profiles`, verificar con algoritmo TOTP estándar (RFC 6238).

---

### 🔴 CRÍTICO-2: Claim MFA Incorrecto — Escalación de Privilegios

**Archivos**: `supabase/functions/_core/base-controller.ts`, `supabase/migrations/00007_storage_hardening.sql`

```typescript
// base-controller.ts ~línea 61
const isMfaVerified = user.user_metadata?.mfa_verified === 'true'
                   || user.user_metadata?.mfa_verified === true;
```

**Impacto**: `user_metadata` puede modificarse vía `auth.admin.updateUserById()`. Un atacante puede inyectar `mfa_verified: true`. El mecanismo correcto es verificar el nivel de seguridad de la sesión activa usando el `aal` (Authentication Assurance Level) del JWT de Supabase: `aal1` = solo contraseña, `aal2` = MFA verificado.

La política RLS en `00007_storage_hardening.sql` repite el mismo error:
```sql
AND (auth.jwt()->'user_metadata'->>'mfa_verified') = 'true'
```

**Solución**:
```sql
-- En RLS:
AND (auth.jwt()->>'aal') = 'aal2'
```
```typescript
// En Edge Functions:
const aal = (await supabase.auth.mfa.getAuthenticatorAssuranceLevel()).data?.currentLevel;
const isMfaVerified = aal === 'aal2';
```

---

### 🔴 CRÍTICO-3: Webhooks de Pago Sin Verificación de Firma

**Archivo**: `supabase/functions/payment-webhook/index.ts`

```typescript
async handleStripeWebhook(body: string, _signature: string) {
    // _signature recibido pero NUNCA usado
    const event = JSON.parse(body);
}

async handlePayPalWebhook(body: string) {
    const event = JSON.parse(body);
    // Sin verificación alguna
}
```

**Impacto**: Cualquier persona con la URL puede enviar una petición POST falsa marcando órdenes como pagadas sin pago real. Fraude masivo posible desde día 1.

**Solución Stripe**:
```typescript
import Stripe from 'npm:stripe';
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
```

---

### 🔴 CRÍTICO-4: Fallback a Credenciales en Texto Plano

**Archivo**: `supabase/migrations/00004_payment_functions.sql` (~línea 156)

```sql
EXCEPTION WHEN OTHERS THEN
    -- Fallback si pgsodium falla
    credentials_encrypted = p_credentials::TEXT::BYTEA  -- Plaintext disfrazado de BYTEA
```

**Impacto**: Si pgsodium no está configurado (cualquier deploy nuevo sin setup explícito), las credenciales de Stripe/PayPal se guardan sin encriptar. El `EXCEPTION WHEN OTHERS` silencia el error completamente.

**Solución**: Eliminar el bloque EXCEPTION. Fallar explícitamente.

---

### 🔴 CRÍTICO-5: Verificación de Monto Ausente en Webhooks

**Archivo**: `supabase/functions/payment-webhook/index.ts`

**Impacto**: Un atacante puede pagar $1 MXN y el sistema marca la orden de $10,000 MXN como pagada. Incluso con webhooks legítimos, un bug en el procesador que cambia el monto es aceptado sin validar.

**Solución**: Verificar `event.amount_received === order.total_amount * 100` (Stripe usa centavos) antes de confirmar.

---

## HALLAZGOS POR ARCHIVO

### `supabase/functions/create-order/index.ts`

| Problema | Severidad | Línea aprox. |
|---------|-----------|--------------|
| Race condition en rate limiting | Alta | ~34-38 |
| Parsing inseguro de error string | Alta | ~69-71 |

**Race condition**: Dos requests simultáneos pasan el check antes de que el primero complete. El rate limit check no es atómico con la inserción de la orden.

**Parsing frágil**:
```typescript
const productId = error.message.split(':')[1]; // Si el formato cambia → crash o info incorrecta
```

---

### `supabase/functions/manage-payment-gateways/index.ts`

**Aislamiento de vendor roto** (~línea 62): Devuelve el primer vendor por rol, no el vendor del usuario actual. Con múltiples vendors, Vendor B puede leer y modificar las gateways de Vendor A.

---

### `supabase/functions/payment-webhook/index.ts`

**Idempotencia incompleta** (~línea 102): Solo verifica existencia del log, no si el intento anterior tuvo éxito. Un webhook que falló y fue reintentado por el procesador pasa como "ya procesado".

---

### `supabase/migrations/00004_payment_functions.sql`

- **Moneda hardcodeada** (~línea 85): `currency, 'MXN'` — la tabla tiene columna `currency` pero se ignora
- **Sin rollback de stock en cancelación**: Al cancelar una orden, el stock no se restaura

---

### `supabase/functions/login/index.ts`

**Sin rate limiting**: Permite brute force de contraseñas y TOTP sin restricción.

---

### `supabase/functions/change-password/index.ts`

**Política de contraseñas débil**: Solo verifica longitud mínima de 12 caracteres. Sin mayúsculas, números ni caracteres especiales.

---

### `apps/client-hub/src/pages/auth/login.astro`

**Token en localStorage** (~línea 77): Vulnerable a XSS por scripts de terceros (analytics, etc.).

---

### `apps/client-hub/src/pages/checkout/index.astro`

**Mock data silencioso en carrito vacío**: Si el carrito está vacío, se inyectan productos falsos. Código de desarrollo que si llega a producción permite hacer checkout de ítems inexistentes.

**Sin validación en campos de envío**: Campos de formulario sin `pattern`, formato ni sanitización.

---

### `apps/storefront/src/lib/catalog/catalog.ts`

**Sin caché en listado de productos**: Se ejecuta en cada petición. Para un storefront estático de Astro debería resolverse en build time o usar ISR.

---

### `supabase/migrations/00001_initial_schema.sql`

**Sequence overflow**: `FM000000` permite máximo 999,999 órdenes/año. Al desbordarse, la constraint UNIQUE falla causando 500s en creación de órdenes.

**Sin unique constraint en `webhook_logs.event_id`**: Permite race condition con logs duplicados.

---

## CÓDIGO DUPLICADO

| Patrón | Archivos | Impacto |
|--------|----------|---------|
| Inicialización del cliente Supabase | `apps/*/src/lib/supabase-client.ts` (3 copias) | Cambio en lógica requiere actualizar 3 archivos |
| `requireMFA()` no llamado consistentemente | Todos los Edge Functions | Protección inconsistente entre endpoints |
| URLs de Edge Functions con `PUBLIC_API_BASE` | `apps/client-hub/*`, `apps/vendor-admin/*` | Sin type safety ni validación |

---

## CÓDIGO MUERTO

| Archivo | Código muerto | Impacto |
|---------|--------------|---------|
| `payment-webhook/index.ts` | Parámetro `_signature` recibido y nunca usado | Intención no implementada |
| `00001_initial_schema.sql` | Columna `currency` en `orders` | Siempre se inserta 'MXN' hardcodeado |
| `_core/base-controller.ts` | `requireMFA()` no llamado en todos los endpoints | Protección inconsistente |
| `checkout/index.astro` | Mock data del carrito | Código de dev en producción |

---

## TESTS FALTANTES

### Prioridad CRÍTICA

| Test | Razón |
|------|-------|
| Verificación de firma de webhook Stripe | Sin esto, fraude posible desde día 1 |
| Verificación de firma de webhook PayPal/MercadoPago | Ídem |
| Validación de monto en confirmación de pago | Pago de $1 acepta orden de $10,000 |
| TOTP real: generación, validación, expiración | Implementación actual es hardcoded |
| `confirm_order_payment` — atomicidad | Doble procesamiento de webhook |
| Race condition en rate limiting de `create-order` | N requests paralelas bypassan el límite |
| Aislamiento multi-vendor en payment-gateways | Vendor B accede a datos de Vendor A |

### Prioridad ALTA

| Test | Razón |
|------|-------|
| Transiciones de estado de orden | Estados inválidos pueden corromperse |
| Restauración de stock en cancelación | Stock puede quedar reservado indefinidamente |
| RLS policies — acceso cross-user | Verificar que users no lean pedidos ajenos |
| `generate_order_display_id` overflow | Falla silenciosa al superar 999,999 |

### Prioridad MEDIA

| Test | Razón |
|------|-------|
| `getVisibleProducts` — productos no visibles excluidos | Regresión posible |
| Validación de formulario de checkout | UX y datos inválidos |
| `OrderStatus` enum en transiciones de estado | Casos límite sin cobertura |

---

## RIESGOS DE PRODUCCIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Fraude por webhook falso | Alta | Catastrófico | Verificación de firma inmediata |
| MFA bypasseable con "123456" | Certeza | Catastrófico | Reimplementar TOTP completamente |
| Credenciales de pago en plaintext | Alta | Crítico | Eliminar fallback, verificar pgsodium |
| Escalación de privilegios via user_metadata | Media | Alto | Migrar a AAL de Supabase |
| Mock data de carrito en checkout | Alta | Alto | Eliminar inmediatamente |
| Sequence overflow > 999,999 órdenes | Baja corto plazo | Alto | Cambiar a BIGINT display |
| Vendor B accede a gateways de Vendor A | Alta con múltiples vendors | Alto | Fix query con user.id |
| Token JWT robado via XSS + localStorage | Media | Alto | Migrar a cookies HttpOnly |

---

## PLAN DE REMEDIACIÓN

### Fase 1 — Bloqueadores de Producción

1. Eliminar mock data del carrito
2. Reimplementar TOTP real con otplib
3. Migrar MFA check a AAL de Supabase
4. Verificar firma de webhooks (Stripe, PayPal, MercadoPago)
5. Validar monto en confirmación de pago
6. Eliminar fallback plaintext en payment_functions.sql
7. Fix aislamiento de vendor en manage-payment-gateways

### Fase 2 — Seguridad Complementaria

8. Rate limiting en login, confirm-totp, setup-totp
9. Fix idempotencia de webhooks (verificar status, no solo existencia)
10. Restaurar stock en cancelación de orden
11. Migrar token de localStorage a cookies HttpOnly vía Supabase SSR
12. Política de complejidad de contraseñas

### Fase 3 — Calidad y Tests

13. Tests para webhooks (firma, monto, idempotencia)
14. Tests para TOTP (generación, validación, expiración)
15. Tests de RLS (aislamiento cross-user)
16. Tests de transiciones de estado de orden

### Fase 4 — Performance y Features

17. Tabla `audit_logs` para trazabilidad de operaciones críticas
18. Tabla `payment_transactions` para ciclo de vida completo del pago
19. Unique constraint en `webhook_logs.event_id`
20. Paginación cursor-based en manage-orders
21. Validación de inputs en formularios de checkout
22. CSP headers en las apps Astro

---

## DEUDA TÉCNICA PRIORIZADA

| # | Deuda | Costo si no se paga |
|---|-------|---------------------|
| 1 | TOTP hardcodeado | Compromiso total de auth |
| 2 | Webhooks sin firma | Fraude de pagos |
| 3 | Sin tabla `payment_transactions` | Imposible auditar pagos, sin retry, sin refunds |
| 4 | Sin `audit_logs` | Sin compliance, imposible investigar incidentes |
| 5 | Mock data en checkout | Bug crítico en prod si se olvida |
| 6 | 0% cobertura en rutas de pago | Cualquier cambio puede romper todo |
| 7 | Sin email verification en signup | Usuarios con emails falsos |
| 8 | Sin password reset | Usuarios bloqueados para siempre |
| 9 | Currency hardcodeada 'MXN' | No internacionalizable |
| 10 | Token en localStorage | Vulnerable a XSS de third-party scripts |
| 11 | Sin paginación cursor-based | A partir de ~10k órdenes, endpoints lentos |
| 12 | Supabase client duplicado x3 | Drift de configuración entre apps |
| 13 | Sequence order display FM000000 | Falla a 1M órdenes/año |

---

## CONCLUSIÓN FINAL

El proyecto tiene una arquitectura que demuestra criterio técnico — monorepo bien organizado, separación de dominio clara, Edge Functions correctamente responsabilizadas, RLS en la base de datos, código generalmente legible con TypeScript estricto. El desarrollador sabe diseñar sistemas.

**Sin embargo**, las implementaciones de seguridad críticas están rotas de forma fundamental:

1. El sistema de MFA/TOTP es **totalmente ficticio**. Un atacante con cuenta básica ingresa "123456" y obtiene acceso de vendor.
2. Los webhooks de pago **no verifican firmas**. Cualquier petición POST a la URL marca órdenes como pagadas.
3. El fallback de encriptación **guarda credenciales de Stripe en texto plano** silenciosamente.

Estos no son bugs menores — son vulnerabilidades que hacen que el sistema sea activamente inseguro si se despliega. La deuda técnica de testing también es crítica: no existe ni un solo test para las rutas de pago.

**Diagnóstico**: Prototipo avanzado donde las implementaciones de seguridad se dejaron como placeholder. Es recuperable con trabajo enfocado.

**Veredicto**: **No desplegar en producción** hasta completar al menos la Fase 1 y Fase 2. El riesgo de fraude y compromiso de credenciales es certero, no hipotético.
