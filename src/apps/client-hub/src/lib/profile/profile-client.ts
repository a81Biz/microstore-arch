import { supabaseClient } from '../supabase-client';

export type { CustomerAddress } from '../checkout/checkout-client';

async function getAuthHeader(): Promise<string> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session ? `Bearer ${session.access_token}` : '';
}

export async function updateProfile(name: string, phone: string): Promise<void> {
  const { error } = await supabaseClient.auth.updateUser({ data: { name, phone } });
  if (error) throw error;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function loadAddresses(): Promise<import('../checkout/checkout-client').CustomerAddress[]> {
  const authHeader = await getAuthHeader();
  if (!authHeader) return [];

  const response = await fetch(
    `${import.meta.env.PUBLIC_API_BASE}/functions/v1/manage-addresses`,
    { headers: { Authorization: authHeader } }
  );
  if (!response.ok) return [];
  return response.json();
}

export async function createAddress(
  address: Omit<import('../checkout/checkout-client').CustomerAddress, 'id' | 'is_default'> & { is_default?: boolean }
): Promise<import('../checkout/checkout-client').CustomerAddress> {
  const authHeader = await getAuthHeader();
  const response = await fetch(
    `${import.meta.env.PUBLIC_API_BASE}/functions/v1/manage-addresses`,
    {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(address),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al guardar dirección');
  }
  return response.json();
}

export async function updateAddress(
  id: string,
  address: Omit<import('../checkout/checkout-client').CustomerAddress, 'id' | 'is_default'>
): Promise<import('../checkout/checkout-client').CustomerAddress> {
  const authHeader = await getAuthHeader();
  const response = await fetch(
    `${import.meta.env.PUBLIC_API_BASE}/functions/v1/manage-addresses/${id}`,
    {
      method: 'PUT',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(address),
    }
  );
  if (!response.ok) throw new Error('Error al actualizar dirección');
  return response.json();
}

export async function deleteAddress(id: string): Promise<void> {
  const authHeader = await getAuthHeader();
  const response = await fetch(
    `${import.meta.env.PUBLIC_API_BASE}/functions/v1/manage-addresses/${id}`,
    { method: 'DELETE', headers: { Authorization: authHeader } }
  );
  if (!response.ok) throw new Error('Error al eliminar dirección');
}

export async function setDefaultAddress(id: string): Promise<void> {
  const authHeader = await getAuthHeader();
  const response = await fetch(
    `${import.meta.env.PUBLIC_API_BASE}/functions/v1/manage-addresses/${id}/default`,
    { method: 'PATCH', headers: { Authorization: authHeader } }
  );
  if (!response.ok) throw new Error('Error al establecer dirección predeterminada');
}
