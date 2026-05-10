import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";
import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { handleError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('create-order');

// Esquemas redefinidos localmente porque Deno no puede importar desde packages/core directamente.
// Mantener sincronizados con packages/core/src/schemas/order.schema.ts.
const ShippingAddressSchema = z.object({
  street: z.string().min(5),
  city: z.string().min(2),
  postal_code: z.string().min(4),
  country: z.string().length(2)
});

const CreateOrderPayloadSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive()
  })).min(1),
  shipping_address: ShippingAddressSchema,
  payment_method: z.enum(['stripe', 'paypal', 'mercadopago', 'hey_banco'])
});

interface OrderRpcResult {
  order_id: string;
  display_id: string;
  total_amount: number;
  currency: string;
  status: string;
}

class CreateOrderController extends BaseController {

  async handle(req: Request): Promise<Response> {
    const authHeader = req.headers.get('Authorization') || '';
    const body = await req.json();

    const user = await this.authenticateUser(authHeader);

    // Rate limiting: 10 pedidos por minuto por usuario
    const withinLimit = await this.checkRateLimit(user.id, 'create-order', 10, 60);
    if (!withinLimit) {
      throw new BusinessError('RATE_LIMITED', 'Demasiados pedidos en poco tiempo. Por favor espera un minuto.', 429);
    }

    // 1. Validar payload con Zod
    const validated = CreateOrderPayloadSchema.parse(body);

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

    // 3. Crear orden atómicamente con bloqueo pesimista en productos
    const { data: order, error } = await this.dbAdmin.rpc('create_order_atomic', {
      p_customer_id: user.id,
      p_shipping_address: validated.shipping_address,
      p_items: validated.items,
      p_payment_method: validated.payment_method
    });

    if (error) {
      if (error.message.includes('INSUFFICIENT_STOCK')) {
        const productId = error.message.split(':')[1];
        throw new BusinessError('INSUFFICIENT_STOCK', 'Stock insuficiente', 400, { productId });
      }
      throw error;
    }

    const typedOrder = order as OrderRpcResult;

    // 4. Crear Payment Intent en la pasarela seleccionada
    const paymentResult = await this.createPaymentIntent(
      validated.payment_method,
      typedOrder,
      user.email!
    );

    logger.info('Order created successfully', {
      orderId: typedOrder.order_id,
      displayId: typedOrder.display_id
    });

    return new Response(JSON.stringify({
      orderId: typedOrder.order_id,
      displayId: typedOrder.display_id,
      totalAmount: typedOrder.total_amount,
      currency: typedOrder.currency,
      payment: paymentResult
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
      // CORS gestionado en BaseController.start()
    });
  }

  private async createPaymentIntent(
    gateway: string,
    order: OrderRpcResult,
    customerEmail: string
  ): Promise<Record<string, unknown>> {
    const amount = Math.round(order.total_amount * 100); // Centavos

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

  private async createStripePayment(amount: number, orderId: string, email: string): Promise<Record<string, unknown>> {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new BusinessError('GATEWAY_NOT_CONFIGURED', 'Stripe no está configurado en el servidor', 503);
    }

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
      const stripeError = await response.json();
      throw new BusinessError('STRIPE_ERROR', stripeError.error?.message || 'Error con Stripe', 502);
    }

    const paymentIntent = await response.json();
    return { gateway: 'stripe', clientSecret: paymentIntent.client_secret };
  }

  private async createPayPalPayment(amount: number, orderId: string, currency: string): Promise<Record<string, unknown>> {
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalSecret = Deno.env.get('PAYPAL_SECRET');
    if (!paypalClientId || !paypalSecret) {
      throw new BusinessError('GATEWAY_NOT_CONFIGURED', 'PayPal no está configurado en el servidor', 503);
    }

    // Leer entorno desde variable de entorno — NUNCA hardcodear sandbox en código de producción
    const paypalEnv = Deno.env.get('PAYPAL_ENV') === 'production' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';
    const paypalBase = `https://${paypalEnv}`;

    const authResponse = await fetch(`${paypalBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${paypalClientId}:${paypalSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!authResponse.ok) {
      throw new BusinessError('PAYPAL_AUTH_ERROR', 'Error de autenticación con PayPal', 502);
    }

    const authData = await authResponse.json();

    const orderResponse = await fetch(`${paypalBase}/v2/checkout/orders`, {
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

    if (!orderResponse.ok) {
      throw new BusinessError('PAYPAL_ORDER_ERROR', 'Error al crear orden en PayPal', 502);
    }

    const orderData = await orderResponse.json();
    return { gateway: 'paypal', orderId: orderData.id, clientId: paypalClientId };
  }

  private async createMercadoPagoPayment(amount: number, orderId: string, email: string): Promise<Record<string, unknown>> {
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) {
      throw new BusinessError('GATEWAY_NOT_CONFIGURED', 'MercadoPago no está configurado en el servidor', 503);
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{ id: orderId, title: `Pedido ${orderId}`, quantity: 1, unit_price: amount / 100 }],
        payer: { email },
        external_reference: orderId
      })
    });

    if (!response.ok) {
      throw new BusinessError('MERCADOPAGO_ERROR', 'Error al crear preferencia de pago', 502);
    }

    const preference = await response.json();
    return {
      gateway: 'mercadopago',
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point
    };
  }

  private async createHeyBancoPayment(amount: number, orderId: string): Promise<Record<string, unknown>> {
    // Obtener CLABE real del vendor desde las credenciales encriptadas en la BD
    const { data: credJson, error } = await this.dbAdmin.rpc('get_payment_credentials', {
      p_gateway: 'hey_banco'
    });

    if (error || !credJson) {
      throw new BusinessError(
        'GATEWAY_NOT_CONFIGURED',
        'Hey Banco no está configurado. El administrador debe guardar la CLABE en Configuración de Pagos.',
        503
      );
    }

    const clabe = credJson?.clabe as string | undefined;
    if (!clabe || !/^\d{18}$/.test(clabe)) {
      throw new BusinessError(
        'GATEWAY_MISCONFIGURED',
        'La CLABE de Hey Banco no está configurada o tiene formato incorrecto (18 dígitos).',
        503
      );
    }

    return {
      gateway: 'hey_banco',
      instructions: {
        amount: (amount / 100).toFixed(2),
        currency: 'MXN',
        reference: orderId,
        bank: 'Hey Banco',
        clabe
      }
    };
  }
}

new CreateOrderController().start();
