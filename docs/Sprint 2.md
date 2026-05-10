# 📦 Micro-Store Arch — Sprint 2: Catálogo y Productos

**Versión:** 1.0
**Duración:** 2 semanas
**Objetivo:** Implementar el catálogo de productos en el Storefront con generación estática (SSG), el panel de administración de productos (CRUD) en el Vendor Admin, y la sincronización automática con Cloudflare Pages para reconstruir el sitio cuando cambie el inventario.

**Dependencia:** Sprint 1 completado (autenticación funcional, perfiles listos).

---

## 🎯 Objetivos del Sprint

1. Implementar la generación estática del catálogo en el Storefront con Astro.
2. Crear el componente `ProductCard` con badges de stock usando `getStockBadge()` del core.
3. Implementar página de detalle de producto (`/producto/[slug]`).
4. Crear panel CRUD de productos en Vendor Admin (React SPA protegido con MFA).
5. Implementar Edge Function para gestión de productos (crear, editar, eliminar).
6. Configurar sincronización automática con Cloudflare Deploy Hooks.
7. Implementar base de datos de imágenes de producto en Supabase Storage.
8. Agregar SEO dinámico (meta tags, sitemap, robots.txt).
9. Implementar pruebas unitarias y de integración.
10. Mantener estricta separación arquitectónica.

---

## 📋 Historias de Usuario

### Cliente
- **HU-01a:** Como cliente, quiero ver un catálogo de productos que cargue instantáneamente (SSG).
- **HU-01b:** Como cliente, quiero ver si un producto está disponible, agotado o es bajo pedido.
- **HU-01c:** Como cliente, quiero ver el detalle de un producto con descripción, precio e imágenes.

### Vendedor
- **HU-05a:** Como vendedor, quiero crear nuevos productos con nombre, descripción, precio e imágenes.
- **HU-05b:** Como vendedor, quiero editar productos existentes (precio, stock, descripción).
- **HU-05c:** Como vendedor, quiero activar/desactivar el modo "bajo pedido" para un producto.
- **HU-05d:** Como vendedor, quiero ocultar productos que no están disponibles para la venta.
- **HU-05e:** Como vendedor, quiero que los cambios en productos se reflejen automáticamente en la tienda.

---

## 📐 Reglas Arquitectónicas (Recordatorio)

| Regla | Permitido | Prohibido |
|---|---|---|
| **Markup HTML** | Solo en `.astro` | `.ts`, `.js` |
| **Estilos CSS** | Solo en `.css` | `style=""` inline |
| **Lógica** | Solo en `.ts`, frontmatter `---` | `<script>` inline en HTML |
| **Enums/Tipos** | `@micro-store/core` | Strings literales, `any` |
| **Componentes Hub/Admin** | React (client:*) | Alpine.js puro |
| **Componentes Storefront**| Astro + Alpine.js | React |
| **Imágenes** | Supabase Storage | URLs externas no controladas |

---

## 📁 Tarea 2.0: Estructura de Carpetas (Nuevos Archivos)

```bash
# Storefront - Catálogo
mkdir -p apps/storefront/src/pages/producto
mkdir -p apps/storefront/src/components/product
mkdir -p apps/storefront/src/lib/catalog

# Vendor Admin - Gestión de Productos
mkdir -p apps/vendor-admin/src/pages/products
mkdir -p apps/vendor-admin/src/components/product
mkdir -p apps/vendor-admin/src/lib/products

# Edge Functions
mkdir -p supabase/functions/manage-products
mkdir -p supabase/functions/trigger-rebuild

# Migraciones
# supabase/migrations/00003_product_images.sql

# Storage buckets (se crean desde Supabase Dashboard o seed)
```

---

## 📁 Tarea 2.1: Base de Datos - Storage y Políticas

### `supabase/migrations/00003_product_images.sql`

```sql
-- Micro-Store Arch: Storage y Funciones de Productos
-- Versión: 1.0

BEGIN;

-- 1. Políticas de Storage para imágenes de productos
-- (Se ejecutan después de crear el bucket 'product-images' en Supabase Dashboard)

-- Nota: Las políticas de storage se crean via SQL o Dashboard
-- Bucket: product-images (público para lectura)

-- 2. Función para obtener productos visibles (catálogo público)
CREATE OR REPLACE FUNCTION public.get_visible_products()
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY
    SELECT *
    FROM products
    WHERE is_visible = true
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función atómica para actualizar stock
CREATE OR REPLACE FUNCTION public.update_product_stock(
  p_product_id UUID,
  p_new_stock INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET 
    stock_quantity = p_new_stock,
    last_stock_change = NOW(),
    updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para crear producto con slug único automático
CREATE OR REPLACE FUNCTION public.create_product(
  p_name TEXT,
  p_description TEXT,
  p_price DECIMAL(10,2),
  p_stock_quantity INTEGER,
  p_is_on_demand BOOLEAN,
  p_is_visible BOOLEAN
)
RETURNS products AS $$
DECLARE
  v_slug TEXT;
  v_product products;
  v_counter INTEGER := 0;
BEGIN
  -- Generar slug base desde el nombre
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '-', 'g'));
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(v_slug, '-');
  
  -- Verificar unicidad y agregar sufijo si es necesario
  LOOP
    IF v_counter > 0 THEN
      v_slug := v_slug || '-' || v_counter::TEXT;
    END IF;
    
    BEGIN
      INSERT INTO products (
        slug, name, description, price, 
        stock_quantity, is_on_demand, is_visible
      ) VALUES (
        v_slug, p_name, p_description, p_price,
        p_stock_quantity, p_is_on_demand, p_is_visible
      )
      RETURNING * INTO v_product;
      
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_counter := v_counter + 1;
      IF v_counter > 100 THEN
        RAISE EXCEPTION 'No se pudo generar un slug único';
      END IF;
    END;
  END LOOP;
  
  RETURN v_product;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger para notificar cambios de stock (usado por webhooks)
CREATE OR REPLACE FUNCTION public.notify_product_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar cambio para posible rebuild del storefront
  IF (TG_OP = 'UPDATE' AND (
    NEW.price != OLD.price OR 
    NEW.stock_quantity != OLD.stock_quantity OR 
    NEW.is_visible != OLD.is_visible OR
    NEW.is_on_demand != OLD.is_on_demand
  )) OR TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
    -- Actualizar timestamp de cambio
    NEW.last_stock_change = NOW();
    
    -- Enviar notificación (Supabase Realtime)
    PERFORM pg_notify('product_changes', json_build_object(
      'product_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'timestamp', NOW()
    )::TEXT);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_product_change ON products;
CREATE TRIGGER on_product_change
  BEFORE INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION notify_product_change();

COMMIT;
```

---

## 📁 Tarea 2.2: Edge Functions de Productos

### 2.2.1 Gestión de Productos (CRUD)

**`supabase/functions/manage-products/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError, BusinessError } from "../_shared/error-handler.ts";
import { BaseController } from "../_core/base-controller.ts";

const logger = createLogger('manage-products');

class ProductController extends BaseController {
  
  async createProduct(authHeader: string, data: ProductInput) {
    const user = await this.authenticateUser(authHeader);
    const isAdmin = await this.isAdmin(authHeader);
    
    if (!isAdmin) {
      throw new UnauthorizedError('Solo el administrador puede crear productos');
    }

    logger.info('Creating product', { userId: user.id, name: data.name });

    const { data: product, error } = await this.dbAdmin.rpc('create_product', {
      p_name: data.name,
      p_description: data.description || null,
      p_price: data.price,
      p_stock_quantity: data.stockQuantity,
      p_is_on_demand: data.isOnDemand,
      p_is_visible: data.isVisible
    });

    if (error) {
      logger.error('Failed to create product', { error });
      throw new Error('Error al crear producto');
    }

    return product;
  }

  async updateProduct(authHeader: string, productId: string, data: Partial<ProductInput>) {
    const user = await this.authenticateUser(authHeader);
    const isAdmin = await this.isAdmin(authHeader);
    
    if (!isAdmin) {
      throw new UnauthorizedError('Solo el administrador puede editar productos');
    }

    logger.info('Updating product', { userId: user.id, productId });

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.stockQuantity !== undefined) updateData.stock_quantity = data.stockQuantity;
    if (data.isOnDemand !== undefined) updateData.is_on_demand = data.isOnDemand;
    if (data.isVisible !== undefined) updateData.is_visible = data.isVisible;
    updateData.updated_at = new Date().toISOString();

    const { data: product, error } = await this.dbAdmin
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update product', { error });
      throw new Error('Error al actualizar producto');
    }

    return product;
  }

  async deleteProduct(authHeader: string, productId: string) {
    const user = await this.authenticateUser(authHeader);
    const isAdmin = await this.isAdmin(authHeader);
    
    if (!isAdmin) {
      throw new UnauthorizedError('Solo el administrador puede eliminar productos');
    }

    logger.info('Deleting product', { userId: user.id, productId });

    const { error } = await this.dbAdmin
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      logger.error('Failed to delete product', { error });
      throw new Error('Error al eliminar producto');
    }

    return { success: true, message: 'Producto eliminado correctamente' };
  }

  async listProducts(authHeader: string) {
    const isAdmin = await this.isAdmin(authHeader);
    
    if (!isAdmin) {
      throw new UnauthorizedError('Acceso no autorizado');
    }

    const { data: products, error } = await this.dbAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Error al cargar productos');
    }

    return products;
  }
}

interface ProductInput {
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  isOnDemand: boolean;
  isVisible: boolean;
}

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const method = req.method;
    const authHeader = req.headers.get('Authorization') || '';

    const controller = new ProductController();

    // GET /manage-products -> Listar todos
    if (method === 'GET' && !path) {
      const products = await controller.listProducts(authHeader);
      return new Response(JSON.stringify(products), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // POST /manage-products -> Crear producto
    if (method === 'POST') {
      const body = await req.json();
      const product = await controller.createProduct(authHeader, body);
      return new Response(JSON.stringify(product), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // PUT /manage-products/:id -> Actualizar producto
    if (method === 'PUT' && path) {
      const body = await req.json();
      const product = await controller.updateProduct(authHeader, path, body);
      return new Response(JSON.stringify(product), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // DELETE /manage-products/:id -> Eliminar producto
    if (method === 'DELETE' && path) {
      const result = await controller.deleteProduct(authHeader, path);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    throw new BusinessError('METHOD_NOT_ALLOWED', 'Método no permitido', 405);

  } catch (error) {
    return handleError(error);
  }
});
```

### 2.2.2 Disparador de Rebuild

**`supabase/functions/trigger-rebuild/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger('trigger-rebuild');

serve(async (req: Request) => {
  try {
    const cfApiToken = Deno.env.get("CF_API_TOKEN");
    const cfDeployHookUrl = Deno.env.get("CF_DEPLOY_HOOK_URL");

    if (!cfApiToken || !cfDeployHookUrl) {
      throw new Error('Cloudflare configuration missing');
    }

    // Disparar deploy hook de Cloudflare Pages
    const response = await fetch(cfDeployHookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfApiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      logger.error('Failed to trigger rebuild', { status: response.status });
      throw new Error('Failed to trigger Cloudflare rebuild');
    }

    logger.info('Rebuild triggered successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Rebuild del storefront iniciado'
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Rebuild trigger failed', { error: String(error) });
    return new Response(JSON.stringify({
      success: false,
      message: 'Error al iniciar rebuild'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

---

## 📁 Tarea 2.3: Librerías del Storefront

### 2.3.1 Catálogo de Productos

**`apps/storefront/src/lib/catalog/catalog.ts`**

```typescript
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
```

### 2.3.2 Librería del Admin

**`apps/vendor-admin/src/lib/products/product-admin.ts`**

```typescript
export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  isOnDemand: boolean;
  isVisible: boolean;
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
  createdAt: string;
  updatedAt: string;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export async function loadProducts(): Promise<AdminProduct[]> {
  const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/manage-products`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Error al cargar productos');
  }

  return response.json();
}

export async function createProduct(data: ProductFormData): Promise<AdminProduct> {
  const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/manage-products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear producto');
  }

  return response.json();
}

export async function updateProduct(id: string, data: Partial<ProductFormData>): Promise<AdminProduct> {
  const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/manage-products/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar producto');
  }

  return response.json();
}

export async function deleteProduct(id: string): Promise<void> {
  const response = await fetch(`${import.meta.env.PUBLIC_API_BASE}/manage-products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar producto');
  }
}

export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  const fileExt = file.name.split('.').pop();
  const filePath = `${productId}/main.${fileExt}`;

  const { error } = await supabaseClient.storage
    .from('product-images')
    .upload(filePath, file, { upsert: true });

  if (error) {
    throw new Error('Error al subir imagen');
  }

  return `${supabaseUrl}/storage/v1/object/public/product-images/${filePath}`;
}

export async function triggerRebuild(): Promise<void> {
  const token = localStorage.getItem('auth_token');
  
  await fetch(`${import.meta.env.PUBLIC_API_BASE}/trigger-rebuild`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}
```

---

## 📁 Tarea 2.4: Páginas del Storefront

### 2.4.1 Página Principal con Catálogo

**`apps/storefront/src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import ProductCard from '../components/product/ProductCard.astro';
import { getVisibleProducts } from '../lib/catalog/catalog.ts';

const products = await getVisibleProducts();
---

<BaseLayout 
  title="Inicio" 
  description="Catálogo de productos - Micro-Store"
>
  <main class="catalog-page">
    <section class="hero">
      <h1>Micro-Store</h1>
      <p class="hero-subtitle">Productos de calidad, entrega rápida</p>
    </section>

    <section class="catalog-section">
      <div class="catalog-header">
        <h2>Nuestros Productos</h2>
        <span class="product-count">{products.length} productos</span>
      </div>

      {products.length === 0 ? (
        <div class="empty-state">
          <p>No hay productos disponibles en este momento.</p>
          <p class="empty-subtitle">Vuelve pronto para ver nuevas adiciones.</p>
        </div>
      ) : (
        <div class="products-grid">
          {products.map(product => (
            <ProductCard product={product} />
          ))}
        </div>
      )}
    </section>
  </main>
</BaseLayout>

<style>
  .catalog-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .hero {
    text-align: center;
    padding: 3rem 1rem;
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    color: white;
    border-radius: 12px;
    margin: 2rem 0;
  }

  .hero h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .hero-subtitle {
    font-size: 1.1rem;
    opacity: 0.9;
  }

  .catalog-section {
    margin-bottom: 3rem;
  }

  .catalog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .catalog-header h2 {
    font-size: 1.5rem;
  }

  .product-count {
    color: #666;
    font-size: 0.9rem;
  }

  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    background: #f9f9f9;
    border-radius: 12px;
  }

  .empty-state p {
    color: #666;
    font-size: 1.1rem;
  }

  .empty-subtitle {
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }

  @media (max-width: 768px) {
    .hero {
      padding: 2rem 1rem;
    }
    
    .hero h1 {
      font-size: 2rem;
    }
    
    .products-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

### 2.4.2 Componente ProductCard

**`apps/storefront/src/components/product/ProductCard.astro`**

```astro
---
import { getStockBadge } from '@micro-store/core/utils';
import type { CatalogProduct } from '../../lib/catalog/catalog.ts';

export interface Props {
  product: CatalogProduct;
}

const { product } = Astro.props;
const badge = getStockBadge({
  id: product.id,
  slug: product.slug,
  name: product.name,
  description: product.description,
  price: product.price,
  stockQuantity: product.stockQuantity,
  isOnDemand: product.isOnDemand,
  isVisible: true,
  lastStockChange: '',
  createdAt: product.createdAt,
  updatedAt: ''
});
---

<article class="product-card">
  <a href={`/producto/${product.slug}`} class="product-link">
    <div class="product-image">
      {product.imageUrl ? (
        <img 
          src={product.imageUrl} 
          alt={product.name}
          loading="lazy"
          width="300"
          height="300"
        />
      ) : (
        <div class="image-placeholder">
          <span>Sin imagen</span>
        </div>
      )}
    </div>

    <div class="product-info">
      <h3 class="product-name">{product.name}</h3>
      
      {product.description && (
        <p class="product-description">{product.description.slice(0, 80)}...</p>
      )}

      <div class="product-footer">
        <span class="product-price">${product.price.toFixed(2)}</span>
        <span class={`badge badge--${badge.variant}`} title={badge.tooltip}>
          {badge.text}
        </span>
      </div>
    </div>
  </a>
</article>

<style>
  .product-card {
    background: white;
    border: 1px solid #eee;
    border-radius: 12px;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .product-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  }

  .product-link {
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .product-image {
    width: 100%;
    height: 250px;
    overflow: hidden;
    background: #f5f5f5;
  }

  .product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 0.9rem;
  }

  .product-info {
    padding: 1rem;
  }

  .product-name {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .product-description {
    font-size: 0.85rem;
    color: #666;
    margin-bottom: 1rem;
    line-height: 1.4;
  }

  .product-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .product-price {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1a1a2e;
  }

  .badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .badge--success {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .badge--warning {
    background: #fff3e0;
    color: #e65100;
  }

  .badge--error {
    background: #ffebee;
    color: #c62828;
  }

  .badge--info {
    background: #e3f2fd;
    color: #1565c0;
  }
</style>
```

### 2.4.3 Página de Detalle de Producto

**`apps/storefront/src/pages/producto/[slug].astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getProductBySlug, getAllProductSlugs } from '../../lib/catalog/catalog.ts';
import { getStockBadge } from '@micro-store/core/utils';

export async function getStaticPaths() {
  const slugs = await getAllProductSlugs();
  return slugs.map(slug => ({ params: { slug } }));
}

const { slug } = Astro.params;
const product = await getProductBySlug(slug as string);

if (!product) {
  return Astro.redirect('/404');
}

const badge = getStockBadge({
  id: product.id,
  slug: product.slug,
  name: product.name,
  description: product.description,
  price: product.price,
  stockQuantity: product.stockQuantity,
  isOnDemand: product.isOnDemand,
  isVisible: true,
  lastStockChange: '',
  createdAt: product.createdAt,
  updatedAt: ''
});
---

<BaseLayout 
  title={product.name} 
  description={product.description || 'Detalle de producto'}
  image={product.imageUrl || undefined}
>
  <main class="product-detail">
    <nav class="breadcrumb">
      <a href="/">Inicio</a>
      <span>/</span>
      <span>{product.name}</span>
    </nav>

    <div class="product-layout">
      <div class="product-gallery">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            class="main-image"
            width="600"
            height="600"
          />
        ) : (
          <div class="image-placeholder-large">
            <span>Sin imagen disponible</span>
          </div>
        )}
      </div>

      <div class="product-details">
        <h1>{product.name}</h1>
        
        <span class={`badge badge--${badge.variant}`}>
          {badge.text}
        </span>

        <p class="price">${product.price.toFixed(2)}</p>

        {product.description && (
          <div class="description">
            <h3>Descripción</h3>
            <p>{product.description}</p>
          </div>
        )}

        <div class="stock-info">
          {product.isOnDemand ? (
            <p class="on-demand-info">Este producto se fabrica bajo pedido</p>
          ) : product.stockQuantity > 0 ? (
            <p class="in-stock-info">{product.stockQuantity} unidades disponibles</p>
          ) : (
            <p class="out-of-stock-info">Producto agotado</p>
          )}
        </div>

        <div class="actions">
          <a href={`https://cliente.tienda.com/checkout?product=${product.id}`} class="btn-primary">
            Comprar ahora
          </a>
          <a href="/" class="btn-secondary">
            Seguir comprando
          </a>
        </div>
      </div>
    </div>
  </main>
</BaseLayout>

<style>
  .product-detail {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .breadcrumb {
    margin-bottom: 2rem;
    font-size: 0.9rem;
    color: #666;
  }

  .breadcrumb a {
    color: #1a1a2e;
    text-decoration: none;
  }

  .breadcrumb a:hover {
    text-decoration: underline;
  }

  .breadcrumb span {
    margin: 0 0.5rem;
  }

  .product-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
  }

  .product-gallery {
    border-radius: 12px;
    overflow: hidden;
    background: #f5f5f5;
  }

  .main-image {
    width: 100%;
    height: auto;
    display: block;
  }

  .image-placeholder-large {
    width: 100%;
    height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
  }

  .product-details {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .product-details h1 {
    font-size: 2rem;
    margin: 0;
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    width: fit-content;
  }

  .badge--success {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .badge--warning {
    background: #fff3e0;
    color: #e65100;
  }

  .badge--error {
    background: #ffebee;
    color: #c62828;
  }

  .badge--info {
    background: #e3f2fd;
    color: #1565c0;
  }

  .price {
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a2e;
  }

  .description h3 {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }

  .description p {
    color: #444;
    line-height: 1.6;
  }

  .stock-info {
    padding: 0.75rem;
    border-radius: 8px;
  }

  .on-demand-info {
    background: #e3f2fd;
    color: #1565c0;
    padding: 0.75rem;
    border-radius: 8px;
  }

  .in-stock-info {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 0.75rem;
    border-radius: 8px;
  }

  .out-of-stock-info {
    background: #ffebee;
    color: #c62828;
    padding: 0.75rem;
    border-radius: 8px;
  }

  .actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .btn-primary {
    padding: 0.875rem 2rem;
    background: #1a1a2e;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-size: 1.1rem;
    text-align: center;
    flex: 1;
  }

  .btn-primary:hover {
    background: #16213e;
  }

  .btn-secondary {
    padding: 0.875rem 2rem;
    background: #eee;
    color: #333;
    text-decoration: none;
    border-radius: 8px;
    font-size: 1.1rem;
    text-align: center;
  }

  .btn-secondary:hover {
    background: #ddd;
  }

  @media (max-width: 768px) {
    .product-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
```

### 2.4.4 Sitemap Dinámico

**`apps/storefront/src/pages/sitemap.xml.ts`**

```typescript
import { getAllProductSlugs } from '../lib/catalog/catalog';

export async function GET() {
  const slugs = await getAllProductSlugs();
  const baseUrl = import.meta.env.PUBLIC_STOREFRONT_URL || 'https://tienda.com';

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${slugs.map(slug => `
  <url>
    <loc>${baseUrl}/producto/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  `).join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
```

### 2.4.5 Robots.txt

**`apps/storefront/src/pages/robots.txt.ts`**

```typescript
export function GET() {
  const baseUrl = import.meta.env.PUBLIC_STOREFRONT_URL || 'https://tienda.com';
  
  const robots = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
```

---

## 📁 Tarea 2.5: Páginas del Vendor Admin

### 2.5.1 Lista de Productos

**`apps/vendor-admin/src/pages/products/index.astro`**

```astro
---
import VendorAdminLayout from '../../layouts/VendorAdminLayout.astro';
---

<VendorAdminLayout title="Gestión de Productos">
  <div class="products-page" x-data="productList()" x-init="loadProducts()">
    <div class="page-header">
      <h1>Productos</h1>
      <button @click="openCreateModal()" class="btn-primary">+ Nuevo Producto</button>
    </div>

    <template x-if="loading">
      <p class="loading-text">Cargando productos...</p>
    </template>

    <template x-if="!loading && products.length === 0">
      <div class="empty-state">
        <p>No hay productos creados aún</p>
        <button @click="openCreateModal()" class="btn-primary">Crear primer producto</button>
      </div>
    </template>

    <template x-if="!loading && products.length > 0">
      <div class="products-table-wrapper">
        <table class="products-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Visible</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <template x-for="product in products" :key="product.id">
              <tr>
                <td>
                  <div class="product-cell">
                    <strong x-text="product.name"></strong>
                    <small x-text="product.slug"></small>
                  </div>
                </td>
                <td x-text="'$' + product.price.toFixed(2)"></td>
                <td>
                  <span x-show="!product.isOnDemand" x-text="product.stockQuantity"></span>
                  <span x-show="product.isOnDemand" class="badge badge--info">Bajo Pedido</span>
                </td>
                <td>
                  <span 
                    :class="product.isVisible ? 'badge badge--success' : 'badge badge--error'"
                    x-text="product.isVisible ? 'Activo' : 'Oculto'"
                  ></span>
                </td>
                <td>
                  <input 
                    type="checkbox" 
                    :checked="product.isVisible"
                    @change="toggleVisibility(product)"
                  />
                </td>
                <td>
                  <div class="actions-cell">
                    <button @click="openEditModal(product)" class="btn-sm">Editar</button>
                    <button @click="deleteProduct(product.id)" class="btn-sm btn-danger">Eliminar</button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Modal Crear/Editar -->
    <template x-if="showModal">
      <div class="modal-overlay" @click.self="closeModal()">
        <div class="modal">
          <h2 x-text="editingProduct ? 'Editar Producto' : 'Nuevo Producto'"></h2>
          
          <form @submit.prevent="saveProduct()" class="product-form">
            <div class="form-group">
              <label for="name">Nombre</label>
              <input type="text" id="name" x-model="form.name" required />
            </div>

            <div class="form-group">
              <label for="description">Descripción</label>
              <textarea id="description" x-model="form.description" rows="3"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="price">Precio</label>
                <input type="number" id="price" x-model="form.price" min="0" step="0.01" required />
              </div>

              <div class="form-group">
                <label for="stock">Stock</label>
                <input type="number" id="stock" x-model="form.stockQuantity" min="0" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" x-model="form.isOnDemand" />
                  Producto bajo pedido
                </label>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" x-model="form.isVisible" />
                  Visible en tienda
                </label>
              </div>
            </div>

            <template x-if="formError">
              <p class="error-message" x-text="formError"></p>
            </template>

            <div class="modal-actions">
              <button type="button" @click="closeModal()" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-primary" :disabled="formLoading">
                <span x-show="!formLoading">Guardar</span>
                <span x-show="formLoading">Guardando...</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </div>
</VendorAdminLayout>

<script>
  import { 
    loadProducts, 
    createProduct, 
    updateProduct, 
    deleteProduct as deleteProductApi,
    triggerRebuild
  } from '../../lib/products/product-admin.ts';

  window.productList = () => ({
    products: [],
    loading: true,
    showModal: false,
    editingProduct: null,
    form: {
      name: '',
      description: '',
      price: 0,
      stockQuantity: 0,
      isOnDemand: false,
      isVisible: true
    },
    formLoading: false,
    formError: '',

    async loadProducts() {
      try {
        this.products = await loadProducts();
      } catch (err) {
        console.error('Error loading products:', err);
      } finally {
        this.loading = false;
      }
    },

    openCreateModal() {
      this.editingProduct = null;
      this.resetForm();
      this.showModal = true;
    },

    openEditModal(product) {
      this.editingProduct = product;
      this.form = {
        name: product.name,
        description: product.description || '',
        price: product.price,
        stockQuantity: product.stockQuantity,
        isOnDemand: product.isOnDemand,
        isVisible: product.isVisible
      };
      this.showModal = true;
    },

    closeModal() {
      this.showModal = false;
      this.editingProduct = null;
      this.resetForm();
    },

    resetForm() {
      this.form = {
        name: '',
        description: '',
        price: 0,
        stockQuantity: 0,
        isOnDemand: false,
        isVisible: true
      };
      this.formError = '';
    },

    async saveProduct() {
      this.formLoading = true;
      this.formError = '';

      try {
        if (this.editingProduct) {
          await updateProduct(this.editingProduct.id, this.form);
        } else {
          await createProduct(this.form);
        }

        await triggerRebuild();
        await this.loadProducts();
        this.closeModal();
      } catch (err) {
        this.formError = err.message || 'Error al guardar producto';
      } finally {
        this.formLoading = false;
      }
    },

    async toggleVisibility(product) {
      try {
        await updateProduct(product.id, { isVisible: !product.isVisible });
        await triggerRebuild();
        await this.loadProducts();
      } catch (err) {
        console.error('Error toggling visibility:', err);
      }
    },

    async deleteProduct(id) {
      if (!confirm('¿Eliminar este producto?')) return;

      try {
        await deleteProductApi(id);
        await triggerRebuild();
        await this.loadProducts();
      } catch (err) {
        alert(err.message || 'Error al eliminar producto');
      }
    }
  });
</script>

<style>
  .products-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 1.5rem;
  }

  .btn-primary {
    padding: 0.75rem 1.5rem;
    background: #16213e;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .btn-secondary {
    padding: 0.75rem 1.5rem;
    background: #eee;
    color: #333;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .btn-sm {
    padding: 0.4rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    background: white;
  }

  .btn-danger {
    color: #c62828;
    border-color: #ffcdd2;
  }

  .btn-danger:hover {
    background: #ffebee;
  }

  .loading-text {
    text-align: center;
    color: #666;
    padding: 2rem;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    background: #f9f9f9;
    border-radius: 12px;
  }

  .empty-state p {
    color: #666;
    margin-bottom: 1rem;
  }

  .products-table-wrapper {
    overflow-x: auto;
  }

  .products-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border: 1px solid #eee;
    border-radius: 12px;
    overflow: hidden;
  }

  .products-table th {
    background: #f9f9f9;
    padding: 0.75rem 1rem;
    text-align: left;
    font-size: 0.85rem;
    color: #666;
    font-weight: 600;
  }

  .products-table td {
    padding: 0.75rem 1rem;
    border-top: 1px solid #eee;
  }

  .product-cell {
    display: flex;
    flex-direction: column;
  }

  .product-cell strong {
    font-size: 0.95rem;
  }

  .product-cell small {
    color: #999;
    font-size: 0.8rem;
  }

  .badge {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .badge--success {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .badge--error {
    background: #ffebee;
    color: #c62828;
  }

  .badge--info {
    background: #e3f2fd;
    color: #1565c0;
  }

  .actions-cell {
    display: flex;
    gap: 0.5rem;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    width: 500px;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal h2 {
    margin-bottom: 1.5rem;
  }

  .product-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .form-group label {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group textarea {
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 0.95rem;
  }

  .form-row {
    display: flex;
    gap: 1rem;
  }

  .form-row .form-group {
    flex: 1;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .error-message {
    background: #ffebee;
    color: #c62828;
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.85rem;
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }
</style>
```

---

## 📁 Tarea 2.6: Pruebas

### 2.6.1 Pruebas Unitarias - Utilidades de Stock

*(Ya implementadas en el Sprint 0 en `packages/core/src/__tests__/stock-utils.test.ts`)*

### 2.6.2 Pruebas de Integración - API de Productos

**`supabase/functions/manage-products/__tests__/products.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';

describe('Product Management API', () => {
  const baseUrl = 'http://localhost:54321/functions/v1/manage-products';

  it('debe rechazar creaciones sin autenticación', async () => {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Product',
        price: 99.99
      })
    });

    expect(response.status).toBe(401);
  });

  it('debe crear producto con autenticación de admin', async () => {
    // Este test requiere un token de admin válido
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer <admin-token>'
      },
      body: JSON.stringify({
        name: 'Producto de Prueba',
        description: 'Descripción',
        price: 49.99,
        stockQuantity: 10,
        isOnDemand: false,
        isVisible: true
      })
    });

    expect(response.status).toBe(201);
    const product = await response.json();
    expect(product.name).toBe('Producto de Prueba');
    expect(product.slug).toBeDefined();
  });
});
```

---

## 📊 Definición de Terminado (DoD) del Sprint 2

- [ ] Catálogo de productos visible en Storefront con carga estática (SSG)
- [ ] `ProductCard` muestra badge correcto según stock (usa `getStockBadge()`)
- [ ] Página de detalle de producto funcional (`/producto/[slug]`)
- [ ] Vendor Admin permite crear, editar y eliminar productos
- [ ] Vendor Admin permite activar/desactivar "bajo pedido"
- [ ] Vendor Admin permite subir imágenes de producto
- [ ] Cambios en productos disparan rebuild del Storefront (Cloudflare)
- [ ] Sitemap dinámico incluye todos los productos visibles
- [ ] Meta tags SEO correctos en cada página de producto
- [ ] RLS permite lectura pública de productos visibles
- [ ] RLS restringe escritura solo al admin con MFA
- [ ] Tests unitarios pasan (>80% cobertura en utils)
- [ ] Tests de integración pasan (CRUD de productos)
- [ ] `npm run check:architecture` pasa sin errores

---

## 🎯 Retrospectiva del Sprint 2 (Template)

1. **¿La generación estática es suficientemente rápida?**
2. **¿El panel de administración es intuitivo?**
3. **¿La sincronización con Cloudflare funciona correctamente?**
4. **¿Las imágenes de producto cargan eficientemente?**
5. **¿Se mantuvo la separación arquitectónica?**
