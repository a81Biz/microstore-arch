---
source_file: "supabase/migrations/00001_initial_schema.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "92-100"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Table: order_items

## Connections
- [[DB Enum item_fulfillment_status]] - `references` [EXTRACTED]
- [[DB Fn confirm_order_payment]] - `references` [EXTRACTED]
- [[DB Fn create_order_atomic]] - `references` [EXTRACTED]
- [[DB Fn search_orders]] - `references` [EXTRACTED]
- [[DB Fn update_item_fulfillment]] - `references` [EXTRACTED]
- [[DB Fn update_order_status]] - `references` [EXTRACTED]
- [[DB Fn update_order_tracking]] - `references` [EXTRACTED]
- [[DB Table orders]] - `references` [EXTRACTED]
- [[DB Table products]] - `references` [EXTRACTED]
- [[Migration 00001 Initial Schema]] - `implements` [EXTRACTED]
- [[Migration 00017 Fix Security Claims (user_metadata → app_metadata)]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies