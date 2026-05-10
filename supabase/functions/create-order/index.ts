import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";
import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { handleError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('create-order');

// Re-definiendo esquemas localmente para evitar problemas de importación fuera de funciones en Supabase
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

class CreateOrderController extends BaseController {
  
  async handle(req: Request): Promise<Response> {
    const authHeader = req.headers.get('Authorization') || '';
    const body = await req.json();
    
    const user = await this.authenticateUser(authHeader);
    
    // 0. Rate Limiting (10 pedidos por minuto por usuario)
    const withinLimit = await this.checkRateLimit(user.id, 'create-order', 10, 60);
    if (!withinLimit) {
      throw new BusinessError('RATE_LIMITED', 'Demasiados pedidos en poco tiempo. Por favor espera un minuto.', 429);
    }

    // 1. Validar payload
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
      user.email!
    );
    
    logger.info('Order created successfully', { 
      orderId: order.order_id, 
      displayId: order.display_id 
    });
    
    return new Response(JSON.stringify({
      orderId: order.order_id,
      displayId: order.display_id,
      totalAmount: order.total_amount,
      currency: order.currency,
      payment: paymentResult
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
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
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return { gateway: 'stripe', mode: 'manual_fallback', orderId };
    
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
    };
  }
  
  private async createPayPalPayment(amount: number, orderId: string, currency: string) {
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalSecret = Deno.env.get('PAYPAL_SECRET');
    if (!paypalClientId || !paypalSecret) return { gateway: 'paypal', mode: 'manual_fallback', orderId };
    
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
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) return { gateway: 'mercadopago', mode: 'manual_fallback', orderId };
    
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
    return {
      gateway: 'hey_banco',
      instructions: {
        amount: (amount / 100).toFixed(2),
        currency: 'MXN',
        reference: orderId,
        bank: 'Hey Banco',
        clabe: '012345678901234567'
      }
    };
  }
}

new CreateOrderController().start();
