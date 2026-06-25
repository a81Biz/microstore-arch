import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { handleError, UnauthorizedError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('login');

async function checkLoginRateLimit(
  dbAdmin: SupabaseClient,
  identifier: string
): Promise<void> {
  const { data, error } = await dbAdmin.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_endpoint: 'login',
    p_limit: 5,
    p_window_seconds: 300,  // 5 intentos por 5 minutos
  });

  // Fail-closed: si la BD falla no podemos verificar — denegar por seguridad
  if (error) {
    throw new BusinessError(
      'RATE_LIMITED',
      'Servicio de rate limiting no disponible. Acceso denegado por seguridad.',
      429
    );
  }
  if (data === false) {
    throw new BusinessError(
      'RATE_LIMITED',
      'Demasiados intentos de inicio de sesión. Espera 5 minutos.',
      429
    );
  }
}

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

    // Rate limiting por IP + email para prevenir brute force (5 intentos / 5 min)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const identifier = `${ip}:${email.toLowerCase()}`;
    await checkLoginRateLimit(supabaseAdmin, identifier);

    // 1. Autenticar usuario
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      logger.warn('Failed login attempt', { email, ip });
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

    // 3. Vendor whitelist check — fail-closed (DB error → deny)
    if (profile.role === 'vendor') {
      const { data: whitelisted, error: wlError } = await supabaseAdmin
        .from('vendor_whitelist')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (wlError || !whitelisted) {
        logger.warn('Vendor not in whitelist', { email, ip });
        throw new BusinessError(
          'VENDOR_NOT_AUTHORIZED',
          'Tu cuenta de vendedor no está autorizada. Contacta al administrador.',
          403
        );
      }
    }

    const disableTotp = Deno.env.get("DISABLE_TOTP") === "true";

    // 4. Vendor sin contraseña cambiada → forzar cambio en primer ingreso
    if (profile.role === 'vendor' && !profile.password_changed_at) {
      logger.info('Vendor must change password', { userId: authData.user.id });
      return new Response(JSON.stringify({
        next_step: 'change_password',
        temp_token: authData.session.access_token,
        message: 'Debes cambiar tu contraseña antes de continuar',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (profile.role === 'vendor' && !disableTotp) {
      // 4. Vendor con TOTP activo → solicitar código
      if (profile.totp_enabled) {
        logger.info('TOTP required', { userId: authData.user.id });
        return new Response(JSON.stringify({
          next_step: 'verify_totp',
          temp_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          message: 'Ingresa el código de Google Authenticator',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 5. Vendor sin TOTP configurado → solicitar setup
      logger.info('TOTP setup required', { userId: authData.user.id });
      return new Response(JSON.stringify({
        next_step: 'setup_totp',
        temp_token: authData.session.access_token,
        message: 'Configura Google Authenticator para continuar',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. Login exitoso (DISABLE_TOTP=true en dev, o rol no-vendor)
    logger.info('Login successful', { userId: authData.user.id, role: profile.role });

    return new Response(JSON.stringify({
      next_step: 'complete',
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: profile.role,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const response = handleError(error);
    if (response.status === 429) {
      const headers = new Headers(response.headers);
      headers.set('Retry-After', '300');
      return new Response(response.body, { status: 429, headers });
    }
    return response;
  }
});
