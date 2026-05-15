---
type: community
cohesion: 0.11
members: 25
---

# Docker & Infrastructure Config

**Cohesion:** 0.11 - loosely connected
**Members:** 25 nodes

## Members
- [[Auth Client Library (client-hub + vendor-admin)]] - document - docs/Sprint 1.md
- [[Dockerfile.astro]] - code - docker/Dockerfile.astro
- [[Migration 00021 Vendor Whitelist Table]] - code - supabase/migrations/00021_vendor_whitelist.sql
- [[Migration 00026 Seed admin@tienda.com into vendor_whitelist]] - code - supabase/migrations/00026_seed_admin_user.sql
- [[README.md Quick Start & Operations Guide]] - document - README.md
- [[RLS Policy vendor_whitelist service_role only (USING false)]] - code - supabase/migrations/00021_vendor_whitelist.sql
- [[Service client-hub (Astro + React + Alpine.js, port 5173)]] - code - docker-compose.yml
- [[Service db-migrate (applies all .sql migrations in order, runs once)]] - code - docker-compose.yml
- [[Service db-seed (creates admin@tienda.com via GoTrue Admin API)]] - code - docker-compose.yml
- [[Service inbucket (local email capture port 8025)]] - code - docker-compose.yml
- [[Service nginx (reverse proxy port 80)]] - code - docker-compose.yml
- [[Service storefront (Astro + Alpine.js, port 4321)]] - code - docker-compose.yml
- [[Service supabase-auth (GoTrue v2.151.0, JWT + MFA)]] - code - docker-compose.yml
- [[Service supabase-db (PostgreSQL 15.8.1 with encryption_key GUC)]] - code - docker-compose.yml
- [[Service supabase-functions (Edge Runtime Deno v1.67.4)]] - code - docker-compose.yml
- [[Service supabase-kong (API Gateway port 8000)]] - code - docker-compose.yml
- [[Service supabase-realtime (WebSockets RLS mode)]] - code - docker-compose.yml
- [[Service supabase-rest (PostgREST v12.2.0 auto-REST API)]] - code - docker-compose.yml
- [[Service supabase-studio (Admin UI port 8323)]] - code - docker-compose.yml
- [[Service vendor-admin (Astro + React + Alpine.js, port 5174)]] - code - docker-compose.yml
- [[Sprint 1 TOTP Flow login → change_password → setup_totp → verify_totp]] - document - docs/Sprint 1.md
- [[Sprint 1.md Auth Sprint Plan (MFA, TOTP, Password Rotation)]] - document - docs/Sprint 1.md
- [[Table vendor_whitelist (email-based vendor authorization)]] - code - supabase/migrations/00021_vendor_whitelist.sql
- [[Vendor First Login Flow (password change + TOTP setup)]] - document - README.md
- [[docker-compose.yml Full Local Development Stack]] - code - docker-compose.yml

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Docker__Infrastructure_Config
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Payment Encryption & Advanced Migrations]]

## Top bridge nodes
- [[Table vendor_whitelist (email-based vendor authorization)]] - degree 4, connects to 1 community
- [[Service supabase-db (PostgreSQL 15.8.1 with encryption_key GUC)]] - degree 3, connects to 1 community