import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TOTP, Secret } from "npm:otpauth";
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

    // 2. Generar secreto TOTP único y criptográficamente seguro (20 bytes = 160 bits)
    const secretBytes = new Uint8Array(20);
    crypto.getRandomValues(secretBytes);
    const secret = new Secret({ buffer: secretBytes.buffer });

    const totp = new TOTP({
      issuer: 'Micro-Store',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const otpauthUrl = totp.toString();

    // 3. Guardar secreto (base32) en el perfil — totp_enabled permanece false hasta confirmación
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        totp_secret: secret.base32,
        totp_enabled: false,
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
        secret: secret.base32,
        otpauth_url: otpauthUrl,
      },
      message: 'Escanea el código QR con Google Authenticator',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return handleError(error);
  }
});
