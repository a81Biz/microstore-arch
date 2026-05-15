---
type: community
cohesion: 0.10
members: 21
---

# Kong, Nginx & Supabase Config

**Cohesion:** 0.10 - loosely connected
**Members:** 21 nodes

## Members
- [[Client Hub Order Detail Page with Timeline]] - code - docs/Sprint 4.md
- [[Client Hub Orders List Page]] - code - docs/Sprint 4.md
- [[Client Hub order-client.ts Library]] - code - docs/Sprint 4.md
- [[Kong API Gateway Config (kong.yml)]] - code - supabase/kong.yml
- [[Kong Service auth-v1 (authv1 → supabase-auth9999)]] - rationale - supabase/kong.yml
- [[Kong Service functions-v1 (functionsv1 → supabase-functions9000)]] - rationale - supabase/kong.yml
- [[Kong Service realtime-v1 (realtimev1 → supabase-realtime4000)]] - rationale - supabase/kong.yml
- [[Kong Service rest-v1 (restv1 → supabase-rest3000)]] - rationale - supabase/kong.yml
- [[Nginx Upstream client-hub5173]] - rationale - nginx/conf.d/microstore.conf
- [[Nginx Upstream storefront4321]] - rationale - nginx/conf.d/microstore.conf
- [[Nginx Upstream supabase-kong8000]] - rationale - nginx/conf.d/microstore.conf
- [[Nginx Upstream vendor-admin5174]] - rationale - nginx/conf.d/microstore.conf
- [[Nginx microstore.conf (subdomain routing)]] - code - nginx/conf.d/microstore.conf
- [[Nginx nginx.conf (main config with WebSocket map)]] - code - nginx/nginx.conf
- [[OrderTimeline Component (React)]] - code - docs/Sprint 4.md
- [[SDD Client Hub UI Design]] - document - docs/Documento de Diseño de Software (SDD).md
- [[Supabase Auth Config (JWT, OAuth, redirect URLs)]] - rationale - supabase/config.toml
- [[Supabase Google OAuth Config]] - rationale - supabase/config.toml
- [[Supabase Local Config (config.toml)]] - code - supabase/config.toml
- [[Supabase Realtime Enabled (IPv6)]] - rationale - supabase/config.toml
- [[Supabase Realtime Order Updates Subscription]] - code - docs/Sprint 4.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Kong_Nginx__Supabase_Config
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_DevOps & Sprint Documentation]]

## Top bridge nodes
- [[Kong Service functions-v1 (functionsv1 → supabase-functions9000)]] - degree 2, connects to 1 community