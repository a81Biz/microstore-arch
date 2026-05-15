---
type: community
cohesion: 0.40
members: 10
---

# Module 26 - authlayout_vendoradmin

**Cohesion:** 0.40 - moderately connected
**Members:** 10 nodes

## Members
- [[AuthLayout (Vendor Admin)]] - code - apps/vendor-admin/src/layouts/AuthLayout.astro
- [[AuthResult Interface]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[MFA TOTP Authentication Flow]] - rationale - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[Vendor Auth Test Suite]] - code - apps/vendor-admin/src/lib/auth/__tests__/vendor-auth.test.ts
- [[Vendor Login Page]] - code - apps/vendor-admin/src/pages/auth/login.astro
- [[changePassword Function]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[confirmTOTP Function]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[setupTOTP Function]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[vendorSignIn Function]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[verifyTOTP Function]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Module_26_-_authlayout_vendoradmin
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Storefront - Product Catalog (SSG)]]

## Top bridge nodes
- [[AuthLayout (Vendor Admin)]] - degree 2, connects to 1 community