import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('manage-products');

class ProductController extends BaseController {
  
  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean).pop();
    const method = req.method;
    const authHeader = req.headers.get('Authorization') || '';

    // GET /manage-products -> Listar todos
    if (method === 'GET' && (path === 'manage-products' || !path)) {
      const products = await this.listProducts(authHeader);
      return new Response(JSON.stringify(products), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // POST /manage-products -> Crear producto
    if (method === 'POST') {
      const body = await req.json();
      const product = await this.createProduct(authHeader, body);
      return new Response(JSON.stringify(product), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // PUT /manage-products/:id -> Actualizar producto
    if (method === 'PUT' && path && path !== 'manage-products') {
      const body = await req.json();
      const product = await this.updateProduct(authHeader, path, body);
      return new Response(JSON.stringify(product), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // DELETE /manage-products/:id -> Eliminar producto
    if (method === 'DELETE' && path && path !== 'manage-products') {
      const result = await this.deleteProduct(authHeader, path);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    throw new BusinessError('Método no permitido', 405, 'METHOD_NOT_ALLOWED');
  }

  private async createProduct(authHeader: string, data: any) {
    await this.requireAdminMFA(authHeader);

    const { data: product, error } = await this.dbAdmin.rpc('create_product', {
      p_name: data.name,
      p_description: data.description || null,
      p_price: data.price,
      p_stock_quantity: data.stockQuantity,
      p_is_on_demand: data.isOnDemand,
      p_is_visible: data.isVisible
    });

    if (error) throw error;
    return product;
  }

  private async updateProduct(authHeader: string, productId: string, data: any) {
    await this.requireAdminMFA(authHeader);

    const updateData: any = {};
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
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return products;
  }
}

new ProductController().start();
