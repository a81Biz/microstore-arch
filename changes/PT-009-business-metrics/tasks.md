# Tasks — PT-009: Business Metrics to Logflare

## PT-009.1 — Read payment-webhook/index.ts

**Objective:** Understand webhook handler structure to identify correct instrumentation points.  
**Inputs:** `src/supabase/functions/payment-webhook/index.ts`  
**Outputs:** Identified success/failure paths in the file  
**Validation:** All instrumentation points documented  
**Status:** PENDING

---

## PT-009.2 — Add metric() method to _shared/logger.ts

**Objective:** Extend logger with a metric method that always sends to Logflare.  
**Inputs:** `src/supabase/functions/_shared/logger.ts`  
**Outputs:** Modified logger.ts with `metric(event, data)` method  
**Validation:** TypeScript compiles; existing callers unaffected (no signature changes)  
**Status:** PENDING

---

## PT-009.3 — Instrument create-order with metric calls

**Objective:** Add order.created and order.failed metric events with duration tracking.  
**Inputs:** `src/supabase/functions/create-order/index.ts`  
**Outputs:** Modified create-order/index.ts with:
- `const startTime = Date.now()` at handler start
- `logger.metric('order.created', {...})` before final Response
- `logger.metric('order.failed', {...})` in BusinessError catches  
**Validation:** TS-009.1 and TS-009.2 pass  
**Status:** PENDING

---

## PT-009.4 — Instrument payment-webhook with metric calls

**Objective:** Add payment.webhook.processed and payment.webhook.failed metric events.  
**Inputs:** `src/supabase/functions/payment-webhook/index.ts`  
**Outputs:** Modified payment-webhook/index.ts with metric instrumentation  
**Validation:** TS-009.3 and TS-009.4 pass  
**Status:** PENDING

---

## PT-009.5 — Verify existing payment-webhook tests still pass

**Objective:** Confirm additive metric calls don't break existing payment-webhook tests.  
**Inputs:** `src/supabase/functions/payment-webhook/__tests__/`  
**Outputs:** Test run output showing 0 failures  
**Validation:** All existing payment-webhook tests PASS  
**Status:** PENDING
