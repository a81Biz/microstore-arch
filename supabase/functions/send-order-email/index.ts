import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";
import { getSupabaseAdmin } from "../_shared/supabase-client.ts";

const logger = createLogger('send-order-email');

serve(async (req: Request) => {
  // H5: Solo acepta llamadas internas con service_role key.
  // Los callers (payment-webhook, manage-orders) ya envían este header.
  const authHeader = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { orderId } = await req.json();

    const supabaseAdmin = getSupabaseAdmin();

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*, profiles(email, role), order_items(*, products(name, price))')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new Error('Orden no encontrada');
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'noreply@tienda.com';

    // H2: Fallo explícito — no devolver 200 cuando la clave no está configurada.
    if (!resendKey) {
      logger.error('RESEND_API_KEY no configurada — email de confirmación no enviado', { orderId });
      return new Response(JSON.stringify({ success: false, error: 'RESEND_NOT_CONFIGURED' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #16213e;">¡Gracias por tu compra!</h1>
        <p>Tu pedido <strong>${order.display_id}</strong> ha sido confirmado.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <h2>Resumen del pedido</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="text-align: left; padding: 10px; border-bottom: 2px solid #eee;">Producto</th>
              <th style="text-align: center; padding: 10px; border-bottom: 2px solid #eee;">Cant.</th>
              <th style="text-align: right; padding: 10px; border-bottom: 2px solid #eee;">Precio</th>
            </tr>
          </thead>
          <tbody>
            ${order.order_items.map((item: any) => `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.products.name}</td>
                <td style="text-align: center; padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
                <td style="text-align: right; padding: 10px; border-bottom: 1px solid #eee;">$${item.unit_price.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="text-align: right; padding: 15px 10px; font-weight: bold; font-size: 1.1em;">Total</td>
              <td style="text-align: right; padding: 15px 10px; font-weight: bold; font-size: 1.1em; color: #16213e;">$${order.total_amount.toFixed(2)} ${order.currency}</td>
            </tr>
          </tfoot>
        </table>
        <p style="margin-top: 30px; color: #666; font-size: 0.9em;">Te notificaremos cuando tu pedido sea enviado.</p>
        <div style="text-align: center; margin-top: 40px; font-size: 0.8em; color: #999;">
          &copy; ${new Date().getFullYear()} Micro-Store Arch. Todos los derechos reservados.
        </div>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: order.profiles.email,
        subject: `Pedido ${order.display_id} confirmado - Micro-Store`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Failed to send email', { error: errorData });
      throw new Error('Error al enviar email');
    }

    logger.info('Confirmation email sent', { orderId });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Send email error', { error: String(error) });
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
