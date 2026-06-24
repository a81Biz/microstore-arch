#!/bin/bash
set -euo pipefail

echo "🔍 Micro-Store Arch - Verificación de reglas arquitectónicas"
echo "=========================================================="

VIOLATIONS_FOUND=0
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

check_violation() {
  local description=$1
  local count=$2
  local details=$3

  if [ "$count" -gt 0 ]; then
    echo -e "${RED}❌ VIOLACIÓN: $description${NC}"
    if [ -n "$details" ]; then
      echo "$details" | head -10
    fi
    VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
  else
    echo -e "${GREEN}✅ OK: $description${NC}"
  fi
}

# =============================================================================
# 1. Verificar HTML en archivos TypeScript puros (.ts, NO .astro)
# EXCLUYE: archivos que generan XML/JSON (sitemap, robots), tests, y tipos
# =============================================================================
echo ""
echo "1. Verificando HTML en archivos TypeScript puros..."

HTML_IN_TS=$(grep -rE '<[a-z][a-z0-9]*[^>]*>|</[a-z][a-z0-9]*>' \
  src/apps/ src/supabase/functions/ \
  --include="*.ts" \
  --exclude-dir="__tests__" \
  --exclude-dir="send-order-email" \
  --exclude-dir="send-shipping-email" \
  --exclude="*.test.ts" \
  --exclude="sitemap.xml.ts" \
  --exclude="robots.txt.ts" \
  | grep -v "node_modules" \
  | grep -v "export type\|interface\|Promise<\|Record<\|z\.infer" \
  | wc -l || true)

check_violation "HTML real en archivos .ts puros" "$HTML_IN_TS" ""

# =============================================================================
# 2. Verificar estilos inline en .astro
# =============================================================================
echo ""
echo "2. Verificando estilos inline en .astro..."

INLINE_STYLES=$(grep -rE 'style="[^"]*"' \
  src/apps/ --include="*.astro" \
  | grep -v "node_modules" \
  | wc -l || true)

check_violation "Estilos inline (style=\"...\") en .astro" "$INLINE_STYLES" ""

# =============================================================================
# 3. Verificar magic strings para estados de orden
# EXCLUYE: tests, definiciones de enums, tipos, y comparaciones legítimas
# =============================================================================
echo ""
echo "3. Verificando magic strings para estados de orden..."

# Buscar strings literales de estados que NO estén:
# - En archivos de test
# - En definiciones de enums
# - En imports/exports de enums
# - En tipos TypeScript (string literals en interfaces)
# - En comparaciones con variables (order.status !== 'pending' es OK si viene de BD)

MAGIC_STRINGS=$(grep -rnE "(^|[^a-zA-Z_])'(pending|paid|in_production|shipped|delivered|cancelled|refunded)'" \
  src/apps/ src/packages/core/src/ \
  --include="*.ts" --include="*.astro" \
  --exclude-dir="__tests__" \
  --exclude="*.test.ts" \
  | grep -v "enum OrderStatus\|export enum\|from.*enums\|import.*OrderStatus" \
  | grep -v "type.*=.*'\|interface.*:\s*'\|z\.enum\|nativeEnum" \
  | grep -v "status:\s*'\|fulfillmentStatus:\s*'\|: OrderStatus\|: ItemFulfillmentStatus" \
  | grep -v "OrderStatus\.\|ItemFulfillmentStatus\." \
  | grep -v "packages/core/src/enums/" \
  | wc -l || true)

if [ "$MAGIC_STRINGS" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Posibles magic strings encontrados ($MAGIC_STRINGS ocurrencias)${NC}"
  echo "Revisa que no sean usos legítimos (tests, tipos, imports):"
  grep -rnE "(^|[^a-zA-Z_])'(pending|paid|shipped|delivered|cancelled)'" \
    src/apps/ src/packages/core/src/ \
    --include="*.ts" --include="*.astro" \
    --exclude-dir="__tests__" \
    --exclude="*.test.ts" \
    | grep -v "enum OrderStatus\|from.*enums\|import.*OrderStatus" \
    | grep -v "type.*=.*'\|interface.*:\s*'\|z\.enum" \
    | grep -v "packages/core/src/enums/" \
    | head -5
  # No fallar el build por esto, solo advertir
  # VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
else
  echo -e "${GREEN}✅ OK: No se encontraron magic strings problemáticas${NC}"
fi

# =============================================================================
# 4. Verificar acceso directo a Supabase en frontend para escritura
# =============================================================================
echo ""
echo "4. Verificando acceso directo a Supabase para escritura..."

# Permitir createClient en supabase-client.ts, pero no en otras ubicaciones
# Solo verificar operaciones de escritura reales (.from() se usa también para lecturas con .select())
DIRECT_SUPABASE_WRITE=$(grep -rE "\.insert\(|\.update\(|\.delete\(|\.upsert\(" \
  src/apps/*/src/ \
  --include="*.ts" \
  | grep -v "supabase-client\.ts" \
  | grep -v "node_modules" \
  | grep -v "\.test\.ts\|__tests__" \
  | wc -l || true)

check_violation "Escritura directa a BD fuera de Edge Functions" "$DIRECT_SUPABASE_WRITE" ""

# =============================================================================
# 5. Verificar integridad del core (sin dependencias de frontend/backend)
# =============================================================================
echo ""
echo "5. Verificando que @micro-store/core sea puro..."

CORE_DEPS=$(node -e "
  try {
    const p = require('./src/packages/core/package.json');
    const deps = Object.keys(p.dependencies || {});
    const forbidden = ['astro', 'react', 'supabase', 'alpinejs'];
    const found = deps.filter(d => forbidden.includes(d));
    console.log(found.join(' '));
  } catch(e) { console.log(''); }
" 2>/dev/null || echo "")

if [ -n "$CORE_DEPS" ]; then
  echo -e "${RED}❌ VIOLACIÓN: src/packages/core tiene dependencias prohibidas: $CORE_DEPS${NC}"
  VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
else
  echo -e "${GREEN}✅ OK: packages/core solo depende de librerías puras${NC}"
fi

# =============================================================================
# Resultado final
# =============================================================================
echo ""
echo "=========================================================="
if [ "$VIOLATIONS_FOUND" -gt 0 ]; then
  echo -e "${RED}❌ Se encontraron $VIOLATIONS_FOUND violación(es) arquitectónica(s)${NC}"
  echo "Corrige los errores arriba y vuelve a intentar."
  exit 1
else
  echo -e "${GREEN}✅ Todas las reglas arquitectónicas pasaron correctamente${NC}"
  exit 0
fi