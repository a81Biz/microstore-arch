import { describe, it, expect } from 'vitest';

// Simulación de la lógica de timeline para testeo unitario
function generateTimeline(order: any) {
  const steps = [
    { label: 'Pedido creado', status: 'completed', date: order.created_at, icon: '📋' },
    { label: 'Pago confirmado', status: order.status !== 'pending' ? 'completed' : 'pending', date: order.updated_at, icon: '💳' },
    { label: 'En producción', status: ['in_production', 'shipped', 'delivered'].includes(order.status) ? 'completed' : 'pending', date: null, icon: '🏭' },
    { label: 'Enviado', status: ['shipped', 'delivered'].includes(order.status) ? 'completed' : (order.status === 'in_production' ? 'current' : 'pending'), date: order.shipped_at, icon: '🚚' },
    { label: 'Entregado', status: order.status === 'delivered' ? 'completed' : 'pending', date: order.delivered_at, icon: '📦' }
  ];
  
  const hasCurrent = steps.some(s => s.status === 'current');
  if (!hasCurrent) {
    const lastCompleted = steps.reduceRight((acc, step, i) => step.status === 'completed' && acc === -1 ? i : acc, -1);
    if (lastCompleted >= 0 && lastCompleted < steps.length - 1) {
      steps[lastCompleted + 1].status = 'current';
    }
  }
  return steps;
}

describe('Order Timeline Logic', () => {
  it('debe marcar el primer paso como completado y el segundo como actual para un pedido pendiente', () => {
    const order = { status: 'pending', created_at: '2026-01-01' };
    const timeline = generateTimeline(order);
    
    expect(timeline[0].status).toBe('completed');
    expect(timeline[1].status).toBe('current');
    expect(timeline[2].status).toBe('pending');
  });

  it('debe marcar hasta "Enviado" como completado para un pedido enviado', () => {
    const order = { status: 'shipped', created_at: '2026-01-01', updated_at: '2026-01-01', shipped_at: '2026-01-02' };
    const timeline = generateTimeline(order);
    
    expect(timeline[0].status).toBe('completed');
    expect(timeline[1].status).toBe('completed');
    expect(timeline[2].status).toBe('completed');
    expect(timeline[3].status).toBe('completed');
    expect(timeline[4].status).toBe('current'); // Siguiente paso tras enviado es entregado
  });

  it('debe marcar todos como completados para un pedido entregado', () => {
    const order = { status: 'delivered', created_at: '2026-01-01', delivered_at: '2026-01-05' };
    const timeline = generateTimeline(order);
    
    expect(timeline.every(s => s.status === 'completed')).toBe(true);
  });
});
