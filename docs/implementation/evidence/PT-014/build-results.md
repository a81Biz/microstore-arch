# PT-014 — Evidence: Build Results

**Date:** 2026-06-25
**Branch:** fix/PT-014-astro7-upgrade
**Command:** `npm run build --workspaces --if-present`

## Result: ALL APPS EXIT 0 ✅

| App | Pages Built | Build Time | Status |
|-----|------------|-----------|--------|
| `client-hub` | 7 | ~503ms | ✅ EXIT 0 |
| `storefront` | 2 | ~21.5s | ✅ EXIT 0 |
| `vendor-admin` | 6 | ~427ms | ✅ EXIT 0 |

## Pages Built

### client-hub (7 pages)
`/auth/callback`, `/auth/login`, `/auth/register`, `/checkout`, `/orders`, `/profile`, `/index.html`

### storefront (2 pages)
Products fetch ECONNREFUSED (no local Supabase) → graceful fallback to empty catalog → build
succeeds. `/index.html` + static assets built.

### vendor-admin (6 pages)
`/auth/login`, `/dev-setup`, `/orders`, `/products`, `/settings`, `/index.html`

## Breaking Changes Fixed During Build

| File | Breaking Change | Fix Applied |
|------|----------------|-------------|
| `client-hub/src/pages/orders/[id].astro` | astro@7 static mode requires `getStaticPaths()` on dynamic routes | Added `export function getStaticPaths() { return []; }` |
| `storefront/src/lib/supabase-client.ts` | `@supabase/supabase-js@2.105.4` validates key at constructor; deploy.yml intentionally omits anon key in storefront build | Added `\|\| 'build-placeholder'` fallback |
| `vendor-admin/src/pages/settings/index.astro` | Rust compiler rejects orphan `</div>` (astro@7 strict HTML) | Removed orphan closing tag at old line 165 |
| `vendor-admin/astro.config.mjs` | Rolldown (astro@7 bundler) requires `manualChunks` as function, not object | Converted to `(id) => { if (id.includes(...)) return '...' }` |
