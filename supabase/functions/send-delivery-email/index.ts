import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";
import { getSupabaseAdmin } from "../_shared/supabase-client.ts";

const logger = createLogger('send-delivery-email');

serve(async (req: Request) => {
  // Internal-only: accepts calls authenticated with service_role key.
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
      .select('display_id, total_amount, currency, profiles(email), order_items(quantity, products(name))')
      .eq('id', orderId)
      .single();

    if (error || !order) throw new Error('Orden no encontrada');

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      logger.error('RESEND_API_KEY no configurada — email de entrega no enviado', { orderId });
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_NOT_CONFIGURED' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customerEmail = order.profiles.email;

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #059669;">¡Tu pedido ha llegado! 📦</h1>
        <p>Tu pedido <strong>${order.display_id}</strong> ha sido entregado exitosamente.</p>

        <h3 style="margin-top: 24px;">Productos recibidos:</h3>
        <ul style="list-style: none; padding: 0;">
          ${order.order_items.map((item: any) => `
            <li style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
              ${item.products.name} <span style="color: #64748b;">×${item.quantity}</span>
            </li>
          `).join('')}
        </ul>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-top: 20px;">
          <p style="margin: 0; color: #166534; font-weight: 600;">
            ¿Todo llegó bien? Si tienes algún problema con tu pedido, responde a este correo.
          </p>
        </div>

        <div style="text-align: center; margin-top: 32px;">
          <a href="${Deno.env.get('PUBLIC_CLIENT_HUB_URL') || 'http://client.localhost'}/orders"
             style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Ver mis pedidos
          </a>
        </div>

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
        from: Deno.env.get('EMAIL_FROM') || 'noreply@tienda.com',
        to: customerEmail,
        subject: `¡Tu pedido ${order.display_id} ha sido entregado! 📦`,
        html: emailHtml,
      }),
    });

    if (!response.ok) throw new Error('Error en Resend API');

    logger.info('Delivery email sent', { orderId });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Failed to send delivery email', { error: String(error) });
    return new Response(
      JSON.stringify({ error: 'Failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
