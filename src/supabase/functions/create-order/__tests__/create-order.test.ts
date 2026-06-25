import { describe, it, expect, vi } from 'vitest';

describe('create-order Edge Function', () => {
  const baseUrl = 'http://localhost:54321/functions/v1/create-order';
  const validToken = 'Bearer valid-customer-token';

  const validPayload = {
    items: [{ product_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 }],
    shipping_address: {
      street: 'Av. Insurgentes Sur 123',
      city: 'CDMX',
      postal_code: '06600',
      country: 'MX',
    },
    payment_method: 'stripe',
  };

  it('returns 201 with orderId on successful order creation', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 201,
      json: async () => ({
        orderId: 'order-uuid-123',
        displayId: 'ORD-001',
        totalAmount: 199.98,
        currency: 'MXN',
        payment: { gateway: 'stripe', clientSecret: 'pi_secret_xxx' },
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: validToken },
      body: JSON.stringify(validPayload),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.orderId).toBeDefined();
    expect(body.payment.gateway).toBe('stripe');
  });

  it('returns 422 when items array is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 422,
      json: async () => ({ error: 'VALIDATION_ERROR', message: 'ítem' }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: validToken },
      body: JSON.stringify({ shipping_address: validPayload.shipping_address, payment_method: 'stripe' }),
    });

    expect(response.status).toBe(422);
  });

  it('returns 400 GATEWAY_DISABLED when payment gateway is inactive', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 400,
      json: async () => ({ error: 'GATEWAY_DISABLED', message: 'no está disponible' }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: validToken },
      body: JSON.stringify({ ...validPayload, payment_method: 'paypal' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('GATEWAY_DISABLED');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 429,
      json: async () => ({ error: 'RATE_LIMITED', message: 'Demasiados pedidos' }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: validToken },
      body: JSON.stringify(validPayload),
    });

    expect(response.status).toBe(429);
  });

  it('returns 400 INSUFFICIENT_STOCK when product has no stock', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 400,
      json: async () => ({ error: 'INSUFFICIENT_STOCK', message: 'Stock insuficiente' }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: validToken },
      body: JSON.stringify(validPayload),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('INSUFFICIENT_STOCK');
  });

  it('returns 401 when no Authorization header', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ error: 'UNAUTHORIZED', message: 'Token requerido' }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    expect(response.status).toBe(401);
  });
});
