import { supabaseClient } from '../supabase-client';
import type { Product } from '@micro-store/core/models';

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  isOnDemand: boolean;
  imageUrl: string | null;
  createdAt: string;
}

function mapToCatalogProduct(product: Product): CatalogProduct {
  const imageUrl = product.id
    ? `${import.meta.env.PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${product.id}/main.webp`
    : null;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: product.price,
    stockQuantity: product.stockQuantity,
    isOnDemand: product.isOnDemand,
    imageUrl,
    createdAt: product.createdAt
  };
}

export async function getVisibleProducts(): Promise<CatalogProduct[]> {
  const { data: products, error } = await supabaseClient
    .from('products')
    .select('*')
    .eq('is_visible', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading products:', error);
    return [];
  }

  return (products || []).map(mapToCatalogProduct);
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const { data: product, error } = await supabaseClient
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_visible', true)
    .single();

  if (error || !product) {
    return null;
  }

  return mapToCatalogProduct(product);
}

export async function getAllProductSlugs(): Promise<string[]> {
  const { data: products, error } = await supabaseClient
    .from('products')
    .select('slug')
    .eq('is_visible', true);

  if (error) {
    return [];
  }

  return (products || []).map(p => p.slug);
}
