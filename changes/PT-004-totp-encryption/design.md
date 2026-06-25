# Design — PT-004: TOTP Secret Encryption

**PT:** PT-004 | **Type:** BUG STANDARD | **Date:** 2026-06-24

---

## Root Cause (from DISCOVERY.md)

`profiles.totp_secret TEXT` — TOTP seeds stored in plaintext. `payment_gateways.credentials BYTEA` uses pgcrypto AES-256. Inconsistency creates a lower-security tier for authentication secrets than for payment credentials — security regression.

## Architecture Decision

**Use pgcrypto `pgp_sym_encrypt`/`pgp_sym_decrypt`, same as payment_gateways pattern (migration 00028).**

### Migration Strategy (00038_encrypt_totp_secret.sql)

```sql
-- 1. Add encrypted column
ALTER TABLE profiles ADD COLUMN totp_secret_enc BYTEA;

-- 2. Migrate existing data (encrypt any non-null values)
UPDATE profiles 
SET totp_secret_enc = pgp_sym_encrypt(
  totp_secret, 
  current_setting('app.settings.encryption_key')
)
WHERE totp_secret IS NOT NULL;

-- 3. Drop old plaintext column  
ALTER TABLE profiles DROP COLUMN totp_secret;

-- 4. Rename encrypted column
ALTER TABLE profiles RENAME COLUMN totp_secret_enc TO totp_secret;
```

After migration: `profiles.totp_secret` is BYTEA (encrypted), not TEXT.

### Read/Write Pattern

**Write** (setup-totp): use `pgp_sym_encrypt(secret, key)` before insert.  
**Read** (confirm-totp, verify-totp): use a new RPC `get_totp_secret(p_user_id UUID)` that decrypts server-side, consistent with `get_payment_credentials` RPC pattern.

OR: use `pgp_sym_decrypt(totp_secret::bytea, key)` inline in the Edge Function, passing `ENCRYPTION_KEY` env var.

**Decision**: Use inline decryption in Edge Function (simpler than new RPC, fewer DB roundtrips).

## Deployment Order (critical)

1. Deploy migration 00038 first.  
2. Deploy updated Edge Functions (setup-totp, confirm-totp, verify-totp) second.

If Edge Functions deploy before migration: `totp_secret` is still TEXT → new code reading it as BYTEA fails.  
If migration deploys before Edge Functions: old functions read from renamed column that still works (TEXT→BYTEA, old functions don't know the difference — they would fail).

**Actual safe order**: Migration first. Once `profiles.totp_secret` is BYTEA and encrypted:
- Old function tries to read `totp_secret` as TEXT → gets BYTEA bytes as a string → TOTP fails for enrolled users.
- This is a brief gap (seconds during deploy) → acceptable for dev, requires maintenance window for prod.

**Mitigation**: Deploy migration + functions as a single atomic Supabase deploy (functions + migrations together in deploy.yml — already how the CI pipeline works).

## Risk Assessment

- **Data integrity**: UPDATE statement migrates all non-null TOTP secrets. NULL values remain NULL (un-enrolled users unaffected).
- **Encryption key**: `ENCRYPTION_KEY` env var must be set on Supabase project settings before migration runs.
- **Rollback**: If migration fails midway, the old `totp_secret TEXT` column is still present (ADD fails, not DROP yet). Safe rollback.
- **Existing enrolled users**: After migration, they can still authenticate because data is migrated atomically in the UPDATE.
