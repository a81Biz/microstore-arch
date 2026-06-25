# Test Scenarios — PT-003

## create-order

**TS-003.1** — Valid payload + payment gateway enabled + stock available → 201 + {orderId, payment.gateway}  
**TS-003.2** — Payload missing 'items' field → 422 VALIDATION_ERROR  
**TS-003.3** — Gateway disabled (mock gateway.is_enabled=false) → 400 GATEWAY_DISABLED  
**TS-003.4** — Rate limit exceeded (mock rate limit=false) → 429 RATE_LIMITED  
**TS-003.5** — RPC returns INSUFFICIENT_STOCK error → 400 INSUFFICIENT_STOCK

## login

**TS-003.6** — Valid CUSTOMER credentials → 200 { next_step: 'complete', access_token }  
**TS-003.7** — Valid VENDOR credentials + totp_enabled=true → 200 { next_step: 'verify_totp' }  
**TS-003.8** — Valid VENDOR credentials + totp_enabled=false → 200 { next_step: 'setup_totp' }  
**TS-003.9** — Invalid password (mock signInWithPassword error) → 401  
**TS-003.10** — Rate limit exceeded → 429 with Retry-After header  
**TS-003.11** — VENDOR + no password_changed_at → 200 { next_step: 'change_password' }

## manage-orders

**TS-003.12** — GET /manage-orders (authenticated) → 200 with orders array  
**TS-003.13** — GET /manage-orders/:id (authenticated, owned order) → 200 with order object  
**TS-003.14** — PATCH /manage-orders/:id/status with valid status → 200  
**TS-003.15** — PATCH /manage-orders/:id/status with invalid status → 400  
**TS-003.16** — GET without Authorization header → 401
