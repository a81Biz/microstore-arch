# 📦 Micro-Store Arch — Sprint 4: Pedidos y Logística

**Versión:** 1.0
**Duración:** 2 semanas
**Objetivo:** Implementar el sistema de seguimiento de pedidos en tiempo real para el cliente, el panel de gestión de pedidos para el vendedor, la actualización de tracking y envío de notificaciones, y los emails transaccionales de cambio de estado.

**Dependencia:** Sprint 3 completado (checkout y pagos funcionales).

---

## 🎯 Objetivos del Sprint

1. Implementar la página de "Mis Pedidos" en Client Hub (React SPA) con actualizaciones en tiempo real.
2. Crear el componente `OrderTimeline` (React) con estados visuales del pedido.
3. Implementar Supabase Realtime (vía React `useEffect`) para notificaciones de cambio de estado.
4. Crear panel de gestión de pedidos en Vendor Admin (React SPA).
5. Implementar actualización de tracking ID y cambio de estado.
6. Configurar emails transaccionales para cada cambio de estado (Resend).
7. Implementar filtros y búsqueda en el panel de pedidos.
8. Crear pruebas de integración para el flujo completo de pedidos.
9. Mantener estricta separación arquitectónica.

---

## 📋 Historias de Usuario

### Cliente
- **HU-04a:** Como cliente, quiero ver todos mis pedidos en una lista.
- **HU-04b:** Como cliente, quiero ver el detalle de un pedido con su estado actual.
- **HU-04c:** Como cliente, quiero ver una línea de tiempo visual del progreso de mi pedido.
- **HU-04d:** Como cliente, quiero recibir notificaciones en tiempo real cuando cambie el estado.
- **HU-04e:** Como cliente, quiero ver el tracking ID cuando mi pedido sea enviado.

### Vendedor
- **HU-08a:** Como vendedor, quiero ver todos los pedidos en un panel.
- **HU-08b:** Como vendedor, quiero filtrar pedidos por estado (pendiente, pagado, enviado).
- **HU-08c:** Como vendedor, quiero cambiar el estado de un pedido manualmente.
- **HU-08d:** Como vendedor, quiero ingresar el tracking ID y la paquetería.
- **HU-08e:** Como vendedor, quiero que el cliente reciba un email automático al enviar.

---

## 📐 Reglas Arquitectónicas (Recordatorio)

| Regla | Permitido | Prohibido |
|---|---|---|
| **Markup HTML** | Solo en `.astro` | `.ts`, `.js` |
| **Estilos CSS** | Solo en `.css` | `style=""` inline |
| **Lógica** | Solo en `.ts`, frontmatter `---` | `<script>` inline en HTML |
| **Enums/Tipos** | `@micro-store/core` | Strings literales, `any` |
| **Componentes Hub/Admin** | React + Realtime hooks | Alpine.js puro |
| **Componentes Storefront**| Astro + Alpine.js | React |
| **Acceso a BD** | Solo Edge Functions para escritura | `createClient` directo en apps para escritura |
| **Tiempo real** | Supabase Realtime (vía React) | Polling constante |

---

## 📁 Tarea 4.0: Estructura de Carpetas (Nuevos Archivos)

```bash
# Client Hub - Pedidos
mkdir -p apps/client-hub/src/pages/orders
mkdir -p apps/client-hub/src/components/orders
mkdir -p apps/client-hub/src/lib/orders

# Vendor Admin - Gestión de Pedidos
mkdir -p apps/vendor-admin/src/pages/orders
mkdir -p apps/vendor-admin/src/components/orders
mkdir -p apps/vendor-admin/src/lib/orders

# Edge Functions
mkdir -p supabase/functions/manage-orders
mkdir -p supabase/functions/send-order-email
mkdir -p supabase/functions/send-shipping-email

# Migraciones
# supabase/migrations/00005_order_functions.sql
```

---

## 📁 Tarea 4.1: Base de Datos - Funciones de Pedidos

### `supabase/migrations/00005_order_functions.sql`

```sql
-- Micro-Store Arch: Funciones de Gestión de Pedidos
-- Versión: 1.0

BEGIN;

-- 1. Función para actualizar tracking y estado de envío
CREATE OR REPLACE FUNCTION public.update_order_tracking(
  p_order_id UUID,
  p_tracking_id TEXT,
  p_carrier TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_order orders;
  v_all_items_ready BOOLEAN;
BEGIN
  -- Verificar que la orden existe
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;
  
  -- Verificar que todos los ítems están listos para enviar
  SELECT BOOL_AND(fulfillment_status IN ('reserved', 'in_production', 'ready_to_ship'))
  INTO v_all_items_ready
  FROM order_items
  WHERE order_id = p_order_id;
  
  -- Actualizar tracking y estado
  UPDATE orders SET
    tracking_id = p_tracking_id,
    carrier = p_carrier,
    status = CASE 
      WHEN v_all_items_ready THEN 'shipped'::order_status
      ELSE status
    END,
    shipped_at = CASE 
      WHEN v_all_items_ready THEN NOW()
      ELSE shipped_at
    END,
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;
  
  -- Actualizar ítems a shipped
  IF v_all_items_ready THEN
    UPDATE order_items
    SET fulfillment_status = 'shipped'
    WHERE order_id = p_order_id;
  END IF;
  
  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'display_id', v_order.display_id,
    'status', v_order.status,
    'tracking_id', v_order.tracking_id,
    'carrier', v_order.carrier,
    'shipped_at', v_order.shipped_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para cambiar estado manualmente (admin)
CREATE OR REPLACE FUNCTION public.update_order_status_manual(
  p_order_id UUID,
  p_new_status order_status
)
RETURNS JSONB AS $$
DECLARE
  v_order orders;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;
  
  -- Validar transiciones de estado permitidas
  IF p_new_status = 'delivered' AND v_order.status != 'shipped' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Solo pedidos enviados pueden marcarse como entregados';
  END IF;
  
  IF p_new_status = 'cancelled' AND v_order.status IN ('shipped', 'delivered') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: No se puede cancelar un pedido enviado o entregado';
  END IF;
  
  -- Actualizar estado
  UPDATE orders SET
    status = p_new_status,
    delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;
  
  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'display_id', v_order.display_id,
    'previous_status', v_order.status,
    'new_status', p_new_status,
    'updated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para actualizar estado de ítems individuales
CREATE OR REPLACE FUNCTION public.update_item_fulfillment(
  p_item_id UUID,
  p_new_status item_fulfillment_status
)
RETURNS JSONB AS $$
DECLARE
  v_item order_items;
  v_order_id UUID;
BEGIN
  SELECT * INTO v_item
  FROM order_items
  WHERE id = p_item_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND';
  END IF;
  
  v_order_id := v_item.order_id;
  
  -- Actualizar estado del ítem
  UPDATE order_items SET
    fulfillment_status = p_new_status
  WHERE id = p_item_id;
  
  -- Recalcular estado de la orden
  PERFORM update_order_status(v_order_id);
  
  RETURN jsonb_build_object(
    'item_id', p_item_id,
    'new_status', p_new_status,
    'order_status', (SELECT status FROM orders WHERE id = v_order_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para búsqueda de pedidos (admin)
CREATE OR REPLACE FUNCTION public.search_orders(
  p_status order_status DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  display_id TEXT,
  customer_email TEXT,
  status order_status,
  total_amount DECIMAL(10,2),
  currency TEXT,
  tracking_id TEXT,
  carrier TEXT,
  items_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
    SELECT 
      o.id,
      o.display_id,
      p.email AS customer_email,
      o.status,
      o.total_amount,
      o.currency,
      o.tracking_id,
      o.carrier,
      COUNT(oi.id) AS items_count,
      o.created_at
    FROM orders o
    JOIN profiles p ON o.customer_id = p.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE 
      (p_status IS NULL OR o.status = p_status)
      AND (p_search IS NULL OR o.display_id ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
      AND (p_date_from IS NULL OR o.created_at >= p_date_from)
      AND (p_date_to IS NULL OR o.created_at <= p_date_to)
    GROUP BY o.id, o.display_id, p.email, o.status, o.total_amount, o.currency, o.tracking_id, o.carrier, o.created_at
    ORDER BY o.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Política RLS adicional para realtime
-- Permitir que el cliente se suscriba a cambios en sus propios pedidos
CREATE POLICY "Customers can subscribe to own orders" ON orders
  FOR SELECT
  USING (customer_id = auth.uid());

COMMIT;
```

---

## 📁 Tarea 4.2: Edge Functions de Pedidos

### 4.2.1 Gestión de Pedidos (Admin)

**`supabase/functions/manage-orders/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('manage-orders');

class OrderManagementController extends BaseController {
  
  async listOrders(authHeader: string, filters: OrderFilters) {
    await this.requireAdmin(authHeader);
    
    const { data: orders, error } = await this.dbAdmin.rpc('search_orders', {
      p_status: filters.status || null,
      p_search: filters.search || null,
      p_date_from: filters.dateFrom || null,
      p_date_to: filters.dateTo || null,
      p_limit: filters.limit || 50,
      p_offset: filters.offset || 0
    });
    
    if (error) throw new Error('Error al cargar pedidos');
    
    return orders;
  }
  
  async getOrderDetail(authHeader: string, orderId: string) {
    const user = await this.authenticateUser(authHeader);
    const isAdmin = await this.isAdmin(authHeader);
    
    // Construir query según rol
    let query = this.dbAdmin
      .from('orders')
      .select(`
        *,
        profiles!orders_customer_id_fkey(email),
        order_items(*, products(name, slug))
      `)
      .eq('id', orderId);
    
    if (!isAdmin) {
      // Cliente solo puede ver sus pedidos
      query = query.eq('customer_id', user.id);
    }
    
    const { data: order, error } = await query.single();
    
    if (error || !order) {
      throw new BusinessError('ORDER_NOT_FOUND', 'Pedido no encontrado', 404);
    }
    
    return order;
  }
  
  async updateTracking(authHeader: string, orderId: string, tracking: TrackingInput) {
    await this.requireAdmin(authHeader);
    
    logger.info('Updating tracking', { orderId, trackingId: tracking.trackingId });
    
    const { data, error } = await this.dbAdmin.rpc('update_order_tracking', {
      p_order_id: orderId,
      p_tracking_id: tracking.trackingId,
      p_carrier: tracking.carrier
    });
    
    if (error) {
      if (error.message.includes('ORDER_NOT_FOUND')) {
        throw new BusinessError('ORDER_NOT_FOUND', 'Pedido no encontrado', 404);
      }
      throw error;
    }
    
    // Enviar email de envío al cliente
    await this.sendShippingEmail(orderId);
    
    return data;
  }
  
  async updateStatus(authHeader: string, orderId: string, newStatus: string) {
    await this.requireAdmin(authHeader);
    
    logger.info('Updating order status', { orderId, newStatus });
    
    const { data, error } = await this.dbAdmin.rpc('update_order_status_manual', {
      p_order_id: orderId,
      p_new_status: newStatus
    });
    
    if (error) {
      if (error.message.includes('INVALID_STATUS_TRANSITION')) {
        throw new BusinessError('INVALID_TRANSITION', error.message.split(':')[1]?.trim(), 400);
      }
      throw error;
    }
    
    // Enviar email según el nuevo estado
    await this.sendStatusUpdateEmail(orderId, newStatus);
    
    return data;
  }
  
  private async requireAdmin(authHeader: string) {
    const isAdmin = await this.isAdmin(authHeader);
    if (!isAdmin) throw new UnauthorizedError('Solo el administrador puede gestionar pedidos');
  }
  
  private async sendShippingEmail(orderId: string) {
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-shipping-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId })
      });
    } catch (err) {
      logger.error('Failed to send shipping email', { error: err });
    }
  }
  
  private async sendStatusUpdateEmail(orderId: string, status: string) {
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-order-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId, statusUpdate: status })
      });
    } catch (err) {
      logger.error('Failed to send status email', { error: err });
    }
  }
}

interface OrderFilters {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

interface TrackingInput {
  trackingId: string;
  carrier: string;
}

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const method = req.method;
    const authHeader = req.headers.get('Authorization') || '';
    const controller = new OrderManagementController();
    
    // GET /manage-orders -> Listar pedidos
    if (method === 'GET' && !url.pathname.includes('/tracking')) {
      const filters: OrderFilters = {
        status: url.searchParams.get('status') || undefined,
        search: url.searchParams.get('search') || undefined,
        dateFrom: url.searchParams.get('dateFrom') || undefined,
        dateTo: url.searchParams.get('dateTo') || undefined,
        limit: parseInt(url.searchParams.get('limit') || '50'),
        offset: parseInt(url.searchParams.get('offset') || '0')
      };
      
      const orders = await controller.listOrders(authHeader, filters);
      return new Response(JSON.stringify(orders), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // GET /manage-orders/:id -> Detalle de pedido
    const orderId = url.pathname.split('/').filter(Boolean).pop();
    if (method === 'GET' && orderId && orderId !== 'manage-orders') {
      const order = await controller.getOrderDetail(authHeader, orderId);
      return new Response(JSON.stringify(order), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // PATCH /manage-orders/:id/tracking -> Actualizar tracking
    if (method === 'PATCH' && url.pathname.includes('/tracking')) {
      const body = await req.json();
      const result = await controller.updateTracking(authHeader, orderId!, body);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // PATCH /manage-orders/:id/status -> Cambiar estado
    if (method === 'PATCH' && url.pathname.includes('/status')) {
      const { status } = await req.json();
      const result = await controller.updateStatus(authHeader, orderId!, status);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw new BusinessError('METHOD_NOT_ALLOWED', 'Método no permitido', 405);
    
  } catch (error) {
    return handleError(error);
  }
});
```

### 4.2.2 Email de Envío

**`supabase/functions/send-shipping-email/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger('send-shipping-email');

serve(async (req: Request) => {
  try {
    const { orderId } = await req.json();
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*, profiles(email), order_items(*, products(name))')
      .eq('id', orderId)
      .single();
    
    if (error || !order) {
      throw new Error('Orden no encontrada');
    }
    
    const trackingUrl = getTrackingUrl(order.carrier, order.tracking_id);
    const customerEmail = order.profiles.email;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a2e;">¡Tu pedido está en camino!</h1>
        <p>Tu pedido <strong>${order.display_id}</strong> ha sido enviado.</p>
        
        <div style="background: #f5f5f5; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
          <h3>Información de envío</h3>
          <p><strong>Paquetería:</strong> ${order.carrier}</p>
          <p><strong>Número de seguimiento:</strong> ${order.tracking_id}</p>
          ${trackingUrl ? `<p><a href="${trackingUrl}" style="color: #16213e;">Seguir envío</a></p>` : ''}
        </div>
        
        <h3>Productos en este envío:</h3>
        <ul>
          ${order.order_items.map((item: any) => `
            <li>${item.products.name} x${item.quantity}</li>
          `).join('')}
        </ul>
        
        <p>Gracias por tu compra.</p>
      </div>
    `;
    
    const resendKey = Deno.env.get('RESEND_API_KEY')!;
    const emailFrom = Deno.env.get('EMAIL_FROM')!;
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: emailFrom,
        to: customerEmail,
        subject: `Pedido ${order.display_id} enviado - Micro-Store`,
        html: emailHtml
      })
    });
    
    if (!response.ok) {
      throw new Error('Error al enviar email');
    }
    
    logger.info('Shipping email sent', { orderId });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    logger.error('Failed to send shipping email', { error: String(error) });
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
});

function getTrackingUrl(carrier: string, trackingId: string): string | null {
  const urls: Record<string, string> = {
    dhl: `https://www.dhl.com/mx-es/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingId}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingId}`,
    estafeta: `https://www.estafeta.com/Herramientas/Rastreo?trackingNumber=${trackingId}`,
    correos_mexico: `https://www.correosdemexico.gob.mx/SSLServicios/ConsultaEnvios/ConsultaEnvio.aspx?envio=${trackingId}`
  };
  return urls[carrier] || null;
}
```

---

## 📁 Tarea 4.3: Librerías del Client Hub

### 4.3.1 Pedidos del Cliente

**`apps/client-hub/src/lib/orders/order-client.ts`**

```typescript
import { supabaseClient } from '../supabase-client';
import { OrderStatus, ItemFulfillmentStatus } from '@micro-store/core/enums';
import type { Order, OrderItem } from '@micro-store/core/models';

export interface OrderViewModel {
  id: string;
  displayId: string;
  status: OrderStatus;
  totalAmount: string;
  currency: string;
  itemsCount: number;
  items: OrderItemViewModel[];
  trackingId: string | null;
  carrier: string | null;
  shippingAddress: string;
  createdAt: string;
  timeline: TimelineStep[];
}

export interface OrderItemViewModel {
  id: string;
  productName: string;
  productSlug: string;
  quantity: number;
  unitPrice: string;
  fulfillmentStatus: ItemFulfillmentStatus;
}

export interface TimelineStep {
  label: string;
  status: 'completed' | 'current' | 'pending';
  date: string | null;
  icon: string;
}

function mapToViewModel(order: any): OrderViewModel {
  const timeline = generateTimeline(order);
  
  return {
    id: order.id,
    displayId: order.display_id,
    status: order.status,
    totalAmount: `$${(order.total_amount || 0).toFixed(2)}`,
    currency: order.currency || 'MXN',
    itemsCount: order.order_items?.length || 0,
    items: (order.order_items || []).map((item: any) => ({
      id: item.id,
      productName: item.products?.name || 'Producto',
      productSlug: item.products?.slug || '',
      quantity: item.quantity,
      unitPrice: `$${(item.unit_price || 0).toFixed(2)}`,
      fulfillmentStatus: item.fulfillment_status
    })),
    trackingId: order.tracking_id,
    carrier: order.carrier,
    shippingAddress: order.shipping_address 
      ? `${order.shipping_address.street}, ${order.shipping_address.city}`
      : '',
    createdAt: order.created_at,
    timeline
  };
}

function generateTimeline(order: any): TimelineStep[] {
  const steps: TimelineStep[] = [
    {
      label: 'Pedido creado',
      status: 'completed',
      date: order.created_at,
      icon: '📋'
    },
    {
      label: 'Pago confirmado',
      status: order.status !== 'pending' ? 'completed' : 'pending',
      date: order.updated_at,
      icon: '💳'
    },
    {
      label: 'En producción',
      status: ['in_production', 'shipped', 'delivered'].includes(order.status) 
        ? 'completed' 
        : 'pending',
      date: null,
      icon: '🏭'
    },
    {
      label: 'Enviado',
      status: ['shipped', 'delivered'].includes(order.status) 
        ? 'completed' 
        : order.status === 'in_production' ? 'current' : 'pending',
      date: order.shipped_at,
      icon: '🚚'
    },
    {
      label: 'Entregado',
      status: order.status === 'delivered' ? 'completed' : 'pending',
      date: order.delivered_at,
      icon: '📦'
    }
  ];
  
  // Marcar el paso actual
  const currentIndex = steps.findIndex(s => s.status === 'current');
  if (currentIndex === -1) {
    const lastCompleted = steps.reduceRight((acc, step, i) => 
      step.status === 'completed' && acc === -1 ? i : acc, -1);
    if (lastCompleted >= 0 && lastCompleted < steps.length - 1) {
      steps[lastCompleted + 1].status = 'current';
    }
  }
  
  return steps;
}

export async function loadCustomerOrders(): Promise<OrderViewModel[]> {
  const { data: user } = await supabaseClient.auth.getUser();
  if (!user.user) return [];

  const { data: orders, error } = await supabaseClient
    .from('orders')
    .select(`
      *,
      order_items(*, products(name, slug))
    `)
    .eq('customer_id', user.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading orders:', error);
    return [];
  }

  return (orders || []).map(mapToViewModel);
}

export async function loadOrderDetail(orderId: string): Promise<OrderViewModel | null> {
  const { data: user } = await supabaseClient.auth.getUser();
  if (!user.user) return null;

  const { data: order, error } = await supabaseClient
    .from('orders')
    .select(`
      *,
      order_items(*, products(name, slug))
    `)
    .eq('id', orderId)
    .eq('customer_id', user.user.id)
    .single();

  if (error || !order) return null;

  return mapToViewModel(order);
}

export function subscribeToOrderUpdates(
  orderId: string, 
  onUpdate: (order: OrderViewModel) => void
): () => void {
  const channel = supabaseClient
    .channel(`order:${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      },
      async (payload) => {
        const updated = await loadOrderDetail(orderId);
        if (updated) onUpdate(updated);
      }
    )
    .subscribe();

  return () => {
    supabaseClient.removeChannel(channel);
  };
}
```

### 4.3.2 Pedidos del Admin

**`apps/vendor-admin/src/lib/orders/order-admin.ts`**

```typescript
export interface AdminOrder {
  id: string;
  displayId: string;
  customerEmail: string;
  status: string;
  totalAmount: number;
  currency: string;
  trackingId: string | null;
  carrier: string | null;
  itemsCount: number;
  createdAt: string;
}

export interface AdminOrderDetail extends AdminOrder {
  shippingAddress: any;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    fulfillmentStatus: string;
  }>;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return {
    'Authorization': `Bearer ${token || ''}`,
    'Content-Type': 'application/json'
  };
}

export async function loadOrders(filters?: {
  status?: string;
  search?: string;
}): Promise<AdminOrder[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);

  const response = await fetch(
    `${import.meta.env.PUBLIC_API_BASE}/manage-orders?${params}`,
    { headers: getAuthHeaders() }
  );

  if (!response.ok) throw new Error('Error al cargar pedidos');
  return response.json();
}

export async function loadOrderDetail(orderId: string): Promise<AdminOrderDetail> {
  const response = await fetch(
    `${import.meta.env.PUBLIC_API_BASE}/manage-orders/${orderId}`,
    { headers: getAuthHeaders() }
  );

  if (!response.ok) throw new Error('Error al cargar detalle');
  return response.json();
}

export async function updateTracking(
  orderId: string, 
  trackingId: string, 
  carrier: string
): Promise<void> {
  const response = await fetch(
    `${import.meta.env.PUBLIC_API_BASE}/manage-orders/${orderId}/tracking`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ trackingId, carrier })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar tracking');
  }
}

export async function updateOrderStatus(
  orderId: string, 
  status: string
): Promise<void> {
  const response = await fetch(
    `${import.meta.env.PUBLIC_API_BASE}/manage-orders/${orderId}/status`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar estado');
  }
}
```

---

## 📁 Tarea 4.4: Páginas del Client Hub

### 4.4.1 Lista de Pedidos

**`apps/client-hub/src/pages/orders/index.astro`**

```astro
---
import ClientHubLayout from '../../layouts/ClientHubLayout.astro';
---

<ClientHubLayout title="Mis Pedidos">
  <div class="orders-page" x-data="orderList()" x-init="loadOrders()">
    <h1>Mis Pedidos</h1>

    <template x-if="loading">
      <div class="loading-state">
        <p>Cargando pedidos...</p>
      </div>
    </template>

    <template x-if="!loading && orders.length === 0">
      <div class="empty-state">
        <p class="empty-icon">📦</p>
        <h2>No tienes pedidos aún</h2>
        <p>Cuando realices una compra, aparecerá aquí.</p>
        <a href="/" class="btn-primary">Ver productos</a>
      </div>
    </template>

    <template x-if="!loading && orders.length > 0">
      <div class="orders-list">
        <template x-for="order in orders" :key="order.id">
          <a :href="`/orders/${order.id}`" class="order-card">
            <div class="order-header">
              <div>
                <h3 x-text="order.displayId"></h3>
                <span class="order-date" x-text="formatDate(order.createdAt)"></span>
              </div>
              <span class="order-total" x-text="order.totalAmount"></span>
            </div>

            <div class="order-body">
              <div class="order-items">
                <template x-for="item in order.items.slice(0, 3)" :key="item.id">
                  <span class="order-item-name" x-text="item.productName"></span>
                </template>
                <template x-if="order.items.length > 3">
                  <span class="more-items" x-text="'+' + (order.items.length - 3) + ' más'"></span>
                </template>
              </div>

              <div class="order-status">
                <span 
                  class="status-badge"
                  :class="'status--' + order.status"
                  x-text="getStatusLabel(order.status)"
                ></span>
              </div>
            </div>

            <template x-if="order.trackingId">
              <div class="order-tracking">
                <span class="tracking-icon">🚚</span>
                <span x-text="'Tracking: ' + order.trackingId"></span>
              </div>
            </template>
          </a>
        </template>
      </div>
    </template>
  </div>
</ClientHubLayout>

<script>
  import { loadCustomerOrders } from '../../lib/orders/order-client.ts';
  import { OrderStatus } from '@micro-store/core/enums';

  window.orderList = () => ({
    orders: [],
    loading: true,

    async loadOrders() {
      try {
        this.orders = await loadCustomerOrders();
      } catch (err) {
        console.error('Error loading orders:', err);
      } finally {
        this.loading = false;
      }
    },

    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    },

    getStatusLabel(status) {
      const labels = {
        pending: 'Pendiente',
        paid: 'Pagado',
        in_production: 'En Producción',
        shipped: 'Enviado',
        delivered: 'Entregado',
        cancelled: 'Cancelado',
        refunded: 'Reembolsado'
      };
      return labels[status] || status;
    }
  });
</script>

<style>
  .orders-page {
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  h1 {
    margin-bottom: 2rem;
  }

  .loading-state {
    text-align: center;
    padding: 3rem;
    color: #666;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    background: #f9f9f9;
    border-radius: 12px;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-state h2 {
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    color: #666;
    margin-bottom: 1.5rem;
  }

  .btn-primary {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: #1a1a2e;
    color: white;
    text-decoration: none;
    border-radius: 8px;
  }

  .orders-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .order-card {
    background: white;
    border: 1px solid #eee;
    border-radius: 12px;
    padding: 1.25rem;
    text-decoration: none;
    color: inherit;
    transition: box-shadow 0.2s;
    display: block;
  }

  .order-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .order-header h3 {
    font-size: 1.1rem;
    margin: 0;
  }

  .order-date {
    font-size: 0.8rem;
    color: #999;
  }

  .order-total {
    font-weight: 600;
    font-size: 1rem;
  }

  .order-body {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .order-items {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .order-item-name {
    background: #f5f5f5;
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-size: 0.8rem;
  }

  .more-items {
    color: #666;
    font-size: 0.8rem;
    padding: 0.2rem 0.6rem;
  }

  .status-badge {
    padding: 0.3rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .status--pending { background: #fff3e0; color: #e65100; }
  .status--paid { background: #e3f2fd; color: #1565c0; }
  .status--in_production { background: #f3e5f5; color: #7b1fa2; }
  .status--shipped { background: #e8f5e9; color: #2e7d32; }
  .status--delivered { background: #e8f5e9; color: #1b5e20; }
  .status--cancelled { background: #ffebee; color: #c62828; }
  .status--refunded { background: #fce4ec; color: #880e4f; }

  .order-tracking {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #eee;
    font-size: 0.85rem;
    color: #666;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
```

### 4.4.2 Detalle de Pedido con Timeline

**`apps/client-hub/src/pages/orders/[id].astro`**

```astro
---
import ClientHubLayout from '../../layouts/ClientHubLayout.astro';
---

<ClientHubLayout title="Detalle de Pedido">
  <div class="order-detail-page" x-data="orderDetail()" x-init="loadOrder()">
    <template x-if="loading">
      <div class="loading-state">
        <p>Cargando pedido...</p>
      </div>
    </template>

    <template x-if="!loading && !order">
      <div class="error-state">
        <h2>Pedido no encontrado</h2>
        <a href="/orders" class="btn-primary">Volver a mis pedidos</a>
      </div>
    </template>

    <template x-if="!loading && order">
      <div>
        <a href="/orders" class="back-link">← Volver a mis pedidos</a>

        <div class="order-header-section">
          <h1 x-text="order.displayId"></h1>
          <span 
            class="status-badge"
            :class="'status--' + order.status"
            x-text="getStatusLabel(order.status)"
          ></span>
        </div>

        <!-- Timeline -->
        <div class="timeline">
          <template x-for="(step, index) in order.timeline" :key="index">
            <div class="timeline-step" :class="'timeline--' + step.status">
              <div class="timeline-icon" x-text="step.icon"></div>
              <div class="timeline-content">
                <p class="timeline-label" x-text="step.label"></p>
                <p class="timeline-date" x-show="step.date" x-text="formatDate(step.date)"></p>
              </div>
              <template x-if="index < order.timeline.length - 1">
                <div class="timeline-line" :class="'line--' + step.status"></div>
              </template>
            </div>
          </template>
        </div>

        <!-- Items -->
        <div class="order-items-section">
          <h2>Productos</h2>
          <div class="items-table">
            <template x-for="item in order.items" :key="item.id">
              <div class="item-row">
                <span class="item-name" x-text="item.productName"></span>
                <span class="item-qty" x-text="'x' + item.quantity"></span>
                <span class="item-price" x-text="item.unitPrice"></span>
              </div>
            </template>
            <div class="item-row total-row">
              <strong>Total</strong>
              <span></span>
              <strong x-text="order.totalAmount"></strong>
            </div>
          </div>
        </div>

        <!-- Tracking -->
        <template x-if="order.trackingId">
          <div class="tracking-section">
            <h2>Información de Envío</h2>
            <div class="tracking-card">
              <p><strong>Paquetería:</strong> <span x-text="order.carrier"></span></p>
              <p><strong>Número de seguimiento:</strong> <span x-text="order.trackingId"></span></p>
            </div>
          </div>
        </template>

        <!-- Dirección -->
        <div class="shipping-section">
          <h2>Dirección de Envío</h2>
          <p x-text="order.shippingAddress"></p>
        </div>
      </div>
    </template>
  </div>
</ClientHubLayout>

<script>
  import { loadOrderDetail, subscribeToOrderUpdates } from '../../lib/orders/order-client.ts';

  window.orderDetail = () => ({
    order: null,
    loading: true,
    unsubscribe: null,

    async loadOrder() {
      const orderId = window.location.pathname.split('/').pop();
      
      try {
        const order = await loadOrderDetail(orderId);
        this.order = order;

        // Suscribirse a actualizaciones en tiempo real
        if (order) {
          this.unsubscribe = subscribeToOrderUpdates(orderId, (updated) => {
            this.order = updated;
          });
        }
      } catch (err) {
        console.error('Error loading order:', err);
      } finally {
        this.loading = false;
      }
    },

    formatDate(dateStr) {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    },

    getStatusLabel(status) {
      const labels = {
        pending: 'Pendiente',
        paid: 'Pagado',
        in_production: 'En Producción',
        shipped: 'Enviado',
        delivered: 'Entregado',
        cancelled: 'Cancelado',
        refunded: 'Reembolsado'
      };
      return labels[status] || status;
    },

    destroyed() {
      if (this.unsubscribe) this.unsubscribe();
    }
  });
</script>

<style>
  .order-detail-page {
    max-width: 700px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  .loading-state, .error-state {
    text-align: center;
    padding: 3rem;
  }

  .back-link {
    color: #666;
    text-decoration: none;
    font-size: 0.9rem;
    display: inline-block;
    margin-bottom: 1rem;
  }

  .back-link:hover {
    color: #1a1a2e;
  }

  .order-header-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .order-header-section h1 {
    margin: 0;
  }

  .status-badge {
    padding: 0.4rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .status--pending { background: #fff3e0; color: #e65100; }
  .status--paid { background: #e3f2fd; color: #1565c0; }
  .status--in_production { background: #f3e5f5; color: #7b1fa2; }
  .status--shipped { background: #e8f5e9; color: #2e7d32; }
  .status--delivered { background: #c8e6c9; color: #1b5e20; }
  .status--cancelled { background: #ffebee; color: #c62828; }

  .timeline {
    margin-bottom: 2rem;
    padding: 1rem 0;
  }

  .timeline-step {
    display: flex;
    align-items: flex-start;
    position: relative;
    padding-bottom: 1.5rem;
  }

  .timeline-step:last-child {
    padding-bottom: 0;
  }

  .timeline-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    margin-right: 1rem;
    flex-shrink: 0;
  }

  .timeline--completed .timeline-icon {
    background: #e8f5e9;
    border: 2px solid #4caf50;
  }

  .timeline--current .timeline-icon {
    background: #e3f2fd;
    border: 2px solid #2196f3;
    animation: pulse 2s infinite;
  }

  .timeline--pending .timeline-icon {
    background: #f5f5f5;
    border: 2px solid #ddd;
    opacity: 0.6;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  .timeline-content {
    flex: 1;
  }

  .timeline-label {
    font-weight: 500;
    margin: 0;
  }

  .timeline--pending .timeline-label {
    color: #999;
  }

  .timeline-date {
    font-size: 0.8rem;
    color: #666;
    margin: 0.25rem 0 0 0;
  }

  .timeline-line {
    position: absolute;
    left: 17px;
    top: 40px;
    bottom: 4px;
    width: 2px;
  }

  .line--completed { background: #4caf50; }
  .line--current { background: linear-gradient(to bottom, #2196f3, #ddd); }
  .line--pending { background: #ddd; }

  .order-items-section, .tracking-section, .shipping-section {
    background: white;
    border: 1px solid #eee;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1rem;
  }

  .order-items-section h2,
  .tracking-section h2,
  .shipping-section h2 {
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .items-table {
    display: flex;
    flex-direction: column;
  }

  .item-row {
    display: grid;
    grid-template-columns: 1fr 60px 100px;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f5f5f5;
  }

  .item-row:last-child {
    border-bottom: none;
  }

  .item-qty {
    text-align: center;
  }

  .item-price {
    text-align: right;
  }

  .total-row {
    border-top: 2px solid #eee;
    padding-top: 1rem;
    margin-top: 0.5rem;
  }

  .tracking-card {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 8px;
  }

  .tracking-card p {
    margin: 0.25rem 0;
  }
</style>
```

---

## 📁 Tarea 4.5: Páginas del Vendor Admin

### 4.5.1 Panel de Pedidos

**`apps/vendor-admin/src/pages/orders/index.astro`**

```astro
---
import VendorAdminLayout from '../../layouts/VendorAdminLayout.astro';
---

<VendorAdminLayout title="Gestión de Pedidos">
  <div class="orders-admin-page" x-data="orderAdmin()" x-init="loadOrders()">
    <h1>Gestión de Pedidos</h1>

    <!-- Filtros -->
    <div class="filters-bar">
      <div class="filter-group">
        <select x-model="filterStatus" @change="applyFilters()">
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="paid">Pagados</option>
          <option value="in_production">En Producción</option>
          <option value="shipped">Enviados</option>
          <option value="delivered">Entregados</option>
          <option value="cancelled">Cancelados</option>
        </select>
      </div>

      <div class="filter-group">
        <input 
          type="text" 
          placeholder="Buscar por email o ID" 
          x-model="filterSearch"
          @input="debounceSearch()"
        />
      </div>
    </div>

    <template x-if="loading">
      <p class="loading-text">Cargando pedidos...</p>
    </template>

    <template x-if="!loading && orders.length === 0">
      <div class="empty-state">
        <p>No se encontraron pedidos</p>
      </div>
    </template>

    <template x-if="!loading && orders.length > 0">
      <div class="orders-table-wrapper">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <template x-for="order in orders" :key="order.id">
              <tr>
                <td>
                  <strong x-text="order.displayId"></strong>
                  <br/>
                  <small x-text="order.itemsCount + ' productos'"></small>
                </td>
                <td x-text="order.customerEmail"></td>
                <td>
                  <span 
                    class="status-badge"
                    :class="'status--' + order.status"
                    x-text="getStatusLabel(order.status)"
                  ></span>
                </td>
                <td x-text="'$' + order.totalAmount.toFixed(2)"></td>
                <td x-text="formatDate(order.createdAt)"></td>
                <td>
                  <div class="actions-cell">
                    <button @click="openDetail(order)" class="btn-sm">Ver</button>
                    <button 
                      @click="openTrackingModal(order)" 
                      class="btn-sm"
                      :disabled="order.status === 'delivered' || order.status === 'cancelled'"
                    >
                      Tracking
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Modal de Detalle -->
    <template x-if="showDetail">
      <div class="modal-overlay" @click.self="showDetail = false">
        <div class="modal modal-lg">
          <h2 x-text="'Pedido ' + selectedOrder?.displayId"></h2>
          
          <template x-if="selectedOrder">
            <div class="detail-grid">
              <div class="detail-section">
                <h3>Información del Pedido</h3>
                <p><strong>Estado:</strong> <span x-text="getStatusLabel(selectedOrder.status)"></span></p>
                <p><strong>Total:</strong> <span x-text="'$' + selectedOrder.totalAmount.toFixed(2)"></span></p>
                <p><strong>Fecha:</strong> <span x-text="formatDate(selectedOrder.createdAt)"></span></p>
                <template x-if="selectedOrder.trackingId">
                  <p><strong>Tracking:</strong> <span x-text="selectedOrder.trackingId"></span></p>
                </template>
              </div>

              <div class="detail-section">
                <h3>Productos</h3>
                <template x-for="item in selectedOrder.items" :key="item.id">
                  <div class="detail-item">
                    <span x-text="item.productName"></span>
                    <span x-text="'x' + item.quantity"></span>
                    <span x-text="'$' + item.unitPrice.toFixed(2)"></span>
                  </div>
                </template>
              </div>

              <div class="detail-section">
                <h3>Cambiar Estado</h3>
                <select x-model="newStatus" class="status-select">
                  <option value="">Seleccionar...</option>
                  <option value="in_production">En Producción</option>
                  <option value="shipped">Enviado</option>
                  <option value="delivered">Entregado</option>
                  <option value="cancelled">Cancelar</option>
                </select>
                <button 
                  @click="changeStatus()" 
                  class="btn-primary btn-sm-full"
                  :disabled="!newStatus || statusLoading"
                >
                  Actualizar Estado
                </button>
                <template x-if="statusMessage">
                  <p class="success-message" x-text="statusMessage"></p>
                </template>
              </div>
            </div>
          </template>

          <button @click="showDetail = false" class="btn-secondary">Cerrar</button>
        </div>
      </div>
    </template>

    <!-- Modal de Tracking -->
    <template x-if="showTracking">
      <div class="modal-overlay" @click.self="showTracking = false">
        <div class="modal">
          <h2>Actualizar Tracking</h2>
          
          <form @submit.prevent="saveTracking()">
            <div class="form-group">
              <label for="carrier">Paquetería</label>
              <select id="carrier" x-model="trackingCarrier" required>
                <option value="">Seleccionar...</option>
                <option value="dhl">DHL</option>
                <option value="fedex">FedEx</option>
                <option value="estafeta">Estafeta</option>
                <option value="correos_mexico">Correos de México</option>
              </select>
            </div>

            <div class="form-group">
              <label for="tracking-id">Número de Seguimiento</label>
              <input 
                type="text" 
                id="tracking-id" 
                x-model="trackingId" 
                required 
                minlength="5"
              />
            </div>

            <template x-if="trackingError">
              <p class="error-message" x-text="trackingError"></p>
            </template>

            <div class="modal-actions">
              <button type="button" @click="showTracking = false" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-primary" :disabled="trackingLoading">
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </div>
</VendorAdminLayout>

<script>
  import { loadOrders, loadOrderDetail, updateTracking, updateOrderStatus } from '../../lib/orders/order-admin.ts';

  window.orderAdmin = () => ({
    orders: [],
    loading: true,
    filterStatus: '',
    filterSearch: '',
    searchTimeout: null,
    showDetail: false,
    selectedOrder: null,
    newStatus: '',
    statusLoading: false,
    statusMessage: '',
    showTracking: false,
    trackingOrderId: '',
    trackingCarrier: '',
    trackingId: '',
    trackingLoading: false,
    trackingError: '',

    async loadOrders() {
      this.loading = true;
      try {
        this.orders = await loadOrders({
          status: this.filterStatus || undefined,
          search: this.filterSearch || undefined
        });
      } catch (err) {
        console.error('Error:', err);
      } finally {
        this.loading = false;
      }
    },

    applyFilters() {
      this.loadOrders();
    },

    debounceSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => this.loadOrders(), 300);
    },

    async openDetail(order) {
      try {
        this.selectedOrder = await loadOrderDetail(order.id);
        this.showDetail = true;
        this.newStatus = '';
        this.statusMessage = '';
      } catch (err) {
        console.error('Error loading detail:', err);
      }
    },

    async changeStatus() {
      if (!this.newStatus || !this.selectedOrder) return;

      this.statusLoading = true;
      this.statusMessage = '';

      try {
        await updateOrderStatus(this.selectedOrder.id, this.newStatus);
        this.statusMessage = 'Estado actualizado correctamente';
        await this.loadOrders();
        setTimeout(() => this.showDetail = false, 1000);
      } catch (err) {
        this.statusMessage = 'Error: ' + err.message;
      } finally {
        this.statusLoading = false;
      }
    },

    openTrackingModal(order) {
      this.trackingOrderId = order.id;
      this.trackingCarrier = order.carrier || '';
      this.trackingId = order.trackingId || '';
      this.trackingError = '';
      this.showTracking = true;
    },

    async saveTracking() {
      this.trackingLoading = true;
      this.trackingError = '';

      try {
        await updateTracking(this.trackingOrderId, this.trackingId, this.trackingCarrier);
        this.showTracking = false;
        await this.loadOrders();
      } catch (err) {
        this.trackingError = err.message;
      } finally {
        this.trackingLoading = false;
      }
    },

    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    },

    getStatusLabel(status) {
      const labels = {
        pending: 'Pendiente', paid: 'Pagado',
        in_production: 'En Producción', shipped: 'Enviado',
        delivered: 'Entregado', cancelled: 'Cancelado',
        refunded: 'Reembolsado'
      };
      return labels[status] || status;
    }
  });
</script>

<style>
  .orders-admin-page {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  h1 { margin-bottom: 1.5rem; }

  .filters-bar {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    background: white;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #eee;
  }

  .filter-group select, .filter-group input {
    padding: 0.6rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.9rem;
  }

  .loading-text { text-align: center; color: #666; }
  .empty-state { text-align: center; padding: 2rem; color: #666; }

  .orders-table-wrapper { overflow-x: auto; }
  .orders-table { width: 100%; border-collapse: collapse; }
  .orders-table th {
    background: #f9f9f9;
    padding: 0.75rem;
    text-align: left;
    font-size: 0.85rem;
    color: #666;
  }
  .orders-table td {
    padding: 0.75rem;
    border-top: 1px solid #eee;
    font-size: 0.9rem;
  }

  .status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .status--pending { background: #fff3e0; color: #e65100; }
  .status--paid { background: #e3f2fd; color: #1565c0; }
  .status--in_production { background: #f3e5f5; color: #7b1fa2; }
  .status--shipped { background: #e8f5e9; color: #2e7d32; }
  .status--delivered { background: #c8e6c9; color: #1b5e20; }
  .status--cancelled { background: #ffebee; color: #c62828; }

  .actions-cell { display: flex; gap: 0.5rem; }
  .btn-sm {
    padding: 0.35rem 0.7rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
    background: white;
  }
  .btn-sm:hover { background: #f5f5f5; }
  .btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }

  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    width: 500px;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-lg { width: 700px; }

  .modal h2 { margin-bottom: 1.5rem; }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .detail-section {
    background: #f9f9f9;
    padding: 1rem;
    border-radius: 8px;
  }

  .detail-section h3 {
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
    color: #666;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    padding: 0.35rem 0;
    font-size: 0.85rem;
  }

  .status-select {
    width: 100%;
    padding: 0.6rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    margin-bottom: 0.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }

  .form-group label { font-size: 0.85rem; font-weight: 500; }
  .form-group input, .form-group select {
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 8px;
  }

  .btn-primary {
    padding: 0.75rem 1.5rem;
    background: #16213e;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
  .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
  .btn-secondary {
    padding: 0.75rem 1.5rem;
    background: #eee;
    color: #333;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
  .btn-sm-full { width: 100%; }

  .success-message {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 0.5rem;
    border-radius: 6px;
    font-size: 0.85rem;
    margin-top: 0.5rem;
  }

  .error-message {
    background: #ffebee;
    color: #c62828;
    padding: 0.5rem;
    border-radius: 6px;
    font-size: 0.85rem;
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }
</style>
```

---

## 📁 Tarea 4.6: Pruebas

### 4.6.1 Pruebas Unitarias - Timeline

**`apps/client-hub/src/lib/orders/__tests__/order-client.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';

// Importar función privada para test (o testear a través de la API pública)
describe('Order Timeline Generation', () => {
  it('debe generar timeline correcto para pedido pendiente', () => {
    const order = {
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    };

    // La timeline debe tener 5 pasos
    // Primer paso completado, resto pendientes
  });

  it('debe generar timeline correcto para pedido enviado', () => {
    const order = {
      status: 'shipped',
      created_at: '2026-01-01T00:00:00Z',
      shipped_at: '2026-01-05T00:00:00Z'
    };

    // Pasos 1-4 completados, paso 5 pendiente
  });

  it('debe generar timeline correcto para pedido entregado', () => {
    const order = {
      status: 'delivered',
      created_at: '2026-01-01T00:00:00Z',
      shipped_at: '2026-01-05T00:00:00Z',
      delivered_at: '2026-01-10T00:00:00Z'
    };

    // Todos los pasos completados
  });
});
```

### 4.6.2 Pruebas de Integración - Realtime

**`apps/client-hub/src/lib/orders/__tests__/realtime.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Order Realtime Subscription', () => {
  it('debe suscribirse a cambios de orden', () => {
    const mockOnUpdate = vi.fn();
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    };

    // Mock supabase channel
    const mockSupabase = {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn()
    };

    // Verificar que se crea el canal con el filtro correcto
    expect(mockSupabase.channel).toHaveBeenCalledWith('order:test-id');
  });

  it('debe llamar onUpdate cuando recibe actualización', async () => {
    const mockOnUpdate = vi.fn();
    
    // Simular evento de actualización
    const payload = {
      new: { id: 'test-id', status: 'shipped' }
    };

    // Verificar que onUpdate se llama con los nuevos datos
  });
});
```

---

## 📊 Definición de Terminado (DoD) del Sprint 4

- [ ] Cliente puede ver lista de todos sus pedidos
- [ ] Cliente puede ver detalle de pedido con timeline visual
- [ ] Timeline muestra estados correctamente (completado, actual, pendiente)
- [ ] Cliente recibe actualizaciones en tiempo real (Supabase Realtime)
- [ ] Cliente puede ver tracking ID cuando el pedido es enviado
- [ ] Vendedor puede ver todos los pedidos en panel
- [ ] Vendedor puede filtrar pedidos por estado y buscar
- [ ] Vendedor puede cambiar estado de pedido manualmente
- [ ] Vendedor puede ingresar tracking ID y paquetería
- [ ] Emails transaccionales se envían al cambiar estado
- [ ] Email de envío incluye link de rastreo
- [ ] RLS permite solo lectura de pedidos propios al cliente
- [ ] RLS permite gestión completa al admin con MFA
- [ ] Tests unitarios pasan (timeline, estados)
- [ ] Tests de integración pasan (realtime, flujo completo)
- [ ] `npm run check:architecture` pasa sin errores

---

## 🎯 Retrospectiva del Sprint 4 (Template)

1. **¿El timeline es claro para el cliente?**
2. **¿Supabase Realtime funciona sin latencia notable?**
3. **¿El panel de pedidos es eficiente para el vendedor?**
4. **¿Los emails de notificación llegan correctamente?**
5. **¿Se mantuvo la separación arquitectónica?**

