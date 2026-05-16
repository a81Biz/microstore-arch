/**
 * USO EXCLUSIVO EN DESARROLLO LOCAL
 * Genera el código TOTP actual para un vendor del stack Docker local.
 *
 * Uso: npx ts-node scripts/dev/get-local-otp.ts [email]
 * Default email: admin@tienda.com
 *
 * Requisitos: stack Docker corriendo (docker compose up) y flujo de primer
 * acceso completado (cambio de contraseña + setup TOTP).
 */

import { createClient } from '@supabase/supabase-js';
import * as OTPAuth from 'otpauth';

// ── Guard de producción ────────────────────────────────────────────────────
// Abortar inmediatamente si apunta a un proyecto Supabase cloud.
const supabaseUrl = process.env.SUPABASE_URL ?? 'http://localhost:8000';
if (supabaseUrl.includes('.supabase.co')) {
  console.error('\nERROR: SUPABASE_URL apunta a un proyecto cloud (.supabase.co).');
  console.error('Este script es exclusivo de desarrollo local. Abortando.\n');
  process.exit(1);
}

// JWT de service_role del docker-compose.yml (valor default conocido para dev).
// Sobreescribible con SUPABASE_SERVICE_ROLE_KEY en .env.
const DEFAULT_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2MTM1MzE5ODUsImV4cCI6NDc2OTIwNTk4NX0.' +
  'tWpFmTM_nlJqPZnZ3sfxUTBJX43KaPSufIkghx35BJA';

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? DEFAULT_SERVICE_KEY;
const targetEmail = process.argv[2] ?? 'admin@tienda.com';

async function main(): Promise<void> {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 1. Buscar usuario por email via Admin API
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({
    perPage: 1000
  });

  if (usersError) {
    console.error(`\nError al conectar con GoTrue: ${usersError.message}`);
    console.error('¿Está el stack Docker corriendo? → docker compose up --build\n');
    process.exit(1);
  }

  const user = users.find(u => u.email === targetEmail);
  if (!user) {
    console.error(`\nNo se encontró el usuario: ${targetEmail}`);
    console.error('Verifica que db-seed completó correctamente → docker compose logs db-seed\n');
    process.exit(1);
  }

  // 2. Obtener totp_secret del perfil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('totp_secret, totp_enabled')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error(`\nError al obtener perfil: ${profileError?.message ?? 'sin datos'}`);
    process.exit(1);
  }

  if (!profile.totp_enabled || !profile.totp_secret) {
    console.log(`\nTOTP no configurado para ${targetEmail}.`);
    console.log('Completa el flujo de primer acceso:');
    console.log('  1. http://admin.localhost → login con Admin1234!');
    console.log('  2. Cambiar contraseña');
    console.log('  3. Escanear QR con Google Authenticator\n');
    process.exit(0);
  }

  // 3. Generar código TOTP actual
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(profile.totp_secret)
  });
  const token = totp.generate();
  const remainingSeconds = 30 - (Math.floor(Date.now() / 1000) % 30);

  console.log('\n─────────────────────────────────────────');
  console.log('  ⚠  USO EXCLUSIVO EN DESARROLLO LOCAL  ');
  console.log('       NUNCA COMPARTIR ESTE CÓDIGO       ');
  console.log('─────────────────────────────────────────');
  console.log(`  Usuario : ${targetEmail}`);
  console.log(`  Código  : ${token}`);
  console.log(`  Válido  : ${remainingSeconds}s más`);
  console.log('─────────────────────────────────────────\n');
}

main().catch(err => {
  console.error('Error inesperado:', (err as Error).message);
  process.exit(1);
});
