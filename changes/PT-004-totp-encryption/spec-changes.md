# Spec Changes — PT-004

## 09-Security-Architecture.md
Update TOTP section: `profiles.totp_secret` is now BYTEA (pgcrypto AES-256), consistent with payment_gateways.credentials.

## 10-Technical-Debt.md
Update D3 entry: mark as RESUELTO (PT-004). Encryption now consistent with payment credentials.

## 07-Database-Architecture.md
Update profiles table schema: `totp_secret BYTEA NOT NULL` (was `TEXT`).
