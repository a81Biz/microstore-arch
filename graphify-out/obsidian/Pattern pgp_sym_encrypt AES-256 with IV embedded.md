---
source_file: "supabase/migrations/00018_fix_payment_encryption.sql"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# Pattern: pgp_sym_encrypt AES-256 with IV embedded

## Connections
- [[Architecture Decision Multi-layer security (RLS + MFA + AES-256)]] - `rationale_for` [INFERRED]
- [[Function save_payment_credentials (final, no updated last_rotated_at)]] - `implements` [EXTRACTED]
- [[Function save_payment_credentials (pgcrypto AES-256 v1)]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations