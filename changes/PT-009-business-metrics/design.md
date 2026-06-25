# Design — PT-009: Business Metrics to Logflare

**PT:** PT-009 | **Type:** FEATURE STANDARD | **Date:** 2026-06-24

---

## Root Cause (from ENRICHMENT.md)

`_shared/logger.ts` exists with Logflare sink but only forwards `warn` and `error` level logs. There are no structured business metric events (order success rate, payment failure rate, webhook processing time). D5 thresholds declared in PTSA (Success Rate ≥95%, Failure Rate ≤2%) are not verifiable.

## Current logger.ts Behavior

```typescript
// Only warn/error go to Logflare:
if (logflare && (level === 'warn' || level === 'error')) {
  logflare.sendLog(level, message, {...context})
}
```

`info` events (including order creation success) are only written to `console.info` — not captured by Logflare.

## Architecture Decision

**Add a `metric()` method to the logger that always sends to Logflare, with `type: 'metric'` field for filtering.**

```typescript
metric: (event: string, data: Record<string, unknown>) => {
  const entry = {
    level: 'info' as LogLevel,
    message: event,
    context: { type: 'metric', event, ...data },
    timestamp: new Date().toISOString(),
    function_name: functionName
  };
  // Always log to console
  console.info(`[METRIC][${functionName}] ${event}`, JSON.stringify(data));
  // Always send to Logflare (not just warn/error)
  if (logflare) {
    logflare.sendLog('info', event, {
      type: 'metric',
      function_name: functionName,
      ...data
    }).catch(err => console.error('Logflare metric error:', err));
  }
}
```

## Instrumentation Points

**create-order/index.ts:**
- SUCCESS: `logger.metric('order.created', { userId, orderId, displayId, gateway, totalAmount, currency, durationMs })`
- FAILURE: `logger.metric('order.failed', { userId, errorCode, gateway, durationMs })` — add to catch blocks per error type

**payment-webhook/index.ts:**
- SUCCESS: `logger.metric('payment.webhook.processed', { gateway, event, orderId, durationMs, idempotencyKey })`
- FAILURE: `logger.metric('payment.webhook.failed', { gateway, event, errorCode, durationMs })`

## Duration Tracking

Add `const startTime = Date.now()` at the start of each `handle()` method.  
Pass `durationMs: Date.now() - startTime` to metric calls.

## Non-Breaking Change

The `metric()` method is additive. All existing callers of `debug/info/warn/error` are unchanged. The only behavioral change: metric events now flow to Logflare (previously only warn/error did).
