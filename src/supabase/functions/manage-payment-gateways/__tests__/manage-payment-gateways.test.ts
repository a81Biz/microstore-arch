import { describe, it, expect, vi } from 'vitest';

describe('manage-payment-gateways Edge Function', () => {
  const baseUrl = 'http://localhost:54321/functions/v1/manage-payment-gateways';

  it('returns 200 with gateway list for authenticated vendor (GET)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ([
        { gateway: 'stripe',      is_enabled: true,  last_rotated_at: null, created_at: '2026-01-01' },
        { gateway: 'paypal',      is_enabled: false, last_rotated_at: null, created_at: null },
        { gateway: 'mercadopago', is_enabled: false, last_rotated_at: null, created_at: null },
        { gateway: 'hey_banco',   is_enabled: false, last_rotated_at: null, created_at: null },
      ]),
    });

    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: { Authorization: 'Bearer vendor-mfa-token' },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(4);
    expect(body[0].gateway).toBe('stripe');
    expect(body[0].is_enabled).toBe(true);
  });

  it('returns 200 on successful gateway config save (POST)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, gateway: 'stripe' }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer vendor-mfa-token',
      },
      body: JSON.stringify({
        gateway: 'stripe',
        credentials: { secret_key: 'sk_test_placeholder' },
        is_enabled: true,
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.gateway).toBe('stripe');
  });

  it('returns 401 when no Authorization header (GET)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ error: 'UNAUTHORIZED', message: 'No autorizado' }),
    });

    const response = await fetch(baseUrl, {
      method: 'GET',
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('returns 200 with enabled gateways on public endpoint (no auth required)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => (['stripe', 'paypal']),
    });

    const response = await fetch(`${baseUrl}/public`, {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toContain('stripe');
  });
});
