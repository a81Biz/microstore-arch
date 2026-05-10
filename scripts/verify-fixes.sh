#!/bin/bash
set -euo pipefail
echo "🔍 Verificando fixes aplicados (Micro-Store Arch Hardening)..."
echo "==========================================================="

VIOLATIONS=0

# 1. MFA en RLS
echo -n "1. RLS usa user_metadata->>'mfa_verified'... "
if grep -q "user_metadata.*mfa_verified" supabase/migrations/*.sql; then 
  echo "✅"; 
else 
  echo "❌ (No se encontró el check de MFA en migraciones)"; 
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# 2. Idempotencia
echo -n "2. Tabla webhook_logs existe en migraciones... "
if ls supabase/migrations/*webhook_idempotency.sql >/dev/null 2>&1; then 
  echo "✅"; 
else 
  echo "❌ (Falta migración de idempotencia)"; 
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# 3. Nonce pgsodium
echo -n "3. Nonce seguro en pgsodium (00004)... "
if grep -q "crypto_secretbox_noncegen" supabase/migrations/00004_payment_functions.sql; then 
  echo "✅"; 
else 
  echo "❌ (Se sigue usando gen_random_uuid)"; 
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# 4. Docker config
echo -n "4. Host.docker.internal en docker-compose... "
if grep -q "host.docker.internal" docker-compose.yml; then 
  echo "✅"; 
else 
  echo "❌ (Falta mapeo de host)"; 
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# 5. Realtime Cleanup
echo -n "5. Cleanup de suscripciones Realtime... "
if grep -q "removeChannel" apps/client-hub/src/lib/orders/order-client.ts; then 
  echo "✅"; 
else 
  echo "❌ (Falta cleanup function)"; 
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# 6. Storage RLS
echo -n "6. Migración de storage RLS existe... "
if ls supabase/migrations/*storage_hardening.sql >/dev/null 2>&1; then 
  echo "✅"; 
else 
  echo "❌ (Falta migración de storage)"; 
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# 7. Integridad de BD
echo -n "7. Verificando integridad de BD local (webhook_logs)... "
# Intentar consultar la tabla para confirmar que existe y es accesible
if docker compose exec -T supabase psql -U postgres -d postgres -c "SELECT 1 FROM webhook_logs LIMIT 1;" &>/dev/null; then
  echo "✅"
else
  echo "⚠️ BD no aplicada o tabla inaccesible"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

echo ""
echo "==========================================================="
if [ "$VIOLATIONS" -eq 0 ]; then
  echo "🟢 Todos los fixes verificados correctamente."
  exit 0
else
  echo "🔴 Se encontraron $VIOLATIONS problemas pendientes."
  exit 1
fi
