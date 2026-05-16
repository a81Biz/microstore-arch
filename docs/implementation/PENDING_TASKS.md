# Tareas Pendientes — Micro-Store Arch

**Corte:** 2026-05-16 (sesión 11 · PT-ADMIN-032 completada)
**Estado general del proyecto:** Sprints 0-5 completos · PT-001–PT-032 cerradas

---

## PRIORIDAD ALTA — Activas

---

### PT-ADMIN-032 · Flujo Administrativo de Pedidos (Backoffice)

**Épica:** Completar el backoffice de pedidos del vendor-admin con audit trail de estados, nuevos estados del ciclo de vida, tabla de pagos por orden, campos de perfil de cliente y UX mejorada en el panel admin.

**Decisiones fijadas:**
- GAP-5: `packaged` e `in_transit` se agregan como valores nativos del enum `order_status`.
- GAP-4: Tabla `order_payments` separada (soporta múltiples intentos de pago por orden).
- GAP-2: `name` y `phone` migran a `profiles`; sincronización vía trigger desde `auth.users.raw_user_meta_data`.
- `search_orders` RPC no se modifica (ya tiene `p_date_from`/`p_date_to`); solo se conecta desde la UI.

---

#### TURNO A — DB: Enum extendido + profiles name/phone (2 archivos)

##### PT-ADMIN-032-A1 · Migración: extender order_status + columnas profiles
- **Archivo:** `supabase/migrations/00035_extend_order_status_and_profiles.sql` *(nuevo)*
- **Qué hace:**
  1. `ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'packaged' AFTER 'in_production'`.
  2. `ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'in_transit' AFTER 'shipped'`.
  3. `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT, ADD COLUMN IF NOT EXISTS phone TEXT`.
  4. `CREATE OR REPLACE FUNCTION sync_profile_meta()` — trigger AFTER UPDATE ON `auth.users` que copia `NEW.raw_user_meta_data->>'name'` y `->>'phone'` a `profiles` donde `id = NEW.id`, solo si los valores no son NULL.
  5. `CREATE TRIGGER trg_sync_profile_meta AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION sync_profile_meta()`.
- **Advertencia de migración:** `ALTER TYPE ... ADD VALUE` no puede ejecutarse dentro de `BEGIN/COMMIT` en PG 14. Usar sentencia standalone (sin bloque de transacción explícito).
- **Test de aceptación:** Migración aplica sin error. `\dT order_status` muestra 9 valores. `\d profiles` muestra columnas `name` y `phone`. Llamada a `supabase.auth.updateUser({ data: { name: 'Test', phone: '555' } })` → trigger actualiza `profiles.name` y `profiles.phone`.
- **Estado:** ✅ Completado 2026-05-16

##### PT-ADMIN-032-A2 · @micro-store/core: PACKAGED e IN_TRANSIT en OrderStatus
- **Archivo:** `packages/core/src/enums/order-status.ts` *(modificar)*
- **Qué hace:**
  1. Agregar `PACKAGED = 'packaged'` entre `IN_PRODUCTION` y `SHIPPED`.
  2. Agregar `IN_TRANSIT = 'in_transit'` entre `SHIPPED` y `DELIVERED`.
- **Test de aceptación:** `npm run test:core` pasa. `OrderStatus.PACKAGED === 'packaged'` y `OrderStatus.IN_TRANSIT === 'in_transit'`.
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO B — DB: Tablas order_status_history y order_payments (2 archivos)

##### PT-ADMIN-032-B1 · Migración: tabla order_status_history + trigger
- **Archivo:** `supabase/migrations/00036_order_status_history.sql` *(nuevo)*
- **Qué hace:**
  1. `CREATE TABLE order_status_history (id UUID PK, order_id UUID FK → orders(id) ON DELETE CASCADE, from_status order_status NULL, to_status order_status NOT NULL, changed_at TIMESTAMPTZ DEFAULT NOW())`.
  2. `CREATE INDEX idx_osh_order_id ON order_status_history(order_id, changed_at)`.
  3. `ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY`.
  4. Policy: solo `service_role` puede leer (no exposición directa al cliente).
  5. `CREATE OR REPLACE FUNCTION record_order_status_change()` — AFTER UPDATE OF status ON orders: INSERT INTO `order_status_history(order_id, from_status, to_status)` VALUES `(NEW.id, OLD.status, NEW.status)`.
  6. `CREATE TRIGGER trg_record_order_status_change AFTER UPDATE OF status ON orders FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION record_order_status_change()`.
- **Test de aceptación:** Cambiar status de una orden vía psql → `SELECT * FROM order_status_history WHERE order_id = '<id>'` retorna 1 fila con `from_status` y `to_status` correctos.
- **Estado:** ✅ Completado 2026-05-16

##### PT-ADMIN-032-B2 · Migración: tabla order_payments + RPC confirm_order_payment actualizado
- **Archivo:** `supabase/migrations/00037_order_payments_and_rpc.sql` *(nuevo)*
- **Qué hace:**
  1. `CREATE TABLE order_payments (id UUID PK, order_id UUID FK → orders(id) ON DELETE CASCADE, gateway payment_gateway NOT NULL, transaction_id TEXT NOT NULL, amount_cents INTEGER CHECK (amount_cents > 0), currency CHAR(3) DEFAULT 'MXN', paid_at TIMESTAMPTZ DEFAULT NOW())`.
  2. `CREATE INDEX idx_op_order_id ON order_payments(order_id)`.
  3. `ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY`. Policy: solo `service_role` puede leer/escribir.
  4. `CREATE OR REPLACE FUNCTION public.confirm_order_payment(p_order_id UUID, p_payment_intent_id TEXT, p_payment_method payment_gateway)` — versión actualizada que al final (después de confirmar stock y estado) hace `INSERT INTO order_payments(order_id, gateway, transaction_id, amount_cents, currency) SELECT id, p_payment_method, p_payment_intent_id, ROUND(total_amount * 100)::INT, currency FROM orders WHERE id = p_order_id`. Si el INSERT falla, loggear pero NO hacer RAISE (el pago ya está confirmado).
- **Test de aceptación:** Ejecutar `confirm_order_payment` en una orden pendiente → `SELECT * FROM order_payments WHERE order_id = '<id>'` retorna 1 fila con `gateway`, `transaction_id` y `amount_cents` correctos.
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO C — Backend + Tipos (2 archivos)

##### PT-ADMIN-032-C1 · manage-orders: detalle enriquecido + filtro por fecha
- **Archivo:** `supabase/functions/manage-orders/index.ts` *(modificar)*
- **Qué hace:**
  1. `getOrderDetail`: actualizar SELECT para incluir `profiles(email, name, phone)` y sub-select de `order_status_history` ordenado por `changed_at ASC` y sub-select de `order_payments`.
  2. `listOrders`: leer query params `date_from` y `date_to` de la URL; pasarlos como `p_date_from` y `p_date_to` al RPC `search_orders` (ya soportados). Validar que sean ISO 8601 válidos o ignorarlos.
  3. NO modificar `updateStatus` ni `updateTracking` — el trigger de DB registra el historial automáticamente.
- **Test de aceptación:** GET `/manage-orders/<id>` con token admin retorna `profiles.name`, `profiles.phone`, array `order_status_history` y objeto `order_payments[0]`. GET `/manage-orders?date_from=2026-01-01` filtra correctamente.
- **Estado:** ✅ Completado 2026-05-16

##### PT-ADMIN-032-C2 · order-admin.ts: tipos extendidos + loadOrders con fechas
- **Archivo:** `apps/vendor-admin/src/lib/orders/order-admin.ts` *(modificar)*
- **Qué hace:**
  1. Extender `AdminOrderDetail` con: `customerName: string | null`, `customerPhone: string | null`, `fullAddress: { street, city, postalCode, country } | null`, `statusHistory: Array<{ fromStatus: string | null; toStatus: string; changedAt: string }>`, `paymentInfo: { gateway: string; transactionId: string; amountCents: number; paidAt: string } | null`.
  2. Actualizar `loadOrderDetail` mapper para leer los nuevos campos.
  3. Extender `loadOrders(filters?)` con params opcionales `dateFrom?: string` y `dateTo?: string`; añadirlos como query params.
- **Test de aceptación:** TypeScript compila sin errores. `loadOrderDetail` retorna objeto con `statusHistory` array (puede estar vacío en tests).
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO D — Frontend: Vendor Admin UI + Client Hub detalle (2 archivos)

##### PT-ADMIN-032-D1 · vendor-admin orders/index.astro: UI completa
- **Archivo:** `apps/vendor-admin/src/pages/orders/index.astro` *(modificar)*
- **Qué hace:**
  1. **Filtros panel:** añadir inputs `date_from` y `date_to` (tipo `date`) con `x-model` → `fetchOrders()` al cambiar.
  2. **Filter select de estado:** añadir opciones `packaged`, `in_transit`, `refunded`.
  3. **`getStatusLabel()`:** mapear los 9 estados (ver tabla en PLAN_ACTUAL.md).
  4. **`TERMINAL_STATUSES`:** actualizar a `[OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED]`.
  5. **Modal detalle — sección "Cliente":** mostrar `customerName || '—'`, email, `customerPhone || '—'`, dirección completa (`street + city + postalCode + country`).
  6. **Modal detalle — sección "Historial de Estados":** timeline vertical con `x-for="entry in selectedOrder.statusHistory"`: icono de flecha, `from_status → to_status`, fecha/hora formateada.
  7. **Modal detalle — sección "Pago":** si `paymentInfo`: gateway en mayúsculas, transacción, monto, fecha.
  8. **Selector de cambio de estado:** añadir `packaged`, `in_transit`, `refunded`.
  9. CSS: `.status--packaged`, `.status--in_transit`, `.status--refunded`; estilos de timeline vertical; sección pago.
- **Test de aceptación:** HTTP 200 al cargar `/orders`. Modal detalle muestra nombre y teléfono del cliente (si existen). Historial de estados visible. Filtros de fecha reducen resultados. Selector incluye todos los nuevos estados.
- **Estado:** ✅ Completado 2026-05-16

##### PT-ADMIN-032-D2 · client-hub orders/[id].astro: labels y CSS para nuevos estados
- **Archivo:** `apps/client-hub/src/pages/orders/[id].astro` *(modificar)*
- **Qué hace:**
  1. Actualizar `getStatusLabel()`: añadir `packaged: 'Empaquetado'`, `in_transit: 'En tránsito'`, `refunded: 'Reembolsado'`.
  2. Añadir estilos CSS: `.status--packaged`, `.status--in_transit`, `.status--refunded`.
- **Test de aceptación:** HTTP 200 al cargar `/orders/[id]`. No hay regresión en pedidos existentes.
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO D2 — Client Hub: timeline + lista de pedidos (2 archivos)

##### PT-ADMIN-032-D2a · order-client.ts: generateTimeline para nuevos estados
- **Archivo:** `apps/client-hub/src/lib/orders/order-client.ts` *(modificar)*
- **Qué hace:**
  1. Importar `OrderStatus.PACKAGED` y `OrderStatus.IN_TRANSIT` de `@micro-store/core`.
  2. Actualizar array `inProgress` a incluir `PACKAGED`: `[OrderStatus.IN_PRODUCTION, OrderStatus.PACKAGED, OrderStatus.SHIPPED, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED]`.
  3. Actualizar array `shipped` a incluir `IN_TRANSIT`: `[OrderStatus.SHIPPED, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED]`.
  4. Añadir paso de timeline entre "En producción" y "Enviado": `{ label: 'Empaquetado', status: ..., icon: '📦' }` — completado si status ∈ {PACKAGED, SHIPPED, IN_TRANSIT, DELIVERED}.
  5. Añadir paso de timeline entre "Enviado" y "Entregado": `{ label: 'En tránsito', status: ..., icon: '🛣️' }` — completado si status ∈ {IN_TRANSIT, DELIVERED}.
- **Test de aceptación:** `npm run test:core` (no afecta directamente). Orden con status `packaged` → timeline muestra "Empaquetado" como `current`. Orden con `in_transit` → "En tránsito" como `current`. No hay regresión en estados existentes.
- **Estado:** ✅ Completado 2026-05-16

##### PT-ADMIN-032-D2b · client-hub orders/index.astro: labels y CSS para nuevos estados
- **Archivo:** `apps/client-hub/src/pages/orders/index.astro` *(modificar)*
- **Qué hace:**
  1. Actualizar `getStatusLabel()`: añadir `packaged: 'Empaquetado'`, `in_transit: 'En tránsito'`, `refunded: 'Reembolsado'`.
  2. Añadir estilos CSS: `.status--packaged`, `.status--in_transit`, `.status--refunded` (consistentes con client-hub [id].astro).
- **Test de aceptación:** HTTP 200. No hay regresión.
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO E — Persistencia (2 archivos)

##### PT-ADMIN-032-E1 · HISTORY.log + PENDING_TASKS.md
- **Archivos:** `docs/implementation/HISTORY.log` *(modificar)* · `docs/implementation/PENDING_TASKS.md` *(modificar)*
- **Qué hace:** Añadir entrada PT-ADMIN-032 a HISTORY.log. Marcar todas las sub-tareas como completadas.
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO F — Documentación arquitectónica (2 archivos)

##### PT-ADMIN-032-F1 · README.md + HANDOFF.md
- **Archivos:** `README.md` *(modificar)* · `docs/HANDOFF.md` *(modificar)*
- **Qué hace:**
  1. README: actualizar tabla de estados del pedido (9 valores), mencionar tablas 00035–00037.
  2. HANDOFF: sprint note PT-ADMIN-032.
  3. Limpiar `PLAN_ACTUAL.md` y `SESSION_SUMMARY.md`.
- **Estado:** ✅ Completado 2026-05-16

---

## Resumen de turnos PT-ADMIN-032

| Turno | Sub-tasks | Archivos | Descripción |
|---|---|---|---|
| **A** | 032-A1, 032-A2 | `00035_*.sql` (nuevo) · `order-status.ts` (mod) | Enum extendido + profiles name/phone |
| **B** | 032-B1, 032-B2 | `00036_*.sql` (nuevo) · `00037_*.sql` (nuevo) | Tablas history + payments + RPC actualizado |
| **C** | 032-C1, 032-C2 | `manage-orders/index.ts` (mod) · `order-admin.ts` (mod) | Backend enriquecido + tipos extendidos |
| **D** | 032-D1, 032-D2 | `vendor-admin/orders/index.astro` (mod) · `client-hub/orders/[id].astro` (mod) | UI vendor admin completa + labels cliente detalle |
| **D2** | 032-D2a, 032-D2b | `order-client.ts` (mod) · `client-hub/orders/index.astro` (mod) | Timeline fix + labels lista cliente |
| **E** | 032-E1 | `HISTORY.log` (mod) · `PENDING_TASKS.md` (mod) | Persistencia |
| **F** | 032-F1 | `README.md` (mod) · `HANDOFF.md` (mod) | Docs arquitectónicas + limpieza |

**Total:** 7 turnos · 13 operaciones · 3 archivos nuevos · 10 archivos modificados

---

### PT-CLIENT-031 · Flujo del Cliente: Direcciones, Perfil, Cart Sync y Emails Transaccionales

**Épica:** Implementar flujo completo del cliente en client.localhost — direcciones guardadas, perfil enriquecido, sincronización de carrito y emails de negocio.
**Decisión fijada:** Checkout se mantiene de un solo paso (sin wizard multi-step); se añade selector de direcciones encima del formulario existente.

---

#### TURNO A — Base de datos: customer_addresses + Edge Function manage-addresses (2 archivos)

##### PT-CLIENT-031-A1 · Migración: tabla customer_addresses
- **Archivo:** `supabase/migrations/00033_customer_addresses.sql` *(nuevo)*
- **Qué hace:**
  1. `CREATE TABLE customer_addresses` con columnas: `id UUID PK`, `user_id UUID FK → auth.users(id) ON DELETE CASCADE`, `label TEXT CHECK IN ('home','office','other')`, `street TEXT NOT NULL`, `city TEXT NOT NULL`, `postal_code TEXT NOT NULL`, `country CHAR(2) NOT NULL`, `is_default BOOLEAN DEFAULT false`, `created_at TIMESTAMPTZ DEFAULT NOW()`.
  2. `ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY`.
  3. Policy `"Owner access only"`: `FOR ALL USING (auth.uid() = user_id)`.
  4. Trigger `enforce_single_default`: cuando se inserta/actualiza `is_default = true`, hace `UPDATE customer_addresses SET is_default = false WHERE user_id = NEW.user_id AND id <> NEW.id`.
- **Test de aceptación:** `docker compose down -v && docker compose up` → db-migrate ExitCode=0 · tabla creada con RLS activa.
- **Estado:** ✅ Completado 2026-05-16

##### PT-CLIENT-031-A2 · Edge Function: manage-addresses (CRUD)
- **Archivo:** `supabase/functions/manage-addresses/index.ts` *(nuevo)*
- **Qué hace:**
  1. `GET /manage-addresses` — lista todas las direcciones del usuario autenticado (SELECT * WHERE user_id = auth.uid() ORDER BY is_default DESC, created_at ASC).
  2. `POST /manage-addresses` — crea nueva dirección (Zod validation: label, street, city, postal_code, country).
  3. `PUT /manage-addresses/:id` — actualiza (valida `user_id = auth.uid()` antes de UPDATE).
  4. `DELETE /manage-addresses/:id` — elimina (valida ownership).
  5. `PATCH /manage-addresses/:id/default` — establece como default; el trigger DB desmarca las demás.
  6. Reutiliza patrón BaseController (manejo de errores, CORS, auth header).
- **Test de aceptación:** POST crea dirección. GET devuelve lista del usuario. Usuario B no puede leer/editar dirección de usuario A (RLS devuelve 0 filas / error 403). PATCH /default → solo una dirección queda con `is_default = true`.
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO B — Checkout: selector de direcciones guardadas (2 archivos)

##### PT-CLIENT-031-B1 · checkout-client.ts: funciones de direcciones
- **Archivo:** `apps/client-hub/src/lib/checkout/checkout-client.ts` *(modificar)*
- **Qué hace:**
  1. Añadir interfaz `CustomerAddress { id, label, street, city, postalCode, country, isDefault }`.
  2. Añadir `loadSavedAddresses(): Promise<CustomerAddress[]>` — GET /manage-addresses con Bearer token.
  3. Añadir `saveAddressToAccount(address: Omit<CustomerAddress, 'id'|'isDefault'>): Promise<CustomerAddress>` — POST /manage-addresses.
  4. NO modificar `createOrder()` — sigue enviando `shipping_address` como JSONB inline.
- **Test de aceptación:** TypeScript compila sin errores. `loadSavedAddresses` devuelve array vacío si usuario sin direcciones.
- **Estado:** ✅ Completado 2026-05-16

##### PT-CLIENT-031-B2 · checkout/index.astro: selector de dirección + opción guardar
- **Archivo:** `apps/client-hub/src/pages/checkout/index.astro` *(modificar)*
- **Qué hace:**
  1. Al cargar (Alpine `init()`): si usuario autenticado, llamar `loadSavedAddresses()` → poblar `savedAddresses[]`.
  2. Si `savedAddresses.length > 0`: mostrar sección "Mis direcciones" con lista de radio buttons (label + calle + ciudad). Opción extra "Nueva dirección".
  3. Al seleccionar dirección guardada: prellenar campos del formulario (street, city, postal_code, country) — editable.
  4. Si selecciona "Nueva dirección" o no hay guardadas: formulario vacío como antes.
  5. Checkbox "Guardar esta dirección para futuras compras" (visible solo en "Nueva dirección" + usuario autenticado) → al confirmar orden, si checked, llamar `saveAddressToAccount()`.
  6. Actualizar `checkout-flow.test.ts` con los nuevos selectors/flujos.
- **Test de aceptación:** Usuario sin direcciones → solo ve formulario vacío (sin regresión). Usuario con 2 direcciones → ve radios + formulario prellenado al seleccionar. Checkbox guarda nueva dirección correctamente. `checkout-flow.test.ts` pasa.
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO C — Perfil: cliente TS + UI enriquecida (2 archivos)

##### PT-CLIENT-031-C1 · profile-client.ts: nueva lib de perfil
- **Archivo:** `apps/client-hub/src/lib/profile/profile-client.ts` *(nuevo)*
- **Qué hace:**
  1. `updateProfile(name: string, phone: string): Promise<void>` — llama `supabase.auth.updateUser({ data: { name, phone } })`.
  2. `loadAddresses(): Promise<CustomerAddress[]>` — re-exporta o llama `loadSavedAddresses()` de checkout-client.
  3. `deleteAddress(id: string): Promise<void>` — DELETE /manage-addresses/:id.
  4. `setDefaultAddress(id: string): Promise<void>` — PATCH /manage-addresses/:id/default.
  5. `createAddress(address): Promise<CustomerAddress>` — POST /manage-addresses.
  6. Exporta interfaz `CustomerAddress` como tipo compartido.
- **Test de aceptación:** TypeScript compila sin errores. Funciones retornan los tipos correctos.
- **Estado:** ✅ Completado 2026-05-16

##### PT-CLIENT-031-C2 · profile/index.astro: datos personales + gestión de direcciones
- **Archivo:** `apps/client-hub/src/pages/profile/index.astro` *(modificar)*
- **Qué hace:**
  1. **Sección "Datos personales":** campos nombre y teléfono (Alpine form), botón Guardar → `updateProfile()`.
  2. **Sección "Cambio de contraseña":** inputs contraseña actual + nueva + confirmación → llama Edge Function `change-password` existente.
  3. **Sección "Mis direcciones":** lista de tarjetas con label (home/office/other), dirección completa, badge "Predeterminada". Botones: Editar (abre modal), Eliminar (confirma), Establecer como predeterminada. Botón "Añadir dirección" (abre modal).
  4. Modal React (`AddressModal.tsx`) para crear/editar: campos label (select), street, city, postal_code, country.
  5. Tabs o acordeón Alpine.js para separar las 3 secciones.
- **Test de aceptación:** Guardar nombre → persiste tras recargar. Cambio de contraseña → Edge Function responde 200. Añadir dirección → aparece en lista. Eliminar → desaparece. Solo una puede ser predeterminada.
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO D1 — Cart: migración cart_items + Edge Function manage-cart (2 archivos)

##### PT-CLIENT-031-D1a · Migración: tabla cart_items
- **Archivo:** `supabase/migrations/00034_cart_items.sql` *(nuevo)*
- **Qué hace:**
  1. `CREATE TABLE cart_items` con columnas: `id UUID PK`, `user_id UUID FK → auth.users(id) ON DELETE CASCADE`, `product_id UUID FK → products(id) ON DELETE CASCADE`, `quantity INT CHECK (quantity > 0)`, `updated_at TIMESTAMPTZ DEFAULT NOW()`. UNIQUE `(user_id, product_id)`.
  2. `ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY`.
  3. Policy `"Owner access only"`: `FOR ALL USING (auth.uid() = user_id)`.
- **Test de aceptación:** db-migrate aplica migración sin errores. UNIQUE constraint previene duplicados por producto.
- **Estado:** ✅ Completado 2026-05-16

##### PT-CLIENT-031-D1b · Edge Function: manage-cart (sync + CRUD)
- **Archivo:** `supabase/functions/manage-cart/index.ts` *(nuevo)*
- **Qué hace:**
  1. `POST /manage-cart/sync` — recibe `{ items: [{product_id, quantity}] }` (localStorage cart), hace UPSERT con `ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = GREATEST(excluded.quantity, cart_items.quantity), updated_at = NOW()`. Retorna carrito resultante.
  2. `GET /manage-cart` — devuelve items del carrito del usuario con JOIN a products (name, price, image_url).
  3. `DELETE /manage-cart/:product_id` — elimina un item específico.
  4. `DELETE /manage-cart` — vacía el carrito completo (tras completar orden).
- **Test de aceptación:** POST /sync con 2 items → GET devuelve 2 items. POST /sync con item ya existente → quantity = GREATEST(ambos). DELETE /:product_id → item desaparece. DELETE (vaciar) → GET devuelve [].
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO D2 — Cart sync al login (2 archivos)

##### PT-CLIENT-031-D2a · auth-client.ts: syncCartOnLogin
- **Archivo:** `apps/client-hub/src/lib/auth/auth-client.ts` *(modificar)*
- **Qué hace:**
  1. Añadir función `syncCartOnLogin(localCartJson: string): Promise<void>` — parsea JSON del localStorage, llama POST /manage-cart/sync con los items. No lanza error si falla (fire-and-forget con log).
  2. NO modificar ninguna firma existente (`signInWithEmail`, `signInWithGoogle`, `signOut`, `getCurrentUser`).
- **Test de aceptación:** TypeScript compila sin errores. Llamada a función con carrito vacío no lanza error.
- **Estado:** ✅ Completado 2026-05-16

##### PT-CLIENT-031-D2b · callback.astro: merge carrito post-OAuth
- **Archivo:** `apps/client-hub/src/pages/auth/callback.astro` *(modificar)*
- **Qué hace:**
  1. Tras confirmar sesión OAuth con Supabase, leer `localStorage.getItem('cart')` del cliente (script inline en `<head>`).
  2. Si hay items, llamar `syncCartOnLogin(cartJson)`.
  3. Redirigir a `/checkout` o a la URL de retorno guardada en `sessionStorage`.
  4. La misma lógica de sync en `login.astro` (post signInWithEmail): añadir llamada a `syncCartOnLogin` antes del redirect.
- **Test de aceptación:** Usuario con carrito localStorage hace login → carrito aparece en GET /manage-cart. Usuario sin carrito hace login → sin errores.
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO E1 — Email transaccional: Edge Function + variable de entorno (2 archivos)

##### PT-CLIENT-031-E1a · send-transactional-email Edge Function
- **Archivo:** `supabase/functions/send-transactional-email/index.ts` *(nuevo)*
- **Qué hace:**
  1. Interface: `sendEmail(to: string, templateId: 'account_created'|'order_placed'|'order_shipped'|'order_delivered', data: Record<string,unknown>): Promise<void>`.
  2. Integración con Resend (POST a `https://api.resend.com/emails`, header `Authorization: Bearer ${RESEND_API_KEY}`).
  3. Templates HTML inline para cada tipo: incluyen logo, datos del pedido/usuario, CTA.
  4. Si `RESEND_API_KEY` no está definida: log warning + return sin lanzar error (nunca bloquea la operación principal).
  5. Expuesta como función interna (no en Kong/external); llamada internamente por otras Edge Functions via fetch interno.
- **Test de aceptación:** Llamada con API key válida → email enviado (Inbucket lo captura en local). Sin API key → función retorna sin error.
- **Estado:** ✅ Completado 2026-05-16

##### PT-CLIENT-031-E1b · .env.example: añadir RESEND_API_KEY
- **Archivo:** `.env.example` *(modificar)*
- **Qué hace:** Añadir línea `RESEND_API_KEY=` con comentario `# Resend.com API key para emails transaccionales (orden, envío, entrega)`.
- **Test de aceptación:** `.env.example` tiene la variable documentada.
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO E2 — Hooks de email en ordenes (2 archivos)

##### PT-CLIENT-031-E2a · create-order: hook email pedido realizado
- **Archivo:** `supabase/functions/create-order/index.ts` *(modificar)*
- **Qué hace:** Tras `create_order_atomic()` exitoso, llamar `sendEmail(userEmail, 'order_placed', { orderId, displayId, totalAmount, items })`. La llamada es fire-and-forget (no bloquea la respuesta 201).
- **Test de aceptación:** Crear orden → Inbucket recibe email "Tu pedido ha sido realizado". Fallo del email no devuelve error 500.
- **Estado:** ✅ Completado 2026-05-16

##### PT-CLIENT-031-E2b · manage-orders: hooks email enviado/entregado
- **Archivo:** `supabase/functions/manage-orders/index.ts` *(modificar)*
- **Qué hace:** En `updateTracking()` (o handler de update status), cuando `status` cambia a `'shipped'` → `sendEmail(userEmail, 'order_shipped', { orderId, trackingCode })`. Cuando cambia a `'delivered'` → `sendEmail(userEmail, 'order_delivered', { orderId })`. Fire-and-forget.
- **Test de aceptación:** Cambiar estado orden a `shipped` → Inbucket recibe email de envío. Cambiar a `delivered` → email de entrega.
- **Estado:** ✅ Completado 2026-05-16

---

#### TURNO F — Persistencia (2 archivos)

##### PT-CLIENT-031-F1 · HISTORY.log + limpieza de sesión
- **Archivos:** `docs/implementation/HISTORY.log` *(modificar)* · `docs/implementation/PENDING_TASKS.md` *(modificar)* · `docs/implementation/SESSION_SUMMARY.md` *(limpiar)* · `docs/implementation/PLAN_ACTUAL.md` *(limpiar)*
- **Qué hace:** Añadir entrada a HISTORY.log con todos los archivos de PT-CLIENT-031. Marcar sub-tareas como completadas. Vaciar SESSION_SUMMARY y PLAN_ACTUAL.
- **Estado:** ✅ Completado 2026-05-16

---

## Resumen de turnos PT-CLIENT-031

| Turno | Sub-tasks | Archivos | Descripción |
|-------|-----------|----------|-------------|
| **A** | 031-A1, 031-A2 | `00033_customer_addresses.sql` (nuevo) · `manage-addresses/index.ts` (nuevo) | Tabla DB + CRUD Edge Function |
| **B** | 031-B1, 031-B2 | `checkout-client.ts` (mod) · `checkout/index.astro` (mod) | Selector de direcciones en checkout |
| **C** | 031-C1, 031-C2 | `profile-client.ts` (nuevo) · `profile/index.astro` (mod) | Lib perfil + UI enriquecida |
| **D1** | 031-D1a, 031-D1b | `00034_cart_items.sql` (nuevo) · `manage-cart/index.ts` (nuevo) | Tabla cart + sync Edge Function |
| **D2** | 031-D2a, 031-D2b | `auth-client.ts` (mod) · `callback.astro` (mod) | Merge carrito al login |
| **E1** | 031-E1a, 031-E1b | `send-transactional-email/index.ts` (nuevo) · `.env.example` (mod) | Edge Function emails + var entorno |
| **E2** | 031-E2a, 031-E2b | `create-order/index.ts` (mod) · `manage-orders/index.ts` (mod) | Hooks email en órdenes |
| **F** | 031-F1 | docs de sesión | Persistencia y limpieza |

**Total:** 8 turnos · 14 operaciones · 7 archivos nuevos · 7 archivos modificados

---

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
