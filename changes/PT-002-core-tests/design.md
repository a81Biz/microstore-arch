# Design — PT-002: @micro-store/core Real Tests

**PT:** PT-002 | **Type:** BUG STANDARD | **Date:** 2026-06-24

---

## Root Cause (from DISCOVERY.md)

`src/packages/core/package.json` test script: `"vitest run --passWithNoTests"`.  
Zero test files exist → CI exits 0 silently. Core business logic has no automated verification.

## What Exists to Test

From glob inspection:
- **Schemas**: `order.schema.ts` (ShippingAddressSchema, CreateOrderPayloadSchema, OrderTrackingSchema)
- **Utils**: `order-status-calculator.ts` (calculateOrderStatus), `stock-utils.ts` (getStockBadge)
- **Enums**: OrderStatus, ItemFulfillmentStatus, PaymentGateway, UserRole

## Architecture Decision

**Write tests for business-logic-bearing code. Skip pure type definitions.**

Priority (highest value per line of test):
1. `calculateOrderStatus` — has 5 meaningful states, pure function, easy to test
2. `getStockBadge` — 4 branches (on-demand, out of stock, low stock, available)
3. `ShippingAddressSchema` + `CreateOrderPayloadSchema` — Zod validation with real error messages
4. Enum value integrity — guard against accidental value changes that would break DB queries

**Test file locations:**
```
src/packages/core/src/utils/__tests__/order-status-calculator.test.ts
src/packages/core/src/utils/__tests__/stock-utils.test.ts
src/packages/core/src/schemas/__tests__/order.schema.test.ts
```

**Do NOT remove `--passWithNoTests`** until tests are written and passing. Remove it as part of this PT's final task (PT-002.5).

## Design Constraints

- Tests must use vitest (already configured, now at 3.2.6 post-PT-006).
- Core package purity: no imports from astro, react, supabase, alpinejs.
- All tests must be pure unit tests — no external I/O, no mocks needed (pure functions).
- Test file naming: `*.test.ts` in `__tests__/` subdirectories (project convention).
