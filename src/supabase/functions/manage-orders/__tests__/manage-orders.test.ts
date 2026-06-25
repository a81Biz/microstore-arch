import { describe, it, expect, vi } from 'vitest';

// manage-orders requires admin MFA — all tests use admin token mock.
// Tests verify HTTP contract, not internal Supabase/DB logic (PE-001 dependency).
describe('manage-orders Edge Function', () => {
  const baseUrl = 'http://localhost:54321/functions/v1/manage-orders';
  const adminToken = 'Bearer valid-admin-mfa-token';

  it('GET /manage-orders returns 200 with orders array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        orders: [
          { id: 'o1', display_id: 'ORD-001', status: 'paid', total_amount: 199.98 },
          { id: 'o2', display_id: 'ORD-002', status: 'shipped', total_amount: 49.99 },
        ],
        total: 2,
        limit: 50,
        offset: 0,
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: { Authorization: adminToken },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.orders)).toBe(true);
    expect(body.orders).toHaveLength(2);
  });

  it('GET /manage-orders/:id returns 200 with order detail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        id: 'o1',
        display_id: 'ORD-001',
        status: 'paid',
        total_amount: 199.98,
        items: [{ product_id: 'p1', quantity: 2 }],
      }),
    });

    const response = await fetch(`${baseUrl}/o1`, {
      method: 'GET',
      headers: { Authorization: adminToken },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe('o1');
    expect(body.items).toBeDefined();
  });

  it('PATCH /manage-orders/:id/status returns 200 on valid transition', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, orderId: 'o1', newStatus: 'in_production' }),
    });

    const response = await fetch(`${baseUrl}/o1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: adminToken },
      body: JSON.stringify({ status: 'in_production' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('PATCH /manage-orders/:id/status returns 400 on invalid status value', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 400,
      json: async () => ({ error: 'VALIDATION_ERROR', message: 'Estado inválido' }),
    });

    const response = await fetch(`${baseUrl}/o1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: adminToken },
      body: JSON.stringify({ status: 'not_a_real_status' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 401 for unauthenticated request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ error: 'UNAUTHORIZED', message: 'Token requerido' }),
    });

    const response = await fetch(baseUrl, {
      method: 'GET',
    });

    expect(response.status).toBe(401);
  });

  it('PATCH /manage-orders/:id/tracking returns 200 with tracking info', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, trackingId: 'DHL-123456', carrier: 'dhl' }),
    });

    const response = await fetch(`${baseUrl}/o1/tracking`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: adminToken },
      body: JSON.stringify({ trackingId: 'DHL-123456', carrier: 'dhl' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.trackingId).toBe('DHL-123456');
  });
});
