import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Checkout Flow E2E', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it('flujo completo de compra con Stripe', async () => {
    // Mock: crear orden
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orderId: 'test-order-id',
        displayId: 'TX-2026-0001',
        totalAmount: 99.98,
        currency: 'MXN',
        payment: {
          gateway: 'stripe',
          clientSecret: 'pi_test_secret',
          publishableKey: 'pk_test'
        }
      })
    });

    const { createOrder } = await import('../../lib/checkout/checkout-client');
    const result = await createOrder(
      [{ productId: 'prod-1', quantity: 2 }],
      { street: 'Calle Test', city: 'Test', postalCode: '12345', country: 'MX' },
      'stripe'
    );

    expect(result.success).toBe(true);
    expect(result.orderId).toBe('test-order-id');
    expect(result.payment?.gateway).toBe('stripe');
    expect(result.payment?.clientSecret).toBeDefined();
  });

  it('debe rechazar compra con stock insuficiente', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'INSUFFICIENT_STOCK',
        message: 'Stock insuficiente para el producto prod-1'
      })
    });

    const { createOrder } = await import('../../lib/checkout/checkout-client');
    const result = await createOrder(
      [{ productId: 'prod-1', quantity: 999 }],
      { street: 'Test', city: 'Test', postalCode: '12345', country: 'MX' },
      'stripe'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Stock insuficiente');
  });
});
