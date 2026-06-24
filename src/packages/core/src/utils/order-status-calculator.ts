import { OrderStatus } from '../enums/order-status';
import { ItemFulfillmentStatus } from '../enums/fulfillment-status';

interface OrderItemStatus {
  fulfillmentStatus: ItemFulfillmentStatus;
}

export function calculateOrderStatus(items: OrderItemStatus[]): OrderStatus {
  if (items.length === 0) {
    return OrderStatus.PAID;
  }

  const allShipped = items.every(
    item => item.fulfillmentStatus === ItemFulfillmentStatus.SHIPPED
  );

  const allProduction = items.every(
    item => [
      ItemFulfillmentStatus.IN_PRODUCTION,
      ItemFulfillmentStatus.READY_TO_SHIP,
      ItemFulfillmentStatus.SHIPPED
    ].includes(item.fulfillmentStatus)
  );

  const anyPending = items.some(
    item => [
      ItemFulfillmentStatus.PENDING,
      ItemFulfillmentStatus.RESERVED
    ].includes(item.fulfillmentStatus)
  );

  if (allShipped) return OrderStatus.SHIPPED;
  if (allProduction) return OrderStatus.IN_PRODUCTION;
  if (anyPending) return OrderStatus.PAID;

  return OrderStatus.PAID;
}
