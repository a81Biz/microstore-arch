import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (_req: Request) => {
  const checks: Record<string, any> = {
    service: 'micro-store-arch',
    version: '1.0.0',
    environment: Deno.env.get('ENVIRONMENT') || 'production',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(performance.now() / 1000)
  };

  // Verificar conexión a BD
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
    
    checks.database = error ? 'error' : 'connected';
    checks.products_count = data || 0;
  } catch (err) {
    checks.database = 'error';
    checks.database_error = String(err);
  }

  // Verificar estado de pasarelas
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: gateways } = await supabase
      .from('payment_credentials')
      .select('gateway, is_enabled');
    
    checks.payment_gateways = gateways || [];
  } catch (err) {
    checks.payment_gateways = 'error';
  }

  const status = checks.database === 'error' ? 503 : 200;

  return new Response(JSON.stringify(checks, null, 2), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    }
  });
});
