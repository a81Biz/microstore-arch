import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";
import { getSupabaseAdmin } from "../_shared/supabase-client.ts";

const logger = createLogger('send-shipping-email');

serve(async (req: Request) => {
  // H5: Solo acepta llamadas internas con service_role key.
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
      .select('*, profiles(email), order_items(*, products(name))')
      .eq('id', orderId)
      .single();

    if (error || !order) throw new Error('Orden no encontrada');

    const resendKey = Deno.env.get('RESEND_API_KEY');

    // H2: Fallo explícito — no devolver 200 cuando la clave no está configurada.
    if (!resendKey) {
      logger.error('RESEND_API_KEY no configurada — email de envío no enviado', { orderId });
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_NOT_CONFIGURED' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const trackingUrl = getTrackingUrl(order.carrier, order.tracking_id);
    const customerEmail = order.profiles.email;

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #16213e;">¡Tu pedido está en camino! 🚚</h1>
        <p>Hola, tu pedido <strong>${order.display_id}</strong> ha sido enviado.</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0;">Detalles del envío</h3>
          <p style="margin: 5px 0;"><strong>Paquetería:</strong> ${order.carrier.toUpperCase()}</p>
          <p style="margin: 5px 0;"><strong>Guía:</strong> <code style="background: #e2e8f0; padding: 2px 5px; border-radius: 4px;">${order.tracking_id}</code></p>
          ${trackingUrl ? `
            <div style="margin-top: 15px;">
              <a href="${trackingUrl}" style="background: #16213e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Rastrear mi paquete
              </a>
            </div>
          ` : ''}
        </div>

        <h3>Productos enviados:</h3>
        <ul style="list-style: none; padding: 0;">
          ${order.order_items.map((item: any) => `
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
        subject: `¡Pedido ${order.display_id} enviado! 🚚`,
        html: emailHtml,
      }),
    });

    if (!response.ok) throw new Error('Error en Resend API');

    logger.info('Shipping email sent', { orderId });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Failed to send shipping email', { error: String(error) });
    return new Response(
      JSON.stringify({ error: 'Failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function getTrackingUrl(carrier: string, trackingId: string): string | null {
  const urls: Record<string, string> = {
    dhl: `https://www.dhl.com/mx-es/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingId}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingId}`,
    estafeta: `https://www.estafeta.com/Herramientas/Rastreo?trackingNumber=${trackingId}`,
    correos_mexico: `https://www.correosdemexico.gob.mx/SSLServicios/ConsultaEnvios/ConsultaEnvio.aspx?envio=${trackingId}`,
  };
  return urls[carrier?.toLowerCase()] ?? null;
}
