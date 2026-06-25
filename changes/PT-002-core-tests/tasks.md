# Tasks — PT-002: @micro-store/core Tests

## PT-002.1 — Write tests for calculateOrderStatus

**Objective:** Cover all 5 return paths of `calculateOrderStatus`.  
**Inputs:** `src/packages/core/src/utils/order-status-calculator.ts`  
**Outputs:** `src/packages/core/src/utils/__tests__/order-status-calculator.test.ts` (≥5 test cases)  
**Validation:** `npm run test:core` → 5+ PASS  
**Status:** PENDING

---

## PT-002.2 — Write tests for getStockBadge

**Objective:** Cover all 4 branches of `getStockBadge` (on-demand, zero stock, low stock ≤5, available).  
**Inputs:** `src/packages/core/src/utils/stock-utils.ts`  
**Outputs:** `src/packages/core/src/utils/__tests__/stock-utils.test.ts` (≥4 test cases)  
**Validation:** All 4 branches covered, correct variant/disabled values  
**Status:** PENDING

---

## PT-002.3 — Write tests for Zod schemas (order.schema.ts)

**Objective:** Verify schema validation accepts valid payloads and rejects invalid ones with correct error messages.  
**Inputs:** `src/packages/core/src/schemas/order.schema.ts`  
**Outputs:** `src/packages/core/src/schemas/__tests__/order.schema.test.ts` (≥6 test cases)  
**Validation:** Valid payload → success; missing field, wrong type, too-short string → Zod error with correct message  
**Status:** PENDING

---

## PT-002.4 — Write enum integrity tests

**Objective:** Guard against accidental enum value changes. One test per critical enum.  
**Inputs:** All enum files in `src/packages/core/src/enums/`  
**Outputs:** `src/packages/core/src/enums/__tests__/enums.test.ts` (≥4 test cases)  
**Validation:** Each enum has the expected string values (e.g., OrderStatus.PENDING === 'pending')  
**Status:** PENDING

---

## PT-002.5 — Remove --passWithNoTests from test script

**Objective:** Remove the false-positive escape hatch now that real tests exist.  
**Inputs:** `src/packages/core/package.json`  
**Outputs:** `"test": "vitest run"` (without --passWithNoTests)  
**Validation:** `npm run test:core` runs and reports N tests (not "no test files found")  
**Status:** PENDING
