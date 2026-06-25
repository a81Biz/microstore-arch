import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TOTP, Secret } from 'npm:otpauth';
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('verify-totp');

serve(async (req: Request) => {
  try {
    const { temp_token, totp_code } = await req.json();

    if (!temp_token || !totp_code) {
      throw new UnauthorizedError('Token temporal y código TOTP requeridos');
    }

    if (!/^\d{6}$/.test(String(totp_code))) {
      throw new BusinessError('INVALID_TOTP_FORMAT', 'El código TOTP debe tener exactamente 6 dígitos', 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Verificar el token temporal
    const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(temp_token);

    if (verifyError || !user) {
      throw new UnauthorizedError('Token temporal inválido o expirado');
    }

    // 2. Verificar que el usuario es vendor — clientes no pasan por este flujo
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('totp_enabled, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new UnauthorizedError('Perfil no encontrado');
    }

    if (profile.role !== 'vendor') {
      throw new UnauthorizedError('Solo vendors pueden verificar TOTP');
    }

    if (!profile.totp_enabled) {
      throw new UnauthorizedError('TOTP no configurado para este usuario');
    }

    // 3. Descifrar secreto TOTP via RPC (pgp_sym_decrypt — mismo patrón que get_payment_credentials)
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('Error de configuración del servidor: ENCRYPTION_KEY requerida');
    }

    const { data: decryptedSecret, error: secretError } = await supabaseAdmin.rpc('get_totp_secret_secure', {
      p_user_id: user.id,
      p_encryption_key: encryptionKey,
    });

    if (secretError || !decryptedSecret) {
      throw new UnauthorizedError('TOTP no configurado para este usuario');
    }

    // 4. Verificar código TOTP criptográficamente contra el secret único del usuario
    const secret = Secret.fromBase32(decryptedSecret as string);
    const totp = new TOTP({
      issuer: 'Micro-Store',
      label: user.email!,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const delta = totp.validate({ token: String(totp_code), window: 1 });

    if (delta === null) {
      logger.warn('Invalid TOTP code attempt', { userId: user.id });
      throw new UnauthorizedError('Código TOTP inválido');
    }

    // 5. Marcar MFA como verificado en app_metadata (solo service role puede escribir esto,
    //    a diferencia de user_metadata que el propio usuario puede modificar desde el cliente)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: { mfa_verified: true, mfa_verified_at: new Date().toISOString() }
      }
    );

    if (updateError) {
      logger.error('Failed to update app_metadata', { error: updateError });
      throw new Error('Error al verificar sesión MFA');
    }

    logger.info('TOTP verified successfully', { userId: user.id, delta });

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
