import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { UnauthorizedError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('manage-payment-gateways');

class PaymentGatewayController extends BaseController {

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
    await this.requireAdminMFA(authHeader);
    const user = await this.authenticateUser(authHeader);

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
    // Solo devuelve las gateways del vendor autenticado — aislamiento garantizado
    const { data, error } = await this.dbAdmin
      .from('payment_credentials')
      .select('gateway, is_enabled, last_rotated_at, created_at')
      .eq('vendor_id', vendorId)
      .order('gateway');

    if (error) throw new Error('Error al cargar pasarelas');

    return data;
  }

  private async saveGateway(
    vendorId: string,
    gateway: string,
    credentials: Record<string, unknown>,
    isEnabled: boolean
  ) {
    logger.info('Saving payment gateway', { vendorId, gateway });

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

    const { error } = await this.dbAdmin.rpc('save_payment_credentials', {
      p_vendor_id: vendorId,
      p_gateway: gateway,
      p_credentials: credentials || {},
    });

    if (error) throw error;

    const { error: updateError } = await this.dbAdmin
      .from('payment_credentials')
      .update({ is_enabled: isEnabled })
      .eq('vendor_id', vendorId)
      .eq('gateway', gateway);

    if (updateError) throw updateError;

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
