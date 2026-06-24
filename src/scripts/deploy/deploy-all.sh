#!/bin/bash
set -euo pipefail

echo "🚀 Micro-Store Arch - Despliegue a Producción"
echo "=============================================="

# 1. Verificar variables de entorno
if [ ! -f .env.production ]; then
  echo "❌ Error: .env.production no encontrado"
  exit 1
fi

source .env.production

# 2. Construir aplicaciones
echo ""
echo "📦 Construyendo aplicaciones..."

echo "  → Storefront..."
cd apps/storefront && npm run build && cd ../..

echo "  → Client Hub..."
cd apps/client-hub && npm run build && cd ../..

echo "  → Vendor Admin..."
cd apps/vendor-admin && npm run build && cd ../..

# 3. Desplegar a Cloudflare Pages
echo ""
echo "☁️ Desplegando a Cloudflare Pages..."

# Storefront
echo "  → Desplegando Storefront..."
npx wrangler pages deploy apps/storefront/dist \
  --project-name micro-store-storefront \
  --branch main \
  --commit-dirty=true

# Client Hub
echo "  → Desplegando Client Hub..."
npx wrangler pages deploy apps/client-hub/dist \
  --project-name micro-store-client-hub \
  --branch main \
  --commit-dirty=true

# Vendor Admin
echo "  → Desplegando Vendor Admin..."
npx wrangler pages deploy apps/vendor-admin/dist \
  --project-name micro-store-vendor-admin \
  --branch main \
  --commit-dirty=true

# 4. Desplegar Edge Functions a Supabase
echo ""
echo "⚡ Desplegando Edge Functions..."
supabase functions deploy create-order
supabase functions deploy payment-webhook
supabase functions deploy manage-products
supabase functions deploy manage-orders
supabase functions deploy manage-payment-gateways
supabase functions deploy login
supabase functions deploy verify-totp
supabase functions deploy setup-totp
supabase functions deploy confirm-totp
supabase functions deploy send-order-email
supabase functions deploy send-shipping-email
supabase functions deploy trigger-rebuild
supabase functions deploy health

# 5. Aplicar migraciones pendientes
echo ""
echo "🗄️ Aplicando migraciones..."
supabase db push

# 6. Configurar variables de entorno
echo ""
echo "🔧 Configurando variables de entorno..."
supabase secrets set --env-file .env.production

# 7. Invalidar caché de Cloudflare
echo ""
echo "🗑️ Invalidando caché..."
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything": true}'

echo ""
echo "✅ Despliegue completado exitosamente"
echo "=============================================="
echo "  Storefront:     https://tienda.com"
echo "  Client Hub:     https://cliente.tienda.com"
echo "  Vendor Admin:   https://admin.tienda.com"
