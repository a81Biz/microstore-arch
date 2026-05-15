---
source_file: "docker-compose.yml"
type: "code"
community: "Docker & Infrastructure Config"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Docker__Infrastructure_Config
---

# Service: db-migrate (applies all .sql migrations in order, runs once)

## Connections
- [[Service client-hub (Astro + React + Alpine.js, port 5173)]] - `references` [EXTRACTED]
- [[Service storefront (Astro + Alpine.js, port 4321)]] - `references` [EXTRACTED]
- [[Service supabase-auth (GoTrue v2.151.0, JWT + MFA)]] - `references` [EXTRACTED]
- [[Service supabase-db (PostgreSQL 15.8.1 with encryption_key GUC)]] - `references` [EXTRACTED]
- [[Service vendor-admin (Astro + React + Alpine.js, port 5174)]] - `references` [EXTRACTED]
- [[docker-compose.yml Full Local Development Stack]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Docker__Infrastructure_Config