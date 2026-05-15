---
type: community
cohesion: 0.09
members: 47
---

# Edge Functions & Payment Providers

**Cohesion:** 0.09 - loosely connected
**Members:** 47 nodes

## Members
- [[Atomic Order Creation with Pessimistic Locking]] - rationale - supabase/functions/create-order/index.ts
- [[BaseController Abstract Class]] - code - supabase/functions/_core/base-controller.ts
- [[Centralized CORS Management]] - rationale - supabase/functions/_core/base-controller.ts
- [[Change Password Edge Function]] - code - supabase/functions/change-password/index.ts
- [[Cloudflare Pages Deployment]] - rationale - scripts/deploy/deploy-all.sh
- [[Confirm TOTP Edge Function]] - code - supabase/functions/confirm-totp/index.ts
- [[Create Order Edge Function]] - code - supabase/functions/create-order/index.ts
- [[Deploy All Script]] - code - scripts/deploy/deploy-all.sh
- [[Edge Runtime Main Worker (Router)]] - code - supabase/functions/main/index.ts
- [[HMAC-SHA256 Webhook Signature Verification]] - rationale - supabase/functions/payment-webhook/index.ts
- [[Health Check Edge Function]] - code - supabase/functions/health/index.ts
- [[Hey Banco Payment Gateway]] - rationale - supabase/functions/create-order/index.ts
- [[Login Edge Function]] - code - supabase/functions/login/index.ts
- [[Manage Orders Edge Function]] - code - supabase/functions/manage-orders/index.ts
- [[Manage Payment Gateways Edge Function]] - code - supabase/functions/manage-payment-gateways/index.ts
- [[Manage Products Edge Function]] - code - supabase/functions/manage-products/index.ts
- [[MercadoPago Payment Gateway]] - rationale - supabase/functions/create-order/index.ts
- [[Password Complexity Policy]] - rationale - supabase/functions/change-password/index.ts
- [[PayPal Payment Gateway]] - rationale - supabase/functions/create-order/index.ts
- [[Payment Amount Mismatch Detection (Anti-Fraud)]] - rationale - supabase/functions/payment-webhook/index.ts
- [[Payment Webhook Edge Function]] - code - supabase/functions/payment-webhook/index.ts
- [[Payment Webhook Tests]] - code - supabase/functions/payment-webhook/__tests__/webhook.test.ts
- [[Product Management Tests]] - code - supabase/functions/manage-products/__tests__/products.test.ts
- [[Rate Limiting Pattern]] - rationale - supabase/functions/_core/base-controller.ts
- [[Resend Email API]] - rationale - supabase/functions/send-order-email/index.ts
- [[Send Order Email Edge Function]] - code - supabase/functions/send-order-email/index.ts
- [[Send Shipping Email Edge Function]] - code - supabase/functions/send-shipping-email/index.ts
- [[Setup TOTP Edge Function]] - code - supabase/functions/setup-totp/index.ts
- [[Stripe Payment Gateway]] - rationale - supabase/functions/create-order/index.ts
- [[TOTP Setup Tests]] - code - supabase/functions/setup-totp/__tests__/totp.test.ts
- [[Trigger Rebuild Edge Function]] - code - supabase/functions/trigger-rebuild/index.ts
- [[Vendor MFA Authentication Flow]] - rationale - supabase/functions/login/index.ts
- [[Verify TOTP Edge Function]] - code - supabase/functions/verify-totp/index.ts
- [[Webhook Idempotency Pattern]] - rationale - supabase/functions/payment-webhook/index.ts
- [[check_rate_limit DB RPC]] - rationale - supabase/functions/_core/base-controller.ts
- [[confirm_order_payment DB RPC]] - rationale - supabase/functions/payment-webhook/index.ts
- [[create_order_atomic DB RPC]] - rationale - supabase/functions/create-order/index.ts
- [[create_product DB RPC]] - rationale - supabase/functions/manage-products/index.ts
- [[get_payment_credentials DB RPC]] - rationale - supabase/functions/create-order/index.ts
- [[orders Table (DB)]] - rationale - supabase/functions/create-order/index.ts
- [[payment_credentials Table (DB)]] - rationale - supabase/functions/manage-payment-gateways/index.ts
- [[products Table (DB)]] - rationale - supabase/functions/manage-products/index.ts
- [[profiles Table (DB)]] - rationale - supabase/functions/login/index.ts
- [[save_payment_credentials DB RPC]] - rationale - supabase/functions/manage-payment-gateways/index.ts
- [[search_orders DB RPC]] - rationale - supabase/functions/manage-orders/index.ts
- [[update_order_tracking DB RPC]] - rationale - supabase/functions/manage-orders/index.ts
- [[webhook_logs Table (DB)]] - rationale - supabase/functions/payment-webhook/index.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Edge_Functions__Payment_Providers
SORT file.name ASC
```
