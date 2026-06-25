# Tasks — PT-004: TOTP Secret Encryption

## PT-004.1 — Read setup-totp and verify-totp functions

**Objective:** Understand exact read/write paths for totp_secret before modifying.  
**Inputs:** `src/supabase/functions/setup-totp/index.ts`, `src/supabase/functions/verify-totp/index.ts`, `src/supabase/functions/confirm-totp/index.ts`  
**Outputs:** Confirmed list of all places that read/write profiles.totp_secret  
**Validation:** All DB interactions with totp_secret identified  
**Status:** PENDING

---

## PT-004.2 — Write migration 00038_encrypt_totp_secret.sql

**Objective:** Create migration that adds encrypted column, migrates data, drops old column, renames.  
**Inputs:** Migration pattern from 00028_save_credentials_with_key.sql  
**Outputs:** `src/supabase/migrations/00038_encrypt_totp_secret.sql`  
**Validation:** Migration is syntactically correct SQL; all 4 steps present  
**Status:** PENDING

---

## PT-004.3 — Update setup-totp: encrypt on write

**Objective:** Change INSERT/UPDATE of totp_secret to use pgp_sym_encrypt.  
**Inputs:** `src/supabase/functions/setup-totp/index.ts` (identified in PT-004.1)  
**Outputs:** Modified setup-totp/index.ts writing encrypted BYTEA  
**Validation:** Test scenario TS-004.1 (setup-totp writes encrypted value)  
**Status:** PENDING

---

## PT-004.4 — Update confirm-totp and verify-totp: decrypt on read

**Objective:** Change SELECT of totp_secret to decrypt before TOTP verification.  
**Inputs:** `src/supabase/functions/confirm-totp/index.ts`, `src/supabase/functions/verify-totp/index.ts`  
**Outputs:** Modified functions reading `pgp_sym_decrypt(totp_secret, key)::text`  
**Validation:** Test scenario TS-004.2 (TOTP verification still works)  
**Status:** PENDING

---

## PT-004.5 — Verify setup-totp existing tests still pass

**Objective:** Confirm PT does not break existing `setup-totp/__tests__/` tests.  
**Inputs:** `src/supabase/functions/setup-totp/__tests__/`  
**Outputs:** Test run output showing 0 failures  
**Validation:** `vitest run` → existing setup-totp tests PASS  
**Status:** PENDING
