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

  if [ "$count" -gt 0 ]; then
    echo -e "${RED}❌ VIOLACIÓN: $description${NC}"
    VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
  else
    echo -e "${GREEN}✅ OK: $description${NC}"
  fi
}

# count_matches: find files + grep pattern, returns integer (0 if no matches/no files)
# Uses find|xargs for Alpine/BusyBox compatibility (no --include/--exclude-dir in BusyBox grep)
# Uses set +o pipefail so grep exiting 1 (no matches) does not abort the pipeline
count_matches() {
  local result
  result=$(set +o pipefail
    find "$@" 2>/dev/null | xargs grep -E "$GREP_PATTERN" 2>/dev/null | grep -vE "$GREP_EXCLUDE" | wc -l
  )
  printf '%d' "${result:-0}" 2>/dev/null || echo 0
}

# =============================================================================
# 1. HTML en archivos TypeScript puros (.ts, NO .astro)
# =============================================================================
echo ""
echo "1. Verificando HTML en archivos TypeScript puros..."

GREP_PATTERN='<[a-z][a-z0-9]*[^>]*>|</[a-z][a-z0-9]*>'
GREP_EXCLUDE='export type|interface|Promise<|Record<|z\.infer|Omit<|Array<'

HTML_IN_TS=$(count_matches \
  src/apps/ src/supabase/functions/ \
  -type f \
  -name "*.ts" \
  -not -name "*.d.ts" \
  -not -name "*.test.ts" \
  -not -name "sitemap.xml.ts" \
  -not -name "robots.txt.ts" \
  -not -path "*/.astro/*" \
  -not -path "*/__tests__/*" \
  -not -path "*/node_modules/*" \
  -not -path "*/send-order-email/*" \
  -not -path "*/send-shipping-email/*" \
  -not -path "*/send-delivery-email/*" \
  -not -path "*/send-status-email/*")

check_violation "HTML real en archivos .ts puros" "$HTML_IN_TS"

# =============================================================================
# 2. Estilos inline en .astro
# =============================================================================
echo ""
echo "2. Verificando estilos inline en .astro..."

GREP_PATTERN='style="[^"]*"'
GREP_EXCLUDE='^$'

INLINE_STYLES=$(count_matches \
  src/apps/ \
  -type f \
  -name "*.astro" \
  -not -path "*/.astro/*" \
  -not -path "*/node_modules/*")

check_violation "Estilos inline (style=\"...\") en .astro" "$INLINE_STYLES"

# =============================================================================
# 3. Magic strings para estados de orden
# =============================================================================
echo ""
echo "3. Verificando magic strings para estados de orden..."

GREP_PATTERN="(^|[^a-zA-Z_])'(pending|paid|in_production|shipped|delivered|cancelled|refunded)'"
GREP_EXCLUDE='enum OrderStatus|export enum|from.*enums|import.*OrderStatus|type.*=.*'"'"'|z\.enum|nativeEnum|status:.*'"'"'|fulfillmentStatus:.*'"'"'|: OrderStatus|: ItemFulfillmentStatus|OrderStatus\.|ItemFulfillmentStatus\.'

MAGIC_STRINGS=$(count_matches \
  src/apps/ src/packages/core/src/ \
  -type f \
  \( -name "*.ts" -o -name "*.astro" \) \
  -not -name "*.test.ts" \
  -not -path "*/__tests__/*" \
  -not -path "*/node_modules/*" \
  -not -path "*/enums/*")

if [ "$MAGIC_STRINGS" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Posibles magic strings encontrados ($MAGIC_STRINGS ocurrencias)${NC}"
else
  echo -e "${GREEN}✅ OK: No se encontraron magic strings problemáticas${NC}"
fi

# =============================================================================
# 4. Escritura directa a Supabase en frontend
# =============================================================================
echo ""
echo "4. Verificando acceso directo a Supabase para escritura..."

GREP_PATTERN='\.insert\(|\.update\(|\.delete\(|\.upsert\('
GREP_EXCLUDE='^$'

DIRECT_SUPABASE_WRITE=$(count_matches \
  src/apps/ \
  -type f \
  -name "*.ts" \
  -not -name "supabase-client.ts" \
  -not -name "*.test.ts" \
  -not -path "*/__tests__/*" \
  -not -path "*/node_modules/*")

check_violation "Escritura directa a BD fuera de Edge Functions" "$DIRECT_SUPABASE_WRITE"

# =============================================================================
# 5. Core purity — sin dependencias de frontend/backend
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
