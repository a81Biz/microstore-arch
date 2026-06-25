# Spec Changes — PT-009

## 06-Backend-Architecture.md
Add to _shared/logger.ts description: metric() method added, always sends to Logflare with type='metric' field.

## 09-Security-Architecture.md / Observability section
Document business metric events: order.created, order.failed, payment.webhook.processed, payment.webhook.failed.

## 10-Technical-Debt.md
No changes — H-011 (no metrics) is being resolved, not added as debt.
