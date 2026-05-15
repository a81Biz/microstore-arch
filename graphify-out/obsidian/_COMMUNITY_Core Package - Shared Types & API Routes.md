---
type: community
cohesion: 0.08
members: 36
---

# Core Package - Shared Types & API Routes

**Cohesion:** 0.08 - loosely connected
**Members:** 36 nodes

## Members
- [[@micro-storecore Package]] - code - packages/core
- [[@micro-storeeslint-config Package]] - code - packages/config-eslint/package.json
- [[API_ROUTES (core)]] - code - packages/core
- [[Architecture Rule Checker Script]] - code - scripts/check-architecture.sh
- [[Astro Islands Pattern]] - rationale - apps/client-hub/astro.config.mjs
- [[Core Package Entry Point]] - code - packages/core/src/index.ts
- [[Core TypeScript Config]] - code - packages/core/tsconfig.json
- [[Dockerfile.astro (Multi-App Base Image)]] - code - docker/Dockerfile.astro
- [[Enums Barrel Export]] - code - packages/core/src/enums/index.ts
- [[ItemFulfillmentStatus Enum]] - code - packages/core/src/enums/fulfillment-status.ts
- [[Models Barrel Export]] - code - packages/core/src/models/index.ts
- [[NPM Workspaces Monorepo]] - rationale - package.json
- [[Order & OrderItem Interfaces]] - code - packages/core/src/models/order.ts
- [[Order Zod Schemas (ShippingAddress, CreateOrderPayload, OrderTracking)]] - code - packages/core/src/schemas/order.schema.ts
- [[OrderStatus Enum]] - code - packages/core/src/enums/order-status.ts
- [[OrderStatus Enum (core)]] - code - packages/core
- [[PaymentGateway Enum]] - code - packages/core/src/enums/payment-gateway.ts
- [[Product Interface]] - code - packages/core/src/models/product.ts
- [[Root package.json (Monorepo)]] - code - package.json
- [[Schemas Barrel Export]] - code - packages/core/src/schemas/index.ts
- [[Security Fixes Verification Script]] - code - scripts/verify-fixes.sh
- [[UserProfile Interface]] - code - packages/core/src/models/user.ts
- [[UserRole Enum]] - code - packages/core/src/enums/user-role.ts
- [[Utils Barrel Export]] - code - packages/core/src/utils/index.ts
- [[Vendor Admin Package JSON]] - code - apps/vendor-admin/package.json
- [[calculateOrderStatus Utility]] - code - packages/core/src/utils/order-status-calculator.ts
- [[client-hub Astro Config]] - code - apps/client-hub/astro.config.mjs
- [[client-hub package.json]] - code - apps/client-hub/package.json
- [[getStockBadge Utility]] - code - packages/core/src/utils/stock-utils.ts
- [[index.ts_1]] - code - packages/core/src/enums/index.ts
- [[index.ts]] - code - packages/core/src/index.ts
- [[index.ts_2]] - code - packages/core/src/models/index.ts
- [[index.ts_3]] - code - packages/core/src/schemas/index.ts
- [[index.ts_4]] - code - packages/core/src/utils/index.ts
- [[storefront Astro Config]] - code - apps/storefront/astro.config.mjs
- [[storefront package.json]] - code - apps/storefront/package.json

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Core_Package_-_Shared_Types__API_Routes
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_Client Hub - Design Concepts & Sprint 4]]
- 1 edge to [[_COMMUNITY_Module 24 - scripts_security_check_secur]]
- 1 edge to [[_COMMUNITY_TypeScript Config (Root)]]

## Top bridge nodes
- [[API_ROUTES (core)]] - degree 6, connects to 1 community
- [[Root package.json (Monorepo)]] - degree 5, connects to 1 community
- [[Architecture Rule Checker Script]] - degree 4, connects to 1 community
- [[OrderStatus Enum (core)]] - degree 2, connects to 1 community