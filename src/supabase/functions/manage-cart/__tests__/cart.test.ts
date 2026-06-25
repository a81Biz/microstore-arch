import { describe, it, expect, vi } from 'vitest';

describe('manage-cart — BR-004: límite 15 SKUs', () => {
  const baseUrl = 'http://localhost:54321/functions/v1/manage-cart';
  const validToken = 'Bearer valid-user-token';

  it('rechaza sync con 16 ítems distintos (BR-004)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 400,
      json: async () => ({ error: 'VALIDATION_ERROR', message: 'Cart cannot exceed 15 items' }),
    });
    global.fetch = mockFetch;

    const items = Array.from({ length: 16 }, (_, i) => ({
      product_id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
      quantity: 1,
    }));

    const response = await fetch(`${baseUrl}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: validToken },
      body: JSON.stringify({ items }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toMatch(/15/);
  });

  it('acepta sync con exactamente 15 ítems (límite exacto)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ([]),
    });
    global.fetch = mockFetch;

    const items = Array.from({ length: 15 }, (_, i) => ({
      product_id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
      quantity: 1,
    }));

    const response = await fetch(`${baseUrl}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: validToken },
      body: JSON.stringify({ items }),
    });

    expect(response.status).toBe(200);
  });
});
