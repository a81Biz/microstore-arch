---
source_file: "supabase/migrations/00001_initial_schema.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "102-112"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Table: payment_credentials

## Connections
- [[DB Enum payment_gateway]] - `references` [EXTRACTED]
- [[DB Fn get_active_payment_methods]] - `references` [EXTRACTED]
- [[DB Fn save_payment_credentials]] - `references` [EXTRACTED]
- [[DB Table profiles]] - `references` [EXTRACTED]
- [[Migration 00001 Initial Schema]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies