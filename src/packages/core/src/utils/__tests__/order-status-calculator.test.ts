import { describe, it, expect } from 'vitest';
import { calculateOrderStatus } from '../order-status-calculator';
import { OrderStatus } from '../../enums/order-status';
import { ItemFulfillmentStatus } from '../../enums/fulfillment-status';

describe('calculateOrderStatus', () => {
  it('returns PAID for empty items list', () => {
    expect(calculateOrderStatus([])).toBe(OrderStatus.PAID);
  });

  it('returns SHIPPED when all items are SHIPPED', () => {
    const items = [
      { fulfillmentStatus: ItemFulfillmentStatus.SHIPPED },
      { fulfillmentStatus: ItemFulfillmentStatus.SHIPPED },
    ];
    expect(calculateOrderStatus(items)).toBe(OrderStatus.SHIPPED);
  });

  it('returns IN_PRODUCTION when all items are in production stages', () => {
    const items = [
      { fulfillmentStatus: ItemFulfillmentStatus.IN_PRODUCTION },
      { fulfillmentStatus: ItemFulfillmentStatus.READY_TO_SHIP },
      { fulfillmentStatus: ItemFulfillmentStatus.SHIPPED },
    ];
    expect(calculateOrderStatus(items)).toBe(OrderStatus.IN_PRODUCTION);
  });

  it('returns PAID when any item is PENDING', () => {
    const items = [
      { fulfillmentStatus: ItemFulfillmentStatus.SHIPPED },
      { fulfillmentStatus: ItemFulfillmentStatus.PENDING },
    ];
    expect(calculateOrderStatus(items)).toBe(OrderStatus.PAID);
  });

  it('returns PAID when any item is RESERVED', () => {
    const items = [
      { fulfillmentStatus: ItemFulfillmentStatus.IN_PRODUCTION },
      { fulfillmentStatus: ItemFulfillmentStatus.RESERVED },
    ];
    expect(calculateOrderStatus(items)).toBe(OrderStatus.PAID);
  });

  it('PAID wins over IN_PRODUCTION when mixed PENDING and production items', () => {
    const items = [
      { fulfillmentStatus: ItemFulfillmentStatus.PENDING },
      { fulfillmentStatus: ItemFulfillmentStatus.IN_PRODUCTION },
      { fulfillmentStatus: ItemFulfillmentStatus.SHIPPED },
    ];
    expect(calculateOrderStatus(items)).toBe(OrderStatus.PAID);
  });
});
