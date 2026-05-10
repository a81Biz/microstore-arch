import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError } from "../_shared/error-handler.ts";

const logger = createLogger('confirm-totp');

serve(async (req: Request) => {
  try {
    const { temp_token, totp_code } = await req.json();

    if (!temp_token || !totp_code) {
      throw new UnauthorizedError('Token y código TOTP requeridos');
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Verificar token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(temp_token);

    if (userError || !user) {
      throw new UnauthorizedError('Token inválido');
    }

    // 2. Obtener secreto temporal
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('totp_secret')
      .eq('id', user.id)
      .single();

    if (!profile?.totp_secret) {
      throw new UnauthorizedError('TOTP no configurado');
    }

    // 3. Verificar código (simulado)
    if (totp_code !== '123456') {
      throw new UnauthorizedError('Código TOTP inválido');
    }

    // 4. Activar TOTP
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        totp_enabled: true
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error('Error al activar TOTP');
    }

    logger.info('TOTP activated successfully', { userId: user.id });

    return new Response(JSON.stringify({
      success: true,
      message: 'Google Authenticator activado correctamente'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return handleError(error);
  }
});
