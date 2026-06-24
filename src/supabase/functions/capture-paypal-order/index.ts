import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('capture-paypal-order');

class CapturePayPalOrderController extends BaseController {

  async handle(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
      throw new BusinessError('METHOD_NOT_ALLOWED', 'Solo POST permitido', 405);
    }

    const authHeader = req.headers.get('Authorization') || '';
    const user = await this.authenticateUser(authHeader);

    const { paypalOrderId, orderId } = await req.json();

    if (!paypalOrderId || typeof paypalOrderId !== 'string') {
      throw new BusinessError('VALIDATION_ERROR', 'paypalOrderId requerido', 400);
    }
    if (!orderId || typeof orderId !== 'string') {
      throw new BusinessError('VALIDATION_ERROR', 'orderId requerido', 400);
    }

    // Verificar que la orden pertenece al usuario autenticado
    const { data: order, error: orderError } = await this.dbAdmin
      .from('orders')
      .select('id, display_id, customer_id, total_amount, currency, status')
      .eq('id', orderId)
      .eq('customer_id', user.id)
      .single();

    if (orderError || !order) {
      throw new BusinessError('ORDER_NOT_FOUND', 'Orden no encontrada o no pertenece al usuario', 404);
    }

    // Idempotencia: si ya fue procesada, retornar éxito sin re-procesar
    const { data: existing } = await this.dbAdmin
      .from('webhook_logs')
      .select('id, status')
      .eq('event_id', paypalOrderId)
      .maybeSingle();

    if (existing?.status === 'processed') {
      logger.info('PayPal order already captured', { paypalOrderId, orderId });
      return new Response(JSON.stringify({
        success: true,
        duplicate: true,
        orderId,
        displayId: order.display_id,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Leer credenciales PayPal de la BD encriptada
    const { data: credJson, error: credError } = await this.dbAdmin.rpc('get_payment_credentials', {
      p_gateway: 'paypal'
    });
    if (credError || !credJson) {
      throw new BusinessError('GATEWAY_NOT_CONFIGURED', 'PayPal no configurado en BD', 503);
    }
    const clientId     = credJson.clientId as string;
    const clientSecret = credJson.secret   as string;
    if (!clientId || !clientSecret) {
      throw new BusinessError('GATEWAY_MISCONFIGURED', 'Credenciales PayPal incompletas en BD', 503);
    }

    const paypalEnv  = Deno.env.get('PAYPAL_ENV') === 'production' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';
    const paypalBase = `https://${paypalEnv}`;

    // Obtener access_token
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

    // Ejecutar capture
    logger.info('Capturing PayPal order', { paypalOrderId, orderId });
    const captureRes = await fetch(`${paypalBase}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!captureRes.ok) {
      const captureError = await captureRes.json().catch(() => ({}));
      logger.error('PayPal capture failed', { paypalOrderId, status: captureRes.status, captureError });
      throw new BusinessError('PAYPAL_CAPTURE_ERROR', 'Error al capturar el pago en PayPal', 502);
    }

    const capture = await captureRes.json();

    if (capture.status !== 'COMPLETED') {
      logger.warn('PayPal capture status not COMPLETED', { paypalOrderId, status: capture.status });
      throw new BusinessError('PAYPAL_CAPTURE_INCOMPLETE', `Estado de capture inesperado: ${capture.status}`, 422);
    }

    const captureUnit = capture.purchase_units[0]?.payments?.captures?.[0];
    if (!captureUnit) {
      throw new BusinessError('PAYPAL_CAPTURE_ERROR', 'Respuesta de capture inválida de PayPal', 502);
    }

    const amountCents   = Math.round(parseFloat(captureUnit.amount.value) * 100);
    const expectedCents = Math.round((order.total_amount as number) * 100);

    if (amountCents !== expectedCents) {
      logger.error('Payment amount mismatch', { orderId, expected: expectedCents, received: amountCents });
      await this.dbAdmin.from('webhook_logs').upsert({
        event_id: paypalOrderId,
        gateway: 'paypal',
        status: 'amount_mismatch',
        payload: { orderId, expected: expectedCents, received: amountCents },
      }, { onConflict: 'event_id' });
      throw new BusinessError('AMOUNT_MISMATCH', 'El monto capturado no coincide con el total de la orden', 422);
    }

    // Marcar en procesamiento (previene race conditions con el webhook)
    await this.dbAdmin.from('webhook_logs').upsert({
      event_id: paypalOrderId,
      gateway: 'paypal',
      status: 'processing',
      payload: { orderId },
    }, { onConflict: 'event_id' });

    // Confirmar orden en BD (transacción atómica)
    const { error: confirmError } = await this.dbAdmin.rpc('confirm_order_payment', {
      p_order_id:           orderId,
      p_payment_intent_id:  captureUnit.id,
      p_payment_method:     'paypal',
    });

    if (confirmError) {
      logger.error('Failed to confirm order after PayPal capture', { orderId, confirmError });
      await this.dbAdmin.from('webhook_logs').update({ status: 'failed' })
        .eq('event_id', paypalOrderId);
      throw new BusinessError('ORDER_CONFIRM_ERROR', 'Error al confirmar la orden tras el pago', 500);
    }

    // Marcar como procesado
    await this.dbAdmin.from('webhook_logs').update({
      status: 'processed',
      payload: { orderId, captureId: captureUnit.id, confirmedAt: new Date().toISOString() },
    }).eq('event_id', paypalOrderId);

    // Email de confirmación (fallo no revierte el pago)
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-order-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });
    } catch (emailErr) {
      logger.error('Failed to send confirmation email', { error: String(emailErr) });
    }

    logger.info('PayPal order captured and confirmed', { paypalOrderId, orderId, captureId: captureUnit.id });

    return new Response(JSON.stringify({
      success: true,
      orderId,
      displayId: order.display_id,
      status: 'paid',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}

new CapturePayPalOrderController().start();
