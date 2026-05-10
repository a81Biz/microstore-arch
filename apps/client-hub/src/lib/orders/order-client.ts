import { supabaseClient } from '../supabase-client';

export interface OrderViewModel {
  id: string;
  displayId: string;
  status: string;
  totalAmount: string;
  currency: string;
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
    items: (order.order_items || []).map((item: any) => ({
      id: item.id,
      productName: item.products?.name || 'Producto',
      productSlug: item.products?.slug || '',
      quantity: item.quantity,
      unitPrice: `$${(item.unit_price || 0).toFixed(2)}`
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
    { label: 'Pedido creado', status: 'completed', date: order.created_at, icon: '📋' },
    { label: 'Pago confirmado', status: order.status !== 'pending' ? 'completed' : 'pending', date: order.updated_at, icon: '💳' },
    { label: 'En producción', status: ['in_production', 'shipped', 'delivered'].includes(order.status) ? 'completed' : 'pending', date: null, icon: '🏭' },
    { label: 'Enviado', status: ['shipped', 'delivered'].includes(order.status) ? 'completed' : (order.status === 'in_production' ? 'current' : 'pending'), date: order.shipped_at, icon: '🚚' },
    { label: 'Entregado', status: order.status === 'delivered' ? 'completed' : 'pending', date: order.delivered_at, icon: '📦' }
  ];
  
  // Ajustar el paso actual si no hay ninguno marcado como tal explícitamente en la lógica anterior
  const hasCurrent = steps.some(s => s.status === 'current');
  if (!hasCurrent) {
    const lastCompleted = steps.reduceRight((acc, step, i) => step.status === 'completed' && acc === -1 ? i : acc, -1);
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
    .select(`*, order_items(*, products(name, slug))`)
    .eq('customer_id', user.user.id)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (orders || []).map(mapToViewModel);
}

export async function loadOrderDetail(orderId: string): Promise<OrderViewModel | null> {
  const { data: user } = await supabaseClient.auth.getUser();
  if (!user.user) return null;

  const { data: order, error } = await supabaseClient
    .from('orders')
    .select(`*, order_items(*, products(name, slug))`)
    .eq('id', orderId)
    .eq('customer_id', user.user.id)
    .single();

  if (error || !order) return null;
  return mapToViewModel(order);
}

export function subscribeToOrderUpdates(orderId: string, onUpdate: (order: OrderViewModel) => void) {
  const channel = supabaseClient
    .channel(`order:${orderId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, 
      async () => {
        const updated = await loadOrderDetail(orderId);
        if (updated) onUpdate(updated);
      }
    )
    .subscribe();

  return () => {
    supabaseClient.removeChannel(channel);
  };
}
