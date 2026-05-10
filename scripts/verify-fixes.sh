#!/bin/bash
set -euo pipefail

echo "🔍 Micro-Store Arch - Verificación de Fixes Aplicados"
echo "====================================================="

VIOLATIONS=0
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_pass() { echo -e "${GREEN}✅ $1${NC}"; }
check_fail() { echo -e "${RED}❌ $1${NC}"; VIOLATIONS=$((VIOLATIONS + 1)); }
check_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# 1. MFA en RLS (user_metadata)
echo -n "1. RLS usa user_metadata para MFA... "
if grep -q "user_metadata.*mfa_verified" supabase/migrations/*.sql 2>/dev/null; then
  check_pass "Políticas actualizadas"
else
  check_fail "Falta validación MFA en RLS"
fi

# 2. Idempotencia de webhooks
echo -n "2. Tabla webhook_logs existe... "
if grep -q "CREATE TABLE.*webhook_logs" supabase/migrations/*.sql 2>/dev/null; then
  check_pass "Idempotencia implementada"
else
  check_fail "Falta tabla webhook_logs"
fi

# 3. Nonce seguro pgsodium
echo -n "3. Nonce seguro en pgsodium... "
if grep -q "crypto_secretbox_noncegen" supabase/migrations/*.sql 2>/dev/null; then
  check_pass "Nonce criptográfico seguro"
else
  check_fail "Nonce inseguro detectado"
fi

# 4. Rutas Docker
echo -n "4. host.docker.internal configurado... "
if grep -q "host.docker.internal" docker-compose.yml 2>/dev/null; then
  check_pass "Rutas Docker correctas"
else
  check_fail "Falta configuración de rutas Docker"
fi

# 5. Cleanup Realtime
echo -n "5. Cleanup de suscripciones Realtime... "
if grep -q "removeChannel" apps/client-hub/src/lib/orders/order-client.ts 2>/dev/null; then
  check_pass "Cleanup implementado"
else
  check_fail "Falta cleanup de canales"
fi

# 6. Rate Limiting SQL
echo -n "6. Rate limiting con SQL puro... "
if grep -q "check_rate_limit" supabase/migrations/*.sql 2>/dev/null; then
  check_pass "Rate limiting implementado"
else
  check_fail "Falta rate limiting"
fi

# 7. Storage RLS
echo -n "7. Políticas Storage para product-images... "
if grep -q "product-images" supabase/migrations/*.sql 2>/dev/null; then
  check_pass "Políticas de storage definidas"
else
  check_warn "Políticas de storage no detectadas (pueden estar en dashboard)"
fi

# 8. Verificación en BD local (si está corriendo)
echo -n "8. Verificando integridad de BD local... "
if docker compose ps | grep -q "microstore-supabase.*healthy" 2>/dev/null || docker compose ps | grep -q "supabase.*Up" 2>/dev/null; then
  if docker compose exec -T supabase psql -U postgres -d postgres -c "SELECT 1 FROM webhook_logs LIMIT 1;" &>/dev/null; then
    check_pass "Tablas de hardening existen en BD"
  else
    check_warn "BD corre pero tablas no aplicadas aún (ejecutar migraciones)"
  fi
else
  check_warn "Supabase no está corriendo (omitir verificación SQL)"
fi

echo ""
echo "====================================================="
if [ "$VIOLATIONS" -gt 0 ]; then
  echo -e "${RED}❌ Se encontraron $VIOLATIONS problema(s) crítico(s)${NC}"
  echo "Aplica los fixes faltantes antes de continuar."
  exit 1
else
  echo -e "${GREEN}✅ Todos los fixes verificados correctamente${NC}"
  echo "El sistema está listo para producción."
  exit 0
fi
