---
type: community
cohesion: 0.31
members: 13
---

# Module 22 - payment_webhook_index_logger

**Cohesion:** 0.31 - loosely connected
**Members:** 13 nodes

## Members
- [[.handle()_4]] - code - supabase/functions/payment-webhook/index.ts
- [[.handleHeyBancoWebhook()]] - code - supabase/functions/payment-webhook/index.ts
- [[.handleMercadoPagoWebhook()]] - code - supabase/functions/payment-webhook/index.ts
- [[.handlePayPalWebhook()]] - code - supabase/functions/payment-webhook/index.ts
- [[.handlePaymentSuccess()]] - code - supabase/functions/payment-webhook/index.ts
- [[.handleStripeWebhook()]] - code - supabase/functions/payment-webhook/index.ts
- [[.sendConfirmationEmail()]] - code - supabase/functions/payment-webhook/index.ts
- [[PaymentWebhookController]] - code - supabase/functions/payment-webhook/index.ts
- [[index.ts_14]] - code - supabase/functions/payment-webhook/index.ts
- [[logger_7]] - code - supabase/functions/payment-webhook/index.ts
- [[verifyHeyBancoSignature()]] - code - supabase/functions/payment-webhook/index.ts
- [[verifyMercadoPagoSignature()]] - code - supabase/functions/payment-webhook/index.ts
- [[verifyStripeSignature()]] - code - supabase/functions/payment-webhook/index.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Module_22_-_payment_webhook_index_logger
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Shared Logger & Monitoring (Logflare)]]
- 1 edge to [[_COMMUNITY_Module 28 - core_base_controller_authent]]
- 1 edge to [[_COMMUNITY_Module 21 - change_password_index_logger]]
- 1 edge to [[_COMMUNITY_Module 27 - manage_payment_gateways_inde]]

## Top bridge nodes
- [[index.ts_14]] - degree 10, connects to 4 communities