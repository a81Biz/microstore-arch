import { describe, it, expect } from 'vitest';
import { ShippingAddressSchema, CreateOrderPayloadSchema } from '../order.schema';
import { PaymentGateway } from '../../enums/payment-gateway';

const validAddress = {
  street: 'Av. Insurgentes Sur 123',
  city: 'CDMX',
  postal_code: '06600',
  country: 'MX',
};

const validItem = { product_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 };

describe('ShippingAddressSchema', () => {
  it('accepts a valid address', () => {
    const result = ShippingAddressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
  });

  it('rejects street shorter than 5 characters', () => {
    const result = ShippingAddressSchema.safeParse({ ...validAddress, street: 'Av' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/calle/i);
  });

  it('rejects city shorter than 2 characters', () => {
    const result = ShippingAddressSchema.safeParse({ ...validAddress, city: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects country not exactly 2 characters', () => {
    const result = ShippingAddressSchema.safeParse({ ...validAddress, country: 'MEX' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/ISO/i);
  });

  it('rejects missing required field', () => {
    const { street: _omit, ...withoutStreet } = validAddress;
    const result = ShippingAddressSchema.safeParse(withoutStreet);
    expect(result.success).toBe(false);
  });
});

describe('CreateOrderPayloadSchema', () => {
  it('accepts a valid order payload', () => {
    const result = CreateOrderPayloadSchema.safeParse({
      items: [validItem],
      shipping_address: validAddress,
      payment_method: PaymentGateway.STRIPE,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = CreateOrderPayloadSchema.safeParse({
      items: [],
      shipping_address: validAddress,
      payment_method: PaymentGateway.STRIPE,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/ítem/i);
  });

  it('rejects invalid product_id (not UUID)', () => {
    const result = CreateOrderPayloadSchema.safeParse({
      items: [{ product_id: 'not-a-uuid', quantity: 1 }],
      shipping_address: validAddress,
      payment_method: PaymentGateway.PAYPAL,
    });
    expect(result.success).toBe(false);
  });

  it('rejects quantity of 0', () => {
    const result = CreateOrderPayloadSchema.safeParse({
      items: [{ product_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 0 }],
      shipping_address: validAddress,
      payment_method: PaymentGateway.MERCADOPAGO,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid payment_method', () => {
    const result = CreateOrderPayloadSchema.safeParse({
      items: [validItem],
      shipping_address: validAddress,
      payment_method: 'bitcoin',
    });
    expect(result.success).toBe(false);
  });
});
