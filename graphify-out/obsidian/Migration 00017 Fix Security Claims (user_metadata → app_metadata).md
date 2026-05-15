---
source_file: "supabase/migrations/00017_fix_security_claims.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "1-112"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# Migration 00017: Fix Security Claims (user_metadata → app_metadata)

## Connections
- [[DB Table order_items]] - `references` [EXTRACTED]
- [[DB Table orders]] - `references` [EXTRACTED]
- [[DB Table products]] - `references` [EXTRACTED]
- [[DB Table webhook_logs]] - `references` [EXTRACTED]
- [[RLS MFA Verified Policy Pattern (app_metadata)]] - `implements` [EXTRACTED]
- [[Storage Bucket product-images]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies