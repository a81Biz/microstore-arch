# Tasks — PT-003: Edge Function Tests (Phase 1)

## PT-003.1 — Read manage-orders/index.ts (architecture review)

**Objective:** Understand manage-orders routes and method signatures before writing tests.  
**Inputs:** `src/supabase/functions/manage-orders/index.ts`  
**Outputs:** List of routes and their expected inputs/outputs documented in design.md  
**Validation:** All routes identified  
**Status:** PENDING

---

## PT-003.2 — Write create-order tests (RED)

**Objective:** Write failing tests for create-order before touching implementation.  
**Inputs:** `src/supabase/functions/create-order/index.ts`, project test pattern  
**Outputs:** `src/supabase/functions/create-order/__tests__/create-order.test.ts`  
Test cases:
- Valid order payload → 201 with orderId + payment data
- Invalid payload (missing items) → 422
- Payment gateway disabled → 400 GATEWAY_DISABLED
- Rate limit exceeded → 429
- INSUFFICIENT_STOCK from RPC → 400

**Validation:** `vitest run` shows tests exist (may fail — tests are RED at this step)  
**Status:** PENDING

---

## PT-003.3 — Write login tests (RED)

**Objective:** Write failing tests for login flow.  
**Inputs:** `src/supabase/functions/login/index.ts` (uses raw serve(), not BaseController)  
**Outputs:** `src/supabase/functions/login/__tests__/login.test.ts`  
Test cases:
- Valid credentials + CUSTOMER role → 200 with access_token
- Valid credentials + VENDOR role + totp_enabled=true → 200 with next_step='verify_totp'
- Valid credentials + VENDOR role + no TOTP → 200 with next_step='setup_totp'
- Invalid password → 401
- Rate limited → 429

**Validation:** Tests file created, vitest can find it  
**Status:** PENDING

---

## PT-003.4 — Write manage-orders tests (RED)

**Objective:** Write failing tests for manage-orders routes.  
**Inputs:** `src/supabase/functions/manage-orders/index.ts`  
**Outputs:** `src/supabase/functions/manage-orders/__tests__/manage-orders.test.ts`  
Test cases:
- GET /manage-orders → 200 with order list
- GET /manage-orders/:id → 200 with single order
- PATCH /manage-orders/:id/status → 200 (valid transition)
- PATCH /manage-orders/:id/status with invalid status → 400
- Unauthenticated request → 401

**Validation:** Tests file created  
**Status:** PENDING

---

## PT-003.5 — Make tests GREEN (if possible with mocks)

**Objective:** Ensure tests pass with the mock setup. Tests that require live DB may be skipped with `it.skip()` and documented.  
**Inputs:** All 3 test files from PT-003.2–004  
**Outputs:** Tests passing or explicitly skipped with documented reason  
**Validation:** `vitest run` exits 0, no unexpected failures  
**Status:** PENDING
