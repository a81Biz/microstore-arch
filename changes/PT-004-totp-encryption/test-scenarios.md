# Test Scenarios — PT-004

## TS-004.1 — setup-totp writes encrypted BYTEA
**When:** TOTP setup completes for a user  
**Then:** `profiles.totp_secret` column contains BYTEA (not readable text)  
**Verify:** `SELECT pg_typeof(totp_secret) FROM profiles WHERE id = <user_id>` → 'bytea'

## TS-004.2 — confirm-totp / verify-totp can authenticate with encrypted secret
**When:** User has encrypted TOTP secret and submits valid TOTP code  
**Then:** Verification succeeds (same as before the migration)

## TS-004.3 — Existing enrolled users can still authenticate after migration
**When:** Migration 00038 runs on a DB with existing TOTP-enrolled users  
**Then:** Data migration (UPDATE) converts all existing TEXT secrets to BYTEA  
**Verify:** COUNT(*) of non-null totp_secret before == COUNT(*) of non-null totp_secret after

## TS-004.4 — Plaintext secret not visible in pg_dump backup
**When:** pg_dump of profiles table  
**Then:** totp_secret column contains binary/encrypted data, not base32 strings

## TS-004.5 — setup-totp/__tests__ existing tests still pass
**When:** PT-004 implementation is complete  
**Then:** All existing setup-totp tests pass without modification

## TS-004.6 — Migration rollback safety
**When:** Migration 00038 fails at step 3 (DROP COLUMN)  
**Then:** Profiles table still has old `totp_secret TEXT` column (no data loss)
