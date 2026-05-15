---
type: community
cohesion: 0.07
members: 51
---

# Database Schema - Migrations & RLS Policies

**Cohesion:** 0.07 - loosely connected
**Members:** 51 nodes

## Members
- [[DB Enum item_fulfillment_status]] - code - supabase/migrations/00001_initial_schema.sql
- [[DB Enum order_status]] - code - supabase/migrations/00001_initial_schema.sql
- [[DB Enum payment_gateway]] - code - supabase/migrations/00001_initial_schema.sql
- [[DB Enum user_role]] - code - supabase/migrations/00001_initial_schema.sql
- [[DB Fn check_password_change_required]] - code - supabase/migrations/00002_auth_triggers.sql
- [[DB Fn confirm_order_payment]] - code - supabase/migrations/00006_confirm_order_payment.sql
- [[DB Fn create_order_atomic]] - code - supabase/migrations/00005_create_order_atomic.sql
- [[DB Fn create_product]] - code - supabase/migrations/00003_product_images.sql
- [[DB Fn generate_order_display_id]] - code - supabase/migrations/00001_initial_schema.sql
- [[DB Fn get_active_payment_methods]] - code - supabase/migrations/00008_get_active_payment_methods.sql
- [[DB Fn get_visible_products]] - code - supabase/migrations/00003_product_images.sql
- [[DB Fn handle_new_user (trigger)]] - code - supabase/migrations/00002_auth_triggers.sql
- [[DB Fn is_totp_enabled]] - code - supabase/migrations/00002_auth_triggers.sql
- [[DB Fn mark_password_changed]] - code - supabase/migrations/00002_auth_triggers.sql
- [[DB Fn notify_product_change (trigger)]] - code - supabase/migrations/00003_product_images.sql
- [[DB Fn save_payment_credentials]] - code - supabase/migrations/00007_save_payment_credentials.sql
- [[DB Fn search_orders]] - code - supabase/migrations/00012_search_orders.sql
- [[DB Fn update_item_fulfillment]] - code - supabase/migrations/00011_update_item_fulfillment.sql
- [[DB Fn update_order_status]] - code - supabase/migrations/00001_initial_schema.sql
- [[DB Fn update_order_status_manual]] - code - supabase/migrations/00010_update_order_status_manual.sql
- [[DB Fn update_order_tracking]] - code - supabase/migrations/00009_update_order_tracking.sql
- [[DB Fn update_product_stock]] - code - supabase/migrations/00003_product_images.sql
- [[DB Table order_items]] - code - supabase/migrations/00001_initial_schema.sql
- [[DB Table orders]] - code - supabase/migrations/00001_initial_schema.sql
- [[DB Table payment_credentials]] - code - supabase/migrations/00001_initial_schema.sql
- [[DB Table products]] - code - supabase/migrations/00001_initial_schema.sql
- [[DB Table profiles]] - code - supabase/migrations/00001_initial_schema.sql
- [[DB Table webhook_logs]] - code - supabase/migrations/00014_webhook_idempotency.sql
- [[DB Trigger on_auth_user_created]] - code - supabase/migrations/00002_auth_triggers.sql
- [[DB Trigger on_product_change]] - code - supabase/migrations/00003_product_images.sql
- [[Migration 00000 Realtime Schema]] - code - supabase/migrations/00000_realtime_schema.sql
- [[Migration 00001 Initial Schema]] - code - supabase/migrations/00001_initial_schema.sql
- [[Migration 00002 Auth Triggers]] - code - supabase/migrations/00002_auth_triggers.sql
- [[Migration 00003 Product Images]] - code - supabase/migrations/00003_product_images.sql
- [[Migration 00004 Payment Extension (pgcrypto)]] - code - supabase/migrations/00004_payment_extension.sql
- [[Migration 00005 create_order_atomic Function]] - code - supabase/migrations/00005_create_order_atomic.sql
- [[Migration 00006 confirm_order_payment Function]] - code - supabase/migrations/00006_confirm_order_payment.sql
- [[Migration 00007 save_payment_credentials Function]] - code - supabase/migrations/00007_save_payment_credentials.sql
- [[Migration 00008 get_active_payment_methods Function]] - code - supabase/migrations/00008_get_active_payment_methods.sql
- [[Migration 00009 update_order_tracking Function]] - code - supabase/migrations/00009_update_order_tracking.sql
- [[Migration 00010 update_order_status_manual Function]] - code - supabase/migrations/00010_update_order_status_manual.sql
- [[Migration 00011 update_item_fulfillment Function]] - code - supabase/migrations/00011_update_item_fulfillment.sql
- [[Migration 00012 search_orders Function]] - code - supabase/migrations/00012_search_orders.sql
- [[Migration 00013 Realtime Subscription Policy]] - code - supabase/migrations/00013_realtime_policy.sql
- [[Migration 00014 Webhook Idempotency Table]] - code - supabase/migrations/00014_webhook_idempotency.sql
- [[Migration 00015 Storage Hardening]] - code - supabase/migrations/00015_storage_hardening.sql
- [[Migration 00017 Fix Security Claims (user_metadata → app_metadata)]] - code - supabase/migrations/00017_fix_security_claims.sql
- [[RLS MFA Verified Policy Pattern (app_metadata)]] - code - supabase/migrations/00017_fix_security_claims.sql
- [[Storage Bucket product-images]] - code - supabase/migrations/00015_storage_hardening.sql
- [[getSupabaseAdmin Function]] - code - supabase/functions/_shared/supabase-client.ts
- [[getSupabaseClient Function]] - code - supabase/functions/_shared/supabase-client.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Database_Schema_-_Migrations__RLS_Policies
SORT file.name ASC
```
