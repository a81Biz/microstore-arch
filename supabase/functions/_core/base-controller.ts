import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleError, UnauthorizedError } from "../_shared/error-handler.ts";

export abstract class BaseController {
  protected dbAdmin: SupabaseClient;

  constructor() {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    this.dbAdmin = createClient(url, key);
  }

  abstract handle(req: Request): Promise<Response>;

  protected async authenticateUser(authHeader: string) {
    if (!authHeader) throw new UnauthorizedError('Token requerido');

    const token = authHeader.replace('Bearer ', '');
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(url, key);

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new UnauthorizedError('Token inválido');

    return user;
  }

  protected async isAdmin(authHeader: string): Promise<boolean> {
    try {
      const user = await this.authenticateUser(authHeader);
      const { data: profile } = await this.dbAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isVendor = profile?.role === 'vendor';
      // app_metadata solo puede ser modificado por service role — inmutable para el usuario
      const isMfaVerified = user.app_metadata?.mfa_verified === true;

      return isVendor && isMfaVerified;
    } catch {
      return false;
    }
  }

  protected async requireAdminMFA(authHeader: string): Promise<void> {
    const user = await this.authenticateUser(authHeader);
    const { data: profile } = await this.dbAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'vendor') {
      throw new UnauthorizedError('Acceso denegado: Solo vendors');
    }

    // app_metadata.mfa_verified se establece al confirmar TOTP mediante service role.
    // A diferencia de user_metadata, no puede ser manipulado por el usuario.
    const isMfaVerified = user.app_metadata?.mfa_verified === true;

    if (!isMfaVerified) {
      throw new UnauthorizedError('Acceso denegado: MFA no verificado');
    }
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
      console.error('Rate limit check failed:', error);
      return true;
    }

    return data as boolean;
  }

  start() {
    serve(async (req: Request) => {
      try {
        if (req.method === 'OPTIONS') {
          return new Response('ok', {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Authorization, Content-Type',
            },
          });
        }

        return await this.handle(req);
      } catch (error) {
        return handleError(error);
      }
    });
  }
}
