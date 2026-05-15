---
source_file: "supabase/migrations/00020_audit_payment_tables.sql"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# Pattern: mfa_verified in app_metadata JWT claim

## Connections
- [[Architecture Decision Multi-layer security (RLS + MFA + AES-256)]] - `rationale_for` [INFERRED]
- [[Fix 1 RLS MFA via app_metadata instead of AMR claim]] - `rationale_for` [EXTRACTED]
- [[RLS Policy audit_logs vendor MFA read]] - `implements` [EXTRACTED]
- [[RLS Policy payment_transactions vendor MFA read]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations