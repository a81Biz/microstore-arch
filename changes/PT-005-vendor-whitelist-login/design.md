# Design — PT-005: vendor_whitelist Enforcement in Login

**PT:** PT-005 | **Type:** FEATURE STANDARD | **Date:** 2026-06-24

---

## Root Cause (from ENRICHMENT.md)

`login/index.ts` authenticates VENDOR role users without checking `vendor_whitelist`. Any Supabase user with `role='vendor'` (in profiles) can complete the login flow. The `vendor_whitelist` table (migration 00021) was never wired into the login function.

## Critical Schema Finding (from direct migration inspection)

**`vendor_whitelist` uses `email TEXT PRIMARY KEY`** — NOT `vendor_id`.  
Seed data: `INSERT INTO vendor_whitelist (email) VALUES ('admin@tienda.com')`.

This means:
- The whitelist check is by email (not vendor_id as originally assumed in STATE 2)
- `email` is available directly from the request body in `login/index.ts` (step 1)
- No need to join with profiles — the email from the login request IS the lookup key

## Implementation

In `login/index.ts`, add after rate limit check, before `supabaseClient.auth.signInWithPassword()`:

```typescript
// Pre-flight: reject unknown vendor emails before spending auth credits
if (body_email is vendor role) {
  // Problem: we don't know the role until after auth
}
```

Wait — the role is only known AFTER step 2 (profile query). So the check must happen AFTER step 2 (profile fetch), not before.

**Correct placement: after profile query (step 2), within the `profile.role === 'vendor'` block.**

```typescript
// After profile fetch, inside vendor role handling:
if (profile.role === 'vendor') {
  // PT-005: check vendor whitelist
  const { data: whitelisted } = await supabaseAdmin
    .from('vendor_whitelist')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();  // maybeSingle() returns null if not found (not .single() which throws)

  if (!whitelisted) {
    logger.warn('Vendor not in whitelist', { email, ip });
    throw new BusinessError(
      'VENDOR_NOT_AUTHORIZED',
      'Tu cuenta de vendedor no está autorizada. Contacta al administrador.',
      403
    );
  }
}
```

This check runs before steps 3, 4, 5 (password change, TOTP, TOTP setup) — appropriate placement.

## Pre-Deploy Requirement (HIGH RISK)

The `vendor_whitelist` table currently has ONE entry: `admin@tienda.com`.  
All other vendor emails WILL be rejected after deploy.

**Required before deployment**: Run a migration or manual INSERT to add all existing vendor user emails to the whitelist.

Proposed migration `00039_seed_vendor_whitelist.sql`:
```sql
-- Add all existing vendor users to whitelist
INSERT INTO vendor_whitelist (email)
SELECT email FROM auth.users 
WHERE id IN (
  SELECT id FROM profiles WHERE role = 'vendor'
)
ON CONFLICT DO NOTHING;
```

This migration must run BEFORE the Edge Function update. Include in tasks.

## Fail-Closed Behavior

If Supabase query fails (network error), `maybeSingle()` returns `{ data: null, error: ... }`.  
The code must treat error → deny. Add error check:

```typescript
const { data: whitelisted, error: wlError } = await supabaseAdmin...

if (wlError || !whitelisted) {
  logger.error('Vendor whitelist check failed', { email, error: wlError?.message });
  throw new BusinessError('VENDOR_NOT_AUTHORIZED', '...', 403);
}
```

Fail-closed: if DB can't be reached, VENDOR login is denied (security > availability).
