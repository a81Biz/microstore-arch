---
source_file: "supabase/migrations/00020_audit_payment_tables.sql"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# RLS Policy: audit_logs vendor MFA read

## Connections
- [[Pattern mfa_verified in app_metadata JWT claim]] - `implements` [EXTRACTED]
- [[Table audit_logs (immutable audit trail)]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations