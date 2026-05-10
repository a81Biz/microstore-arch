import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";
import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('manage-products');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CreateProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  price: z.number().positive().max(999_999),
  stockQuantity: z.number().int().min(0),
  isOnDemand: z.boolean(),
  isVisible: z.boolean()
});

const UpdateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().positive().max(999_999).optional(),
  stockQuantity: z.number().int().min(0).optional(),
  isOnDemand: z.boolean().optional(),
  isVisible: z.boolean().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'Al menos un campo debe ser proporcionado para actualizar'
});

class ProductController extends BaseController {

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean).pop();
    const method = req.method;
    const authHeader = req.headers.get('Authorization') || '';

    // GET /manage-products → Listar todos
    if (method === 'GET' && (path === 'manage-products' || !path)) {
      const products = await this.listProducts(authHeader);
      return new Response(JSON.stringify(products), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // POST /manage-products → Crear producto
    if (method === 'POST') {
      const body = await req.json();
      const product = await this.createProduct(authHeader, body);
      return new Response(JSON.stringify(product), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // PUT /manage-products/:id → Actualizar producto
    if (method === 'PUT' && path && path !== 'manage-products') {
      if (!UUID_REGEX.test(path)) {
        throw new BusinessError('VALIDATION_ERROR', 'ID de producto inválido', 400);
      }
      const body = await req.json();
      const product = await this.updateProduct(authHeader, path, body);
      return new Response(JSON.stringify(product), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // DELETE /manage-products/:id → Eliminar producto
    if (method === 'DELETE' && path && path !== 'manage-products') {
      if (!UUID_REGEX.test(path)) {
        throw new BusinessError('VALIDATION_ERROR', 'ID de producto inválido', 400);
      }
      const result = await this.deleteProduct(authHeader, path);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
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

    if (error) throw error;
    logger.info('Product created', { name: validated.name });
    return product;
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
    updateData.updated_at = new Date().toISOString();

    const { data: product, error } = await this.dbAdmin
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;
    return product;
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
      .select('id, name, slug, description, price, stock_quantity, is_on_demand, is_visible, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return products;
  }
}

new ProductController().start();
