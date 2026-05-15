---
type: community
cohesion: 0.17
members: 20
---

# Client Hub - Design Concepts & Sprint 4

**Cohesion:** 0.17 - loosely connected
**Members:** 20 nodes

## Members
- [[Auth Callback Page]] - code - apps/client-hub/src/pages/auth/callback.astro
- [[Auth Client]] - code - apps/client-hub/src/lib/auth/auth-client.ts
- [[Auth Client Tests]] - code - apps/client-hub/src/lib/auth/__tests__/auth-client.test.ts
- [[Checkout Client]] - code - apps/client-hub/src/lib/checkout/checkout-client.ts
- [[Checkout Flow E2E Test]] - code - apps/client-hub/src/__tests__/e2e/checkout-flow.test.ts
- [[Checkout Page]] - code - apps/client-hub/src/pages/checkout/index.astro
- [[ClientHubLayout Astro]] - code - apps/client-hub/src/layouts/ClientHubLayout.astro
- [[Login Page]] - code - apps/client-hub/src/pages/auth/login.astro
- [[MFA  TOTP Authentication Flow]] - rationale - apps/client-hub/src/lib/auth/auth-client.ts
- [[Multi-Gateway Payment Support]] - rationale - apps/client-hub/src/lib/checkout/checkout-client.ts
- [[Order Client]] - code - apps/client-hub/src/lib/orders/order-client.ts
- [[Order Client Tests]] - code - apps/client-hub/src/lib/orders/__tests__/order-client.test.ts
- [[Order Detail Page]] - code - apps/client-hub/src/pages/orders/[id].astro
- [[Order Status Timeline Logic]] - rationale - apps/client-hub/src/lib/orders/order-client.ts
- [[Orders List Page]] - code - apps/client-hub/src/pages/orders/index.astro
- [[Profile Page]] - code - apps/client-hub/src/pages/profile/index.astro
- [[Register Page]] - code - apps/client-hub/src/pages/auth/register.astro
- [[Supabase Client (client-hub)]] - code - apps/client-hub/src/lib/supabase-client.ts
- [[Supabase Realtime Subscriptions]] - rationale - apps/client-hub/src/lib/orders/order-client.ts
- [[client-hub Index Page]] - code - apps/client-hub/src/pages/index.astro

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Client_Hub_-_Design_Concepts__Sprint_4
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_Core Package - Shared Types & API Routes]]

## Top bridge nodes
- [[Auth Client]] - degree 9, connects to 1 community
- [[Order Client]] - degree 7, connects to 1 community
- [[Checkout Client]] - degree 6, connects to 1 community