#!/bin/bash

# Micro-Store Arch: Architecture Compliance Checker
# Principle: HTML in .astro, logic in .ts, CSS in .css

errors=0

echo "🔍 Checking for HTML tags in .ts files..."
grep -rE "<[a-z]+|/>" apps packages --include="*.ts" --exclude-dir="node_modules" && {
  echo "❌ Error: HTML tags found in .ts files."
  errors=$((errors+1))
}

echo "🔍 Checking for inline styles in .astro files..."
grep -r "style=\"" apps --include="*.astro" --exclude-dir="node_modules" && {
  echo "❌ Error: Inline styles found in .astro files."
  errors=$((errors+1))
}

echo "🔍 Checking for magic strings (order status)..."
grep -rE "['\"](pending|paid|shipped|delivered)['\"]" apps --include="*.ts" --exclude-dir="node_modules" --exclude="*order-status.ts" && {
  echo "❌ Error: Magic strings for order status found. Use OrderStatus enum from @micro-store/core."
  errors=$((errors+1))
}

echo "🔍 Checking for direct DB client creation in apps (should use edge functions for write)..."
grep -r "createClient" apps/*/src --exclude="*supabase-client.ts" --exclude-dir="node_modules" && {
  echo "⚠️ Warning: createClient found outside of lib/supabase-client.ts."
  # This is a warning for now as read access is allowed
}

if [ $errors -gt 0 ]; then
  echo "❌ Architecture check failed with $errors errors."
  exit 1
else
  echo "✅ Architecture check passed!"
  exit 0
fi
