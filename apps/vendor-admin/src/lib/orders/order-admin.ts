import { API_ROUTES } from '@micro-store/core';

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

const base = () => import.meta.env.PUBLIC_API_BASE as string;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { supabaseClient } = await import('../supabase-client');
  const { data: { session } } = await supabaseClient.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token || ''}`,
    'Content-Type': 'application/json'
  };
}

export async function loadOrders(filters?: { status?: string; search?: string }): Promise<AdminOrder[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);

  const response = await fetch(`${base()}${API_ROUTES.admin.orders}?${params}`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) throw new Error('Error al cargar pedidos');

  const data = await response.json();
  return data.map((o: any) => ({
    id: o.id,
    displayId: o.display_id,
    customerEmail: o.customer_email,
    status: o.status,
    totalAmount: parseFloat(o.total_amount),
    currency: o.currency,
    trackingId: o.tracking_id,
    carrier: o.carrier,
    itemsCount: parseInt(o.items_count),
    createdAt: o.created_at
  }));
}

export async function loadOrderDetail(orderId: string): Promise<AdminOrderDetail> {
  const response = await fetch(`${base()}${API_ROUTES.admin.orders}/${orderId}`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) throw new Error('Error al cargar detalle');
  const o = await response.json();

  return {
    id: o.id,
    displayId: o.display_id,
    customerEmail: o.profiles?.email,
    status: o.status,
    totalAmount: parseFloat(o.total_amount),
    currency: o.currency,
    trackingId: o.tracking_id,
    carrier: o.carrier,
    itemsCount: o.order_items?.length || 0,
    createdAt: o.created_at,
    shippingAddress: o.shipping_address,
    items: (o.order_items || []).map((item: any) => ({
      id: item.id,
      productName: item.products?.name,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unit_price),
      fulfillmentStatus: item.fulfillment_status
    }))
  };
}

export async function updateTracking(orderId: string, trackingId: string, carrier: string): Promise<void> {
  const response = await fetch(`${base()}${API_ROUTES.admin.orders}/${orderId}/tracking`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ trackingId, carrier })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar tracking');
  }
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  const response = await fetch(`${base()}${API_ROUTES.admin.orders}/${orderId}/status`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar estado');
  }
}
