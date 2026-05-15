---
source_file: "supabase/migrations/00024_save_payment_credentials.sql"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# Function: save_payment_credentials (final, no updated last_rotated_at)

## Connections
- [[Function get_payment_credentials (decrypt AES-256, service_role restricted)]] - `semantically_similar_to` [INFERRED]
- [[Function save_payment_credentials (pgcrypto AES-256 v1)]] - `semantically_similar_to` [INFERRED]
- [[GUC app.settings.encryption_key (PostgreSQL runtime setting)]] - `references` [EXTRACTED]
- [[Migration 00024 save_payment_credentials final version (pgcrypto)]] - `implements` [EXTRACTED]
- [[Pattern pgp_sym_encrypt AES-256 with IV embedded]] - `implements` [EXTRACTED]
- [[Table payment_credentials (encrypted gateway credentials)]] - `calls` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations