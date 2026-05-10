import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('manage-orders');

interface OrderFilters {
  status?: string;
  search?: string;
  limit: number;
  offset: number;
}

interface TrackingUpdate {
  trackingId: string;
  carrier: string;
}

class OrderManagementController extends BaseController {

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;
    const authHeader = req.headers.get('Authorization') || '';

    // GET /manage-orders → Listar pedidos
    if (method === 'GET' && url.pathname.endsWith('/manage-orders')) {
      const filters: OrderFilters = {
        status: url.searchParams.get('status') ?? undefined,
        search: url.searchParams.get('search') ?? undefined,
        limit: Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100),
        offset: Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0)
      };
      const orders = await this.listOrders(authHeader, filters);
      return new Response(JSON.stringify(orders), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const segments = url.pathname.split('/').filter(Boolean);
    const orderId = segments[1];

    if (method === 'GET' && orderId && segments.length === 2) {
      const order = await this.getOrderDetail(authHeader, orderId);
      return new Response(JSON.stringify(order), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (method === 'PATCH' && orderId && url.pathname.includes('/tracking')) {
      const body = await req.json();
      const result = await this.updateTracking(authHeader, orderId, body);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (method === 'PATCH' && orderId && url.pathname.includes('/status')) {
      const { status } = await req.json();
      const result = await this.updateStatus(authHeader, orderId, status);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    throw new BusinessError('METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  private async listOrders(authHeader: string, filters: OrderFilters) {
    await this.requireAdminMFA(authHeader);

    const { data: orders, error } = await this.dbAdmin.rpc('search_orders', {
      p_status: filters.status ?? null,
      p_search: filters.search ?? null,
      p_limit: filters.limit,
      p_offset: filters.offset
    });

    if (error) throw error;
    return orders;
  }

  private async getOrderDetail(authHeader: string, orderId: string) {
    // Autenticar una sola vez y reutilizar el objeto user
    const user = await this.authenticateUser(authHeader);
    const isAdmin = await this.isAdminUser(user);

    let query = this.dbAdmin
      .from('orders')
      .select(`
        *,
        profiles(email),
        order_items(*, products(name, slug))
      `)
      .eq('id', orderId);

    if (!isAdmin) {
      query = query.eq('customer_id', user.id);
    }

    const { data: order, error } = await query.single();
    if (error || !order) throw new BusinessError('ORDER_NOT_FOUND', 'Pedido no encontrado', 404);

    return order;
  }

  private async updateTracking(authHeader: string, orderId: string, tracking: TrackingUpdate) {
    await this.requireAdminMFA(authHeader);

    if (!tracking.trackingId || typeof tracking.trackingId !== 'string') {
      throw new BusinessError('VALIDATION_ERROR', 'trackingId es requerido', 400);
    }
    if (!tracking.carrier || typeof tracking.carrier !== 'string') {
      throw new BusinessError('VALIDATION_ERROR', 'carrier es requerido', 400);
    }

    const { data, error } = await this.dbAdmin.rpc('update_order_tracking', {
      p_order_id: orderId,
      p_tracking_id: tracking.trackingId,
      p_carrier: tracking.carrier
    });

    if (error) throw error;

    // Notificación asíncrona — error no debe bloquear la respuesta al vendor
    this.triggerEmail(orderId, 'shipping').catch(err =>
      logger.error('Failed to trigger shipping email', { orderId, error: String(err) })
    );

    return data;
  }

  private async updateStatus(authHeader: string, orderId: string, newStatus: string) {
    await this.requireAdminMFA(authHeader);

    const { data, error } = await this.dbAdmin.rpc('update_order_status_manual', {
      p_order_id: orderId,
      p_new_status: newStatus
    });

    if (error) throw error;

    this.triggerEmail(orderId, 'status_update', newStatus).catch(err =>
      logger.error('Failed to trigger status email', { orderId, error: String(err) })
    );

    return data;
  }

  private async triggerEmail(orderId: string, type: string, status?: string): Promise<void> {
    const functionName = type === 'shipping' ? 'send-shipping-email' : 'send-order-email';
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId, statusUpdate: status })
    });
  }
}

new OrderManagementController().start();
