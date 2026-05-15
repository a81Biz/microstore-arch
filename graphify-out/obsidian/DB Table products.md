---
source_file: "supabase/migrations/00001_initial_schema.sql"
type: "code"
community: "Database Schema - Migrations & RLS Policies"
location: "53-65"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Database_Schema_-_Migrations__RLS_Policies
---

# DB Table: products

## Connections
- [[DB Fn confirm_order_payment]] - `references` [EXTRACTED]
- [[DB Fn create_order_atomic]] - `references` [EXTRACTED]
- [[DB Fn create_product]] - `references` [EXTRACTED]
- [[DB Fn get_visible_products]] - `references` [EXTRACTED]
- [[DB Fn notify_product_change (trigger)]] - `references` [EXTRACTED]
- [[DB Fn update_product_stock]] - `references` [EXTRACTED]
- [[DB Table order_items]] - `references` [EXTRACTED]
- [[Migration 00001 Initial Schema]] - `implements` [EXTRACTED]
- [[Migration 00017 Fix Security Claims (user_metadata → app_metadata)]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Database_Schema_-_Migrations__RLS_Policies