# Design — PT-003: Edge Function Tests (Phase 1 — Critical Flows)

**PT:** PT-003 | **Type:** BUG MAJOR | **Date:** 2026-06-24

---

## Scope of This PT (Phase 1 of 3)

This PT covers 3 new test files for the 3 highest-risk Edge Functions:
1. `create-order/__tests__/create-order.test.ts`
2. `login/__tests__/login.test.ts`
3. `manage-orders/__tests__/manage-orders.test.ts`

Phase 2 (separate PT): `manage-addresses`, `change-password`, `confirm-totp`  
Phase 3 (separate PT): `payment-webhook` integration tests, remaining functions

## Test Pattern (from existing codebase)

Existing tests (manage-products, payment-webhook, setup-totp) use vitest with `vi.fn().mockResolvedValue` for `global.fetch` and for Supabase client methods. This is a **mock-based** unit test approach — not true integration tests.

This pattern is accepted (see PT-010 implementation) and will be used consistently.

## Architecture Decision: Where to Mock

For Edge Functions using BaseController, the injection points are:
- `this.dbAdmin` (SupabaseClient) — mock specific `.from().select().eq().single()` chains
- `this.authenticateUser(auth)` — mock to return a fake user object
- `global.fetch` — mock for payment gateway API calls

For `login/index.ts` specifically:
- `login` does NOT use BaseController — it uses raw `serve()` + manual `createClient()`
- Must mock `supabaseClient.auth.signInWithPassword` and `supabaseAdmin.from('profiles').select()`

## Mocking Strategy

Since Deno Edge Functions can't be imported directly into vitest (vitest runs in Node, Deno functions use Deno-specific APIs), the test strategy is:

**Option A** (chosen): Test the HTTP handler via mock global.fetch — same as existing tests. The test doesn't import the function directly; it calls `fetch()` which is mocked to simulate the function's response.

This is the established pattern. Tests verify the contract (input → output HTTP response), not the implementation.

**Key constraint**: Tests run in Node/vitest, NOT in Deno. They test the HTTP interface via mocked fetch, not internal function logic.

## Risk Acknowledgment (MAJOR — mandatory)

| Risk | Severity | Mitigation |
|:---|:---|:---|
| Mocks don't reflect real Supabase behavior | MEDIUM | Document limitation in test files |
| create-order test can't test actual stock locking | HIGH | Document as PE-001 dependency |
| login test uses mocked auth — real auth bugs won't be caught | MEDIUM | Integration tests planned for Phase 3 |
| Test file added to login/ which doesn't use BaseController | LOW | Different mock setup, documented |

## File Structure

```
src/supabase/functions/
  create-order/__tests__/create-order.test.ts   (NEW)
  login/__tests__/login.test.ts                 (NEW)
  manage-orders/__tests__/manage-orders.test.ts (NEW)
```
