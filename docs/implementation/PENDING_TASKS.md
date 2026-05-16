# Tareas Pendientes — Micro-Store Arch

**Corte:** 2026-05-16 (sesión 9 · PASO 4 completado)
**Estado general del proyecto:** Sprints 0-5 completos · PT-001–PT-030 cerradas

---

## PRIORIDAD ALTA — Activas

### PT-IMG-030-FIX-A · Bug 500: HTTPS regex en AddImageSchema
- **Archivo:** `supabase/functions/manage-products/index.ts` *(modificar)*
- **Qué hace:** Cambiar `HTTPS_REGEX = /^https:\/\/.+/` → `/^https?:\/\/.+/` para aceptar URLs `http://` (entorno local).
- **Estado:** ✅ Completado 2026-05-16

---

### PT-IMG-030 · Galería de Imágenes por Producto (hasta 10)
**Épica:** Extender sistema de 1 imagen a N imágenes (máx 10) con galería interactiva en storefront y UI admin de gestión.
**Bloqueante de:** experiencia visual del producto en storefront.

---

#### TURNO 1 — Capa de datos + Edge Function (2 archivos)

##### PT-IMG-030-A1 · Migración: tabla product_images
- **Archivo:** `supabase/migrations/00032_product_images_gallery.sql` *(nuevo)*
- **Qué hace:**
  1. `CREATE TABLE product_images` con columnas: `id UUID PK`, `product_id UUID FK → products(id) ON DELETE CASCADE`, `url TEXT NOT NULL`, `sort_order INT DEFAULT 0`, `alt_text TEXT`, `created_at TIMESTAMPTZ DEFAULT NOW()`.
  2. `CREATE INDEX idx_product_images_product_id ON product_images(product_id, sort_order)`.
  3. `ALTER TABLE product_images ENABLE ROW LEVEL SECURITY`.
  4. Policy **"Public read product_images"**: `FOR SELECT` donde `EXISTS (SELECT 1 FROM products WHERE id = product_id AND is_visible = true)`.
  5. Policy **"Vendor write product_images"**: `FOR ALL` donde `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendor')`.
- **Test de aceptación:** `docker compose down -v && docker compose up` → db-migrate ExitCode=0 · migración 00032 CREATE TABLE ✅.
- **Estado:** ✅ Completado 2026-05-16

##### PT-IMG-030-A2 · Edge Function: handlers POST/DELETE images en manage-products
- **Archivo:** `supabase/functions/manage-products/index.ts` *(modificar)*
- **Qué hace:**
  1. **Routing nuevo** — detectar patrones de ruta:
     - `POST /manage-products/{productId}/images` → `addImage()`
     - `DELETE /manage-products/{productId}/images/{imageId}` → `deleteImage()`
  2. **`addImage(productId, { url, altText?, sortOrder? })`:**
     - Validar que `productId` existe y pertenece al vendor.
     - Contar imágenes actuales; rechazar con 400 si `count >= 10`.
     - Insertar fila en `product_images`.
     - Si es la primera imagen (`count === 0`), hacer `UPDATE products SET image_url = url WHERE id = productId`.
     - Retornar `{ id, url, sortOrder, altText }` con status 201.
  3. **`deleteImage(productId, imageId)`:**
     - Obtener fila a eliminar (validar que pertenece al `productId`).
     - Eliminar fila de `product_images`.
     - Si `url === products.image_url` (era la imagen primaria): buscar la siguiente por `sort_order ASC`; si existe, `UPDATE products SET image_url = nextUrl`; si no, `UPDATE products SET image_url = null`.
     - Retornar `{ success: true }` con status 200.
  4. **`listProducts` y `getProduct` actualizados:**
     - Añadir al SELECT de productos: `.select('*, product_images(id, url, sort_order, alt_text)')` ordenado por `sort_order`.
     - `mapProduct()` actualizado: incluir `images: Array<{id, url, sortOrder, altText}>` en el objeto retornado.
     - `imageUrl` sigue siendo el primer elemento de images (sort_order = 0) o el valor actual de `products.image_url`.
- **Test de aceptación:** POST a `/manage-products/{id}/images` con URL válida → 201. POST cuando ya hay 10 → 400. DELETE de imagen primaria → `products.image_url` se actualiza al siguiente. GET `/manage-products` → cada producto incluye campo `images: [...]`.
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO 2 — Admin: cliente TypeScript + UI (2 archivos)

##### PT-IMG-030-B1 · product-admin.ts: funciones addProductImage y deleteProductImage
- **Archivo:** `apps/vendor-admin/src/lib/products/product-admin.ts` *(modificar)*
- **Qué hace:**
  1. **Actualizar interfaz `AdminProduct`:** añadir campo `images: Array<{ id: string; url: string; sortOrder: number; altText: string | null }>`.
  2. **Nueva función `addProductImage(productId, imageUrl, altText?)`:**
     - POST a `{SUPABASE_FUNCTIONS_URL}/manage-products/{productId}/images` con `{ url: imageUrl, altText }`.
     - Retorna `{ id, url, sortOrder }`.
  3. **Nueva función `deleteProductImage(productId, imageId)`:**
     - DELETE a `{SUPABASE_FUNCTIONS_URL}/manage-products/{productId}/images/{imageId}`.
     - También elimina el archivo de Supabase Storage: `supabaseClient.storage.from('product-images').remove([storagePath])` donde `storagePath` se extrae de la URL.
     - Retorna void.
  4. **Exportar** las dos nuevas funciones.
- **Test de aceptación:** `addProductImage` retorna objeto con id. `deleteProductImage` no lanza error. TypeScript compila sin errores en `product-admin.ts`.
- **Estado:** ✅ Completado 2026-05-16

##### PT-IMG-030-B2 · products/index.astro: galería multi-imagen en modal
- **Archivo:** `apps/vendor-admin/src/pages/products/index.astro` *(modificar)*
- **Qué hace:**
  1. **Estado Alpine ampliado:**
     - Añadir `images: []` (array de `{id, url}`) en el objeto `form`.
     - Añadir `uploadingImage: false` como flag de loading.
     - `openEditModal(product)`: poblar `form.images` desde `product.images`.
     - `resetForm()`: limpiar `form.images = []`.
  2. **Importar** `addProductImage` y `deleteProductImage` desde `product-admin.ts`.
  3. **Reemplazar la sección de imagen única** por la nueva sección de galería dentro del modal:
     - Encabezado: "Imágenes del producto" + contador `(X/10)`.
     - Grid de thumbnails existentes: `x-for="img in form.images"` — muestra `<img>` 80×80px + botón ✕.
       - Clic en ✕: llama `deleteProductImage(editingProduct.id, img.id)` → splice del array.
       - Si no hay `editingProduct.id` (creación): sólo splice del array (la imagen aún no está en DB, fue subida previamente; si se cancela el modal se elimina del storage).
     - Input de archivo + botón "Añadir imagen":
       - `accept="image/jpeg,image/png,image/webp"`.
       - `x-bind:disabled="form.images.length >= 10 || uploadingImage"`.
       - Al seleccionar: `uploadingImage = true` → `uploadProductImage(productId, file)` → `addProductImage(productId, url)` → push a `form.images` → `uploadingImage = false`.
       - Para creación (sin `productId`): el upload de imagen se hace **tras** `createProduct()`, igual que el flujo anterior de imagen única.
     - Indicador de carga: spinner o texto "Subiendo..." visible mientras `uploadingImage`.
  4. **CSS nuevo:** `.gallery-grid` (flex wrap, gap 8px), `.gallery-thumb` (80×80, object-cover, border-radius 8px, relative), `.gallery-thumb-delete` (posición absoluta top-right, botón rojo pequeño), `.gallery-upload-hint` (texto informativo).
  5. **Eliminar** la lógica antigua de `form.imageFile` / `form.imagePreviewUrl` de imagen única (reemplazada por la galería).
- **Test de aceptación:** Abrir modal de edición de producto con imágenes existentes → thumbnails visibles. Subir nueva imagen → aparece thumbnail sin recargar. Clic ✕ en thumbnail → desaparece. Con 10 imágenes el botón "Añadir" queda deshabilitado.
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO 3 — Storefront: catálogo + galería (2 archivos)

##### PT-IMG-030-C1 · catalog.ts: CatalogProduct.images + query con JOIN
- **Archivo:** `apps/storefront/src/lib/catalog/catalog.ts` *(modificar)*
- **Qué hace:**
  1. **Actualizar interfaz `CatalogProduct`:** añadir `images: string[]` (array de URLs ordenadas por sort_order).
  2. **`getVisibleProducts()`:** cambiar `.select('*')` por `.select('*, product_images(url, sort_order)')` + `.order('sort_order', { foreignTable: 'product_images' })`.
  3. **`getProductBySlug(slug)`:** mismo cambio de SELECT.
  4. **`mapToCatalogProduct(product)`:**
     - Leer `(product as Record<string, unknown>).product_images` → ordenar por `sort_order` → mapear a array de URL strings.
     - `images = sortedImages.map(i => i.url)`.
     - Fallback: si `images` está vacío y `imageUrl` no es null → `images = [imageUrl]`.
     - Si ambos vacíos → `images = []`.
- **Test de aceptación:** `getProductBySlug` retorna producto con `images: ['url1', 'url2', ...]`. TypeScript compila sin errores.
- **Estado:** ✅ Completado 2026-05-16

##### PT-IMG-030-C2 · [slug].astro: galería Alpine completa
- **Archivo:** `apps/storefront/src/pages/producto/[slug].astro` *(modificar)*
- **Qué hace:**

  **1. Datos SSR:** computar en frontmatter:
  ```
  const images = product.images.length > 0
    ? product.images
    : (product.imageUrl ? [product.imageUrl] : []);
  const hasGallery = images.length > 1;
  ```

  **2. Estructura HTML de galería** (reemplaza `.product-gallery` actual):
  - Si `!hasGallery`: mostrar layout actual (imagen única o placeholder). Sin cambios en este path.
  - Si `hasGallery`:
    ```
    <div class="gallery-wrap" x-data="galleryStore()" x-init="init()">
      <!-- Miniaturas (desktop: columna izquierda; móvil: fila inferior) -->
      <div class="thumb-strip">
        <button x-for="(url, idx) in images" :key="idx"
          class="thumb-btn" :class="{ 'thumb-btn--active': activeIdx === idx }"
          @click="setActive(idx)" @mouseenter="setActive(idx)"
          :aria-label="'Ver imagen ' + (idx+1) + ' de ' + images.length"
          :aria-current="activeIdx === idx">
          <img :src="url" :alt="productName + ' imagen ' + (idx+1)"
               width="80" height="80" loading="lazy" />
        </button>
      </div>
      <!-- Imagen principal -->
      <div class="main-image-wrap" @click="openLightbox()">
        <img :src="images[activeIdx]" :alt="productName"
             width="600" height="600" loading="eager"
             class="main-image" />
        <span class="zoom-hint" aria-hidden="true">🔍</span>
      </div>
    </div>
    ```

  **3. Lightbox** (al final del body, fuera del grid de producto):
  ```
  <div class="lightbox-overlay" x-show="lightboxOpen"
       role="dialog" aria-modal="true"
       @click.self="closeLightbox()"
       @keydown.escape.window="closeLightbox()">
    <button class="lightbox-prev" @click="prevImage()" aria-label="Imagen anterior">‹</button>
    <img :src="images[activeIdx]" :alt="productName" class="lightbox-img" />
    <button class="lightbox-next" @click="nextImage()" aria-label="Imagen siguiente">›</button>
    <button class="lightbox-close" @click="closeLightbox()" aria-label="Cerrar">✕</button>
  </div>
  ```

  **4. Alpine `galleryStore()`** — inline script en el componente:
  - `images`: array de URLs inyectado vía `data-images` attribute en el nodo raíz (JSON.stringify SSR → JSON.parse en init).
  - `activeIdx: 0`, `lightboxOpen: false`.
  - `setActive(idx)`, `openLightbox()`, `closeLightbox()`.
  - `prevImage()`: `activeIdx = (activeIdx - 1 + images.length) % images.length`.
  - `nextImage()`: `activeIdx = (activeIdx + 1) % images.length`.
  - `init()`: lee `this.$el.dataset.images` → JSON.parse → asigna `this.images`.

  **5. CSS nuevo:**
  - `.gallery-wrap`: `display: grid; grid-template-columns: 88px 1fr; gap: 1rem;` (desktop).
  - `.thumb-strip`: `display: flex; flex-direction: column; gap: 8px; overflow-y: auto; max-height: 520px`.
  - `.thumb-btn`: `width: 80px; height: 80px; border-radius: 8px; border: 2px solid transparent; overflow: hidden; cursor: pointer; background: none; padding: 0; transition: border-color 0.15s, box-shadow 0.15s`.
  - `.thumb-btn--active`: `border-color: #1a1a2e; box-shadow: 0 0 0 1px #1a1a2e`.
  - `.thumb-btn:hover`: `border-color: #9ca3af`.
  - `.thumb-btn img`: `width: 100%; height: 100%; object-fit: cover`.
  - `.main-image-wrap`: `position: relative; cursor: zoom-in; border-radius: 24px; overflow: hidden; background: #f9fafb`.
  - `.zoom-hint`: `position: absolute; bottom: 12px; right: 12px; background: rgba(0,0,0,0.4); color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; opacity: 0; transition: opacity 0.2s`.
  - `.main-image-wrap:hover .zoom-hint`: `opacity: 1`.
  - `.lightbox-overlay`: `position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 500; display: flex; align-items: center; justify-content: center; gap: 1rem`.
  - `.lightbox-img`: `max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px`.
  - `.lightbox-prev`, `.lightbox-next`: `background: rgba(255,255,255,0.15); border: none; color: white; font-size: 2.5rem; width: 48px; height: 48px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center`.
  - `.lightbox-close`: `position: absolute; top: 1rem; right: 1rem; background: rgba(255,255,255,0.15); border: none; color: white; font-size: 1.2rem; width: 36px; height: 36px; border-radius: 50%; cursor: pointer`.
  - **Responsive `@media (max-width: 968px)`:** `.gallery-wrap { grid-template-columns: 1fr; grid-template-rows: auto auto }` · `.thumb-strip { flex-direction: row; overflow-x: auto; max-height: none; order: 2 }` · `.main-image-wrap { order: 1 }`.

- **Test de aceptación:** Producto con 1 imagen → layout actual sin cambios. Producto con 3+ imágenes → se ven thumbnails. Clic en thumbnail → imagen principal cambia sin recargar. Thumbnail activo tiene borde `#1a1a2e`. Clic en imagen principal → lightbox se abre. Tecla Esc → lightbox se cierra. En móvil → thumbnails en fila horizontal debajo de imagen principal.
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO 4 — Persistencia

##### PT-IMG-030-D1 · HISTORY.log + limpieza de contexto de sesión
- **Archivos:** `docs/implementation/HISTORY.log`, `docs/implementation/PENDING_TASKS.md`, `docs/implementation/SESSION_SUMMARY.md`, `docs/implementation/PLAN_ACTUAL.md`
- **Qué hace:**
  1. Añadir entrada a `HISTORY.log` documentando PT-IMG-030 (todos los sub-tasks completados).
  2. Marcar PT-IMG-030 como cerrada en `PENDING_TASKS.md`.
  3. Vaciar `SESSION_SUMMARY.md` y `PLAN_ACTUAL.md`.
- **Estado:** ✅ Completado 2026-05-16

---

## Resumen de turnos de ejecución

| Turno | Sub-tasks | Archivos | Descripción |
|-------|-----------|----------|-------------|
| **1** | 030-A1, 030-A2 | `00032_product_images_gallery.sql` (nuevo) · `manage-products/index.ts` (mod) | Tabla DB + API de imágenes |
| **2** | 030-B1, 030-B2 | `product-admin.ts` (mod) · `products/index.astro` (mod) | Cliente TS + UI galería admin |
| **3** | 030-C1, 030-C2 | `catalog.ts` (mod) · `[slug].astro` (mod) | Catálogo con JOIN + galería storefront |
| **4** | 030-D1 | `HISTORY.log` · docs de sesión | Persistencia y limpieza |

**Total:** 4 turnos · 7 operaciones · 1 archivo nuevo · 6 archivos modificados

---

## PRIORIDAD MEDIA — Producción / Operativas (abiertas)

### PT-006 · Configurar variables de entorno de producción en Supabase
- **Contexto:** `ENCRYPTION_KEY`, `RESEND_API_KEY`, `LOGFLARE_API_KEY` y secretos de pasarelas no están configurados en el proyecto Supabase de producción (solo en `.env` local).
- **Acción manual:** `supabase secrets set --env-file .env.production` una vez que `.env.production` esté completo.

### PT-009 · Actualizar graphify tras cada sprint / sesión
- **Acción:** Ejecutar `/graphify . --update` al inicio de cada sesión. Hábito operativo — no es cambio de código.
