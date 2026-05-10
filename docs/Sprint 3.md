# 📦 Micro-Store Arch — Sprint 3: Checkout y Pagos

**Versión:** 1.0
**Duración:** 3 semanas
**Objetivo:** Implementar el flujo completo de checkout y pagos con múltiples pasarelas (Stripe, PayPal, Mercado Pago, Hey Banco), incluyendo la Edge Function de creación de órdenes, webhooks de confirmación de pago, y el panel de configuración de pasarelas en el Vendor Admin.

**Dependencia:** Sprint 2 completado (catálogo funcional, productos gestionables).

---

## 🎯 Objetivos del Sprint

1. Implementar el flujo de checkout en Client Hub (React SPA) con selección de método de pago.
2. Crear la Edge Function `create-order` con validación atómica de stock.
3. Integrar Stripe, PayPal, Mercado Pago y Hey Banco como pasarelas.
4. Implementar webhooks de confirmación de pago para cada pasarela (Manejo de **idempotencia** obligatorio).
5. Crear panel de configuración de pasarelas en Vendor Admin.
6. Implementar encriptación de credenciales con pgsodium.
7. Configurar emails transaccionales de confirmación (Resend).
8. Implementar pruebas E2E del flujo de compra completo.
9. Mantener estricta separación arquitectónica.

---

## 📋 Historias de Usuario

### Cliente
- **HU-03a:** Como cliente, quiero seleccionar productos y proceder al checkout.
- **HU-03b:** Como cliente, quiero elegir entre Stripe, PayPal, Mercado Pago o Hey Banco para pagar.
- **HU-03c:** Como cliente, quiero recibir confirmación por email cuando mi pago sea exitoso.
- **HU-03d:** Como cliente, quiero ver un resumen de mi pedido antes de pagar.

### Vendedor
- **HU-06a:** Como vendedor, quiero configurar las credenciales de cada pasarela de pago.
- **HU-06b:** Como vendedor, quiero activar/desactivar métodos de pago específicos.
- **HU-06c:** Como vendedor, quiero que mis credenciales estén encriptadas y nunca expuestas.
- **HU-06d:** Como vendedor, quiero ver qué pasarelas están activas para los clientes.

---

## 📐 Reglas Arquitectónicas (Recordatorio)

| Regla | Permitido | Prohibido |
|---|---|---|
| **Markup HTML** | Solo en `.astro` | `.ts`, `.js` |
| **Estilos CSS** | Solo en `.css` | `style=""` inline |
| **Lógica** | Solo en `.ts`, frontmatter `---` | `<script>` inline en HTML |
| **Enums/Tipos** | `@micro-store/core` | Strings literales, `any` |
| **Componentes Hub/Admin** | React (client:*) | Alpine.js puro |
| **Componentes Storefront**| Astro + Alpine.js | React |
| **Credenciales** | Encriptadas con pgsodium | Texto plano en BD o frontend |

---

## 📁 Tarea 3.0: Estructura de Carpetas (Nuevos Archivos)

```bash
# Client Hub - Checkout
mkdir -p apps/client-hub/src/pages/checkout
mkdir -p apps/client-hub/src/lib/checkout
mkdir -p apps/client-hub/src/components/checkout

# Vendor Admin - Configuración de Pagos
mkdir -p apps/vendor-admin/src/pages/settings
mkdir -p apps/vendor-admin/src/lib/payment-gateways

# Edge Functions
mkdir -p supabase/functions/create-order
mkdir -p supabase/functions/payment-webhook
mkdir -p supabase/functions/manage-payment-gateways
mkdir -p supabase/functions/send-order-email

# Migraciones
# supabase/migrations/00004_payment_functions.sql

# Tests
mkdir -p apps/client-hub/src/__tests__/e2e
```

---

## 📁 Tarea 3.1: Base de Datos - Funciones de Pago

### `supabase/migrations/00004_payment_functions.sql`

```sql
-- Micro-Store Arch: Funciones y Procedimientos de Pago
-- Versión: 1.0

BEGIN;

-- 1. Extensión para encriptación
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- 2. Función atómica para crear orden con validación de stock
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_customer_id UUID,
  p_shipping_address JSONB,
  p_items JSONB,
  p_payment_method payment_gateway,
  p_payment_intent_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_display_id TEXT;
  v_total DECIMAL(10,2) := 0;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_unit_price DECIMAL(10,2);
  v_is_on_demand BOOLEAN;
  v_stock_quantity INTEGER;
  v_order_status order_status := 'pending';
BEGIN
  -- 1. Validar stock para cada ítem (bloqueo pesimista)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    
    -- Bloquear fila del producto
    SELECT is_on_demand, stock_quantity, price
    INTO v_is_on_demand, v_stock_quantity, v_unit_price
    FROM products
    WHERE id = v_product_id
    FOR UPDATE;
    
    -- Validar disponibilidad
    IF NOT v_is_on_demand AND v_stock_quantity < v_quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_product_id;
    END IF;
    
    -- Acumular total
    v_total := v_total + (v_unit_price * v_quantity);
  END LOOP;
  
  -- 2. Crear orden
  v_display_id := generate_order_display_id();
  
  INSERT INTO orders (
    display_id, customer_id, status, 
    shipping_address, total_amount, currency
  ) VALUES (
    v_display_id, p_customer_id, v_order_status,
    p_shipping_address, v_total, 'MXN'
  )
  RETURNING id INTO v_order_id;
  
  -- 3. Crear ítems de la orden
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    
    SELECT price INTO v_unit_price
    FROM products WHERE id = v_product_id;
    
    INSERT INTO order_items (
      order_id, product_id, quantity, unit_price, fulfillment_status
    ) VALUES (
      v_order_id, v_product_id, v_quantity, v_unit_price, 'pending'
    );
  END LOOP;
  
  -- 4. Retornar resultado
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'display_id', v_display_id,
    'total_amount', v_total,
    'currency', 'MXN',
    'status', v_order_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para confirmar pago y reservar stock
CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  p_order_id UUID,
  p_payment_intent_id TEXT,
  p_payment_method payment_gateway
)
RETURNS JSONB AS $$
DECLARE
  v_item RECORD;
  v_product_id UUID;
  v_quantity INTEGER;
  v_is_on_demand BOOLEAN;
  v_new_status order_status;
BEGIN
  -- 1. Verificar que la orden existe y está pendiente
  IF NOT EXISTS (
    SELECT 1 FROM orders 
    WHERE id = p_order_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND_OR_ALREADY_PROCESSED';
  END IF;
  
  -- 2. Procesar cada ítem
  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    -- Bloquear producto
    SELECT is_on_demand INTO v_is_on_demand
    FROM products WHERE id = v_item.product_id FOR UPDATE;
    
    IF NOT v_is_on_demand THEN
      -- Reservar stock físico
      UPDATE products 
      SET 
        stock_quantity = stock_quantity - v_item.quantity,
        last_stock_change = NOW(),
        updated_at = NOW()
      WHERE id = v_item.product_id;
      
      UPDATE order_items 
      SET fulfillment_status = 'reserved'
      WHERE id = v_item.id;
    ELSE
      -- Marcar para producción
      UPDATE order_items 
      SET fulfillment_status = 'in_production'
      WHERE id = v_item.id;
    END IF;
  END LOOP;
  
  -- 3. Calcular nuevo estado
  SELECT update_order_status(p_order_id) INTO v_new_status;
  
  -- 4. Guardar referencia de pago (en metadata de la orden)
  -- En producción, crearías una tabla payment_transactions
  
  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', v_new_status,
    'payment_intent_id', p_payment_intent_id,
    'confirmed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para encriptar credenciales de pago
CREATE OR REPLACE FUNCTION public.save_payment_credentials(
  p_vendor_id UUID,
  p_gateway payment_gateway,
  p_credentials JSONB
)
RETURNS VOID AS $$
DECLARE
  v_encrypted BYTEA;
BEGIN
  -- Encriptar credenciales con pgsodium usando clave maestra
  -- La clave se obtiene de una variable de entorno o vault
  v_encrypted := pgsodium.crypto_secretbox(
    p_credentials::TEXT::BYTEA,
    gen_random_uuid()::TEXT::BYTEA, -- nonce (en producción usar nonce adecuado)
    current_setting('app.encryption_key')::BYTEA
  );
  
  -- Insertar o actualizar
  INSERT INTO payment_credentials (
    vendor_id, gateway, is_enabled, credentials_encrypted
  ) VALUES (
    p_vendor_id, p_gateway, TRUE, v_encrypted
  )
  ON CONFLICT (vendor_id, gateway)
  DO UPDATE SET 
    credentials_encrypted = v_encrypted,
    last_rotated_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para obtener métodos de pago activos (para el checkout)
CREATE OR REPLACE FUNCTION public.get_active_payment_methods()
RETURNS TABLE (
  gateway payment_gateway,
  is_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
    SELECT pc.gateway, pc.is_enabled
    FROM payment_credentials pc
    WHERE pc.is_enabled = TRUE
    ORDER BY pc.gateway;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
```

---

## 📁 Tarea 3.2: Edge Functions de Pago

### 3.2.1 Crear Orden

**`supabase/functions/create-order/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { CreateOrderPayloadSchema } from "../../../packages/core/src/schemas/order.schema.ts";
import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { handleError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('create-order');

class CreateOrderController extends BaseController {
  
  async execute(authHeader: string, payload: any) {
    const user = await this.authenticateUser(authHeader);
    
    // 1. Validar payload
    const validated = CreateOrderPayloadSchema.parse(payload);
    
    logger.info('Creating order', { userId: user.id, paymentMethod: validated.payment_method });
    
    // 2. Verificar que la pasarela esté activa
    const { data: gateway } = await this.dbAdmin
      .from('payment_credentials')
      .select('is_enabled')
      .eq('gateway', validated.payment_method)
      .single();
    
    if (!gateway?.is_enabled) {
      throw new BusinessError(
        'GATEWAY_DISABLED',
        `La pasarela ${validated.payment_method} no está disponible`,
        400
      );
    }
    
    // 3. Crear orden atómicamente
    const { data: order, error } = await this.dbAdmin.rpc('create_order_atomic', {
      p_customer_id: user.id,
      p_shipping_address: validated.shipping_address,
      p_items: validated.items,
      p_payment_method: validated.payment_method
    });
    
    if (error) {
      if (error.message.includes('INSUFFICIENT_STOCK')) {
        const productId = error.message.split(':')[1];
        throw new BusinessError('INSUFFICIENT_STOCK', `Stock insuficiente`, 400, { productId });
      }
      throw error;
    }
    
    // 4. Crear Payment Intent en la pasarela seleccionada
    const paymentResult = await this.createPaymentIntent(
      validated.payment_method,
      order,
      user.email
    );
    
    logger.info('Order created successfully', { 
      orderId: order.order_id, 
      displayId: order.display_id 
    });
    
    return {
      orderId: order.order_id,
      displayId: order.display_id,
      totalAmount: order.total_amount,
      currency: order.currency,
      payment: paymentResult
    };
  }
  
  private async createPaymentIntent(
    gateway: string,
    order: any,
    customerEmail: string
  ): Promise<any> {
    const amount = Math.round(order.total_amount * 100); // Convertir a centavos
    
    switch (gateway) {
      case 'stripe':
        return this.createStripePayment(amount, order.order_id, customerEmail);
      case 'paypal':
        return this.createPayPalPayment(amount, order.order_id, order.currency);
      case 'mercadopago':
        return this.createMercadoPagoPayment(amount, order.order_id, customerEmail);
      case 'hey_banco':
        return this.createHeyBancoPayment(amount, order.order_id);
      default:
        throw new BusinessError('INVALID_GATEWAY', 'Pasarela no soportada', 400);
    }
  }
  
  private async createStripePayment(amount: number, orderId: string, email: string) {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        amount: amount.toString(),
        currency: 'mxn',
        'metadata[order_id]': orderId,
        receipt_email: email
      }).toString()
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new BusinessError('STRIPE_ERROR', error.error?.message || 'Error con Stripe', 500);
    }
    
    const paymentIntent = await response.json();
    
    return {
      gateway: 'stripe',
      clientSecret: paymentIntent.client_secret,
      // La publishableKey se obtiene vía GET /payment-gateways/public en el frontend
    };
  }
  
  private async createPayPalPayment(amount: number, orderId: string, currency: string) {
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID')!;
    const paypalSecret = Deno.env.get('PAYPAL_SECRET')!;
    
    // Obtener token de acceso
    const authResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${paypalClientId}:${paypalSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    const authData = await authResponse.json();
    
    // Crear orden
    const orderResponse = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: orderId,
          amount: {
            currency_code: currency,
            value: (amount / 100).toFixed(2)
          }
        }]
      })
    });
    
    const orderData = await orderResponse.json();
    
    return {
      gateway: 'paypal',
      orderId: orderData.id,
      clientId: paypalClientId
    };
  }
  
  private async createMercadoPagoPayment(amount: number, orderId: string, email: string) {
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;
    
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          id: orderId,
          title: `Pedido ${orderId}`,
          quantity: 1,
          unit_price: amount / 100
        }],
        payer: { email },
        external_reference: orderId
      })
    });
    
    if (!response.ok) {
      throw new BusinessError('MERCADOPAGO_ERROR', 'Error al crear preferencia de pago', 500);
    }
    
    const preference = await response.json();
    
    return {
      gateway: 'mercadopago',
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point
    };
  }
  
  private async createHeyBancoPayment(amount: number, orderId: string) {
    // Hey Banco usa link de pago o transferencia
    // Implementación simplificada
    return {
      gateway: 'hey_banco',
      instructions: {
        amount: (amount / 100).toFixed(2),
        currency: 'MXN',
        reference: orderId,
        bank: 'Hey Banco',
        clabe: '012345678901234567' // CLABE de prueba
      }
    };
  }
}

serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const body = await req.json();
    
    const controller = new CreateOrderController();
    const result = await controller.execute(authHeader, body);
    
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleError(error);
  }
});
```

### 3.2.2 Webhook de Pago (Idempotente)

**`supabase/functions/payment-webhook/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { handleError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('payment-webhook');

class PaymentWebhookController extends BaseController {
  
  async handleStripeWebhook(body: string, signature: string) {
    const stripeSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
    
    // En producción: verificar firma HMAC
    // const event = stripe.webhooks.constructEvent(body, signature, stripeSecret);
    
    const event = JSON.parse(body);
    logger.info('Stripe webhook received', { type: event.type });
    
    if (event.type === 'payment_intent.succeeded') {
      return this.handlePaymentSuccess(
        event.data.object.metadata.order_id,
        event.data.object.id,
        'stripe'
      );
    }
    
    return { received: true, type: event.type };
  }
  
  async handlePayPalWebhook(body: string) {
    const event = JSON.parse(body);
    
    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
      return this.handlePaymentSuccess(
        event.resource.purchase_units[0].reference_id,
        event.resource.id,
        'paypal'
      );
    }
    
    return { received: true };
  }
  
  async handleMercadoPagoWebhook(body: string) {
    const event = JSON.parse(body);
    
    if (event.type === 'payment' && event.action === 'payment.created') {
      return this.handlePaymentSuccess(
        event.data.id,
        event.data.id,
        'mercadopago'
      );
    }
    
    return { received: true };
  }
  
  async handleHeyBancoWebhook(body: string) {
    const event = JSON.parse(body);
    
    if (event.status === 'completed') {
      return this.handlePaymentSuccess(
        event.reference,
        event.transaction_id,
        'hey_banco'
      );
    }
    
    return { received: true };
  }
  
  private async handlePaymentSuccess(
    orderId: string,
    paymentIntentId: string,
    gateway: string
  ) {
    logger.info('Payment succeeded', { orderId, gateway, paymentIntentId });
    
    // 1. Confirmar orden y reservar stock
    const { data: result, error } = await this.dbAdmin.rpc('confirm_order_payment', {
      p_order_id: orderId,
      p_payment_intent_id: paymentIntentId,
      p_payment_method: gateway
    });
    
    if (error) {
      logger.error('Failed to confirm order', { error, orderId });
      throw new Error('Error al confirmar orden');
    }
    
    // 2. Enviar email de confirmación
    await this.sendConfirmationEmail(orderId);
    
    // 3. Disparar rebuild del storefront si cambió stock
    await this.triggerStorefrontRebuild();
    
    return { 
      success: true, 
      orderStatus: result.status,
      orderId 
    };
  }
  
  private async sendConfirmationEmail(orderId: string) {
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-order-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId })
      });
    } catch (err) {
      logger.error('Failed to send confirmation email', { error: err });
    }
  }
  
  private async triggerStorefrontRebuild() {
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/trigger-rebuild`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        }
      });
    } catch (err) {
      logger.error('Failed to trigger rebuild', { error: err });
    }
  }
}

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const gateway = url.pathname.split('/').pop();
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || '';
    
    const controller = new PaymentWebhookController();
    let result;
    
    switch (gateway) {
      case 'stripe':
        result = await controller.handleStripeWebhook(body, signature);
        break;
      case 'paypal':
        result = await controller.handlePayPalWebhook(body);
        break;
      case 'mercadopago':
        result = await controller.handleMercadoPagoWebhook(body);
        break;
      case 'hey_banco':
        result = await controller.handleHeyBancoWebhook(body);
        break;
      default:
        throw new BusinessError('INVALID_GATEWAY', 'Pasarela no soportada', 400);
    }
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleError(error);
  }
});
```

### 3.2.3 Gestión de Pasarelas (Admin)

**`supabase/functions/manage-payment-gateways/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('manage-payment-gateways');

class PaymentGatewayController extends BaseController {
  
  async listGateways(authHeader: string) {
    const isAdmin = await this.isAdmin(authHeader);
    if (!isAdmin) throw new UnauthorizedError('Solo el administrador puede ver las pasarelas');
    
    const { data, error } = await this.dbAdmin
      .from('payment_credentials')
      .select('gateway, is_enabled, last_rotated_at, created_at')
      .order('gateway');
    
    if (error) throw new Error('Error al cargar pasarelas');
    
    return data;
  }
  
  async saveGateway(authHeader: string, gateway: string, credentials: any, isEnabled: boolean) {
    const isAdmin = await this.isAdmin(authHeader);
    if (!isAdmin) throw new UnauthorizedError('Solo el administrador puede configurar pasarelas');
    
    logger.info('Saving payment gateway', { gateway });
    
    // Encriptar credenciales antes de guardar
    const encKey = Deno.env.get('ENCRYPTION_KEY')!;
    // En producción: usar pgsodium para encriptar
    
    const { error } = await this.dbAdmin
      .from('payment_credentials')
      .upsert({
        vendor_id: 'vendor-id', // Obtener del contexto
        gateway,
        is_enabled: isEnabled,
        credentials_encrypted: new TextEncoder().encode(JSON.stringify(credentials))
      });
    
    if (error) throw new Error('Error al guardar configuración');
    
    return { success: true, gateway };
  }
  
  async getPublicGateways() {
    const { data, error } = await this.dbClient
      .from('payment_credentials')
      .select('gateway, is_enabled')
      .eq('is_enabled', true);
    
    if (error) throw new Error('Error al cargar pasarelas');
    
    return data.map(g => g.gateway);
  }
}

serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const method = req.method;
    const controller = new PaymentGatewayController();
    
    if (method === 'GET') {
      const gateways = await controller.listGateways(authHeader);
      return new Response(JSON.stringify(gateways), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'POST') {
      const { gateway, credentials, is_enabled } = await req.json();
      const result = await controller.saveGateway(authHeader, gateway, credentials, is_enabled);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw new BusinessError('METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  } catch (error) {
    return handleError(error);
  }
});
```

### 3.2.4 Email de Confirmación

**`supabase/functions/send-order-email/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger('send-order-email');

serve(async (req: Request) => {
  try {
    const { orderId } = await req.json();
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Obtener datos de la orden
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*, profiles(email, role), order_items(*, products(name, price))')
      .eq('id', orderId)
      .single();
    
    if (error || !order) {
      throw new Error('Orden no encontrada');
    }
    
    // Enviar email con Resend
    const resendKey = Deno.env.get('RESEND_API_KEY')!;
    const emailFrom = Deno.env.get('EMAIL_FROM')!;
    
    const emailHtml = `
      <h1>¡Gracias por tu compra!</h1>
      <p>Tu pedido <strong>${order.display_id}</strong> ha sido confirmado.</p>
      <h2>Resumen del pedido</h2>
      <table>
        <thead>
          <tr><th>Producto</th><th>Cantidad</th><th>Precio</th></tr>
        </thead>
        <tbody>
          ${order.order_items.map((item: any) => `
            <tr>
              <td>${item.products.name}</td>
              <td>${item.quantity}</td>
              <td>$${item.unit_price.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p><strong>Total: $${order.total_amount.toFixed(2)} ${order.currency}</strong></p>
      <p>Te notificaremos cuando tu pedido sea enviado.</p>
    `;
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: emailFrom,
        to: order.profiles.email,
        subject: `Pedido ${order.display_id} confirmado - Micro-Store`,
        html: emailHtml
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Failed to send email', { error: errorData });
      throw new Error('Error al enviar email');
    }
    
    logger.info('Confirmation email sent', { orderId });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Send email error', { error: String(error) });
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

---

## 📁 Tarea 3.3: Librerías del Client Hub

### 3.3.1 Checkout Client

**`apps/client-hub/src/lib/checkout/checkout-client.ts`**

```typescript
import type { CreateOrderPayload, ShippingAddress } from '@micro-store/core/schemas';
import type { PaymentGateway } from '@micro-store/core/enums';

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  displayId?: string;
  totalAmount?: number;
  currency?: string;
  payment?: PaymentResult;
  error?: string;
}

export interface PaymentResult {
  gateway: string;
  clientSecret?: string;
  publishableKey?: string;
  orderId?: string;
  clientId?: string;
  preferenceId?: string;
  initPoint?: string;
  sandboxInitPoint?: string;
  instructions?: HeyBancoInstructions;
}

export interface HeyBancoInstructions {
  amount: string;
  currency: string;
  reference: string;
  bank: string;
  clabe: string;
}

function getAuthToken(): string {
  return localStorage.getItem('auth_token') || '';
}

export async function createOrder(
  items: Array<{ productId: string; quantity: number }>,
  shippingAddress: ShippingAddress,
  paymentMethod: PaymentGateway
): Promise<CheckoutResult> {
  const payload: CreateOrderPayload = {
    items: items.map(i => ({
      product_id: i.productId,
      quantity: i.quantity
    })),
    shipping_address: shippingAddress,
    payment_method: paymentMethod
  };

  const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/create-order`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data.message || 'Error al crear orden'
    };
  }

  return {
    success: true,
    orderId: data.orderId,
    displayId: data.displayId,
    totalAmount: data.totalAmount,
    currency: data.currency,
    payment: data.payment
  };
}

export async function getActivePaymentMethods(): Promise<PaymentGateway[]> {
  const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/manage-payment-gateways/public`, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) return [];

  return response.json();
}
```

---

## 📁 Tarea 3.4: Páginas del Client Hub

### 3.4.1 Página de Checkout

**`apps/client-hub/src/pages/checkout/index.astro`**

```astro
---
import ClientHubLayout from '../../layouts/ClientHubLayout.astro';
---

<ClientHubLayout title="Checkout">
  <div class="checkout-page" x-data="checkoutForm()" x-init="init()">
    <h1>Finalizar Compra</h1>

    <div class="checkout-layout">
      <!-- Resumen del pedido -->
      <div class="order-summary">
        <h2>Resumen del Pedido</h2>
        
        <template x-if="loading">
          <p class="loading-text">Calculando...</p>
        </template>

        <template x-if="!loading && items.length > 0">
          <div>
            <div class="items-list">
              <template x-for="item in items" :key="item.productId">
                <div class="order-item">
                  <span x-text="item.name"></span>
                  <span x-text="'x' + item.quantity"></span>
                  <span x-text="'$' + (item.price * item.quantity).toFixed(2)"></span>
                </div>
              </template>
            </div>

            <div class="order-total">
              <strong>Total</strong>
              <strong x-text="'$' + total.toFixed(2)"></strong>
            </div>
          </div>
        </template>
      </div>

      <!-- Formulario de envío y pago -->
      <div class="checkout-form">
        <!-- Paso 1: Dirección de envío -->
        <template x-if="step === 'shipping'">
          <div>
            <h2>Dirección de Envío</h2>
            <form @submit.prevent="nextToPayment()" class="shipping-form">
              <div class="form-group">
                <label for="street">Calle y número</label>
                <input type="text" id="street" x-model="shipping.street" required />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="city">Ciudad</label>
                  <input type="text" id="city" x-model="shipping.city" required />
                </div>
                <div class="form-group">
                  <label for="postal_code">Código Postal</label>
                  <input type="text" id="postal_code" x-model="shipping.postalCode" required />
                </div>
              </div>

              <div class="form-group">
                <label for="country">País</label>
                <select id="country" x-model="shipping.country" required>
                  <option value="MX">México</option>
                  <option value="US">Estados Unidos</option>
                  <option value="AR">Argentina</option>
                  <option value="CO">Colombia</option>
                </select>
              </div>

              <button type="submit" class="btn-primary">Continuar al pago</button>
            </form>
          </div>
        </template>

        <!-- Paso 2: Método de pago -->
        <template x-if="step === 'payment'">
          <div>
            <h2>Método de Pago</h2>

            <div class="payment-methods">
              <template x-for="method in activeMethods" :key="method">
                <label class="payment-option" :class="{ selected: selectedMethod === method }">
                  <input 
                    type="radio" 
                    name="payment_method" 
                    :value="method" 
                    x-model="selectedMethod"
                  />
                  <span class="payment-label">
                    <span x-text="getMethodName(method)"></span>
                  </span>
                </label>
              </template>
            </div>

            <template x-if="error">
              <p class="error-message" x-text="error"></p>
            </template>

            <div class="checkout-actions">
              <button @click="step = 'shipping'" class="btn-secondary">Volver</button>
              <button @click="processPayment()" class="btn-primary" :disabled="processingPayment">
                <span x-show="!processingPayment">Pagar ahora</span>
                <span x-show="processingPayment">Procesando...</span>
              </button>
            </div>
          </div>
        </template>

        <!-- Paso 3: Redirección a pasarela -->
        <template x-if="step === 'redirecting'">
          <div class="redirecting-state">
            <h2>Redirigiendo a la pasarela de pago...</h2>
            <p>Serás redirigido automáticamente en unos segundos.</p>
            <div class="spinner"></div>

            <!-- Stripe -->
            <template x-if="paymentResult?.gateway === 'stripe'">
              <div id="stripe-payment-element"></div>
            </template>

            <!-- PayPal -->
            <template x-if="paymentResult?.gateway === 'paypal'">
              <div id="paypal-button-container"></div>
            </template>

            <!-- Mercado Pago -->
            <template x-if="paymentResult?.gateway === 'mercadopago'">
              <div>
                <p>Haz clic en el botón para pagar con Mercado Pago:</p>
                <a :href="paymentResult?.sandboxInitPoint || paymentResult?.initPoint" class="btn-primary" target="_blank">
                  Ir a Mercado Pago
                </a>
              </div>
            </template>

            <!-- Hey Banco -->
            <template x-if="paymentResult?.gateway === 'hey_banco'">
              <div class="hey-banco-instructions">
                <h3>Instrucciones de Pago</h3>
                <p>Realiza una transferencia a la siguiente cuenta:</p>
                <div class="bank-details">
                  <p><strong>Banco:</strong> <span x-text="paymentResult?.instructions?.bank"></span></p>
                  <p><strong>CLABE:</strong> <span x-text="paymentResult?.instructions?.clabe"></span></p>
                  <p><strong>Monto:</strong> $<span x-text="paymentResult?.instructions?.amount"></span></p>
                  <p><strong>Referencia:</strong> <span x-text="paymentResult?.instructions?.reference"></span></p>
                </div>
                <p class="info-text">Tu pedido será procesado cuando se confirme la transferencia.</p>
              </div>
            </template>
          </div>
        </template>

        <!-- Paso 4: Confirmación -->
        <template x-if="step === 'confirmed'">
          <div class="confirmation">
            <div class="confirmation-icon">✅</div>
            <h2>¡Pedido Confirmado!</h2>
            <p>Tu pedido <strong x-text="displayId"></strong> ha sido creado exitosamente.</p>
            <p>Recibirás un email con los detalles de tu compra.</p>
            <a href="/orders" class="btn-primary">Ver mis pedidos</a>
          </div>
        </template>
      </div>
    </div>
  </div>
</ClientHubLayout>

<script>
  import { createOrder, getActivePaymentMethods } from '../../lib/checkout/checkout-client.ts';
  import { PaymentGateway } from '@micro-store/core/enums';

  window.checkoutForm = () => ({
    step: 'shipping',
    loading: true,
    processingPayment: false,
    error: '',
    items: [],
    total: 0,
    shipping: {
      street: '',
      city: '',
      postalCode: '',
      country: 'MX'
    },
    selectedMethod: '',
    activeMethods: [],
    paymentResult: null,
    displayId: '',

    init() {
      // Cargar items del carrito desde localStorage
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      this.items = cart;
      this.calculateTotal();
      this.loadPaymentMethods();
    },

    calculateTotal() {
      this.total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    async loadPaymentMethods() {
      try {
        this.activeMethods = await getActivePaymentMethods();
        this.loading = false;
      } catch (err) {
        this.error = 'Error al cargar métodos de pago';
        this.loading = false;
      }
    },

    nextToPayment() {
      if (!this.shipping.street || !this.shipping.city) {
        this.error = 'Completa todos los campos de envío';
        return;
      }
      this.step = 'payment';
      this.error = '';
    },

    getMethodName(method) {
      const names = {
        stripe: 'Tarjeta (Stripe)',
        paypal: 'PayPal',
        mercadopago: 'Mercado Pago',
        hey_banco: 'Hey Banco (Transferencia)'
      };
      return names[method] || method;
    },

    async processPayment() {
      if (!this.selectedMethod) {
        this.error = 'Selecciona un método de pago';
        return;
      }

      this.processingPayment = true;
      this.error = '';

      try {
        const result = await createOrder(this.items, this.shipping, this.selectedMethod);

        if (!result.success) {
          this.error = result.error || 'Error al procesar el pago';
          this.processingPayment = false;
          return;
        }

        this.paymentResult = result.payment;
        this.displayId = result.displayId || '';
        this.step = 'redirecting';

        // Para Hey Banco, mostrar instrucciones
        if (result.payment?.gateway === 'hey_banco') {
          this.processingPayment = false;
          return;
        }

        // Para Mercado Pago, redirigir automáticamente después de 2 segundos
        if (result.payment?.gateway === 'mercadopago') {
          setTimeout(() => {
            window.open(result.payment?.initPoint, '_blank');
          }, 2000);
        }

        // Stripe y PayPal se manejan con sus SDKs en producción
        this.processingPayment = false;
      } catch (err) {
        this.error = 'Error de conexión';
        this.processingPayment = false;
      }
    }
  });
</script>

<style>
  .checkout-page {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  h1 {
    margin-bottom: 2rem;
  }

  .checkout-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .order-summary, .checkout-form {
    background: white;
    border: 1px solid #eee;
    border-radius: 12px;
    padding: 1.5rem;
  }

  h2 {
    font-size: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .loading-text {
    color: #666;
    text-align: center;
  }

  .items-list {
    border-bottom: 1px solid #eee;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
  }

  .order-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    font-size: 0.9rem;
  }

  .order-total {
    display: flex;
    justify-content: space-between;
    font-size: 1.2rem;
  }

  .shipping-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .form-group label {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .form-group input, .form-group select {
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
  }

  .form-row {
    display: flex;
    gap: 1rem;
  }

  .form-row .form-group {
    flex: 1;
  }

  .payment-methods {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .payment-option {
    display: flex;
    align-items: center;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .payment-option.selected {
    border-color: #16213e;
    background: #f5f5ff;
  }

  .payment-option input {
    margin-right: 0.75rem;
  }

  .payment-label {
    font-weight: 500;
  }

  .checkout-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .btn-primary {
    flex: 1;
    padding: 0.875rem;
    background: #16213e;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    text-decoration: none;
  }

  .btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .btn-secondary {
    padding: 0.875rem;
    background: #eee;
    color: #333;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .error-message {
    background: #ffebee;
    color: #c62828;
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.85rem;
  }

  .redirecting-state {
    text-align: center;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #eee;
    border-top: 4px solid #16213e;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 1rem auto;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .confirmation {
    text-align: center;
  }

  .confirmation-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .confirmation h2 {
    color: #2e7d32;
  }

  .bank-details {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 8px;
    text-align: left;
    margin: 1rem 0;
  }

  .info-text {
    font-size: 0.85rem;
    color: #666;
  }

  .hey-banco-instructions {
    text-align: left;
  }

  @media (max-width: 768px) {
    .checkout-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
```

---

## 📁 Tarea 3.5: Páginas del Vendor Admin

### 3.5.1 Configuración de Pasarelas

**`apps/vendor-admin/src/pages/settings/index.astro`**

```astro
---
import VendorAdminLayout from '../../layouts/VendorAdminLayout.astro';
---

<VendorAdminLayout title="Configuración de Pagos">
  <div class="settings-page" x-data="paymentSettings()" x-init="loadGateways()">
    <h1>Configuración de Pasarelas de Pago</h1>

    <template x-if="loading">
      <p class="loading-text">Cargando configuración...</p>
    </template>

    <template x-if="!loading">
      <div class="gateways-grid">
        <template x-for="gateway in gateways" :key="gateway.gateway">
          <div class="gateway-card" :class="{ active: gateway.isEnabled }">
            <div class="gateway-header">
              <h2 x-text="getGatewayName(gateway.gateway)"></h2>
              <label class="toggle">
                <input 
                  type="checkbox" 
                  :checked="gateway.isEnabled"
                  @change="toggleGateway(gateway)"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <template x-if="gateway.isEnabled">
              <form @submit.prevent="saveCredentials(gateway.gateway)" class="credentials-form">
                <template x-if="gateway.gateway === 'stripe'">
                  <div>
                    <div class="form-group">
                      <label>Publishable Key</label>
                      <input type="password" x-model="credentials.stripe.publishableKey" />
                    </div>
                    <div class="form-group">
                      <label>Secret Key</label>
                      <input type="password" x-model="credentials.stripe.secretKey" />
                    </div>
                    <div class="form-group">
                      <label>Webhook Secret</label>
                      <input type="password" x-model="credentials.stripe.webhookSecret" />
                    </div>
                  </div>
                </template>

                <template x-if="gateway.gateway === 'paypal'">
                  <div>
                    <div class="form-group">
                      <label>Client ID</label>
                      <input type="password" x-model="credentials.paypal.clientId" />
                    </div>
                    <div class="form-group">
                      <label>Secret</label>
                      <input type="password" x-model="credentials.paypal.secret" />
                    </div>
                  </div>
                </template>

                <template x-if="gateway.gateway === 'mercadopago'">
                  <div>
                    <div class="form-group">
                      <label>Access Token</label>
                      <input type="password" x-model="credentials.mercadopago.accessToken" />
                    </div>
                  </div>
                </template>

                <template x-if="gateway.gateway === 'hey_banco'">
                  <div>
                    <div class="form-group">
                      <label>API Key</label>
                      <input type="password" x-model="credentials.heyBanco.apiKey" />
                    </div>
                    <div class="form-group">
                      <label>CLABE</label>
                      <input type="text" x-model="credentials.heyBanco.clabe" />
                    </div>
                  </div>
                </template>

                <template x-if="saveMessage[gateway.gateway]">
                  <p class="success-message" x-text="saveMessage[gateway.gateway]"></p>
                </template>
                <template x-if="saveError[gateway.gateway]">
                  <p class="error-message" x-text="saveError[gateway.gateway]"></p>
                </template>

                <button type="submit" class="btn-primary" :disabled="savingGateway === gateway.gateway">
                  <span x-show="savingGateway !== gateway.gateway">Guardar credenciales</span>
                  <span x-show="savingGateway === gateway.gateway">Guardando...</span>
                </button>
              </form>
            </template>
          </div>
        </template>
      </div>
    </template>
  </div>
</VendorAdminLayout>

<script>
  import { PaymentGateway } from '@micro-store/core/enums';

  window.paymentSettings = () => ({
    gateways: [],
    loading: true,
    savingGateway: null,
    saveMessage: {},
    saveError: {},
    credentials: {
      stripe: { publishableKey: '', secretKey: '', webhookSecret: '' },
      paypal: { clientId: '', secret: '' },
      mercadopago: { accessToken: '' },
      heyBanco: { apiKey: '', clabe: '' }
    },

    async loadGateways() {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/manage-payment-gateways`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          this.gateways = await response.json();
        }
      } catch (err) {
        console.error('Error loading gateways:', err);
      } finally {
        this.loading = false;
      }
    },

    getGatewayName(gateway) {
      const names = {
        stripe: 'Stripe (Tarjetas)',
        paypal: 'PayPal',
        mercadopago: 'Mercado Pago',
        hey_banco: 'Hey Banco'
      };
      return names[gateway] || gateway;
    },

    async toggleGateway(gateway) {
      const token = localStorage.getItem('auth_token');
      await fetch(`${import.meta.env.PUBLIC_API_BASE}/manage-payment-gateways`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gateway: gateway.gateway,
          is_enabled: !gateway.isEnabled,
          credentials: {}
        })
      });

      await this.loadGateways();
    },

    async saveCredentials(gateway) {
      this.savingGateway = gateway;
      this.saveMessage[gateway] = '';
      this.saveError[gateway] = '';

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/manage-payment-gateways`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            gateway,
            is_enabled: true,
            credentials: this.credentials[gateway]
          })
        });

        if (response.ok) {
          this.saveMessage[gateway] = 'Credenciales guardadas correctamente';
          // Limpiar campos por seguridad
          this.credentials[gateway] = {};
        } else {
          const data = await response.json();
          this.saveError[gateway] = data.message || 'Error al guardar';
        }
      } catch (err) {
        this.saveError[gateway] = 'Error de conexión';
      } finally {
        this.savingGateway = null;
      }
    }
  });
</script>

<style>
  .settings-page {
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  h1 {
    margin-bottom: 2rem;
  }

  .loading-text {
    text-align: center;
    color: #666;
  }

  .gateways-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .gateway-card {
    background: white;
    border: 1px solid #eee;
    border-radius: 12px;
    padding: 1.5rem;
    transition: border-color 0.2s;
  }

  .gateway-card.active {
    border-color: #16213e;
  }

  .gateway-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .gateway-header h2 {
    font-size: 1.25rem;
  }

  .toggle {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 24px;
  }

  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #ccc;
    border-radius: 24px;
    transition: 0.3s;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: 0.3s;
  }

  .toggle input:checked + .toggle-slider {
    background: #16213e;
  }

  .toggle input:checked + .toggle-slider:before {
    transform: translateX(24px);
  }

  .credentials-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .form-group label {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .form-group input {
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 0.95rem;
    font-family: monospace;
  }

  .btn-primary {
    padding: 0.75rem;
    background: #16213e;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .success-message {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.85rem;
  }

  .error-message {
    background: #ffebee;
    color: #c62828;
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.85rem;
  }
</style>
```

---

## 📁 Tarea 3.6: Pruebas

### 3.6.1 Prueba E2E - Flujo de Compra

**`apps/client-hub/src/__tests__/e2e/checkout-flow.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Checkout Flow E2E', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it('flujo completo de compra con Stripe', async () => {
    // Mock: crear orden
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderId: 'test-order-id',
          displayId: 'TX-2026-0001',
          totalAmount: 99.98,
          currency: 'MXN',
          payment: {
            gateway: 'stripe',
            clientSecret: 'pi_test_secret',
            publishableKey: 'pk_test'
          }
        })
      });

    const { createOrder } = await import('../../lib/checkout/checkout-client');
    const result = await createOrder(
      [{ productId: 'prod-1', quantity: 2 }],
      { street: 'Calle Test', city: 'Test', postalCode: '12345', country: 'MX' },
      'stripe' as any
    );

    expect(result.success).toBe(true);
    expect(result.orderId).toBe('test-order-id');
    expect(result.payment?.gateway).toBe('stripe');
    expect(result.payment?.clientSecret).toBeDefined();
  });

  it('debe rechazar compra con stock insuficiente', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'INSUFFICIENT_STOCK',
          message: 'Stock insuficiente para el producto prod-1'
        })
      });

    const { createOrder } = await import('../../lib/checkout/checkout-client');
    const result = await createOrder(
      [{ productId: 'prod-1', quantity: 999 }],
      { street: 'Test', city: 'Test', postalCode: '12345', country: 'MX' },
      'stripe' as any
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Stock insuficiente');
  });

  it('debe manejar error de pasarela no disponible', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'GATEWAY_DISABLED',
          message: 'La pasarela paypal no está disponible'
        })
      });

    const { createOrder } = await import('../../lib/checkout/checkout-client');
    const result = await createOrder(
      [{ productId: 'prod-1', quantity: 1 }],
      { street: 'Test', city: 'Test', postalCode: '12345', country: 'MX' },
      'paypal' as any
    );

    expect(result.success).toBe(false);
  });
});
```

---

## 📊 Definición de Terminado (DoD) del Sprint 3

- [ ] Cliente puede crear una orden desde el checkout
- [ ] Cliente puede seleccionar entre Stripe, PayPal, Mercado Pago y Hey Banco
- [ ] La validación de stock es atómica (sin race conditions)
- [ ] El pago con Stripe funciona (modo test)
- [ ] El webhook de Stripe confirma la orden y reserva stock
- [ ] Los webhooks de PayPal, Mercado Pago y Hey Banco funcionan
- [ ] El vendedor puede activar/desactivar pasarelas
- [ ] El vendedor puede guardar credenciales (encriptadas)
- [ ] Las credenciales nunca se exponen al frontend
- [ ] El email de confirmación se envía al completar el pago
- [ ] Los métodos de pago activos se reflejan en el checkout
- [ ] Tests E2E pasan (flujo completo de compra)
- [ ] `npm run check:architecture` pasa sin errores

---

## 🎯 Retrospectiva del Sprint 3 (Template)

1. **¿El flujo de checkout es intuitivo?**
2. **¿La integración con las pasarelas fue compleja?**
3. **¿Los webhooks responden correctamente?**
4. **¿La encriptación de credenciales es segura?**
5. **¿Se mantuvo la separación arquitectónica?**
