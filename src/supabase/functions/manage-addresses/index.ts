import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { BusinessError } from "../_shared/error-handler.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const logger = createLogger('manage-addresses');

const AddressSchema = z.object({
  label:       z.enum(['home', 'office', 'other']),
  street:      z.string().min(5),
  city:        z.string().min(2),
  postal_code: z.string().min(4),
  country:     z.string().length(2),
  is_default:  z.boolean().optional().default(false),
});

type AddressInput = z.infer<typeof AddressSchema>;

class ManageAddressesController extends BaseController {

  async handle(req: Request): Promise<Response> {
    const url     = new URL(req.url);
    const method  = req.method;
    const auth    = req.headers.get('Authorization') || '';

    const segments  = url.pathname.split('/').filter(Boolean);
    const fnIdx     = segments.findIndex(s => s === 'manage-addresses');
    const pathParts = fnIdx >= 0 ? segments.slice(fnIdx + 1) : [];
    const addrId    = pathParts[0];
    const sub       = pathParts[1]; // 'default' or undefined

    // GET /manage-addresses
    if (method === 'GET' && !addrId) {
      return await this.listAddresses(auth);
    }

    // POST /manage-addresses
    if (method === 'POST' && !addrId) {
      const body = await req.json();
      return await this.createAddress(auth, body);
    }

    // PUT /manage-addresses/:id
    if (method === 'PUT' && addrId && !sub) {
      const body = await req.json();
      return await this.updateAddress(auth, addrId, body);
    }

    // DELETE /manage-addresses/:id
    if (method === 'DELETE' && addrId && !sub) {
      return await this.deleteAddress(auth, addrId);
    }

    // PATCH /manage-addresses/:id/default
    if (method === 'PATCH' && addrId && sub === 'default') {
      return await this.setDefault(auth, addrId);
    }

    throw new BusinessError('METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  private async listAddresses(auth: string): Promise<Response> {
    const user = await this.authenticateUser(auth);

    const { data, error } = await this.dbAdmin
      .from('customer_addresses')
      .select('id, label, street, city, postal_code, country, is_default, created_at')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;

    logger.info('Listed addresses', { userId: user.id, count: data?.length ?? 0 });
    return new Response(JSON.stringify(data ?? []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async createAddress(auth: string, body: unknown): Promise<Response> {
    const user  = await this.authenticateUser(auth);
    const input = this.validate(body);

    const { data, error } = await this.dbAdmin
      .from('customer_addresses')
      .insert({ ...input, user_id: user.id })
      .select('id, label, street, city, postal_code, country, is_default, created_at')
      .single();

    if (error) throw error;

    logger.info('Address created', { userId: user.id, id: data.id });
    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async updateAddress(auth: string, id: string, body: unknown): Promise<Response> {
    const user  = await this.authenticateUser(auth);
    const input = this.validate(body);

    await this.assertOwnership(user.id, id);

    const { data, error } = await this.dbAdmin
      .from('customer_addresses')
      .update(input)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, label, street, city, postal_code, country, is_default, created_at')
      .single();

    if (error) throw error;

    logger.info('Address updated', { userId: user.id, id });
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async deleteAddress(auth: string, id: string): Promise<Response> {
    const user = await this.authenticateUser(auth);

    await this.assertOwnership(user.id, id);

    const { error } = await this.dbAdmin
      .from('customer_addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    logger.info('Address deleted', { userId: user.id, id });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async setDefault(auth: string, id: string): Promise<Response> {
    const user = await this.authenticateUser(auth);

    await this.assertOwnership(user.id, id);

    // The DB trigger enforce_single_default_address clears other defaults.
    const { data, error } = await this.dbAdmin
      .from('customer_addresses')
      .update({ is_default: true })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, label, street, city, postal_code, country, is_default, created_at')
      .single();

    if (error) throw error;

    logger.info('Default address set', { userId: user.id, id });
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private validate(body: unknown): AddressInput {
    const result = AddressSchema.safeParse(body);
    if (!result.success) {
      throw new BusinessError(
        'VALIDATION_ERROR',
        result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
        422
      );
    }
    return result.data;
  }

  private async assertOwnership(userId: string, id: string): Promise<void> {
    const { data, error } = await this.dbAdmin
      .from('customer_addresses')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new BusinessError('NOT_FOUND', 'Dirección no encontrada', 404);
    }
  }
}

new ManageAddressesController().start();
