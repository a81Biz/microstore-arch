# Spec Changes — PT-005

## 09-Security-Architecture.md
Add to Vendor Authentication section: vendor_whitelist is now enforced at login. Vendors not in the whitelist receive 403 regardless of valid credentials.

## 08-API-Catalog.md  
Update POST /login response: add 403 VENDOR_NOT_AUTHORIZED to possible responses.

## 06-Backend-Architecture.md
Update login function description: add whitelist enforcement step to the flow diagram.

## 10-Technical-Debt.md
Update D8: mark as RESUELTO (PT-005). vendor_whitelist is now enforced in login flow.
