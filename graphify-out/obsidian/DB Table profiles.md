---
source_file: "supabase/migrations/00001_initial_schema.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "42-51"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Table: profiles

## Connections
- [[DB Enum user_role]] - `references` [EXTRACTED]
- [[DB Fn check_password_change_required]] - `references` [EXTRACTED]
- [[DB Fn handle_new_user (trigger)]] - `references` [EXTRACTED]
- [[DB Fn is_totp_enabled]] - `references` [EXTRACTED]
- [[DB Fn mark_password_changed]] - `references` [EXTRACTED]
- [[DB Fn search_orders]] - `references` [EXTRACTED]
- [[DB Table orders]] - `references` [EXTRACTED]
- [[DB Table payment_credentials]] - `references` [EXTRACTED]
- [[Migration 00001 Initial Schema]] - `implements` [EXTRACTED]
- [[Migration 00015 Storage Hardening]] - `references` [EXTRACTED]
- [[RLS MFA Verified Policy Pattern (app_metadata)]] - `references` [EXTRACTED]
- [[getSupabaseAdmin Function]] - `shares_data_with` [INFERRED]
- [[getSupabaseClient Function]] - `shares_data_with` [INFERRED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies