# Test Scenarios — PT-005

## TS-005.1 — VENDOR email in whitelist → login proceeds
**When:** POST /login with valid VENDOR credentials, email exists in vendor_whitelist  
**Then:** 200 with next_step (verify_totp or setup_totp depending on TOTP state)

## TS-005.2 — VENDOR email NOT in whitelist → 403
**When:** POST /login with valid VENDOR credentials, email NOT in vendor_whitelist  
**Then:** 403 { error: 'VENDOR_NOT_AUTHORIZED', message: 'Tu cuenta de vendedor no está autorizada...' }

## TS-005.3 — DB error on whitelist check → 403 (fail-closed)
**When:** POST /login with valid VENDOR credentials, vendor_whitelist query returns error  
**Then:** 403 (not 500 — fail-closed, security over availability)

## TS-005.4 — CUSTOMER role → whitelist check skipped
**When:** POST /login with valid CUSTOMER credentials  
**Then:** 200 with next_step='complete' — vendor_whitelist table NOT queried

## TS-005.5 — ADMIN role → whitelist check skipped
**When:** POST /login with valid ADMIN credentials  
**Then:** 200 with next_step='complete' — vendor_whitelist table NOT queried

## TS-005.6 — Email case insensitivity
**When:** Whitelist has 'Vendor@Example.com', login attempt with 'vendor@example.com'  
**Then:** 200 (check uses email.toLowerCase())

## TS-005.7 — Pre-deploy migration seeds all existing vendors
**When:** Migration 00039 runs on a DB with existing vendor users  
**Then:** All vendor emails appear in vendor_whitelist (no existing vendor locked out)
