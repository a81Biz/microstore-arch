import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('manage-orders');

class OrderManagementController extends BaseController {
  
  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;
    const authHeader = req.headers.get('Authorization') || '';
    
    // GET /manage-orders -> Listar pedidos
    if (method === 'GET' && url.pathname.endsWith('/manage-orders')) {
      const filters = {
        status: url.searchParams.get('status') || undefined,
        search: url.searchParams.get('search') || undefined,
        limit: parseInt(url.searchParams.get('limit') || '50'),
        offset: parseInt(url.searchParams.get('offset') || '0')
      };
      const orders = await this.listOrders(authHeader, filters);
      return new Response(JSON.stringify(orders), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    // Rutas con ID
    const segments = url.pathname.split('/').filter(Boolean);
    const orderId = segments[1];

    if (method === 'GET' && orderId && segments.length === 2) {
      const order = await this.getOrderDetail(authHeader, orderId);
      return new Response(JSON.stringify(order), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    if (method === 'PATCH' && orderId && url.pathname.includes('/tracking')) {
      const body = await req.json();
      const result = await this.updateTracking(authHeader, orderId, body);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    if (method === 'PATCH' && orderId && url.pathname.includes('/status')) {
      const { status } = await req.json();
      const result = await this.updateStatus(authHeader, orderId, status);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    throw new BusinessError('METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  async listOrders(authHeader: string, filters: any) {
    await this.requireAdmin(authHeader);
    
    const { data: orders, error } = await this.dbAdmin.rpc('search_orders', {
      p_status: filters.status || null,
      p_search: filters.search || null,
      p_limit: filters.limit || 50,
      p_offset: filters.offset || 0
    });
    
    if (error) throw error;
    return orders;
  }
  
  async getOrderDetail(authHeader: string, orderId: string) {
    const user = await this.authenticateUser(authHeader);
    const isAdmin = await this.isAdmin(authHeader);
    
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
  
  async updateTracking(authHeader: string, orderId: string, tracking: any) {
    await this.requireAdmin(authHeader);
    
    const { data, error } = await this.dbAdmin.rpc('update_order_tracking', {
      p_order_id: orderId,
      p_tracking_id: tracking.trackingId,
      p_carrier: tracking.carrier
    });
    
    if (error) throw error;
    
    // Notificar por email
    await this.triggerEmail(orderId, 'shipping');
    
    return data;
  }
  
  async updateStatus(authHeader: string, orderId: string, newStatus: string) {
    await this.requireAdmin(authHeader);
    
    const { data, error } = await this.dbAdmin.rpc('update_order_status_manual', {
      p_order_id: orderId,
      p_new_status: newStatus
    });
    
    if (error) throw error;
    
    // Notificar por email
    await this.triggerEmail(orderId, 'status_update', newStatus);
    
    return data;
  }
  
  private async triggerEmail(orderId: string, type: string, status?: string) {
    try {
      const functionName = type === 'shipping' ? 'send-shipping-email' : 'send-order-email';
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId, statusUpdate: status })
      });
    } catch (err) {
      logger.error(`Failed to trigger ${type} email`, { error: err });
    }
  }

  private async requireAdmin(authHeader: string) {
    await this.requireAdminMFA(authHeader);
  }
}

new OrderManagementController().start();
