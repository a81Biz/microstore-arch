---
source_file: "supabase/migrations/00007_save_payment_credentials.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "2-35"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Fn: save_payment_credentials

## Connections
- [[DB Enum payment_gateway]] - `references` [EXTRACTED]
- [[DB Table payment_credentials]] - `references` [EXTRACTED]
- [[Migration 00004 Payment Extension (pgcrypto)]] - `rationale_for` [INFERRED]
- [[Migration 00007 save_payment_credentials Function]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies