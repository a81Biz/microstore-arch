import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";
import { getSupabaseAdmin } from "../_shared/supabase-client.ts";

const logger = createLogger('send-status-email');

const STATUS_COPY: Record<string, { subject: string; heading: string; body: string; emoji: string }> = {
  packaged: {
    emoji: '📦',
    subject: 'Tu pedido está siendo empaquetado',
    heading: '¡Tu pedido está siendo empaquetado!',
    body: 'Estamos preparando cuidadosamente tu pedido. Pronto lo enviaremos.',
  },
  shipped: {
    emoji: '🚚',
    subject: 'Tu pedido ha sido enviado',
    heading: '¡Tu pedido está en camino!',
    body: 'Tu pedido ha sido entregado a la paquetería y está en proceso de envío.',
  },
  in_transit: {
    emoji: '🛣️',
    subject: 'Tu pedido está en tránsito',
    heading: 'Tu pedido está en tránsito',
    body: 'Tu pedido está en camino y llegará pronto a tu domicilio.',
  },
  cancelled: {
    emoji: '❌',
    subject: 'Tu pedido ha sido cancelado',
    heading: 'Tu pedido ha sido cancelado',
    body: 'Lamentamos informarte que tu pedido ha sido cancelado. Si tienes dudas, contáctanos.',
  },
};

serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { orderId, status } = await req.json();

    const copy = STATUS_COPY[status as string];
    if (!copy) {
      logger.info('No email copy for status — skipping', { orderId, status });
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('display_id, order_items(quantity, products(name)), profiles(email)')
      .eq('id', orderId)
      .single();

    if (error || !order) throw new Error('Orden no encontrada');

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      logger.error('RESEND_API_KEY no configurada — email de estado no enviado', { orderId, status });
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_NOT_CONFIGURED' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customerEmail = (order as any).profiles.email;

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #16213e;">${copy.emoji} ${copy.heading}</h1>
        <p>Hola, te informamos sobre el estado de tu pedido <strong>${(order as any).display_id}</strong>.</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 1rem;">${copy.body}</p>
        </div>

        <h3>Productos de tu pedido:</h3>
        <ul style="list-style: none; padding: 0;">
          ${(order as any).order_items.map((item: any) => `
            <li style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
              ${item.products.name} <span style="color: #64748b;">x${item.quantity}</span>
            </li>
          `).join('')}
        </ul>

        <p style="margin-top: 30px; color: #64748b; font-size: 0.9em;">
          Si tienes alguna duda, contáctanos respondiendo a este correo.
        </p>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('EMAIL_FROM') || 'pedidos@tienda.com',
        to: customerEmail,
        subject: `${copy.emoji} ${copy.subject} — Pedido ${(order as any).display_id}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) throw new Error('Error en Resend API');

    logger.info('Status email sent', { orderId, status });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Failed to send status email', { error: String(error) });
    return new Response(
      JSON.stringify({ error: 'Failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
