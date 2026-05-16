import { API_ROUTES } from '@micro-store/core';

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  isOnDemand: boolean;
  isVisible: boolean;
  imageUrl?: string | null;
}

export interface AdminProductImage {
  id: string;
  url: string;
  sortOrder: number;
  altText: string | null;
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  isOnDemand: boolean;
  isVisible: boolean;
  imageUrl: string | null;
  images: AdminProductImage[];
  createdAt: string;
  updatedAt: string;
}

const base = () => import.meta.env.PUBLIC_API_BASE as string;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { supabaseClient } = await import('../supabase-client');
  const { data: { session } } = await supabaseClient.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token || ''}`,
    'Content-Type': 'application/json'
  };
}

export async function loadProducts(): Promise<AdminProduct[]> {
  const response = await fetch(`${base()}${API_ROUTES.admin.products}`, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Error al cargar productos');
  }

  return response.json();
}

export async function createProduct(data: ProductFormData): Promise<AdminProduct> {
  const response = await fetch(`${base()}${API_ROUTES.admin.products}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear producto');
  }

  return response.json();
}

export async function updateProduct(id: string, data: Partial<ProductFormData>): Promise<AdminProduct> {
  const response = await fetch(`${base()}${API_ROUTES.admin.products}/${id}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar producto');
  }

  return response.json();
}

export async function deleteProduct(id: string): Promise<void> {
  const response = await fetch(`${base()}${API_ROUTES.admin.products}/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar producto');
  }
}

export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const { supabaseClient } = await import('../supabase-client');

  const fileExt = file.name.split('.').pop();
  const filePath = `${productId}/${Date.now()}.${fileExt}`;

  const { error } = await supabaseClient.storage
    .from('product-images')
    .upload(filePath, file, { upsert: false });

  if (error) {
    throw new Error('Error al subir imagen');
  }

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/product-images/${filePath}`;
}

export async function addProductImage(
  productId: string,
  imageUrl: string,
  altText?: string
): Promise<AdminProductImage> {
  const response = await fetch(`${base()}${API_ROUTES.admin.products}/${productId}/images`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ url: imageUrl, altText })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al añadir imagen');
  }

  return response.json();
}

export async function deleteProductImage(
  productId: string,
  imageId: string,
  storageUrl: string
): Promise<void> {
  const { supabaseClient } = await import('../supabase-client');

  // Delete metadata from Edge Function
  const response = await fetch(`${base()}${API_ROUTES.admin.products}/${productId}/images/${imageId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar imagen');
  }

  // Remove file from Storage — extract path after /product-images/
  const marker = '/product-images/';
  const idx = storageUrl.indexOf(marker);
  if (idx !== -1) {
    const storagePath = storageUrl.slice(idx + marker.length);
    await supabaseClient.storage.from('product-images').remove([storagePath]);
  }
}

export async function triggerRebuild(): Promise<void> {
  const headers = await getAuthHeaders();
  await fetch(`${base()}/functions/v1/trigger-rebuild`, {
    method: 'POST',
    headers
  });
}
