import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";
import { handleError, UnauthorizedError } from "../_shared/error-handler.ts";

export abstract class BaseController {
  protected dbAdmin: SupabaseClient;

  constructor() {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    this.dbAdmin = createClient(url, key);
  }

  abstract handle(req: Request): Promise<Response>;

  protected async authenticateUser(authHeader: string): Promise<User> {
    if (!authHeader) throw new UnauthorizedError('Token requerido');

    const token = authHeader.replace('Bearer ', '');
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(url, key);

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new UnauthorizedError('Token inválido');

    return user;
  }

  // Verifica si un usuario ya autenticado es vendor con MFA.
  // Acepta el objeto User para evitar una segunda llamada a getUser().
  protected async isAdminUser(user: User): Promise<boolean> {
    try {
      const { data: profile } = await this.dbAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isVendor = profile?.role === 'vendor';
      // app_metadata solo puede modificarse vía service_role — inmutable para el usuario
      const isMfaVerified = user.app_metadata?.mfa_verified === true;

      return isVendor && isMfaVerified;
    } catch {
      return false;
    }
  }

  protected async requireAdminMFA(authHeader: string): Promise<User> {
    const user = await this.authenticateUser(authHeader);
    const { data: profile } = await this.dbAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'vendor') {
      throw new UnauthorizedError('Acceso denegado: Solo vendors');
    }

    const isMfaVerified = user.app_metadata?.mfa_verified === true;
    if (!isMfaVerified) {
      throw new UnauthorizedError('Acceso denegado: MFA no verificado');
    }

    return user;
  }

  protected async checkRateLimit(
    identifier: string,
    endpoint: string,
    limit: number,
    windowSeconds: number
  ): Promise<boolean> {
    const { data, error } = await this.dbAdmin.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      // Fail-closed: si no podemos verificar el rate limit, denegamos por seguridad
      return false;
    }

    return data as boolean;
  }

  private getCorsOrigin(requestOrigin: string | null): string {
    const raw = Deno.env.get('ALLOWED_ORIGINS') ?? '';
    const allowed = raw.split(',').map(o => o.trim()).filter(Boolean);

    if (allowed.length === 0) {
      // En desarrollo sin env configurada, permitir localhost únicamente
      const devOrigins = ['http://localhost:4321', 'http://localhost:5173', 'http://localhost:5174'];
      return requestOrigin && devOrigins.includes(requestOrigin) ? requestOrigin : devOrigins[0];
    }

    return requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : allowed[0];
  }

  start() {
    serve(async (req: Request) => {
      const corsOrigin = this.getCorsOrigin(req.headers.get('Origin'));
      const corsHeaders = {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Vary': 'Origin',
      };

      if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
      }

      try {
        const response = await this.handle(req);
        // Inyectar headers CORS en cada respuesta para centralizar el control
        const headers = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
        return new Response(response.body, { status: response.status, headers });
      } catch (error) {
        const errResponse = handleError(error);
        const headers = new Headers(errResponse.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
        return new Response(errResponse.body, { status: errResponse.status, headers });
      }
    });
  }
}
