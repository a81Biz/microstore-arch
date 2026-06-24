#!/bin/bash
set -euo pipefail

echo "🔒 Verificación de Seguridad"
echo "============================"

VIOLATIONS=0

# 1. Verificar que RLS está habilitado en todas las tablas
echo ""
echo "1. Verificando Row Level Security..."
TABLES_WITHOUT_RLS=$(grep -L "ENABLE ROW LEVEL SECURITY" supabase/migrations/*.sql || true)
if [ -n "$TABLES_WITHOUT_RLS" ]; then
  echo "⚠️  Tablas sin RLS detectadas:"
  echo "$TABLES_WITHOUT_RLS"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✅ RLS configurado en migraciones"
fi

# 2. Verificar que no hay credenciales en texto plano
echo ""
echo "2. Verificando credenciales expuestas..."
CREDENTIALS_EXPOSED=$(grep -r "sk_live\|pk_live\|APP_USR\|secret_key.*=" apps/ supabase/functions/ --include="*.ts" --include="*.astro" | grep -v ".env" | grep -v "example" | wc -l || true)
if [ "$CREDENTIALS_EXPOSED" -gt 0 ]; then
  echo "❌ CRÍTICO: Credenciales expuestas en código fuente"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✅ No se encontraron credenciales expuestas"
fi

# 3. Verificar que los headers de seguridad existen
echo ""
echo "3. Verificando headers de seguridad..."
for app in storefront client-hub vendor-admin; do
  if [ -f "apps/$app/public/_headers" ]; then
    HEADERS_COUNT=$(grep -c "X-" "apps/$app/public/_headers" || true)
    echo "  ✅ $app: $HEADERS_COUNT headers de seguridad configurados"
  else
    echo "  ⚠️  $app: Sin archivo _headers"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

# 4. Verificar que los secrets no están en git
echo ""
echo "4. Verificando secrets en git..."
SECRETS_IN_GIT=$(git ls-files | grep "\.env$" | grep -v ".example" | wc -l || true)
if [ "$SECRETS_IN_GIT" -gt 0 ]; then
  echo "❌ Archivos .env encontrados en git"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✅ No hay secrets en git"
fi

echo ""
echo "============================"
if [ "$VIOLATIONS" -gt 0 ]; then
  echo "❌ Se encontraron $VIOLATIONS problemas de seguridad"
  exit 1
else
  echo "✅ Verificación de seguridad completada"
fi
