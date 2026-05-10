import { z } from 'zod';
import { PaymentGateway } from '../enums/payment-gateway';

export const ShippingAddressSchema = z.object({
  street: z.string().min(5, 'La calle debe tener al menos 5 caracteres'),
  city: z.string().min(2, 'La ciudad debe tener al menos 2 caracteres'),
  postal_code: z.string().min(4, 'El código postal debe tener al menos 4 caracteres'),
  country: z.string().length(2, 'El país debe ser un código ISO de 2 caracteres')
});

export const CreateOrderPayloadSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid('ID de producto inválido'),
    quantity: z.number().int().positive('La cantidad debe ser un entero positivo')
  })).min(1, 'El pedido debe tener al menos un ítem'),
  shipping_address: ShippingAddressSchema,
  payment_method: z.nativeEnum(PaymentGateway)
});

export const OrderTrackingSchema = z.object({
  tracking_id: z.string().min(5, 'El tracking ID debe tener al menos 5 caracteres'),
  carrier: z.enum(['dhl', 'fedex', 'estafeta', 'correos_mexico'])
});

export type CreateOrderPayload = z.infer<typeof CreateOrderPayloadSchema>;
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;
export type OrderTracking = z.infer<typeof OrderTrackingSchema>;
