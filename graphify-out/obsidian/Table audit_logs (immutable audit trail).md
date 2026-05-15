---
source_file: "supabase/migrations/00020_audit_payment_tables.sql"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# Table: audit_logs (immutable audit trail)

## Connections
- [[Migration 00020 Audit Logs & Payment Transactions]] - `implements` [EXTRACTED]
- [[RLS Policy audit_logs vendor MFA read]] - `references` [EXTRACTED]
- [[Table profiles (user roles + TOTP state)]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations