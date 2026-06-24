#!/usr/bin/env bash
# Diagnóstico y recuperación del usuario admin local.
# Lee el estado directamente vía docker exec + psql y GoTrue Admin API (Kong).
# Requiere que el stack Docker esté corriendo: docker compose up
#
# USO:
#   bash scripts/dev/diagnose-admin.sh [email] [--reset-password] [--reset-totp]
#
# Sin flags → solo diagnóstico (read-only).
# --reset-password → restablece la contraseña a Admin1234! vía GoTrue Admin API.
# --reset-totp     → limpia totp_enabled y totp_secret en profiles (psql directo).

set -euo pipefail

# ---------------------------------------------------------------------------
# Guard de producción
# ---------------------------------------------------------------------------
SUPABASE_URL="${SUPABASE_URL:-}"
if [[ "$SUPABASE_URL" == *".supabase.co"* ]]; then
  echo "ERROR: SUPABASE_URL apunta a producción. Este script es exclusivo de desarrollo local." >&2
  exit 1
fi

# Cargar .env local si existe (ignorar errores de vars sin valor)
if [ -f .env ]; then
  set +u
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | grep -E '^SUPABASE_' | xargs) 2>/dev/null || true
  set -u
fi

# ---------------------------------------------------------------------------
# Parámetros
# ---------------------------------------------------------------------------
ADMIN_EMAIL="${1:-admin@tienda.com}"
PG_CONTAINER_DEFAULT="microstore-supabase-db"
KONG_URL="http://localhost:8000"

# Clave de servicio — fallback al JWT hardcodeado de docker-compose (solo dev)
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2MTM1MzE5ODUsImV4cCI6NDc2OTIwNTk4NX0.tWpFmTM_nlJqPZnZ3sfxUTBJX43KaPSufIkghx35BJA}"

RESET_PASSWORD=false
RESET_TOTP=false

for arg in "$@"; do
  case $arg in
    --reset-password) RESET_PASSWORD=true ;;
    --reset-totp)     RESET_TOTP=true ;;
  esac
done

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║    ⚠️   USO EXCLUSIVO EN DESARROLLO LOCAL   ⚠️       ║"
echo "║         NO ejecutar contra Supabase Cloud            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Target: $ADMIN_EMAIL"
echo "  Flags:  reset-password=$RESET_PASSWORD  reset-totp=$RESET_TOTP"
echo ""

# ---------------------------------------------------------------------------
# Resolver nombre del contenedor Postgres (canónico → auto-detección fallback)
# ---------------------------------------------------------------------------
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${PG_CONTAINER_DEFAULT}$"; then
  PG_CONTAINER="$PG_CONTAINER_DEFAULT"
else
  DETECTED=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E 'supabase-db|postgres' | head -1)
  if [ -n "$DETECTED" ]; then
    echo "  ⚠️  Contenedor '$PG_CONTAINER_DEFAULT' no encontrado."
    echo "      Auto-detectado: '$DETECTED'"
    echo ""
    PG_CONTAINER="$DETECTED"
  else
    echo "ERROR: No se encontró ningún contenedor Postgres corriendo." >&2
    echo "       Nombres buscados: *supabase-db*, *postgres*" >&2
    echo "       Contenedores activos: $(docker ps --format '{{.Names}}' 2>/dev/null | tr '\n' '  ')" >&2
    echo "       Ejecuta: docker compose up -d" >&2
    exit 1
  fi
fi

# Helper: ejecuta SQL y devuelve resultado limpio (sin headers, sin líneas vacías)
psql_q() {
  docker exec "$PG_CONTAINER" psql -U supabase_admin -d postgres -t -A -c "$1" 2>/dev/null | grep -v '^$' || true
}

# ---------------------------------------------------------------------------
# FASE 1 — DIAGNÓSTICO (siempre read-only)
# ---------------------------------------------------------------------------
echo "════════════════════════════════════════"
echo " DIAGNÓSTICO"
echo "════════════════════════════════════════"

echo ""
echo "── 1. auth.users ──────────────────────"
RESULT=$(psql_q "SELECT id, email, created_at, last_sign_in_at FROM auth.users WHERE email='$ADMIN_EMAIL';")
if [ -z "$RESULT" ]; then
  echo "  ❌  Usuario NO encontrado en auth.users"
  echo "      El servicio db-seed no se ejecutó o falló silenciosamente."
  echo "      Solución: docker compose up  (o  docker compose restart db-seed)"
else
  echo "  ✅  $RESULT"
fi

echo ""
echo "── 2. public.profiles ─────────────────"
PROFILE=$(psql_q "SELECT id, role, totp_enabled, password_changed_at FROM public.profiles WHERE email='$ADMIN_EMAIL';")
if [ -z "$PROFILE" ]; then
  echo "  ❌  Perfil NO encontrado en profiles"
  echo "      El trigger handle_new_user no disparó o la migración 00022 no se aplicó."
else
  echo "  ✅  $PROFILE"
fi

echo ""
echo "── 3. vendor_whitelist ────────────────"
WHITELIST=$(psql_q "SELECT email, created_at FROM public.vendor_whitelist WHERE email='$ADMIN_EMAIL';")
if [ -z "$WHITELIST" ]; then
  echo "  ❌  Email NO en vendor_whitelist (migración 00026 no aplicada)"
else
  echo "  ✅  $WHITELIST"
fi

echo ""
echo "── 4. rate_limits (login) ─────────────"
RATE=$(psql_q "SELECT identifier, request_count, window_start FROM public.rate_limits WHERE identifier LIKE '%${ADMIN_EMAIL}%' ORDER BY window_start DESC LIMIT 5;")
if [ -z "$RATE" ]; then
  echo "  ✅  Sin entradas activas de rate limit para este email"
else
  echo "  ⚠️   Rate limit activo:"
  echo "$RATE" | while IFS= read -r line; do echo "      $line"; done
  echo "      Tip: espera 5 minutos, o ejecuta --reset-password para limpiar el contador."
fi

echo ""
echo "── 5. TOTP secret ─────────────────────"
TOTP_SECRET=$(psql_q "SELECT totp_secret FROM public.profiles WHERE email='$ADMIN_EMAIL';" | head -1)
TOTP_ENABLED=$(psql_q "SELECT totp_enabled FROM public.profiles WHERE email='$ADMIN_EMAIL';" | head -1)
if [ -z "$TOTP_SECRET" ] || [ "$TOTP_SECRET" = "" ]; then
  echo "  ℹ️   Sin TOTP secret configurado (totp_enabled=$TOTP_ENABLED)"
else
  echo "  🔑  totp_enabled=$TOTP_ENABLED"
  echo "  🔑  totp_secret=$TOTP_SECRET"
  echo "      Para generar el código actual:"
  echo "      npm run get-local-otp $ADMIN_EMAIL"
fi

# ---------------------------------------------------------------------------
# FASE 2 — RECUPERACIÓN (solo con flags explícitos)
# ---------------------------------------------------------------------------

if [ "$RESET_TOTP" = true ]; then
  echo ""
  echo "════════════════════════════════════════"
  echo " RESET TOTP"
  echo "════════════════════════════════════════"
  psql_q "UPDATE public.profiles SET totp_enabled=false, totp_secret=NULL, password_changed_at=NULL WHERE email='$ADMIN_EMAIL';"
  echo "  ✅  TOTP limpiado (totp_enabled=false, totp_secret=NULL, password_changed_at=NULL)"
  echo "      El próximo login pedirá: 1) cambiar contraseña → 2) configurar TOTP"
fi

if [ "$RESET_PASSWORD" = true ]; then
  echo ""
  echo "════════════════════════════════════════"
  echo " RESET CONTRASEÑA → Admin1234!"
  echo "════════════════════════════════════════"

  USER_ID=$(psql_q "SELECT id FROM auth.users WHERE email='$ADMIN_EMAIL';" | head -1)
  if [ -z "$USER_ID" ]; then
    echo "  ERROR: Usuario no encontrado. El db-seed no se ejecutó." >&2
    echo "         Ejecuta: docker compose up -d  (el servicio db-seed corre solo una vez)" >&2
    exit 1
  fi

  echo "  User ID: $USER_ID"

  # Limpiar rate limit activo para que el login no quede bloqueado
  psql_q "DELETE FROM public.rate_limits WHERE identifier LIKE '%${ADMIN_EMAIL}%';" || true
  echo "  ✅  Rate limits limpiados para $ADMIN_EMAIL"

  HTTP_STATUS=$(curl -s -o /tmp/gotrue_reset_response.json -w "%{http_code}" \
    -X PUT "$KONG_URL/auth/v1/admin/users/$USER_ID" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"password\":\"Admin1234!\"}" 2>/dev/null)

  if [ "$HTTP_STATUS" = "200" ]; then
    echo "  ✅  Contraseña restablecida a: Admin1234!"
    echo ""
    echo "  Próximos pasos:"
    echo "    1. Abre http://admin.localhost/auth/login"
    echo "    2. Email: $ADMIN_EMAIL  |  Password: Admin1234!"
    if [ "$RESET_TOTP" = true ]; then
      echo "    3. El sistema pedirá cambiar contraseña → luego configurar TOTP"
    else
      echo "    3. Si TOTP está activo: npm run get-local-otp $ADMIN_EMAIL"
    fi
  else
    echo "  ERROR: GoTrue respondió HTTP $HTTP_STATUS" >&2
    echo "  Respuesta:" >&2
    cat /tmp/gotrue_reset_response.json 2>/dev/null >&2 || true
    echo "" >&2
    echo "  Verifica que Kong esté corriendo: curl -sf http://localhost:8000/health" >&2
    exit 1
  fi
fi

echo ""
echo "════════════════════════════════════════"
echo " FIN DEL DIAGNÓSTICO"
echo "════════════════════════════════════════"
echo ""
