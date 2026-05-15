---
type: community
cohesion: 0.07
members: 39
---

# Payment Encryption & Advanced Migrations

**Cohesion:** 0.07 - loosely connected
**Members:** 39 nodes

## Members
- [[ARCHITECTURE.md System Architecture Document]] - document - docs/ARCHITECTURE.md
- [[Architecture Decision Jamstack + Cloudflare Pages edge deployment]] - rationale - docs/ARCHITECTURE.md
- [[Architecture Decision Multi-layer security (RLS + MFA + AES-256)]] - rationale - docs/ARCHITECTURE.md
- [[Architecture Decision Zero operational cost (Cloudflare + Supabase free tiers)]] - rationale - docs/ARCHITECTURE.md
- [[Correcciones Finales.md 8-fix Technical Corrections Document]] - document - docs/Correcciones Finales.md
- [[Extension pgcrypto (AES-256 symmetric encryption)]] - code - supabase/migrations/00018_fix_payment_encryption.sql
- [[Fix 1 RLS MFA via app_metadata instead of AMR claim]] - rationale - docs/Correcciones Finales.md
- [[Fix 2 Webhook idempotency via webhook_logs table]] - rationale - docs/Correcciones Finales.md
- [[Fix 3 Secure nonce via pgsodium.crypto_secretbox_noncegen()]] - rationale - docs/Correcciones Finales.md
- [[Fix 6 SQL-based rate limiting (no Redis, free tier compatible)]] - rationale - docs/Correcciones Finales.md
- [[Function confirm_order_payment (updated with transaction logging)]] - code - supabase/migrations/00020_audit_payment_tables.sql
- [[Function get_payment_credentials (decrypt AES-256, service_role restricted)]] - code - supabase/migrations/00025_get_payment_credentials.sql
- [[Function handle_new_user (whitelist-based role assignment)]] - code - supabase/migrations/00022_handle_new_user.sql
- [[Function save_payment_credentials (final, no updated last_rotated_at)]] - code - supabase/migrations/00024_save_payment_credentials.sql
- [[Function save_payment_credentials (pgcrypto AES-256 v1)]] - code - supabase/migrations/00018_fix_payment_encryption.sql
- [[Function update_order_status_manual (with stock restoration)]] - code - supabase/migrations/00019_fix_order_cancellation.sql
- [[GUC app.settings.encryption_key (PostgreSQL runtime setting)]] - code - docker-compose.yml
- [[Migration 00018 Fix Payment Encryption (pgsodium → pgcrypto)]] - code - supabase/migrations/00018_fix_payment_encryption.sql
- [[Migration 00019 Fix Order Cancellation Stock Restoration]] - code - supabase/migrations/00019_fix_order_cancellation.sql
- [[Migration 00020 Audit Logs & Payment Transactions]] - code - supabase/migrations/00020_audit_payment_tables.sql
- [[Migration 00022 handle_new_user uses vendor_whitelist]] - code - supabase/migrations/00022_handle_new_user.sql
- [[Migration 00023 Cleanup AMR Policy (drop admin_with_mfa profile policy)]] - code - supabase/migrations/00023_cleanup_amr_policy.sql
- [[Migration 00024 save_payment_credentials final version (pgcrypto)]] - code - supabase/migrations/00024_save_payment_credentials.sql
- [[Migration 00025 get_payment_credentials (service_role only)]] - code - supabase/migrations/00025_get_payment_credentials.sql
- [[Pattern mfa_verified in app_metadata JWT claim]] - code - supabase/migrations/00020_audit_payment_tables.sql
- [[Pattern pgp_sym_encrypt AES-256 with IV embedded]] - code - supabase/migrations/00018_fix_payment_encryption.sql
- [[RLS Policy audit_logs vendor MFA read]] - code - supabase/migrations/00020_audit_payment_tables.sql
- [[RLS Policy payment_transactions customer read (via orders)]] - code - supabase/migrations/00020_audit_payment_tables.sql
- [[RLS Policy payment_transactions vendor MFA read]] - code - supabase/migrations/00020_audit_payment_tables.sql
- [[Sprint 2 Cloudflare Rebuild Trigger on product changes]] - document - docs/Sprint 2.md
- [[Sprint 2 SSG Catalog Astro static generation for storefront]] - document - docs/Sprint 2.md
- [[Sprint 2.md Product Catalog & CRUD Sprint Plan]] - document - docs/Sprint 2.md
- [[Table audit_logs (immutable audit trail)]] - code - supabase/migrations/00020_audit_payment_tables.sql
- [[Table order_items]] - code - supabase/migrations/00019_fix_order_cancellation.sql
- [[Table orders]] - code - supabase/migrations/00019_fix_order_cancellation.sql
- [[Table payment_credentials (encrypted gateway credentials)]] - code - supabase/migrations/00018_fix_payment_encryption.sql
- [[Table payment_transactions (payment lifecycle)]] - code - supabase/migrations/00020_audit_payment_tables.sql
- [[Table products]] - code - supabase/migrations/00019_fix_order_cancellation.sql
- [[Table profiles (user roles + TOTP state)]] - code - supabase/migrations/00020_audit_payment_tables.sql

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Payment_Encryption__Advanced_Migrations
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Docker & Infrastructure Config]]

## Top bridge nodes
- [[GUC app.settings.encryption_key (PostgreSQL runtime setting)]] - degree 4, connects to 1 community
- [[Function handle_new_user (whitelist-based role assignment)]] - degree 3, connects to 1 community