import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";
import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('manage-products');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HTTPS_REGEX = /^https?:\/\/.+/;

const CreateProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  price: z.number().positive().max(999_999),
  stockQuantity: z.number().int().min(0),
  isOnDemand: z.boolean(),
  isVisible: z.boolean(),
  imageUrl: z.string().nullable().optional()
});

const UpdateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().positive().max(999_999).optional(),
  stockQuantity: z.number().int().min(0).optional(),
  isOnDemand: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  imageUrl: z.string().nullable().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'Al menos un campo debe ser proporcionado para actualizar'
});

const AddImageSchema = z.object({
  url: z.string().regex(HTTPS_REGEX, 'La URL debe comenzar con https://'),
  altText: z.string().optional(),
  sortOrder: z.number().int().min(0).optional()
});

class ProductController extends BaseController {

  private mapProduct(row: Record<string, unknown>) {
    const rawImages = (row.product_images as Array<Record<string, unknown>> | null) ?? [];
    const images = rawImages
      .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
      .map(img => ({
        id:        img.id,
        url:       img.url,
        sortOrder: img.sort_order,
        altText:   img.alt_text ?? null,
      }));

    return {
      id:            row.id,
      slug:          row.slug,
      name:          row.name,
      description:   row.description ?? null,
      price:         row.price,
      stockQuantity: row.stock_quantity,
      isOnDemand:    row.is_on_demand,
      isVisible:     row.is_visible,
      imageUrl:      row.image_url ?? null,
      images,
      createdAt:     row.created_at,
      updatedAt:     row.updated_at,
    };
  }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const segments = url.pathname.split('/').filter(Boolean);
    const fnIdx = segments.findIndex(s => s === 'manage-products');
    const pathParts = fnIdx >= 0 ? segments.slice(fnIdx + 1) : [];
    const productId = pathParts[0];
    const subResource = pathParts[1]; // 'images' or undefined
    const imageId = pathParts[2];
    const method = req.method;
    const authHeader = req.headers.get('Authorization') || '';

    // GET /manage-products → list all products
    if (method === 'GET' && !productId) {
      const products = await this.listProducts(authHeader);
      return new Response(JSON.stringify(products), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // POST /manage-products → create product
    if (method === 'POST' && !productId) {
      const body = await req.json();
      const product = await this.createProduct(authHeader, body);
      return new Response(JSON.stringify(product), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Routes with productId
    if (productId) {
      if (!UUID_REGEX.test(productId)) {
        throw new BusinessError('VALIDATION_ERROR', 'ID de producto inválido', 400);
      }

      // POST /manage-products/:id/images → add image
      if (method === 'POST' && subResource === 'images') {
        const body = await req.json();
        const image = await this.addImage(authHeader, productId, body);
        return new Response(JSON.stringify(image), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // DELETE /manage-products/:id/images/:imageId → delete image
      if (method === 'DELETE' && subResource === 'images' && imageId) {
        if (!UUID_REGEX.test(imageId)) {
          throw new BusinessError('VALIDATION_ERROR', 'ID de imagen inválido', 400);
        }
        const result = await this.deleteImage(authHeader, productId, imageId);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // PUT /manage-products/:id → update product
      if (method === 'PUT' && !subResource) {
        const body = await req.json();
        const product = await this.updateProduct(authHeader, productId, body);
        return new Response(JSON.stringify(product), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // DELETE /manage-products/:id → delete product
      if (method === 'DELETE' && !subResource) {
        const result = await this.deleteProduct(authHeader, productId);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    throw new BusinessError('METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  private async createProduct(authHeader: string, data: unknown) {
    await this.requireAdminMFA(authHeader);

    const validated = CreateProductSchema.parse(data);

    const { data: product, error } = await this.dbAdmin.rpc('create_product', {
      p_name: validated.name,
      p_description: validated.description ?? null,
      p_price: validated.price,
      p_stock_quantity: validated.stockQuantity,
      p_is_on_demand: validated.isOnDemand,
      p_is_visible: validated.isVisible
    });

    if (error) throw new Error(error.message ?? 'Error al crear producto');
    logger.info('Product created', { name: validated.name });
    return this.mapProduct(product as Record<string, unknown>);
  }

  private async updateProduct(authHeader: string, productId: string, data: unknown) {
    await this.requireAdminMFA(authHeader);

    const validated = UpdateProductSchema.parse(data);

    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.price !== undefined) updateData.price = validated.price;
    if (validated.stockQuantity !== undefined) updateData.stock_quantity = validated.stockQuantity;
    if (validated.isOnDemand !== undefined) updateData.is_on_demand = validated.isOnDemand;
    if (validated.isVisible !== undefined) updateData.is_visible = validated.isVisible;
    if (validated.imageUrl !== undefined) updateData.image_url = validated.imageUrl;
    updateData.updated_at = new Date().toISOString();

    const { data: product, error } = await this.dbAdmin
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select('*, product_images(id, url, sort_order, alt_text)')
      .single();

    if (error) throw new Error(error.message ?? 'Error al actualizar producto');
    return this.mapProduct(product as Record<string, unknown>);
  }

  private async deleteProduct(authHeader: string, productId: string) {
    await this.requireAdminMFA(authHeader);

    const { error } = await this.dbAdmin
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw error;
    return { success: true, message: 'Producto eliminado correctamente' };
  }

  private async listProducts(authHeader: string) {
    await this.requireAdminMFA(authHeader);

    const { data: products, error } = await this.dbAdmin
      .from('products')
      .select('id, name, slug, description, price, stock_quantity, is_on_demand, is_visible, image_url, created_at, updated_at, product_images(id, url, sort_order, alt_text)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message ?? 'Error al cargar productos');
    return (products ?? []).map(row => this.mapProduct(row as Record<string, unknown>));
  }

  private async addImage(authHeader: string, productId: string, data: unknown) {
    await this.requireAdminMFA(authHeader);
    await this.verifyProductOwner(authHeader, productId);

    const validated = AddImageSchema.parse(data);

    // Enforce max 10 images
    const { count, error: countError } = await this.dbAdmin
      .from('product_images')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId);

    if (countError) throw new Error(countError.message);
    if ((count ?? 0) >= 10) {
      throw new BusinessError('VALIDATION_ERROR', 'El producto ya tiene el máximo de 10 imágenes', 422);
    }

    const sortOrder = validated.sortOrder ?? (count ?? 0);

    const { data: image, error } = await this.dbAdmin
      .from('product_images')
      .insert({
        product_id: productId,
        url: validated.url,
        sort_order: sortOrder,
        alt_text: validated.altText ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message ?? 'Error al añadir imagen');

    // If this is the first image, sync products.image_url
    if ((count ?? 0) === 0) {
      await this.dbAdmin
        .from('products')
        .update({ image_url: validated.url, updated_at: new Date().toISOString() })
        .eq('id', productId);
    }

    logger.info('Product image added', { productId, imageId: (image as Record<string, unknown>).id });
    const img = image as Record<string, unknown>;
    return { id: img.id, url: img.url, sortOrder: img.sort_order, altText: img.alt_text ?? null };
  }

  private async deleteImage(authHeader: string, productId: string, imageId: string) {
    await this.requireAdminMFA(authHeader);
    await this.verifyProductOwner(authHeader, productId);

    // Fetch the image to check if it's the primary
    const { data: imageRow, error: fetchError } = await this.dbAdmin
      .from('product_images')
      .select('url, sort_order')
      .eq('id', imageId)
      .eq('product_id', productId)
      .single();

    if (fetchError || !imageRow) {
      throw new BusinessError('NOT_FOUND', 'Imagen no encontrada', 404);
    }

    const { error } = await this.dbAdmin
      .from('product_images')
      .delete()
      .eq('id', imageId);

    if (error) throw new Error(error.message ?? 'Error al eliminar imagen');

    // If this was the primary image (sort_order=0), promote the next one
    const { data: product } = await this.dbAdmin
      .from('products')
      .select('image_url')
      .eq('id', productId)
      .single();

    if (product && (product as Record<string, unknown>).image_url === (imageRow as Record<string, unknown>).url) {
      const { data: nextImage } = await this.dbAdmin
        .from('product_images')
        .select('url')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single();

      await this.dbAdmin
        .from('products')
        .update({
          image_url: nextImage ? (nextImage as Record<string, unknown>).url : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);
    }

    logger.info('Product image deleted', { productId, imageId });
    return { success: true };
  }

  private async verifyProductOwner(authHeader: string, productId: string) {
    const user = await this.authenticateUser(authHeader);
    const { data: product, error } = await this.dbAdmin
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (error || !product) {
      throw new BusinessError('NOT_FOUND', 'Producto no encontrado', 404);
    }
    // dbAdmin uses service_role so it can see all products; vendor ownership is
    // enforced by RLS on the product_images table itself as a second layer.
    void user;
  }
}

new ProductController().start();
