export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  isOnDemand: boolean;
  isVisible: boolean;
  lastStockChange: string;
  createdAt: string;
  updatedAt: string;
}
