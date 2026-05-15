---
source_file: "supabase/migrations/00018_fix_payment_encryption.sql"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# Table: payment_credentials (encrypted gateway credentials)

## Connections
- [[Function get_payment_credentials (decrypt AES-256, service_role restricted)]] - `calls` [EXTRACTED]
- [[Function save_payment_credentials (final, no updated last_rotated_at)]] - `calls` [EXTRACTED]
- [[Function save_payment_credentials (pgcrypto AES-256 v1)]] - `calls` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations