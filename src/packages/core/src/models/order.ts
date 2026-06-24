import type { OrderStatus } from '../enums/order-status';
import type { ItemFulfillmentStatus } from '../enums/fulfillment-status';
import type { ShippingAddress } from '../schemas/order.schema';

export interface Order {
  id: string;
  displayId: string;
  customerId: string;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  totalAmount: number;
  currency: string;
  trackingId: string | null;
  carrier: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  fulfillmentStatus: ItemFulfillmentStatus;
}
