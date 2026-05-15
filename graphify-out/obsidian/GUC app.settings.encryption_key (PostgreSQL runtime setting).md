---
source_file: "docker-compose.yml"
type: "code"
community: "Payment Encryption & Advanced Migrations"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Payment_Encryption__Advanced_Migrations
---

# GUC: app.settings.encryption_key (PostgreSQL runtime setting)

## Connections
- [[Function get_payment_credentials (decrypt AES-256, service_role restricted)]] - `references` [EXTRACTED]
- [[Function save_payment_credentials (final, no updated last_rotated_at)]] - `references` [EXTRACTED]
- [[Function save_payment_credentials (pgcrypto AES-256 v1)]] - `references` [EXTRACTED]
- [[Service supabase-db (PostgreSQL 15.8.1 with encryption_key GUC)]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Payment_Encryption__Advanced_Migrations