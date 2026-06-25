# Tasks — PT-005: vendor_whitelist Enforcement in Login

## PT-005.1 — Write pre-deploy seeding migration 00039

**Objective:** Seed whitelist with all existing vendor emails BEFORE the login function changes.  
**Inputs:** `src/supabase/migrations/00021_vendor_whitelist.sql` (schema reference)  
**Outputs:** `src/supabase/migrations/00039_seed_vendor_whitelist.sql`  
Content:
```sql
INSERT INTO vendor_whitelist (email)
SELECT u.email FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE p.role = 'vendor'
ON CONFLICT DO NOTHING;
```
**Validation:** Migration file exists and is syntactically valid  
**Status:** PENDING

---

## PT-005.2 — Write login test (RED) — whitelist scenarios

**Objective:** Write failing tests for the whitelist enforcement before implementing.  
**Inputs:** `src/supabase/functions/login/index.ts`, `src/supabase/functions/login/__tests__/login.test.ts` (created in PT-003.3)  
**Outputs:** New test cases in login/__tests__/login.test.ts:
- VENDOR email in whitelist → 200
- VENDOR email NOT in whitelist → 403 VENDOR_NOT_AUTHORIZED
- VENDOR email, DB error on whitelist check → 403 (fail-closed)
- CUSTOMER email → 200 (whitelist check skipped)

**Validation:** Tests exist and are RED (fail) before PT-005.3  
**Status:** PENDING

---

## PT-005.3 — Implement whitelist check in login/index.ts

**Objective:** Add vendor_whitelist query after profile fetch, before TOTP/password-change flow.  
**Inputs:** `src/supabase/functions/login/index.ts`  
**Outputs:** Modified login/index.ts with whitelist enforcement  
Implementation:
```typescript
if (profile.role === 'vendor') {
  const { data: whitelisted, error: wlError } = await supabaseAdmin
    .from('vendor_whitelist')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (wlError || !whitelisted) {
    logger.warn('Vendor not in whitelist', { email, ip });
    throw new BusinessError('VENDOR_NOT_AUTHORIZED', 
      'Tu cuenta de vendedor no está autorizada. Contacta al administrador.', 403);
  }
}
```
**Validation:** Login tests go GREEN  
**Status:** PENDING

---

## PT-005.4 — Verify CUSTOMER/ADMIN login unaffected

**Objective:** Confirm whitelist check is only triggered for vendor role.  
**Inputs:** Login function + test suite  
**Outputs:** All non-vendor test scenarios still passing  
**Validation:** TS-005.4 (CUSTOMER login, no whitelist query)  
**Status:** PENDING
