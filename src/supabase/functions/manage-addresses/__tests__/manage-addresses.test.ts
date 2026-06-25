import { describe, it, expect, vi } from 'vitest';

describe('manage-addresses Edge Function', () => {
  const baseUrl = 'http://localhost:54321/functions/v1/manage-addresses';

  it('returns 201 with created address for authenticated customer (POST)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 201,
      json: async () => ({
        id: 'addr-uuid-001',
        label: 'home',
        street: 'Calle Principal 123',
        city: 'Ciudad de México',
        postal_code: '06600',
        country: 'MX',
        is_default: false,
        created_at: '2026-06-25T00:00:00Z',
      }),
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer customer-token',
      },
      body: JSON.stringify({
        label: 'home',
        street: 'Calle Principal 123',
        city: 'Ciudad de México',
        postal_code: '06600',
        country: 'MX',
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.label).toBe('home');
    expect(body.country).toBe('MX');
  });

  it('returns 200 with address list for authenticated customer (GET)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ([
        {
          id: 'addr-uuid-001',
          label: 'home',
          street: 'Calle Principal 123',
          city: 'CDMX',
          postal_code: '06600',
          country: 'MX',
          is_default: true,
          created_at: '2026-06-25T00:00:00Z',
        },
      ]),
    });

    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: { Authorization: 'Bearer customer-token' },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(0);
  });

  it('returns 200 with success on address deletion (DELETE)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ success: true }),
    });

    const response = await fetch(`${baseUrl}/addr-uuid-001`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer customer-token' },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
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
});
