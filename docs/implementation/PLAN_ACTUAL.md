# PLAN_ACTUAL.md — STATE 2: Classification & Strategy
# 6 PTs pending STATE 2 ACK: PT-001, PT-002, PT-003, PT-004, PT-005, PT-009
# Generated: 2026-06-24

---

## PT-001 — BUG STANDARD: Fix check-architecture.sh False Positives

**Objective:** Make `check-architecture.sh` exit 0 on a clean codebase by excluding build artifacts and adding narrow exemptions for legitimate HTML-in-.ts email template functions.

**Proposed Solution:**
1. Add `--exclude-dir='.astro'` and `--exclude-dir='node_modules'` to all grep calls in the script to prevent matching build output.
2. Add `--exclude-dir='send-order-email' --exclude-dir='send-shipping-email' --exclude-dir='send-delivery-email' --exclude-dir='send-status-email'` to the Rule 1 grep (no HTML in .ts), since these functions legitimately generate HTML email templates.
3. Verify with `bash src/scripts/check-architecture.sh` → EXIT 0.

**Alternatives Considered:**
- Rewrite the script in TypeScript/Node: more maintainable but out of scope for STANDARD fix.
- Move email templates to .html files: architectural change that touches 4 functions, out of scope.
- Add per-file `# check:skip` annotations: non-standard, less maintainable.

**Rejected Alternatives:**
- Skip CI check: violates Convention RULE-01 (CI-enforced architecture rules must pass).

**Dependencies:** 
- PT-007 ✅ (inline styles removed) — Rule 2 violations in source are now real 0.

**Risks:**
- LOW: Shell script change. If exclusion patterns are too broad, could suppress real violations. Mitigation: test with deliberately bad files to verify the script still catches real violations.

**Constraints:**
- RULE-01: The script must continue to catch all 5 architecture violations in real source code.
- Must not add `--no-verify` to CI — fix the root cause.

**Success Criteria:**
`bash src/scripts/check-architecture.sh` → EXIT 0.  
Deliberately added inline style in a .astro file → script catches it (regression test).

**Regression Analysis:**
- Impact: Only `check-architecture.sh`. No app code changes.
- Risk of introducing blind spot: LOW — exclusions are narrow (specific function directories, build output dirs).
- CI will go from failing to passing → unlocks H-001 resolution.

---

## PT-002 — BUG STANDARD: @micro-store/core — Write Real Tests

**Objective:** Write meaningful tests for the core package so CI runs tests with actual coverage (not just exiting with `--passWithNoTests`). Remove the false-positive EXIT 0 from `npm run test:core`.

**Proposed Solution:**
Write tests covering:
1. **Zod schemas** (`order.schema.ts`, `product.schema.ts`): validation of valid/invalid payloads (required fields, type coercion, error messages).
2. **Enums** (`OrderStatus`, `ItemFulfillmentStatus`, `PaymentGateway`, `UserRole`): existence and value checks.
3. **Utility functions** (whatever exists in `src/utils/`): basic input/output contracts.

Files to create:
- `src/packages/core/src/schemas/__tests__/order.schema.test.ts`
- `src/packages/core/src/schemas/__tests__/product.schema.test.ts`
- `src/packages/core/src/enums/__tests__/enums.test.ts`

After writing tests, evaluate removing `--passWithNoTests` from the test script.

**Alternatives Considered:**
- Remove `--passWithNoTests` without adding tests: would make CI fail, not fix the root cause.
- Add integration tests requiring Supabase: out of scope — core is pure TS with no external deps.

**Rejected Alternatives:**
- Keep `--passWithNoTests` permanently: H-002 is an ongoing false-positive risk.

**Dependencies:**
- PT-006 ✅ (vitest 3.2.6 installed) — tests will run on the fixed vitest version.

**Risks:**
- LOW: Writing tests does not change production code.
- If schemas have incorrect validation logic, tests will expose it (desired).

**Constraints:**
- Core package purity: tests must not import from astro, react, or supabase.
- Vitest is the only test runner (already configured).

**Success Criteria:**
`npm run test:core` reports N tests executed (N ≥ 5), all PASS.  
No `--passWithNoTests` silent exit.

**Regression Analysis:**
- No production code modified — zero regression risk.
- CI test step will now actually run and could fail if schemas have bugs. That is the desired behavior.

---

## PT-003 — BUG MAJOR: Edge Function Test Coverage (Progressive Plan)

**Objective:** Establish automated test coverage for Edge Functions starting with the highest-risk flows: `create-order`, `login`, and `manage-orders`. Target: 5 of 22 functions tested (up from 3/22) by end of this PT.

**Proposed Solution (prioritized):**
Phase 1 (this PT — STANDARD scope boundary):
1. `create-order/__tests__/create-order.test.ts` — test: valid order payload, stock check failure, gateway-disabled failure, rate limit exceeded.
2. `login/__tests__/login.test.ts` — test: valid login, wrong password, MFA required path, unknown user.
3. `manage-orders/__tests__/manage-orders.test.ts` — test: list orders, update status, invalid status transition.

Pattern: Same as existing tests (vitest + `vi.fn().mockResolvedValue` for Supabase client and fetch).

Phase 2 (separate PT): manage-addresses, change-password, confirm-totp.  
Phase 3 (separate PT): payment-webhook integration tests (more complex due to idempotency).

**Alternatives Considered:**
- Full coverage in one PT (all 19 functions): effort L/XL, would require 3+ sprints. MAJOR risk of incomplete delivery.
- Integration tests with live Supabase: better quality but requires PE-001 resolved (no live DB currently).
- E2E tests (Playwright): correct layer for UI, wrong layer for Edge Function logic.

**Rejected Alternatives:**
- Skip tests entirely: H-003 is rated 9 ALTO, highest risk after H-001.

**Dependencies:**
- PT-006 ✅ (vitest 3.2.6)
- PE-001 (no live DB): tests must use mocks — this is a constraint, not a blocker.

**Risks:**
- MEDIUM: Test pattern requires mocking Supabase client deeply. If BaseController internals change, mocks break.
- MAJOR risk: `create-order` tests mock payment gateway calls — real gateway behavior not covered.
- Mitigation: Document mock limitations in test files. Plan Phase 2 for integration tests when PE-001 resolved.

**Constraints:**
- Deno test files in `__tests__/` must use vitest (not Deno.test) — project pattern.
- No live network calls in tests.
- Must not change Edge Function implementation code in this PT (test-only changes).

**Success Criteria:**
3 new `__tests__/` directories with ≥3 test cases each.  
`npm run test --workspaces --if-present` → 0 failures.  
Coverage: `create-order`, `login`, `manage-orders` have at least 1 passing test each.

**Regression Analysis (MAJOR — mandatory):**
- **create-order tests**: Tests are additive (new files). Zero risk to existing create-order logic.
- **login tests**: Additive only.
- **Downstream systems**: No Edge Function code modified → Stripe, PayPal, MercadoPago integrations untouched.
- **DB schema**: No migrations. No data changes.
- **Affected workflows**: None — tests are isolated with mocks.
- **Breaking risk**: LOW (tests fail → CI red, but no production regression).
- **Rollback**: Delete test files. Trivial.

---

## PT-004 — BUG STANDARD: TOTP Secret Encryption

**Objective:** Encrypt `profiles.totp_secret` at column level using pgcrypto (AES-256, same as payment_gateways.credentials), eliminating plaintext TOTP seed exposure in database backups.

**Proposed Solution:**
1. **Migration (new `00038_encrypt_totp_secret.sql`)**:
   - Add new column `totp_secret_enc BYTEA` to profiles table.
   - Migrate existing data: `UPDATE profiles SET totp_secret_enc = pgp_sym_encrypt(totp_secret, current_setting('app.settings.encryption_key')) WHERE totp_secret IS NOT NULL`.
   - Drop old `totp_secret TEXT` column.
   - Rename `totp_secret_enc → totp_secret` (keep column name for minimal code change).
   - Alternative: change type in place is not possible in Postgres without rename dance.

2. **Edge Function updates**:
   - `setup-totp/index.ts`: change `INSERT INTO profiles (totp_secret)` → `INSERT INTO profiles (totp_secret) VALUES (pgp_sym_encrypt(...))` or use RPC.
   - `confirm-totp/index.ts`, `verify-totp/index.ts`: change read path from `SELECT totp_secret TEXT` → decrypt with `pgp_sym_decrypt`.

3. **Use existing RPC pattern**: check if `get_payment_credentials` RPC decrypts via pgcrypto. If a similar pattern exists for TOTP, use it. Otherwise, add a `get_totp_secret(p_user_id UUID)` RPC that handles decryption server-side.

**Alternatives Considered:**
- Encrypt at application level (in Edge Function before INSERT): equivalent security, avoids DB migration complexity, but inconsistent with existing pattern.
- Use vault extension (Supabase Vault): cleaner API but requires enabling a new extension — infrastructure change.
- Accept risk: plaintext TOTP is a security regression vs payment credentials — unacceptable inconsistency.

**Rejected Alternatives:**
- Vault extension: would be correct long-term but requires separate PT for extension activation and policy setup.

**Dependencies:**
- Supabase pgcrypto extension is already enabled (used by payment_gateways table — migration 00028).
- `ENCRYPTION_KEY` env var already exists in .env.example.
- Must check if `setup-totp/__tests__/` tests break after column type change.

**Risks:**
- MEDIUM: Migration renames column → if any code queries `profiles.totp_secret` directly (not via RPC), it breaks.
- Migration on existing data: if `totp_secret` is NULL for some rows, encrypt NULL safely (WHERE clause handles).
- DEPLOYMENT ORDER: Migration must deploy BEFORE Edge Function code. If reversed, Edge Functions fail.

**Constraints:**
- Deployment must be atomic: migration + function update in same deploy.
- Cannot break `setup-totp/__tests__/` existing tests.
- Must preserve TOTP functionality for existing enrolled users (data migration must be lossless).

**Success Criteria:**
`profiles.totp_secret` column is BYTEA (not TEXT).  
Existing TOTP enrolled users can still authenticate.  
`pg_dump profiles` does not expose readable TOTP seeds.

**Regression Analysis:**
- **Affected functions**: setup-totp, confirm-totp, verify-totp — 3 Edge Functions.
- **Breaking risk if deploy order wrong**: HIGH — mitigated by deployment sequencing rule in constraints.
- **Data integrity**: Existing TOTP records migrated in migration script (not post-deploy). If migration fails, column stays TEXT (rollback safe).
- **Auth flow**: Users who have enrolled TOTP will still authenticate — decryption path replaces direct TEXT read.

---

## PT-005 — FEATURE STANDARD: vendor_whitelist Enforcement in Login

**Objective:** Enforce the `vendor_whitelist` table in the login Edge Function so that only explicitly whitelisted vendors can complete authentication, preventing unauthorized vendor access.

**Proposed Solution:**
In `login/index.ts`, after confirming `user.role === 'VENDOR'`:
```typescript
// After role check, before issuing session:
const { data: whitelisted } = await this.dbAdmin
  .from('vendor_whitelist')
  .select('vendor_id')
  .eq('vendor_id', user.vendor_id)
  .eq('is_active', true)
  .single();

if (!whitelisted) {
  throw new BusinessError('VENDOR_NOT_AUTHORIZED',
    'Tu cuenta de vendedor no está autorizada. Contacta al administrador.', 403);
}
```

The check must occur:
- Only for users with `role = 'VENDOR'`
- After MFA verification (if required for vendor role — check MFA flow)
- Before session token issuance

**Alternatives Considered:**
- DB-level RLS policy that rejects vendor login: would work but login Edge Function uses service role key (bypasses RLS). Not viable.
- Trigger on `auth.users` table: more complex, less visible, harder to debug.
- CRON job that revokes sessions of non-whitelisted vendors: reactive (not preventive).

**Rejected Alternatives:**
- Trust role-only without whitelist: existing behavior that H-010 identified as a security gap.

**Dependencies:**
- `vendor_whitelist` table exists (migration 00021) with at minimum `vendor_id` and `is_active` columns.
- Must verify actual column names before implementing.

**Risks:**
- HIGH: If `vendor_whitelist` is empty and enforcement is added, ALL vendors are immediately locked out.
  - **Mitigation**: Verify vendor_whitelist has entries BEFORE deploying, or add a seeding migration.
- MEDIUM: If `vendor_id` on user profile is NULL for some vendor users, check will fail unexpectedly.

**Constraints:**
- Must not affect CUSTOMER or ADMIN role login flows.
- Whitelist check must fail-closed (if DB error → deny login, not allow).
- An admin migration to pre-populate whitelist with existing vendors is required before deploy.

**Success Criteria:**
- `POST /login` with VENDOR role + not in whitelist → 403 VENDOR_NOT_AUTHORIZED.
- `POST /login` with VENDOR role + in whitelist + is_active=true → 200 (normal flow).
- `POST /login` with CUSTOMER role → unaffected.
- `POST /login` with ADMIN role → unaffected.

**Regression Analysis:**
- **Customer login**: Not affected — check is role-gated to VENDOR only.
- **Admin login**: Not affected.
- **Existing vendor users**: AT RISK if not in whitelist — requires pre-deploy migration to populate whitelist.
- **Vendor MFA flow**: Must verify whitelist check placement relative to MFA gate — check must happen at correct point in flow.
- **CI**: New test in login/__tests__/login.test.ts (PT-003 will create this file — coordinate).

---

## PT-009 — FEATURE STANDARD: Business Metrics to Logflare

**Objective:** Instrument `create-order` and `payment-webhook` with structured business metric events so that order success/failure rates and payment gateway performance are queryable in Logflare.

**Proposed Solution:**
Add metric-log calls to `_shared/logger.ts` as a `metric()` method (or use `info()` with structured fields):
```typescript
logger.metric('order.created', {
  userId, orderId, gateway, totalAmount, currency,
  durationMs: Date.now() - startTime
});

logger.metric('order.failed', {
  userId, errorCode, gateway, durationMs
});

logger.metric('payment.webhook.processed', {
  gateway, event, orderId, durationMs, idempotencyKey
});
```

Implementation:
1. Add `metric(event: string, data: Record<string, unknown>): void` to logger.ts (wraps `info()` with `type: 'metric'` field for Logflare filtering).
2. Instrument `create-order/index.ts`: add metric at success path and at each BusinessError throw.
3. Instrument `payment-webhook/index.ts`: add metric on each webhook event processed.

**Alternatives Considered:**
- Prometheus/Grafana integration: requires external infrastructure — over-engineered for current scale.
- DataDog custom metrics: cost, external dependency.
- Dedicated metrics service: separate PT — out of scope here.

**Rejected Alternatives:**
- No metrics: H-011 explicitly states D5 thresholds (Success Rate ≥95%) are not verifiable without metrics.

**Dependencies:**
- `_shared/logger.ts` and Logflare integration must be working (existing).
- PT-003 (Edge Function tests) is complementary but independent.

**Risks:**
- LOW: Metric calls are additive — existing functionality untouched.
- Logger.ts changes affect all functions that import it — verify no breaking change in signature.

**Constraints:**
- No external services added — Logflare is already the designated sink.
- Metric events must be distinguishable from regular logs (type field or structured key).
- Must not add latency to the critical order creation path (metric call must be async-fire-and-forget or synchronous but non-blocking).

**Success Criteria:**
Logflare receives events with type='metric' when create-order succeeds/fails.  
Logflare receives events with type='metric' on payment-webhook processing.  
Querying `SELECT * FROM logs WHERE type = 'metric' AND event = 'order.created'` returns rows.

**Regression Analysis:**
- **create-order**: Additive metric calls only. Payment gateway calls unchanged.
- **payment-webhook**: Additive metric calls only. Idempotency logic unchanged.
- **logger.ts**: New method added (backward-compatible). Existing callers unaffected.
- **D5 thresholds**: Once metrics flow, D5 becomes verifiable in S-002 audit.

---

## Summary

| PT | Complexity | Key Risk | Gate Before Code |
|:---|:---|:---|:---|
| PT-001 | STANDARD | Script over-exclusion | STATE 3 Proposal Package ACK |
| PT-002 | STANDARD | Schema bugs exposed by tests | STATE 3 ACK |
| PT-003 | MAJOR | Mock limitations / phase scope | STATE 3 ACK + risk review |
| PT-004 | STANDARD | Vendor lockout if whitelist empty | STATE 3 ACK + deployment order |
| PT-005 | STANDARD | TOTP migration lossless | STATE 3 ACK + migration review |
| PT-009 | STANDARD | logger.ts signature change | STATE 3 ACK |

**STOP — Waiting for STATE 2 ACK before STATE 3 Proposal Packages.**
