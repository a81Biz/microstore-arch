import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { BusinessError } from "../_shared/error-handler.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const logger = createLogger('manage-cart');

const SyncSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity:   z.number().int().min(1),
  })).min(0),
});

class ManageCartController extends BaseController {

  async handle(req: Request): Promise<Response> {
    const url     = new URL(req.url);
    const method  = req.method;
    const auth    = req.headers.get('Authorization') || '';

    const segments  = url.pathname.split('/').filter(Boolean);
    const fnIdx     = segments.findIndex(s => s === 'manage-cart');
    const pathParts = fnIdx >= 0 ? segments.slice(fnIdx + 1) : [];
    const sub       = pathParts[0]; // 'sync' | product_id | undefined

    // POST /manage-cart/sync — merge localStorage cart into DB
    if (method === 'POST' && sub === 'sync') {
      const body = await req.json();
      return await this.syncCart(auth, body);
    }

    // GET /manage-cart — return user's current cart with product details
    if (method === 'GET' && !sub) {
      return await this.getCart(auth);
    }

    // DELETE /manage-cart/:product_id — remove one item
    if (method === 'DELETE' && sub && sub !== 'sync') {
      return await this.removeItem(auth, sub);
    }

    // DELETE /manage-cart — empty the entire cart (called after order completion)
    if (method === 'DELETE' && !sub) {
      return await this.clearCart(auth);
    }

    throw new BusinessError('METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  private async syncCart(auth: string, body: unknown): Promise<Response> {
    const user   = await this.authenticateUser(auth);
    const result = SyncSchema.safeParse(body);
    if (!result.success) {
      throw new BusinessError('VALIDATION_ERROR', 'items inválidos', 422);
    }

    const { items } = result.data;
    if (items.length === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const uniqueProductIds = new Set(items.map(i => i.product_id));
    if (uniqueProductIds.size > 15) {
      throw new BusinessError('VALIDATION_ERROR', 'Cart cannot exceed 15 items', 400);
    }

    // UPSERT: keeps GREATEST quantity to avoid overwriting a larger server cart.
    const rows = items.map(i => ({ user_id: user.id, product_id: i.product_id, quantity: i.quantity, updated_at: new Date().toISOString() }));

    const { error } = await this.dbAdmin
      .from('cart_items')
      .upsert(rows, {
        onConflict: 'user_id,product_id',
        ignoreDuplicates: false,
      });

    if (error) throw error;

    // Re-fetch with product details so caller can update UI
    const cart = await this.fetchCartWithProducts(user.id);
    logger.info('Cart synced', { userId: user.id, itemCount: items.length });

    return new Response(JSON.stringify(cart), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getCart(auth: string): Promise<Response> {
    const user = await this.authenticateUser(auth);
    const cart = await this.fetchCartWithProducts(user.id);

    return new Response(JSON.stringify(cart), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async removeItem(auth: string, productId: string): Promise<Response> {
    const user = await this.authenticateUser(auth);

    const { error } = await this.dbAdmin
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) throw error;

    logger.info('Cart item removed', { userId: user.id, productId });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async clearCart(auth: string): Promise<Response> {
    const user = await this.authenticateUser(auth);

    const { error } = await this.dbAdmin
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    logger.info('Cart cleared', { userId: user.id });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async fetchCartWithProducts(userId: string) {
    const { data, error } = await this.dbAdmin
      .from('cart_items')
      .select('product_id, quantity, products(id, name, price, image_url, slug)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }
}

new ManageCartController().start();
