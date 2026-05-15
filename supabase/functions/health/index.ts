import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";
import { getSupabaseClient, getSupabaseAdmin } from "../_shared/supabase-client.ts";

const logger = createLogger('health');

serve(async (_req: Request) => {
  const checks: Record<string, unknown> = {
    service: 'micro-store-arch',
    version: '1.0.0',
    environment: Deno.env.get('ENVIRONMENT') || 'production',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(performance.now() / 1000)
  };

  // Verificar conexión a BD
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('products').select('count', { count: 'exact', head: true });
    checks.database = error ? 'error' : 'connected';
    if (error) checks.database_error = error.message;
  } catch (err) {
    checks.database = 'error';
    checks.database_error = String(err);
  }

  // Verificar estado de pasarelas (requiere service_role para leer payment_credentials)
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: gateways } = await supabaseAdmin
      .from('payment_credentials')
      .select('gateway, is_enabled');
    checks.payment_gateways = gateways || [];
  } catch (err) {
    checks.payment_gateways = 'error';
    logger.warn('Failed to fetch payment gateways in health check', { error: String(err) });
  }

  const status = checks.database === 'error' ? 503 : 200;
  logger.info('Health check', { status, database: checks.database });

  return new Response(JSON.stringify(checks, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    }
  });
});
