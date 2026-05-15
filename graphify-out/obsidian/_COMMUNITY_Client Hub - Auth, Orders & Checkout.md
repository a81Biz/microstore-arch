---
type: community
cohesion: 0.05
members: 61
---

# Client Hub - Auth, Orders & Checkout

**Cohesion:** 0.05 - loosely connected
**Members:** 61 nodes

## Members
- [[....layoutsAuthLayout.astro]] - code - apps/vendor-admin/src/layouts/AuthLayout.astro
- [[....layoutsClientHubLayout.astro]] - code - apps/client-hub/src/layouts/ClientHubLayout.astro
- [[....libauthauth-client.ts]] - code - apps/client-hub/src/lib/auth/auth-client.ts
- [[....libauthauth-client.ts_1]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[....libcheckoutcheckout-client]] - code - apps/client-hub/src/lib/checkout/checkout-client
- [[....libordersorder-client]] - code - apps/client-hub/src/lib/orders/order-client
- [[....libsupabase-client.ts]] - code - apps/client-hub/src/lib/supabase-client.ts
- [[..libauthauth-client]] - code - apps/client-hub/src/lib/auth/auth-client
- [[..libsupabase-client]] - code - apps/client-hub/src/lib/supabase-client
- [[AuthResult]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[CheckoutResult]] - code - apps/client-hub/src/lib/checkout/checkout-client.ts
- [[HeyBancoInstructions]] - code - apps/client-hub/src/lib/checkout/checkout-client.ts
- [[OrderItemViewModel]] - code - apps/client-hub/src/lib/orders/order-client.ts
- [[OrderViewModel]] - code - apps/client-hub/src/lib/orders/order-client.ts
- [[PaymentResult]] - code - apps/client-hub/src/lib/checkout/checkout-client.ts
- [[RawOrder]] - code - apps/client-hub/src/lib/orders/order-client.ts
- [[RawOrderItem]] - code - apps/client-hub/src/lib/orders/order-client.ts
- [[ShippingAddress]] - code - apps/client-hub/src/lib/checkout/checkout-client.ts
- [[TOTPSetupData]] - code - apps/client-hub/src/lib/auth/auth-client.ts
- [[TimelineStep]] - code - apps/client-hub/src/lib/orders/order-client.ts
- [[id.astro]] - code - apps/client-hub/src/pages/orders/[id].astro
- [[base()]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[callback.astro]] - code - apps/client-hub/src/pages/auth/callback.astro
- [[changePassword()]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[checkout-client.ts]] - code - apps/client-hub/src/lib/checkout/checkout-client.ts
- [[confirmTOTP()]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[createOrder()]] - code - apps/client-hub/src/lib/checkout/checkout-client.ts
- [[fetchOrders()]] - code - apps/client-hub/src/pages/orders/index.astro
- [[formatDate()]] - code - apps/client-hub/src/pages/orders/index.astro
- [[generateTimeline()]] - code - apps/client-hub/src/lib/orders/order-client.ts
- [[getActivePaymentMethods()]] - code - apps/client-hub/src/lib/checkout/checkout-client.ts
- [[getAuthHeader()]] - code - apps/client-hub/src/lib/checkout/checkout-client.ts
- [[getCurrentUser()]] - code - apps/client-hub/src/lib/auth/auth-client.ts
- [[getStatusLabel()]] - code - apps/client-hub/src/pages/orders/index.astro
- [[getVendorAuthHeader()]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[handleLogout()]] - code - apps/client-hub/src/pages/profile/index.astro
- [[handleRegister()]] - code - apps/client-hub/src/pages/auth/register.astro
- [[index.astro_1]] - code - apps/client-hub/src/pages/checkout/index.astro
- [[index.astro]] - code - apps/client-hub/src/pages/index.astro
- [[index.astro_2]] - code - apps/client-hub/src/pages/orders/index.astro
- [[index.astro_3]] - code - apps/client-hub/src/pages/profile/index.astro
- [[init()]] - code - apps/client-hub/src/pages/orders/index.astro
- [[loadCustomerOrders()]] - code - apps/client-hub/src/lib/orders/order-client.ts
- [[loadOrderDetail()]] - code - apps/client-hub/src/lib/orders/order-client.ts
- [[loadProfile()]] - code - apps/client-hub/src/pages/profile/index.astro
- [[login.astro]] - code - apps/client-hub/src/pages/auth/login.astro
- [[login.astro_1]] - code - apps/vendor-admin/src/pages/auth/login.astro
- [[mapToViewModel()]] - code - apps/client-hub/src/lib/orders/order-client.ts
- [[order-client.ts]] - code - apps/client-hub/src/lib/orders/order-client.ts
- [[register.astro]] - code - apps/client-hub/src/pages/auth/register.astro
- [[setupTOTP()]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[signInWithEmail()]] - code - apps/client-hub/src/lib/auth/auth-client.ts
- [[signInWithGoogle()]] - code - apps/client-hub/src/lib/auth/auth-client.ts
- [[signInWithGoogle()_1]] - code - apps/client-hub/src/pages/auth/register.astro
- [[signOut()]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[signUpWithEmail()]] - code - apps/client-hub/src/lib/auth/auth-client.ts
- [[subscribeToOrderUpdates()]] - code - apps/client-hub/src/lib/orders/order-client.ts
- [[supabase-client.ts]] - code - apps/storefront/src/lib/supabase-client.ts
- [[supabaseClient]] - code - apps/vendor-admin/src/lib/supabase-client.ts
- [[vendorSignIn()]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[verifyTOTP()]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Client_Hub_-_Auth_Orders__Checkout
SORT file.name ASC
```

## Connections to other communities
- 6 edges to [[_COMMUNITY_Vendor Admin - Products & Order Management]]
- 2 edges to [[_COMMUNITY_Module 20 - apps_storefront_src_componen]]

## Top bridge nodes
- [[supabaseClient]] - degree 8, connects to 2 communities
- [[....libauthauth-client.ts]] - degree 17, connects to 1 community
- [[order-client.ts]] - degree 13, connects to 1 community
- [[....libauthauth-client.ts_1]] - degree 13, connects to 1 community
- [[checkout-client.ts]] - degree 10, connects to 1 community