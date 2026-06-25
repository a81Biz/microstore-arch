import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('payment-webhook');

// Verifica la firma HMAC-SHA256 de Stripe (https://stripe.com/docs/webhooks/signatures)
async function verifyStripeSignature(
  body: string,
  signatureHeader: string,
  secret: string
): Promise<void> {
  const parts = signatureHeader.split(',');
  const tPart = parts.find(p => p.startsWith('t='));
  const v1Part = parts.find(p => p.startsWith('v1='));

  if (!tPart || !v1Part) {
    throw new BusinessError('INVALID_SIGNATURE', 'Firma Stripe malformada', 400);
  }

  const timestamp = tPart.slice(2);
  const expectedSig = v1Part.slice(3);
  const signedPayload = `${timestamp}.${body}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedPayload)
  );

  const computedSig = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (computedSig.length !== expectedSig.length || computedSig !== expectedSig) {
    throw new BusinessError('INVALID_SIGNATURE', 'Firma Stripe inválida — posible webhook forjado', 401);
  }

  // Protección contra replay attacks: rechazar eventos con más de 5 minutos de antigüedad
  const eventAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (eventAge > 300) {
    throw new BusinessError('WEBHOOK_EXPIRED', 'Webhook expirado (>5 min)', 400);
  }
}

// Verifica la firma HMAC-SHA256 de MercadoPago
async function verifyMercadoPagoSignature(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  secret: string
): Promise<void> {
  const parts = xSignature.split(',');
  const tsPart = parts.find(p => p.startsWith('ts='));
  const v1Part = parts.find(p => p.startsWith('v1='));

  if (!tsPart || !v1Part) {
    throw new BusinessError('INVALID_SIGNATURE', 'Firma MercadoPago malformada', 400);
  }

  const ts = tsPart.slice(3);
  const expectedSig = v1Part.slice(3);
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(manifest)
  );

  const computedSig = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (computedSig !== expectedSig) {
    throw new BusinessError('INVALID_SIGNATURE', 'Firma MercadoPago inválida', 401);
  }
}

// Verifica la firma HMAC-SHA256 de Hey Banco
async function verifyHeyBancoSignature(
  body: string,
  signatureHeader: string,
  secret: string
): Promise<void> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(body)
  );

  const computedSig = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (computedSig !== signatureHeader) {
    throw new BusinessError('INVALID_SIGNATURE', 'Firma Hey Banco inválida', 401);
  }
}

class PaymentWebhookController extends BaseController {

  async handle(req: Request): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(req.url);
    const gateway = url.pathname.split('/').pop();
    const body = await req.text();

    let result;

    try {
      switch (gateway) {
        case 'stripe':
          result = await this.handleStripeWebhook(body, req.headers);
          break;
        case 'paypal':
          result = await this.handlePayPalWebhook(body, req.headers);
          break;
        case 'mercadopago':
          result = await this.handleMercadoPagoWebhook(body, req.headers);
          break;
        case 'hey_banco':
          result = await this.handleHeyBancoWebhook(body, req.headers);
          break;
        default:
          throw new BusinessError('INVALID_GATEWAY', 'Pasarela no soportada', 400);
      }

      logger.metric('payment.webhook.processed', {
        gateway,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      const code = (error as { code?: string }).code ?? 'UNKNOWN_ERROR';
      logger.metric('payment.webhook.failed', {
        gateway,
        errorCode: code,
        durationMs: Date.now() - startTime,
      });
      throw error;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  private async handleStripeWebhook(body: string, headers: Headers) {
    const signature = headers.get('stripe-signature') || '';
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new BusinessError('CONFIG_ERROR', 'STRIPE_WEBHOOK_SECRET no configurado', 500);
    }
    if (!signature) {
      throw new BusinessError('MISSING_SIGNATURE', 'Header stripe-signature ausente', 401);
    }

    await verifyStripeSignature(body, signature, webhookSecret);

    const event = JSON.parse(body);
    logger.info('Stripe webhook verified', { type: event.type });

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      return this.handlePaymentSuccess(
        pi.metadata.order_id,
        pi.id,
        'stripe',
        pi.amount_received,   // Stripe usa centavos
        pi.currency.toUpperCase()
      );
    }

    return { received: true, type: event.type };
  }

  private async handlePayPalWebhook(body: string, headers: Headers) {
    const { data: credJson, error: credError } = await this.dbAdmin.rpc('get_payment_credentials', {
      p_gateway: 'paypal'
    });
    if (credError || !credJson) {
      throw new BusinessError('GATEWAY_NOT_CONFIGURED', 'PayPal no configurado en BD', 503);
    }
    const clientId     = credJson.clientId as string;
    const clientSecret = credJson.secret   as string;
    const webhookId    = credJson.webhookId as string | undefined;
    if (!clientId || !clientSecret) {
      throw new BusinessError('GATEWAY_MISCONFIGURED', 'Credenciales PayPal incompletas en BD', 503);
    }

    const paypalEnv  = Deno.env.get('PAYPAL_ENV') === 'production' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';
    const paypalBase = `https://${paypalEnv}`;

    // Obtener access_token para verificación y posible capture
    const authRes = await fetch(`${paypalBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!authRes.ok) {
      throw new BusinessError('PAYPAL_AUTH_ERROR', 'Error de autenticación con PayPal', 502);
    }
    const { access_token } = await authRes.json();

    // Verificación de firma via PayPal Webhooks Verification API
    if (webhookId) {
      const verifyRes = await fetch(
        `${paypalBase}/v1/notifications/verify-webhook-signature`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transmission_id:   headers.get('paypal-transmission-id'),
            transmission_time: headers.get('paypal-transmission-time'),
            cert_url:          headers.get('paypal-cert-url'),
            auth_algo:         headers.get('paypal-auth-algo') || 'SHA256withRSA',
            transmission_sig:  headers.get('paypal-transmission-sig'),
            webhook_id:        webhookId,
            webhook_event:     JSON.parse(body),
          }),
        }
      );
      const { verification_status } = await verifyRes.json();
      if (verification_status !== 'SUCCESS') {
        throw new BusinessError('INVALID_SIGNATURE', 'Firma PayPal inválida', 401);
      }
    } else {
      // webhookId no configurado en BD — solo tolerable en sandbox
      if (Deno.env.get('PAYPAL_ENV') === 'production') {
        throw new BusinessError('GATEWAY_MISCONFIGURED', 'PAYPAL_WEBHOOK_ID no configurado en BD (requerido en producción)', 503);
      }
      logger.warn('PayPal webhookId not configured in DB — skipping signature verification (sandbox only)');
    }

    const event = JSON.parse(body);
    logger.info('PayPal webhook verified', { type: event.event_type });

    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
      // Ejecutar capture como fallback (para usuarios que cerraron la pestaña tras aprobar)
      const paypalOrderId = event.resource.id as string;
      const captureRes = await fetch(`${paypalBase}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!captureRes.ok) {
        logger.error('PayPal capture failed in webhook', { paypalOrderId });
        return { received: true, status: 'capture_failed' };
      }

      const capture = await captureRes.json();
      if (capture.status !== 'COMPLETED') {
        logger.info('PayPal capture not completed yet', { paypalOrderId, status: capture.status });
        return { received: true, status: capture.status };
      }

      const captureUnit   = capture.purchase_units[0].payments.captures[0];
      const amountCents   = Math.round(parseFloat(captureUnit.amount.value) * 100);
      const referenceId   = capture.purchase_units[0].reference_id as string;

      return this.handlePaymentSuccess(
        referenceId,
        captureUnit.id,
        'paypal',
        amountCents,
        captureUnit.amount.currency_code
      );
    }

    return { received: true };
  }

  private async handleMercadoPagoWebhook(body: string, headers: Headers) {
    const xSignature = headers.get('x-signature') || '';
    const xRequestId = headers.get('x-request-id') || '';
    const webhookSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
    const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!webhookSecret) {
      throw new BusinessError('CONFIG_ERROR', 'MERCADOPAGO_WEBHOOK_SECRET no configurado', 500);
    }
    if (!mpToken) {
      throw new BusinessError('CONFIG_ERROR', 'MERCADOPAGO_ACCESS_TOKEN no configurado', 500);
    }

    const event = JSON.parse(body);
    const dataId = event.data?.id?.toString() || '';

    await verifyMercadoPagoSignature(xSignature, xRequestId, dataId, webhookSecret);

    logger.info('MercadoPago webhook verified', { type: event.type });

    if (event.type === 'payment' && event.action === 'payment.created') {
      const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: { 'Authorization': `Bearer ${mpToken}` },
      });
      const payment = await paymentRes.json();

      if (payment.status !== 'approved') {
        return { received: true, status: payment.status };
      }

      const amountCents = Math.round(payment.transaction_amount * 100);
      return this.handlePaymentSuccess(
        payment.external_reference,
        dataId,
        'mercadopago',
        amountCents,
        payment.currency_id
      );
    }

    return { received: true };
  }

  private async handleHeyBancoWebhook(body: string, headers: Headers) {
    const signature = headers.get('x-hey-signature') || '';
    const webhookSecret = Deno.env.get('HEY_BANCO_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new BusinessError('CONFIG_ERROR', 'HEY_BANCO_WEBHOOK_SECRET no configurado', 500);
    }
    if (!signature) {
      throw new BusinessError('MISSING_SIGNATURE', 'Header x-hey-signature ausente', 401);
    }

    await verifyHeyBancoSignature(body, signature, webhookSecret);

    const event = JSON.parse(body);
    logger.info('Hey Banco webhook verified', { status: event.status });

    if (event.status === 'completed') {
      const amountCents = Math.round(parseFloat(event.amount) * 100);
      return this.handlePaymentSuccess(
        event.reference,
        event.transaction_id,
        'hey_banco',
        amountCents,
        event.currency || 'MXN'
      );
    }

    return { received: true };
  }

  private async handlePaymentSuccess(
    orderId: string,
    paymentIntentId: string,
    gateway: string,
    amountCents: number,
    currency: string
  ) {
    // 1. Idempotencia: verificar si ya fue procesado y con qué resultado
    const { data: existing } = await this.dbAdmin
      .from('webhook_logs')
      .select('id, status')
      .eq('event_id', paymentIntentId)
      .maybeSingle();

    if (existing?.status === 'processed') {
      logger.info('Duplicate webhook — already processed successfully', { paymentIntentId });
      return { success: true, duplicate: true };
    }

    // 2. Verificar que el monto recibido coincide con el total de la orden
    const { data: order, error: orderError } = await this.dbAdmin
      .from('orders')
      .select('total_amount, currency')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new BusinessError('ORDER_NOT_FOUND', `Orden ${orderId} no encontrada`, 404);
    }

    const expectedCents = Math.round(order.total_amount * 100);

    if (amountCents !== expectedCents) {
      logger.error('Payment amount mismatch — possible fraud attempt', {
        orderId,
        gateway,
        expected: expectedCents,
        received: amountCents,
      });
      await this.dbAdmin.from('webhook_logs').upsert({
        event_id: paymentIntentId,
        gateway,
        status: 'amount_mismatch',
        payload: { orderId, expected: expectedCents, received: amountCents },
      }, { onConflict: 'event_id' });
      throw new BusinessError(
        'AMOUNT_MISMATCH',
        `Monto recibido (${amountCents}) no coincide con total de orden (${expectedCents})`,
        422
      );
    }

    logger.info('Payment verified — confirming order', { orderId, gateway, amountCents });

    // 3. Marcar en procesamiento antes de confirmar (previene race conditions en retries)
    await this.dbAdmin.from('webhook_logs').upsert({
      event_id: paymentIntentId,
      gateway,
      status: 'processing',
      payload: { orderId },
    }, { onConflict: 'event_id' });

    // 4. Confirmar orden y reservar stock (transacción atómica en DB)
    const { data: result, error } = await this.dbAdmin.rpc('confirm_order_payment', {
      p_order_id: orderId,
      p_payment_intent_id: paymentIntentId,
      p_payment_method: gateway,
    });

    if (error) {
      logger.error('Failed to confirm order', { error, orderId });
      await this.dbAdmin.from('webhook_logs').update({ status: 'failed' })
        .eq('event_id', paymentIntentId);
      throw new Error('Error al confirmar orden');
    }

    // 5. Marcar como procesado exitosamente
    await this.dbAdmin.from('webhook_logs').update({
      status: 'processed',
      payload: { orderId, confirmedAt: new Date().toISOString() },
    }).eq('event_id', paymentIntentId);

    // 6. Email de confirmación (fallo no revierte el pago)
    await this.sendConfirmationEmail(orderId);

    return {
      success: true,
      orderStatus: result?.status,
      orderId,
    };
  }

  private async sendConfirmationEmail(orderId: string) {
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-order-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });
    } catch (err) {
      logger.error('Failed to send confirmation email', { error: err });
    }
  }
}

new PaymentWebhookController().start();
