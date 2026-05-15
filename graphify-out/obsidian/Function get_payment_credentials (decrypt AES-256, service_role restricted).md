---
source_file: "supabase/migrations/00025_get_payment_credentials.sql"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# Function: get_payment_credentials (decrypt AES-256, service_role restricted)

## Connections
- [[Function save_payment_credentials (final, no updated last_rotated_at)]] - `semantically_similar_to` [INFERRED]
- [[GUC app.settings.encryption_key (PostgreSQL runtime setting)]] - `references` [EXTRACTED]
- [[Migration 00025 get_payment_credentials (service_role only)]] - `implements` [EXTRACTED]
- [[Table payment_credentials (encrypted gateway credentials)]] - `calls` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations