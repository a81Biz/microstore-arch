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
  images: string[];
  createdAt: string;
}

function mapToCatalogProduct(product: Product): CatalogProduct {
  const raw = product as unknown as Record<string, unknown>;
  const rawImages = (raw.product_images as Array<Record<string, unknown>> | null) ?? [];
  const sorted = rawImages.slice().sort(
    (a, b) => (a.sort_order as number) - (b.sort_order as number)
  );
  const images = sorted.map(i => i.url as string);
  const imageUrl = (raw.image_url as string | null) ?? null;

  return {
    id:            product.id,
    slug:          product.slug,
    name:          product.name,
    description:   product.description,
    price:         product.price,
    stockQuantity: (raw.stock_quantity as number) ?? 0,
    isOnDemand:    Boolean(raw.is_on_demand),
    imageUrl,
    images:        images.length > 0 ? images : (imageUrl ? [imageUrl] : []),
    createdAt:     (raw.created_at as string) ?? '',
  };
}

export async function getVisibleProducts(): Promise<CatalogProduct[]> {
  const { data: products, error } = await supabaseClient
    .from('products')
    .select('*, product_images(url, sort_order)')
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
    .select('*, product_images(url, sort_order)')
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
