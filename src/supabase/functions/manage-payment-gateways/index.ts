import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { UnauthorizedError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('manage-payment-gateways');

class PaymentGatewayController extends BaseController {

  // sync with payment_gateway enum in migrations
  private readonly ALL_GATEWAYS = ['stripe', 'paypal', 'mercadopago', 'hey_banco'] as const;

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const authHeader = req.headers.get('Authorization') || '';
    const method = req.method;

    // Ruta pública para el checkout: lista gateways activos sin credenciales
    if (method === 'GET' && url.pathname.endsWith('/public')) {
      const gateways = await this.getPublicGateways();
      return new Response(JSON.stringify(gateways), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Todas las rutas de gestión requieren vendor + MFA
    const user = await this.requireAdminMFA(authHeader);

    if (method === 'GET') {
      const gateways = await this.listGateways(user.id);
      return new Response(JSON.stringify(gateways), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (method === 'POST') {
      const { gateway, credentials, is_enabled } = await req.json();
      const result = await this.saveGateway(user.id, gateway, credentials, is_enabled);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    throw new BusinessError('METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  private async listGateways(vendorId: string) {
    const { data, error } = await this.dbAdmin
      .from('payment_credentials')
      .select('gateway, is_enabled, last_rotated_at, created_at')
      .eq('vendor_id', vendorId);

    if (error) throw new Error('Error al cargar pasarelas');

    const dbByGateway = new Map(
      (data ?? []).map(row => [row.gateway, row])
    );

    return this.ALL_GATEWAYS.map(gw => {
      const row = dbByGateway.get(gw);
      return {
        gateway:         gw,
        is_enabled:      row?.is_enabled ?? false,
        last_rotated_at: row?.last_rotated_at ?? null,
        created_at:      row?.created_at ?? null,
      };
    });
  }

  private async saveGateway(
    vendorId: string,
    gateway: string,
    credentials: Record<string, unknown>,
    isEnabled: boolean
  ) {
    logger.info('Saving payment gateway', { vendorId, gateway });

    const encKey = Deno.env.get('PAYMENT_ENCRYPTION_KEY') ?? '';
    if (!encKey || encKey.length < 32) {
      throw new BusinessError('ENCRYPTION_KEY_NOT_CONFIGURED', 'Clave de cifrado no configurada en el servidor', 500);
    }

    // Verificar que el perfil del usuario autenticado tiene rol vendor
    const { data: profile } = await this.dbAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', vendorId)
      .eq('role', 'vendor')
      .single();

    if (!profile) {
      throw new BusinessError('VENDOR_NOT_FOUND', 'Perfil de vendor no encontrado', 404);
    }

    // save_gateway_credentials_secure inyecta la clave vía set_config transaction-local
    // antes de llamar a save_payment_credentials, todo en la misma transacción PL/pgSQL.
    const { error } = await this.dbAdmin.rpc('save_gateway_credentials_secure', {
      p_vendor_id: vendorId,
      p_gateway: gateway,
      p_credentials: credentials || {},
      p_encryption_key: encKey,
    });

    if (error) throw new Error(error.message ?? 'Error al guardar pasarela');

    const { error: updateError } = await this.dbAdmin
      .from('payment_credentials')
      .update({ is_enabled: isEnabled })
      .eq('vendor_id', vendorId)
      .eq('gateway', gateway);

    if (updateError) throw new Error(updateError.message ?? 'Error al actualizar estado de pasarela');

    return { success: true, gateway };
  }

  private async getPublicGateways() {
    const { data, error } = await this.dbAdmin
      .from('payment_credentials')
      .select('gateway, is_enabled')
      .eq('is_enabled', true);

    if (error) throw new Error('Error al cargar pasarelas');

    return data.map(g => g.gateway);
  }
}

new PaymentGatewayController().start();
