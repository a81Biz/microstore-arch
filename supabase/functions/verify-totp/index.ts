import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError } from "../_shared/error-handler.ts";

const logger = createLogger('verify-totp');

async function verifyTOTPToken(secret: string, token: string): Promise<boolean> {
  // Simulación para desarrollo (en producción usar otplib o librería TOTP de Deno)
  if (!/^\d{6}$/.test(token)) {
    return false;
  }
  return token === '123456';
}

serve(async (req: Request) => {
  try {
    const { temp_token, totp_code } = await req.json();

    if (!temp_token || !totp_code) {
      throw new UnauthorizedError('Token temporal y código TOTP requeridos');
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Verificar el token temporal
    const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(temp_token);

    if (verifyError || !user) {
      throw new UnauthorizedError('Token temporal inválido');
    }

    // 2. Obtener secreto TOTP del perfil
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('totp_secret, totp_enabled, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.totp_enabled || !profile.totp_secret) {
      throw new UnauthorizedError('TOTP no configurado para este usuario');
    }

    // 3. Verificar código TOTP
    const isValid = await verifyTOTPToken(profile.totp_secret, totp_code);

    if (!isValid) {
      logger.warn('Invalid TOTP code', { userId: user.id });
      throw new UnauthorizedError('Código TOTP inválido');
    }

    // 4. Marcar sesión como verificada vía metadata (enfoque para Free Tier)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: { mfa_verified: true, mfa_verified_at: new Date().toISOString() }
      }
    );

    if (updateError) {
      logger.error('Failed to update user metadata', { error: updateError });
      throw new Error('Error al verificar sesión MFA');
    }

    logger.info('TOTP verified successfully', { userId: user.id });

    return new Response(JSON.stringify({
      success: true,
      access_token: temp_token,
      message: 'Autenticación de segundo factor exitosa'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return handleError(error);
  }
});
