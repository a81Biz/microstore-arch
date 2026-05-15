---
source_file: "supabase/migrations/00010_update_order_status_manual.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "2-42"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Fn: update_order_status_manual

## Connections
- [[DB Enum order_status]] - `references` [EXTRACTED]
- [[DB Fn update_order_tracking]] - `semantically_similar_to` [INFERRED]
- [[DB Table orders]] - `references` [EXTRACTED]
- [[Migration 00010 update_order_status_manual Function]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies