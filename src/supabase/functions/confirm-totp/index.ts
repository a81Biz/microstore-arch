import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TOTP, Secret } from "npm:otpauth";
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError } from "../_shared/error-handler.ts";

const logger = createLogger('confirm-totp');

serve(async (req: Request) => {
  try {
    const { temp_token, totp_code } = await req.json();

    if (!temp_token || !totp_code) {
      throw new UnauthorizedError('Token y código TOTP requeridos');
    }

    // Validar formato: exactamente 6 dígitos
    if (!/^\d{6}$/.test(String(totp_code))) {
      throw new UnauthorizedError('El código TOTP debe ser de 6 dígitos');
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Verificar token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(temp_token);

    if (userError || !user) {
      throw new UnauthorizedError('Token inválido');
    }

    // 2. Obtener secreto descifrado via RPC (pgp_sym_decrypt — mismo patrón que get_payment_credentials)
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('Error de configuración del servidor: ENCRYPTION_KEY requerida');
    }

    const { data: decryptedSecret, error: secretError } = await supabaseAdmin.rpc('get_totp_secret_secure', {
      p_user_id: user.id,
      p_encryption_key: encryptionKey,
    });

    if (secretError || !decryptedSecret) {
      throw new UnauthorizedError('TOTP no configurado. Usa setup-totp primero.');
    }

    // 3. Verificar código TOTP con ventana de ±1 período (tolerancia de 30s por desfase de reloj)
    const totp = new TOTP({
      issuer: 'Micro-Store',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(decryptedSecret as string),
    });

    const delta = totp.validate({ token: String(totp_code), window: 1 });

    if (delta === null) {
      logger.warn('Invalid TOTP code attempt', { userId: user.id });
      throw new UnauthorizedError('Código TOTP inválido o expirado');
    }

    // 4. Activar TOTP en el perfil
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ totp_enabled: true })
      .eq('id', user.id);

    if (updateProfileError) {
      throw new Error('Error al activar TOTP');
    }

    // 5. Marcar MFA verificado en app_metadata (solo modificable por service role, inmutable por usuarios)
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { app_metadata: { mfa_verified: true } }
    );

    if (updateAuthError) {
      logger.error('Failed to update app_metadata', { error: updateAuthError });
      throw new Error('Error al actualizar metadata de autenticación');
    }

    logger.info('TOTP activated successfully', { userId: user.id });

    return new Response(JSON.stringify({
      success: true,
      message: 'Google Authenticator activado correctamente',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return handleError(error);
  }
});
