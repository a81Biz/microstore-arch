---
source_file: "supabase/migrations/00018_fix_payment_encryption.sql"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# Function: save_payment_credentials (pgcrypto AES-256 v1)

## Connections
- [[Function save_payment_credentials (final, no updated last_rotated_at)]] - `semantically_similar_to` [INFERRED]
- [[GUC app.settings.encryption_key (PostgreSQL runtime setting)]] - `references` [EXTRACTED]
- [[Migration 00018 Fix Payment Encryption (pgsodium → pgcrypto)]] - `implements` [EXTRACTED]
- [[Pattern pgp_sym_encrypt AES-256 with IV embedded]] - `implements` [EXTRACTED]
- [[Table payment_credentials (encrypted gateway credentials)]] - `calls` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations