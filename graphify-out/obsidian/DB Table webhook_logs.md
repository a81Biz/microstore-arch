---
source_file: "supabase/migrations/00014_webhook_idempotency.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "5-12"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Table: webhook_logs

## Connections
- [[DB Enum payment_gateway]] - `references` [EXTRACTED]
- [[Migration 00014 Webhook Idempotency Table]] - `implements` [EXTRACTED]
- [[Migration 00017 Fix Security Claims (user_metadata → app_metadata)]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies