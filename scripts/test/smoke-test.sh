#!/usr/bin/env bash
# Smoke test: verifies that all production endpoints return expected HTTP status.
# Reads URLs from env vars; pass overrides as positional args for local use:
#   bash smoke-test.sh [storefront_url] [client_hub_url] [vendor_admin_url] [api_base_url]
set -uo pipefail

STOREFRONT_URL="${1:-${PUBLIC_STOREFRONT_URL:-}}"
CLIENT_HUB_URL="${2:-${PUBLIC_CLIENT_HUB_URL:-}}"
VENDOR_ADMIN_URL="${3:-${PUBLIC_VENDOR_ADMIN_URL:-}}"
API_BASE_URL="${4:-${PUBLIC_API_BASE:-}}"

FAILED=0

check_url() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"

  if [[ -z "$url" ]]; then
    echo "SKIP  $name (no URL provided)"
    return
  fi

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 --retry 2 "$url")

  if [[ "$status" == "$expected" ]]; then
    printf "PASS  %-20s %s → HTTP %s\n" "$name" "$url" "$status"
  else
    printf "FAIL  %-20s %s → HTTP %s (expected %s)\n" "$name" "$url" "$status" "$expected"
    FAILED=1
  fi
}

echo "========================================"
echo " Smoke Test — $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "========================================"

check_url "Storefront"    "$STOREFRONT_URL"
check_url "Client Hub"    "$CLIENT_HUB_URL"
check_url "Vendor Admin"  "$VENDOR_ADMIN_URL"
check_url "API Health"    "${API_BASE_URL:+${API_BASE_URL}/health}"

echo "========================================"

if [[ "$FAILED" -ne 0 ]]; then
  echo "RESULT: FAILED — one or more endpoints did not respond as expected"
  exit 1
fi

echo "RESULT: PASSED — all endpoints healthy"
exit 0
