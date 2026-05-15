---
source_file: "docker-compose.yml"
type: "code"
community: "Docker & Infrastructure Config"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Docker__Infrastructure_Config
---

# docker-compose.yml: Full Local Development Stack

## Connections
- [[Service client-hub (Astro + React + Alpine.js, port 5173)]] - `implements` [EXTRACTED]
- [[Service db-migrate (applies all .sql migrations in order, runs once)]] - `implements` [EXTRACTED]
- [[Service db-seed (creates admin@tienda.com via GoTrue Admin API)]] - `implements` [EXTRACTED]
- [[Service inbucket (local email capture port 8025)]] - `implements` [EXTRACTED]
- [[Service nginx (reverse proxy port 80)]] - `implements` [EXTRACTED]
- [[Service storefront (Astro + Alpine.js, port 4321)]] - `implements` [EXTRACTED]
- [[Service supabase-auth (GoTrue v2.151.0, JWT + MFA)]] - `implements` [EXTRACTED]
- [[Service supabase-db (PostgreSQL 15.8.1 with encryption_key GUC)]] - `implements` [EXTRACTED]
- [[Service supabase-functions (Edge Runtime Deno v1.67.4)]] - `implements` [EXTRACTED]
- [[Service supabase-kong (API Gateway port 8000)]] - `implements` [EXTRACTED]
- [[Service supabase-realtime (WebSockets RLS mode)]] - `implements` [EXTRACTED]
- [[Service supabase-rest (PostgREST v12.2.0 auto-REST API)]] - `implements` [EXTRACTED]
- [[Service supabase-studio (Admin UI port 8323)]] - `implements` [EXTRACTED]
- [[Service vendor-admin (Astro + React + Alpine.js, port 5174)]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Docker__Infrastructure_Config