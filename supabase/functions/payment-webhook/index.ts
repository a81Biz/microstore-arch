import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { handleError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('payment-webhook');

class PaymentWebhookController extends BaseController {
  
  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const gateway = url.pathname.split('/').pop();
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || '';
    
    let result;
    
    switch (gateway) {
      case 'stripe':
        result = await this.handleStripeWebhook(body, signature);
        break;
      case 'paypal':
        result = await this.handlePayPalWebhook(body);
        break;
      case 'mercadopago':
        result = await this.handleMercadoPagoWebhook(body);
        break;
      case 'hey_banco':
        result = await this.handleHeyBancoWebhook(body);
        break;
      default:
        throw new BusinessError('INVALID_GATEWAY', 'Pasarela no soportada', 400);
    }
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  async handleStripeWebhook(body: string, _signature: string) {
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
    // Verificar idempotencia
    const { data: existing } = await this.dbAdmin
      .from('webhook_logs')
      .select('id')
      .eq('event_id', paymentIntentId)
      .single();

    if (existing) {
      logger.info('Duplicate webhook event detected, skipping', { paymentIntentId });
      return { success: true, duplicate: true };
    }

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

    // Registrar webhook procesado
    await this.dbAdmin.from('webhook_logs').insert({
      event_id: paymentIntentId,
      gateway: gateway,
      status: 'processed',
      payload: { orderId }
    });
    
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

new PaymentWebhookController().start();
