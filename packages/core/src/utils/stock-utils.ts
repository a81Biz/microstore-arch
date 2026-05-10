import type { Product } from '../models/product';

export interface StockBadge {
  text: string;
  variant: 'success' | 'warning' | 'error' | 'info';
  tooltip: string;
  disabled: boolean;
}

export function getStockBadge(product: Product): StockBadge {
  if (product.isOnDemand) {
    return {
      text: 'Bajo Pedido',
      variant: 'info',
      tooltip: 'Se produce tras la compra',
      disabled: false
    };
  }

  if (product.stockQuantity === 0) {
    return {
      text: 'Agotado',
      variant: 'error',
      tooltip: 'Producto sin stock disponible',
      disabled: true
    };
  }

  if (product.stockQuantity <= 5) {
    return {
      text: `Últimos ${product.stockQuantity}`,
      variant: 'warning',
      tooltip: 'Quedan pocas unidades',
      disabled: false
    };
  }

  return {
    text: 'Disponible',
    variant: 'success',
    tooltip: 'Producto en stock',
    disabled: false
  };
}
