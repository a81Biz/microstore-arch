import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('change-password');

function validatePasswordComplexity(password: string): void {
  const errors: string[] = [];

  if (password.length < 12) errors.push('mínimo 12 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('al menos una mayúscula');
  if (!/[a-z]/.test(password)) errors.push('al menos una minúscula');
  if (!/\d/.test(password)) errors.push('al menos un número');
  if (!/[!@#$%^&*()\-_=+\[\]{};':",.<>/?\\|`~]/.test(password)) {
    errors.push('al menos un carácter especial (!@#$%^&*...)');
  }

  if (errors.length > 0) {
    throw new BusinessError(
      'WEAK_PASSWORD',
      `La contraseña debe contener: ${errors.join(', ')}`,
      400
    );
  }
}

serve(async (req: Request) => {
  try {
    const { temp_token, new_password } = await req.json();

    if (!temp_token || !new_password) {
      throw new UnauthorizedError('Token y nueva contraseña requeridos');
    }

    validatePasswordComplexity(new_password);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Verificar token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(temp_token);

    if (userError || !user) {
      throw new UnauthorizedError('Token inválido');
    }

    // 2. Actualizar contraseña
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    );

    if (updateAuthError) {
      logger.error('Failed to update password', { error: updateAuthError });
      throw new Error('Error al actualizar la contraseña');
    }

    // 3. Marcar como cambiada en el perfil
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ password_changed_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateProfileError) {
      logger.error('Failed to update profile password_changed_at', { error: updateProfileError });
    }

    logger.info('Password changed successfully', { userId: user.id });

    return new Response(JSON.stringify({
      success: true,
      message: 'Contraseña actualizada correctamente. Procede a configurar TOTP.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return handleError(error);
  }
});
