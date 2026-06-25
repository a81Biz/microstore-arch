import { describe, it, expect } from 'vitest';
import { getStockBadge } from '../stock-utils';
import type { Product } from '../../models/product';

const base: Product = {
  id: 'p1',
  name: 'Test Product',
  slug: 'test-product',
  description: null,
  price: 100,
  stockQuantity: 10,
  isOnDemand: false,
  isVisible: true,
  lastStockChange: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('getStockBadge', () => {
  it('returns info badge for on-demand products regardless of stock', () => {
    const badge = getStockBadge({ ...base, isOnDemand: true, stockQuantity: 0 });
    expect(badge.variant).toBe('info');
    expect(badge.disabled).toBe(false);
    expect(badge.text).toBe('Bajo Pedido');
  });

  it('returns error badge when stock is 0', () => {
    const badge = getStockBadge({ ...base, stockQuantity: 0 });
    expect(badge.variant).toBe('error');
    expect(badge.disabled).toBe(true);
    expect(badge.text).toBe('Agotado');
  });

  it('returns warning badge when stock is low (≤5)', () => {
    const badge = getStockBadge({ ...base, stockQuantity: 3 });
    expect(badge.variant).toBe('warning');
    expect(badge.disabled).toBe(false);
    expect(badge.text).toBe('Últimos 3');
  });

  it('returns success badge when stock is ample (>5)', () => {
    const badge = getStockBadge({ ...base, stockQuantity: 50 });
    expect(badge.variant).toBe('success');
    expect(badge.disabled).toBe(false);
    expect(badge.text).toBe('Disponible');
  });

  it('stock of exactly 5 is low (warning boundary)', () => {
    const badge = getStockBadge({ ...base, stockQuantity: 5 });
    expect(badge.variant).toBe('warning');
    expect(badge.text).toBe('Últimos 5');
  });

  it('stock of exactly 6 is ample (success boundary)', () => {
    const badge = getStockBadge({ ...base, stockQuantity: 6 });
    expect(badge.variant).toBe('success');
  });
});
