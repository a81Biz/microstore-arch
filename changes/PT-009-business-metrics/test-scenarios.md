# Test Scenarios — PT-009

## TS-009.1 — order.created metric fires on success
**When:** POST /create-order succeeds (valid payload, stock available, gateway enabled)  
**Then:** Logflare receives event with: `{ type: 'metric', event: 'order.created', orderId, gateway, durationMs }`

## TS-009.2 — order.failed metric fires on business error
**When:** POST /create-order fails with GATEWAY_DISABLED  
**Then:** Logflare receives event with: `{ type: 'metric', event: 'order.failed', errorCode: 'GATEWAY_DISABLED', durationMs }`

## TS-009.3 — payment.webhook.processed metric fires on webhook success
**When:** POST /payment-webhook receives valid webhook event  
**Then:** Logflare receives event with: `{ type: 'metric', event: 'payment.webhook.processed', gateway, durationMs }`

## TS-009.4 — payment.webhook.failed metric fires on webhook error
**When:** POST /payment-webhook fails processing  
**Then:** Logflare receives event with: `{ type: 'metric', event: 'payment.webhook.failed', errorCode, durationMs }`

## TS-009.5 — metric() is fire-and-forget (does not block response)
**When:** Logflare is unavailable  
**Then:** Order creation still returns 201 (Logflare error caught and logged to console only)

## TS-009.6 — Existing logger.info/warn/error behavior unchanged
**When:** Any function calls logger.info()  
**Then:** Same behavior as before (info → console only, warn/error → Logflare)

## TS-009.7 — durationMs is present and reasonable
**When:** Order creation takes ~200ms  
**Then:** metric event has `durationMs` between 0 and 30000 (not negative, not absurdly large)
