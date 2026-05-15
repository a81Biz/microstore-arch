---
type: community
cohesion: 0.10
members: 29
---

# Storefront - Product Catalog (SSG)

**Cohesion:** 0.10 - loosely connected
**Members:** 29 nodes

## Members
- [[AdminOrder Interface]] - code - apps/vendor-admin/src/lib/orders/order-admin.ts
- [[AdminProduct Interface]] - code - apps/vendor-admin/src/lib/products/product-admin.ts
- [[Auth Client (Vendor Admin)]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[BaseLayout (Storefront)]] - code - apps/storefront/src/layouts/BaseLayout.astro
- [[Catalog Data Layer]] - code - apps/storefront/src/lib/catalog/catalog.ts
- [[CatalogProduct Interface]] - code - apps/storefront/src/lib/catalog/catalog.ts
- [[Order Admin Client]] - code - apps/vendor-admin/src/lib/orders/order-admin.ts
- [[Product Admin Client]] - code - apps/vendor-admin/src/lib/products/product-admin.ts
- [[Product Detail Page slug]] - code - apps/storefront/src/pages/producto/[slug].astro
- [[ProductCard Component]] - code - apps/storefront/src/components/product/ProductCard.astro
- [[SDD Storefront UI Design]] - document - docs/Documento de Diseño de Software (SDD).md
- [[SSG No-Session Persistence Pattern]] - rationale - apps/storefront/src/lib/supabase-client.ts
- [[Storefront Index Page]] - code - apps/storefront/src/pages/index.astro
- [[Supabase Client (Storefront)]] - code - apps/storefront/src/lib/supabase-client.ts
- [[Supabase Client (Vendor Admin)]] - code - apps/vendor-admin/src/lib/supabase-client.ts
- [[Vendor Admin Dashboard Page]] - code - apps/vendor-admin/src/pages/index.astro
- [[Vendor Orders Page]] - code - apps/vendor-admin/src/pages/orders/index.astro
- [[Vendor Products Page]] - code - apps/vendor-admin/src/pages/products/index.astro
- [[Vendor SettingsPayment Gateways Page]] - code - apps/vendor-admin/src/pages/settings/index.astro
- [[VendorAdminLayout]] - code - apps/vendor-admin/src/layouts/VendorAdminLayout.astro
- [[getAllProductSlugs Function]] - code - apps/storefront/src/lib/catalog/catalog.ts
- [[getProductBySlug Function]] - code - apps/storefront/src/lib/catalog/catalog.ts
- [[getVendorAuthHeader Function]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[getVisibleProducts Function]] - code - apps/storefront/src/lib/catalog/catalog.ts
- [[robots.txt Endpoint]] - code - apps/storefront/src/pages/robots.txt.ts
- [[signOut Function]] - code - apps/vendor-admin/src/lib/auth/auth-client.ts
- [[sitemap.xml Endpoint]] - code - apps/storefront/src/pages/sitemap.xml.ts
- [[triggerRebuild Function]] - code - apps/vendor-admin/src/lib/products/product-admin.ts
- [[uploadProductImage Function]] - code - apps/vendor-admin/src/lib/products/product-admin.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Storefront_-_Product_Catalog_SSG
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Module 26 - authlayout_vendoradmin]]

## Top bridge nodes
- [[BaseLayout (Storefront)]] - degree 4, connects to 1 community