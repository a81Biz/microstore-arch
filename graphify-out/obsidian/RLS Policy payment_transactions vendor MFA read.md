---
source_file: "supabase/migrations/00020_audit_payment_tables.sql"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# RLS Policy: payment_transactions vendor MFA read

## Connections
- [[Pattern mfa_verified in app_metadata JWT claim]] - `implements` [EXTRACTED]
- [[Table payment_transactions (payment lifecycle)]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations