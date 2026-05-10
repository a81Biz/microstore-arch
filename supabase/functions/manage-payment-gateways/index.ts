import { BaseController } from "../_core/base-controller.ts";
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('manage-payment-gateways');

class PaymentGatewayController extends BaseController {
  
  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const authHeader = req.headers.get('Authorization') || '';
    const method = req.method;
    
    // Ruta pública para el checkout
    if (method === 'GET' && url.pathname.endsWith('/public')) {
      const gateways = await this.getPublicGateways();
      return new Response(JSON.stringify(gateways), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const isAdmin = await this.isAdmin(authHeader);
    if (!isAdmin) throw new UnauthorizedError('Solo el administrador puede gestionar las pasarelas');

    if (method === 'GET') {
      const gateways = await this.listGateways();
      return new Response(JSON.stringify(gateways), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    if (method === 'POST') {
      const { gateway, credentials, is_enabled } = await req.json();
      const result = await this.saveGateway(gateway, credentials, is_enabled);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    throw new BusinessError('METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }
  
  private async listGateways() {
    const { data, error } = await this.dbAdmin
      .from('payment_credentials')
      .select('gateway, is_enabled, last_rotated_at, created_at')
      .order('gateway');
    
    if (error) throw new Error('Error al cargar pasarelas');
    
    return data;
  }
  
  private async saveGateway(gateway: string, credentials: any, isEnabled: boolean) {
    logger.info('Saving payment gateway', { gateway });
    
    // Obtener vendor_id del usuario autenticado
    // En este monorepo simplificado, asumimos que solo hay un vendor o lo obtenemos del perfil
    const { data: profile } = await this.dbAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'vendor')
      .limit(1)
      .single();

    if (!profile) throw new BusinessError('VENDOR_NOT_FOUND', 'No se encontró perfil de vendedor', 404);

    const { error } = await this.dbAdmin.rpc('save_payment_credentials', {
      p_vendor_id: profile.id,
      p_gateway: gateway,
      p_credentials: credentials || {}
    });

    if (error) throw error;
    
    // Actualizar is_enabled por separado si es necesario o asegurar que la función lo maneje
    const { error: updateError } = await this.dbAdmin
      .from('payment_credentials')
      .update({ is_enabled: isEnabled })
      .eq('vendor_id', profile.id)
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
