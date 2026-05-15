---
source_file: "supabase/migrations/00018_fix_payment_encryption.sql"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# Migration 00018: Fix Payment Encryption (pgsodium → pgcrypto)

## Connections
- [[Extension pgcrypto (AES-256 symmetric encryption)]] - `references` [EXTRACTED]
- [[Fix 3 Secure nonce via pgsodium.crypto_secretbox_noncegen()]] - `rationale_for` [INFERRED]
- [[Function save_payment_credentials (pgcrypto AES-256 v1)]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations