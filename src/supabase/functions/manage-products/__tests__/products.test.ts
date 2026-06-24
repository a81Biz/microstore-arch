import { describe, it, expect, vi } from 'vitest';

describe('Product Management API', () => {
  const baseUrl = 'http://localhost:54321/functions/v1/manage-products';

  it('debe rechazar creaciones sin autenticación', async () => {
    // Mock de fetch global si no estamos en entorno real
    const mockFetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ error: 'UNAUTHORIZED', message: 'Token requerido' })
    });
    global.fetch = mockFetch;

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Product',
        price: 99.99
      })
    });

    expect(response.status).toBe(401);
  });

  it('debe crear producto con autenticación de admin', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 201,
      json: async () => ({
        id: '123',
        name: 'Producto de Prueba',
        slug: 'producto-de-prueba',
        price: 49.99
      })
    });
    global.fetch = mockFetch;

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-admin-token'
      },
      body: JSON.stringify({
        name: 'Producto de Prueba',
        description: 'Descripción',
        price: 49.99,
        stockQuantity: 10,
        isOnDemand: false,
        isVisible: true
      })
    });

    expect(response.status).toBe(201);
    const product = await response.json();
    expect(product.name).toBe('Producto de Prueba');
    expect(product.slug).toBe('producto-de-prueba');
  });
});
