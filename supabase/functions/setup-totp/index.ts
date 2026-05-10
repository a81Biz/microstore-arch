import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError } from "../_shared/error-handler.ts";

const logger = createLogger('setup-totp');

serve(async (req: Request) => {
  try {
    const { temp_token } = await req.json();

    if (!temp_token) {
      throw new UnauthorizedError('Token requerido');
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Verificar token y obtener usuario
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(temp_token);

    if (userError || !user) {
      throw new UnauthorizedError('Token inválido');
    }

    // 2. Generar secreto TOTP (simulado)
    const secret = 'JBSWY3DPEHPK3PXP'; 
    const otpauthUrl = `otpauth://totp/Micro-Store:${user.email}?secret=${secret}&issuer=Micro-Store`;

    // 3. Guardar secreto temporal en el perfil
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        totp_secret: secret,
        totp_enabled: false
      })
      .eq('id', user.id);

    if (updateError) {
      logger.error('Failed to save TOTP secret', { error: updateError });
      throw new Error('Error al guardar configuración TOTP');
    }

    logger.info('TOTP setup initiated', { userId: user.id });

    return new Response(JSON.stringify({
      success: true,
      data: {
        secret: secret,
        otpauth_url: otpauthUrl
      },
      message: 'Escanea el código QR con Google Authenticator'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return handleError(error);
  }
});
