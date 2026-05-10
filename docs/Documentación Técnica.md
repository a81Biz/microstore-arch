# Documentación Técnica / API

**Proyecto:** Micro-Store Arch
**Versión:** 1.0
**Fecha:** Mayo 2026

---

## 1. Introducción

### 1.1 Propósito
Este documento describe todas las interfaces de programación (APIs) del sistema, incluyendo Edge Functions, endpoints, métodos HTTP, esquemas de entrada/salida, códigos de error y ejemplos de uso.

### 1.2 Base URL

| Entorno | URL |
|---|---|
| Desarrollo Local | `http://localhost:54321/functions/v1` |
| Producción | `https://[project-ref].supabase.co/functions/v1` |

### 1.3 Autenticación

Todas las APIs que requieren autenticación usan Bearer Token (JWT de Supabase):

```
Authorization: Bearer <jwt_token>
```

Las APIs de administración requieren adicionalmente el claim `amr: ['pwd', 'mfa']` en el JWT.

---

## 2. Endpoints de Autenticación

### 2.1 Login

**Endpoint:** `POST /login`

**Descripción:** Inicia sesión y determina los pasos siguientes (cambio de contraseña, verificación TOTP, o acceso directo).

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Responses:**

| Código | Descripción | Body |
|---|---|---|
| 200 | Login exitoso (sin pasos adicionales) | `{ "next_step": "complete", "access_token": "...", "refresh_token": "...", "user": { "id": "...", "email": "...", "role": "..." } }` |
| 200 | Requiere cambio de contraseña | `{ "next_step": "change_password", "temp_token": "...", "message": "Debes cambiar tu contraseña" }` |
| 200 | Requiere verificación TOTP | `{ "next_step": "verify_totp", "temp_token": "...", "message": "Ingresa el código" }` |
| 401 | Credenciales inválidas | `{ "error": "UNAUTHORIZED", "message": "Credenciales inválidas" }` |

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:54321/functions/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email": "cliente@test.com", "password": "password123"}'
```

---

### 2.2 Verificar TOTP

**Endpoint:** `POST /verify-totp`

**Descripción:** Verifica el código TOTP y devuelve token con MFA.

**Request Body:**
```json
{
  "temp_token": "string (JWT con claim amr: ['pwd'])",
  "totp_code": "string (6 dígitos)"
}
```

**Responses:**

| Código | Descripción | Body |
|---|---|---|
| 200 | TOTP válido | `{ "success": true, "access_token": "...", "message": "Autenticación de segundo factor exitosa" }` |
| 401 | Código inválido | `{ "error": "UNAUTHORIZED", "message": "Código TOTP inválido" }` |

---

### 2.3 Cambio de Contraseña

**Endpoint:** `POST /change-password`

**Descripción:** Ejecuta el cambio de contraseña obligatorio para nuevos usuarios.

**Request Body:**
```json
{
  "temp_token": "string",
  "new_password": "string (mínimo 12 caracteres, complejos)"
}
```

**Responses:**

| Código | Descripción | Body |
|---|---|---|
| 200 | Cambio exitoso | `{ "success": true, "message": "Contraseña actualizada. Por favor inicia sesión de nuevo." }` |
| 400 | Contraseña débil | `{ "error": "WEAK_PASSWORD", "message": "La contraseña no cumple con los requisitos mínimos" }` |
| 401 | Token inválido | `{ "error": "UNAUTHORIZED", "message": "Token inválido o expirado" }` |

---

### 2.4 Configurar TOTP

**Endpoint:** `POST /setup-totp`

**Descripción:** Genera secreto TOTP y devuelve URL para generar QR.

**Request Body:**
```json
{
  "temp_token": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "otpauth_url": "otpauth://totp/Micro-Store:admin@tienda.com?secret=...",
  "message": "Escanea el código QR con Google Authenticator"
}
```

---

### 2.5 Confirmar TOTP

**Endpoint:** `POST /confirm-totp`

**Descripción:** Activa TOTP después de verificar el código inicial.

**Request Body:**
```json
{
  "temp_token": "string",
  "totp_code": "string (6 dígitos)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Google Authenticator activado correctamente"
}
```

---

## 3. Endpoints de Productos

### 3.1 Crear Orden (Checkout)

**Endpoint:** `POST /create-order`

**Auth:** Requerido (Bearer Token de cliente)

**Request Body:**
```json
{
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2
    }
  ],
  "shipping_address": {
    "street": "Av. Siempre Viva 742",
    "city": "Springfield",
    "postal_code": "49000",
    "country": "MX"
  },
  "payment_method": "stripe"
}
```

**Validaciones:**
- `items`: Array con al menos 1 elemento
- `product_id`: UUID válido
- `quantity`: Entero positivo
- `shipping_address.street`: Mínimo 5 caracteres
- `shipping_address.city`: Mínimo 2 caracteres
- `shipping_address.postal_code`: Mínimo 4 caracteres
- `shipping_address.country`: Exactamente 2 caracteres (ISO)
- `payment_method`: `stripe` | `paypal` | `mercadopago` | `hey_banco`

**Response (201):**
```json
{
  "orderId": "uuid",
  "displayId": "TX-2026-0001",
  "totalAmount": 99.98,
  "currency": "MXN",
  "payment": {
    "gateway": "stripe",
    "clientSecret": "pi_3N..._secret_..."
  }
}
```

> 💡 **Nota:** La `publishableKey` debe obtenerse desde `GET /payment-gateways/public`.

**Errores:**

| Código | Error | Descripción |
|---|---|---|
| 400 | `INSUFFICIENT_STOCK` | Stock insuficiente para un producto |
| 400 | `GATEWAY_DISABLED` | Pasarela no disponible |
| 401 | `UNAUTHORIZED` | Token inválido o expirado |
| 422 | `VALIDATION_ERROR` | Datos de entrada inválidos |

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:54321/functions/v1/create-order \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"product_id": "123e4567-e89b-12d3-a456-426614174000", "quantity": 2}],
    "shipping_address": {"street": "Av. Siempre Viva 742", "city": "Springfield", "postal_code": "49000", "country": "MX"},
    "payment_method": "stripe"
  }'
```

---

## 4. Endpoints de Webhooks de Pago

> ⚠️ **Nota:** Los webhooks deben ser **idempotentes**: verificar `event_id` ya procesado antes de ejecutar lógica.

### 4.1 Webhook de Stripe

**Endpoint:** `POST /payment-webhook/stripe`

**Auth:** Firma HMAC (Stripe Signature)

**Headers:**
```
stripe-signature: t=123456,v1=abcdef...
Content-Type: application/json
```

**Request Body (evento payment_intent.succeeded):**
```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_3N...",
      "metadata": {
        "order_id": "uuid"
      }
    }
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "orderStatus": "paid",
  "orderId": "uuid"
}
```

### 4.2 Webhook de PayPal

**Endpoint:** `POST /payment-webhook/paypal`

**Request Body (evento CHECKOUT.ORDER.APPROVED):**
```json
{
  "event_type": "CHECKOUT.ORDER.APPROVED",
  "resource": {
    "id": "order_id",
    "purchase_units": [
      {
        "reference_id": "order_uuid"
      }
    ]
  }
}
```

### 4.3 Webhook de Mercado Pago

**Endpoint:** `POST /payment-webhook/mercadopago`

**Request Body:**
```json
{
  "type": "payment",
  "action": "payment.created",
  "data": {
    "id": "payment_id"
  }
}
```

### 4.4 Webhook de Hey Banco

**Endpoint:** `POST /payment-webhook/hey_banco`

**Request Body:**
```json
{
  "status": "completed",
  "reference": "order_uuid",
  "transaction_id": "txn_id"
}
```

---

## 5. Endpoints de Gestión (Admin)

### 5.1 Listar Pedidos

**Endpoint:** `GET /manage-orders`

**Auth:** Requerido (Admin con MFA)

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `status` | string | Filtrar por estado |
| `search` | string | Buscar por email o display_id |
| `dateFrom` | ISO date | Fecha desde |
| `dateTo` | ISO date | Fecha hasta |
| `limit` | integer | Límite (default 50) |
| `offset` | integer | Offset (default 0) |

**Response (200):**
```json
[
  {
    "id": "uuid",
    "display_id": "TX-2026-0001",
    "customer_email": "cliente@test.com",
    "status": "paid",
    "total_amount": 99.98,
    "currency": "MXN",
    "tracking_id": null,
    "carrier": null,
    "items_count": 2,
    "created_at": "2026-05-09T12:00:00Z"
  }
]
```

### 5.2 Detalle de Pedido

**Endpoint:** `GET /manage-orders/{orderId}`

**Auth:** Requerido (Admin con MFA, o cliente dueño del pedido)

**Response (200):**
```json
{
  "id": "uuid",
  "display_id": "TX-2026-0001",
  "status": "paid",
  "shipping_address": { "street": "...", "city": "...", "postal_code": "...", "country": "MX" },
  "total_amount": 99.98,
  "currency": "MXN",
  "tracking_id": null,
  "carrier": null,
  "profiles": { "email": "cliente@test.com" },
  "order_items": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "quantity": 2,
      "unit_price": 49.99,
      "fulfillment_status": "reserved",
      "products": { "name": "Producto", "slug": "producto" }
    }
  ]
}
```

### 5.3 Actualizar Tracking

**Endpoint:** `PATCH /manage-orders/{orderId}/tracking`

**Auth:** Requerido (Admin con MFA)

**Request Body:**
```json
{
  "trackingId": "ABC123456",
  "carrier": "dhl"
}
```

**Carriers válidos:** `dhl` | `fedex` | `estafeta` | `correos_mexico`

**Response (200):**
```json
{
  "order_id": "uuid",
  "display_id": "TX-2026-0001",
  "status": "shipped",
  "tracking_id": "ABC123456",
  "carrier": "dhl",
  "shipped_at": "2026-05-09T15:00:00Z"
}
```

### 5.4 Actualizar Estado de Pedido

**Endpoint:** `PATCH /manage-orders/{orderId}/status`

**Auth:** Requerido (Admin con MFA)

**Request Body:**
```json
{
  "status": "in_production"
}
```

**Transiciones válidas:**
- `paid` → `in_production`
- `in_production` → `shipped` (requiere tracking)
- `shipped` → `delivered`
- `pending` → `cancelled`

**Response (200):**
```json
{
  "order_id": "uuid",
  "display_id": "TX-2026-0001",
  "previous_status": "paid",
  "new_status": "in_production",
  "updated_at": "2026-05-09T14:00:00Z"
}
```

---

### 5.5 Listar Productos (Admin)

**Endpoint:** `GET /manage-products`

**Auth:** Requerido (Admin con MFA)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "slug": "producto-ejemplo",
    "name": "Producto Ejemplo",
    "description": "Descripción del producto",
    "price": 49.99,
    "stock_quantity": 100,
    "is_on_demand": false,
    "is_visible": true,
    "created_at": "2026-05-01T00:00:00Z",
    "updated_at": "2026-05-09T12:00:00Z"
  }
]
```

### 5.6 Crear Producto

**Endpoint:** `POST /manage-products`

**Auth:** Requerido (Admin con MFA)

**Request Body:**
```json
{
  "name": "Nuevo Producto",
  "description": "Descripción opcional",
  "price": 29.99,
  "stockQuantity": 50,
  "isOnDemand": false,
  "isVisible": true
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "slug": "nuevo-producto",
  "name": "Nuevo Producto",
  "description": "Descripción opcional",
  "price": 29.99,
  "stock_quantity": 50,
  "is_on_demand": false,
  "is_visible": true,
  "created_at": "2026-05-09T16:00:00Z"
}
```

### 5.7 Actualizar Producto

**Endpoint:** `PUT /manage-products/{productId}`

**Auth:** Requerido (Admin con MFA)

**Request Body (parcial):**
```json
{
  "price": 24.99,
  "stockQuantity": 45
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "price": 24.99,
  "stock_quantity": 45,
  "updated_at": "2026-05-09T16:30:00Z"
}
```

### 5.8 Eliminar Producto

**Endpoint:** `DELETE /manage-products/{productId}`

**Auth:** Requerido (Admin con MFA)

**Response (200):**
```json
{
  "success": true,
  "message": "Producto eliminado correctamente"
}
```

---

### 5.9 Configurar Pasarela de Pago

**Endpoint:** `POST /manage-payment-gateways`

**Auth:** Requerido (Admin con MFA)

**Request Body (Stripe):**
```json
{
  "gateway": "stripe",
  "is_enabled": true,
  "credentials": {
    "publishableKey": "pk_live_...",
    "secretKey": "sk_live_...",
    "webhookSecret": "whsec_..."
  }
}
```

**Request Body (PayPal):**
```json
{
  "gateway": "paypal",
  "is_enabled": true,
  "credentials": {
    "clientId": "...",
    "secret": "..."
  }
}
```

**Nota de seguridad:** Las credenciales se encriptan con pgsodium antes de almacenarse. Nunca se devuelven en las respuestas.

**Response (200):**
```json
{
  "success": true,
  "gateway": "stripe"
}
```

### 5.10 Listar Pasarelas

**Endpoint:** `GET /manage-payment-gateways`

**Auth:** Requerido (Admin con MFA)

**Response (200):**
```json
[
  {
    "gateway": "stripe",
    "is_enabled": true,
    "last_rotated_at": "2026-05-01T00:00:00Z",
    "created_at": "2026-05-01T00:00:00Z"
  },
  {
    "gateway": "paypal",
    "is_enabled": false,
    "last_rotated_at": null,
    "created_at": "2026-05-01T00:00:00Z"
  }
]
```

---

### 5.11 Obtener Pasarelas Activas (Público)

**Endpoint:** `GET /manage-payment-gateways/public`

**Auth:** No requerido

**Response (200):**
```json
[
  { "gateway": "stripe", "publishableKey": "pk_test_..." },
  { "gateway": "mercadopago", "publishableKey": "APP_USR-..." }
]
```

---

## 6. Endpoints de Sistema

### 6.1 Disparar Rebuild del Storefront

**Endpoint:** `POST /trigger-rebuild`

**Auth:** Requerido (Service Role o Admin)

**Response (202):**
```json
{
  "success": true,
  "message": "Rebuild del storefront iniciado"
}
```

### 6.2 Health Check

**Endpoint:** `GET /health`

**Auth:** No requerido

**Response (200):**
```json
{
  "status": "ok",
  "service": "micro-store-arch",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2026-05-09T12:00:00Z",
  "uptime": 12345,
  "database": "connected",
  "products_count": 5,
  "payment_gateways": [
    { "gateway": "stripe", "is_enabled": true }
  ],
  "memory": {
    "heapUsed": "45MB",
    "heapTotal": "64MB"
  }
}
```

**Response (503 - si BD no disponible):**
```json
{
  "status": "ok",
  "database": "error",
  "database_error": "Connection refused"
}
```

---

## 7. Códigos de Error Comunes

| Código HTTP | Código de Error | Descripción |
|---|---|---|
| 400 | `INSUFFICIENT_STOCK` | Stock insuficiente |
| 400 | `GATEWAY_DISABLED` | Pasarela no disponible |
| 400 | `INVALID_TRANSITION` | Transición de estado inválida |
| 400 | `INVALID_GATEWAY` | Pasarela no soportada |
| 401 | `UNAUTHORIZED` | Token inválido, expirado o sin permisos |
| 404 | `ORDER_NOT_FOUND` | Pedido no encontrado |
| 404 | `PRODUCT_NOT_FOUND` | Producto no encontrado |
| 405 | `METHOD_NOT_ALLOWED` | Método HTTP no permitido |
| 422 | `VALIDATION_ERROR` | Error de validación (Zod) |
| 500 | `INTERNAL_SERVER_ERROR` | Error interno del servidor |

---

## 8. Modelos de Datos Compartidos

### 8.1 Enums (TypeScript)

```typescript
// @micro-store/core/enums
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  IN_PRODUCTION = 'in_production',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum ItemFulfillmentStatus {
  PENDING = 'pending',
  RESERVED = 'reserved',
  IN_PRODUCTION = 'in_production',
  READY_TO_SHIP = 'ready_to_ship',
  SHIPPED = 'shipped'
}

export enum PaymentGateway {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  MERCADOPAGO = 'mercadopago',
  HEY_BANCO = 'hey_banco'
}

export enum UserRole {
  CUSTOMER = 'customer',
  VENDOR = 'vendor'
}
```

### 8.2 Schemas Zod

```typescript
// @micro-store/core/schemas
export const ShippingAddressSchema = z.object({
  street: z.string().min(5),
  city: z.string().min(2),
  postal_code: z.string().min(4),
  country: z.string().length(2)
});

export const CreateOrderPayloadSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive()
  })).min(1),
  shipping_address: ShippingAddressSchema,
  payment_method: z.nativeEnum(PaymentGateway)
});

export const OrderTrackingSchema = z.object({
  tracking_id: z.string().min(5),
  carrier: z.enum(['dhl', 'fedex', 'estafeta', 'correos_mexico'])
});
```

---

## 9. Rate Limiting

| Endpoint | Límite | Ventana |
|---|---|---|
| `POST /login` | 5 | 1 minuto |
| `POST /create-order` | 10 | 1 minuto |
| `POST /payment-webhook/*` | Ilimitado | N/A (externo) |
| `GET /manage-*` | 100 | 1 minuto |
| `POST/PUT/DELETE /manage-*` | 50 | 1 minuto |

**Mecanismo de Implementación:**
Usar `@supabase/rls` + contador en Redis (Upstash Free) o lógica en Edge Function con KV.

---

## 10. Versionado

La API actual es v1. Todas las rutas usan el prefijo implícito `/functions/v1/`. Cambios futuros deben versionarse:

```
/functions/v1/create-order   (actual)
/functions/v2/create-order   (futuro)
```

---

## 11. Ejemplos de Uso

### 11.1 Flujo Completo de Compra

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:54321/functions/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@test.com","password":"pass123"}' \
  | jq -r '.access_token')

# 2. Crear orden
curl -X POST http://localhost:54321/functions/v1/create-order \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"product_id": "PRODUCT-UUID", "quantity": 1}],
    "shipping_address": {"street":"Calle 123","city":"CDMX","postal_code":"06000","country":"MX"},
    "payment_method": "stripe"
  }'

# 3. El pago se procesa externamente y Stripe llama al webhook
# POST /payment-webhook/stripe (automático)

# 4. Verificar pedido
curl http://localhost:54321/functions/v1/manage-orders/ORDER-UUID \
  -H "Authorization: Bearer $TOKEN"
```

### 11.2 Flujo Admin - Actualizar Tracking

```bash
# 1. Login admin (con MFA)
ADMIN_TOKEN=$(curl -s -X POST http://localhost:54321/functions/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tienda.com","password":"admin123"}' \
  | jq -r '.temp_token')

# 2. Verificar TOTP
FINAL_TOKEN=$(curl -s -X POST http://localhost:54321/functions/v1/verify-totp \
  -H "Content-Type: application/json" \
  -d "{\"temp_token\":\"$ADMIN_TOKEN\",\"totp_code\":\"123456\"}" \
  | jq -r '.access_token')

# 3. Actualizar tracking
curl -X PATCH http://localhost:54321/functions/v1/manage-orders/ORDER-UUID/tracking \
  -H "Authorization: Bearer $FINAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"trackingId":"DHL123456","carrier":"dhl"}'
```

---

**Documentación API completa. Última actualización: Mayo 2026.**