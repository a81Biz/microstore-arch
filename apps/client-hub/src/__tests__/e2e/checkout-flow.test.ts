import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabaseClient } from '../../lib/supabase-client';

// vi.mock is hoisted above all imports by vitest, so checkout-client will
// receive this mock when it imports supabase-client.
vi.mock('../../lib/supabase-client', () => ({
  supabaseClient: {
    auth: {
      getSession: vi.fn()
    }
  }
}));

const mockGetSession = vi.mocked(supabaseClient.auth.getSession);

describe('Checkout Flow E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    // Default state: authenticated user with a valid session.
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-access-token' } }
    } as any);
  });

  // ─── Case 1: Happy path ────────────────────────────────────────────────────

  it('flujo completo de compra con Stripe', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
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

  // ─── Case 2: Pago rechazado ────────────────────────────────────────────────

  it('debe mostrar mensaje de error cuando la pasarela rechaza el pago', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 402,
      json: async () => ({
        error: 'PAYMENT_FAILED',
        message: 'Pago rechazado por la pasarela de pago'
      })
    });

    const { createOrder } = await import('../../lib/checkout/checkout-client');
    const result = await createOrder(
      [{ productId: 'prod-1', quantity: 1 }],
      { street: 'Calle Test', city: 'Test', postalCode: '12345', country: 'MX' },
      'stripe'
    );

    expect(result.success).toBe(false);
    // UI message: must be human-readable, not a raw error code.
    expect(result.error).toBe('Pago rechazado por la pasarela de pago');
  });

  // ─── Case 3: Stock insuficiente ────────────────────────────────────────────

  it('debe mostrar mensaje de stock insuficiente para el producto afectado', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
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
    // UI message: must identify the product so the customer knows what to adjust.
    expect(result.error).toContain('Stock insuficiente');
    expect(result.error).toContain('prod-1');
  });

  // ─── Case 4: Usuario no autenticado ───────────────────────────────────────

  it('debe bloquear checkout y mostrar mensaje de login si no hay sesión activa', async () => {
    // Override default: no active session for this test only.
    mockGetSession.mockResolvedValueOnce({ data: { session: null } } as any);

    const { createOrder } = await import('../../lib/checkout/checkout-client');
    const result = await createOrder(
      [{ productId: 'prod-1', quantity: 1 }],
      { street: 'Calle Test', city: 'Test', postalCode: '12345', country: 'MX' },
      'stripe'
    );

    expect(result.success).toBe(false);
    // UI message: direct instruction to the user.
    expect(result.error).toBe('Debes iniciar sesión para realizar un pedido');
    // Guard: no network request must be made when unauthenticated.
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
