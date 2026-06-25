import { describe, it, expect } from 'vitest';
import { OrderStatus } from '../order-status';
import { ItemFulfillmentStatus } from '../fulfillment-status';
import { PaymentGateway } from '../payment-gateway';
import { UserRole } from '../user-role';

describe('OrderStatus enum values', () => {
  it('has expected string values', () => {
    expect(OrderStatus.PENDING).toBe('pending');
    expect(OrderStatus.PAID).toBe('paid');
    expect(OrderStatus.IN_PRODUCTION).toBe('in_production');
    expect(OrderStatus.SHIPPED).toBe('shipped');
    expect(OrderStatus.DELIVERED).toBe('delivered');
    expect(OrderStatus.CANCELLED).toBe('cancelled');
    expect(OrderStatus.REFUNDED).toBe('refunded');
  });
});

describe('ItemFulfillmentStatus enum values', () => {
  it('has expected string values', () => {
    expect(ItemFulfillmentStatus.PENDING).toBe('pending');
    expect(ItemFulfillmentStatus.RESERVED).toBe('reserved');
    expect(ItemFulfillmentStatus.IN_PRODUCTION).toBe('in_production');
    expect(ItemFulfillmentStatus.READY_TO_SHIP).toBe('ready_to_ship');
    expect(ItemFulfillmentStatus.SHIPPED).toBe('shipped');
  });
});

describe('PaymentGateway enum values', () => {
  it('has expected string values', () => {
    expect(PaymentGateway.STRIPE).toBe('stripe');
    expect(PaymentGateway.PAYPAL).toBe('paypal');
    expect(PaymentGateway.MERCADOPAGO).toBe('mercadopago');
    expect(PaymentGateway.HEY_BANCO).toBe('hey_banco');
  });
});

describe('UserRole enum values', () => {
  it('has expected string values', () => {
    expect(UserRole.CUSTOMER).toBe('customer');
    expect(UserRole.VENDOR).toBe('vendor');
  });
});
