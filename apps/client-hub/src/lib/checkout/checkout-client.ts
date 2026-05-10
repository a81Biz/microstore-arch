import { supabaseClient } from '../supabase-client';

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  displayId?: string;
  totalAmount?: number;
  currency?: string;
  payment?: PaymentResult;
  error?: string;
}

export interface PaymentResult {
  gateway: string;
  clientSecret?: string;
  publishableKey?: string;
  orderId?: string;
  clientId?: string;
  preferenceId?: string;
  initPoint?: string;
  sandboxInitPoint?: string;
  instructions?: HeyBancoInstructions;
}

export interface HeyBancoInstructions {
  amount: string;
  currency: string;
  reference: string;
  bank: string;
  clabe: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

async function getAuthHeader(): Promise<string> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session ? `Bearer ${session.access_token}` : '';
}

export async function createOrder(
  items: Array<{ productId: string; quantity: number; name?: string; price?: number }>,
  shippingAddress: ShippingAddress,
  paymentMethod: string
): Promise<CheckoutResult> {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { success: false, error: 'Debes iniciar sesión para realizar un pedido' };
  }

  const payload = {
    items: items.map(i => ({
      product_id: i.productId,
      quantity: i.quantity
    })),
    shipping_address: {
      street: shippingAddress.street,
      city: shippingAddress.city,
      postal_code: shippingAddress.postalCode,
      country: shippingAddress.country
    },
    payment_method: paymentMethod
  };

  const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/create-order`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    return { success: false, error: data.message || 'Error al crear orden' };
  }

  return {
    success: true,
    orderId: data.orderId,
    displayId: data.displayId,
    totalAmount: data.totalAmount,
    currency: data.currency,
    payment: data.payment
  };
}

export async function getActivePaymentMethods(): Promise<string[]> {
  const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/manage-payment-gateways/public`, {
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) return [];

  return response.json();
}
