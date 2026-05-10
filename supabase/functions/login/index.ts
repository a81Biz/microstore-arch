import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError } from "../_shared/error-handler.ts";

const logger = createLogger('login');

serve(async (req: Request) => {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      throw new UnauthorizedError('Email y contraseña son requeridos');
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Autenticar usuario
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    // 2. Obtener perfil
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, totp_enabled, password_changed_at')
      .eq('id', authData.user.id)
      .single();

    if (!profile) {
      throw new UnauthorizedError('Perfil no encontrado');
    }

    // 3. Verificar si debe cambiar contraseña (vendor primer ingreso)
    if (profile.role === 'vendor' && !profile.password_changed_at) {
      logger.info('Vendor must change password', { userId: authData.user.id });

      return new Response(JSON.stringify({
        next_step: 'change_password',
        temp_token: authData.session.access_token,
        message: 'Debes cambiar tu contraseña antes de continuar'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Verificar si requiere TOTP
    if (profile.role === 'vendor' && profile.totp_enabled) {
      logger.info('TOTP required', { userId: authData.user.id });

      return new Response(JSON.stringify({
        next_step: 'verify_totp',
        temp_token: authData.session.access_token,
        message: 'Ingresa el código de Google Authenticator'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 5. Login exitoso sin pasos adicionales
    logger.info('Login successful', { userId: authData.user.id, role: profile.role });

    return new Response(JSON.stringify({
      next_step: 'complete',
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: profile.role
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return handleError(error);
  }
});
