# Documento de Diseño de Software (SDD)

**Proyecto:** Micro-Store Arch
**Versión:** 1.0
**Fecha:** Mayo 2026
**Arquitecto:** Alberto Jacinto Martínez Torres

---

## 1. Introducción

### 1.1 Propósito
Este documento describe la arquitectura, diseño detallado, modelos de datos, diagramas de flujo e interfaces de usuario del sistema Micro-Store Arch.

### 1.2 Alcance
Cubre los tres módulos del sistema (Storefront, Client Hub, Vendor Admin), la capa de backend (Edge Functions), la base de datos, y la infraestructura de despliegue.

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE EDGE                          │
│                                                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │  STOREFRONT   │  │  CLIENT HUB   │  │ VENDOR ADMIN  │   │
│  │  (Astro SSG)  │  │  (Astro SPA)  │  │  (Astro SPA)  │   │
│  │               │  │               │  │               │   │
│  │  tienda.com   │  │cliente.tienda │  │ admin.tienda  │   │
│  │               │  │    .com       │  │    .com       │   │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘   │
│          │                  │                  │             │
└──────────┼──────────────────┼──────────────────┼─────────────┘
           │                  │                  │
           │        ┌─────────┴─────────┐        │
           │        │                   │        │
           └────────┤    SUPABASE       ├────────┘
                    │                   │
                    │  ┌─────────────┐  │
                    │  │    Auth     │  │
                    │  │ (Google,    │  │
                    │  │  Email/Pwd) │  │
                    │  └─────────────┘  │
                    │                   │
                    │  ┌─────────────┐  │
                    │  │  PostgreSQL │  │
                    │  │  + RLS      │  │
                    │  └─────────────┘  │
                    │                   │
                    │  ┌─────────────┐  │
                    │  │   Storage   │  │
                    │  │ (Imágenes)  │  │
                    │  └─────────────┘  │
                    │                   │
                    │  ┌─────────────┐  │
                    │  │    Edge     │  │
                    │  │  Functions  │  │
                    │  └─────────────┘  │
                    │                   │
                    └───────────────────┘
```

### 2.2 Patrones Arquitectónicos

| Patrón | Aplicación |
|---|---|
| **Jamstack** | Separación frontend/backend, SSG, APIs serverless |
| **Multi-Site** | 3 sitios independientes con responsabilidades separadas |
| **Edge Computing** | Edge Functions en Supabase (Deno) |
| **Arquitectura Hexagonal (simplificada)** | Controladores separados de handlers HTTP |
| **Repository Pattern** | Acceso a datos a través de Supabase Client |
| **Singleton** | Clientes de Supabase en Edge Functions |

### 2.3 Principios de Diseño

1. **Separación de Responsabilidades (SoC):** HTML en .astro, CSS en .css, lógica en .ts
2. **DRY (Don't Repeat Yourself):** Modelos y enums centralizados en @micro-store/core
3. **Seguridad por Diseño:** RLS, MFA, encriptación pgsodium
4. **Costo Cero:** Todo opera en free tiers
5. **Tipado Fuerte:** TypeScript strict, sin `any`, sin magic strings

---

## 3. Diagramas de Flujo

### 3.1 Flujo de Compra

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Navegar  │───▶│ Agregar  │───▶│ Checkout │───▶│  Pagar   │
│ Catálogo │    │ al Cart  │    │ (Envío)  │    │          │
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                      │
                                          ┌───────────┴───────────┐
                                          │                       │
                                    ┌─────┴─────┐          ┌─────┴─────┐
                                    │ Pago OK   │          │ Pago Fall │
                                    └─────┬─────┘          └─────┬─────┘
                                          │                       │
                                    ┌─────┴─────┐          ┌─────┴─────┐
                                    │ Confirmar │          │ Mostrar   │
                                    │ Orden     │          │ Error     │
                                    └─────┬─────┘          └───────────┘
                                          │
                                    ┌─────┴─────┐
                                    │ Enviar    │
                                    │ Email     │
                                    └───────────┘
```

### 3.2 Flujo de Autenticación del Vendedor (MFA)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Login   │───▶│ Cambiar  │───▶│  Setup   │───▶│ Verificar│
│ Email/   │    │Password? │    │  TOTP?   │    │  TOTP    │
│ Password │    └────┬─────┘    └────┬─────┘    └────┬─────┘
└──────────┘         │              │              │
                     │No            │No            │OK
                     ▼              ▼              ▼
              ┌──────────┐   ┌──────────┐   ┌──────────┐
              │ Verificar│   │ Generar  │   │  Acceso  │
              │  TOTP    │   │ QR +     │   │  Admin   │
              └────┬─────┘   │ Secreto  │   └──────────┘
                   │         └────┬─────┘
                   │OK            │
                   ▼              ▼
            ┌──────────┐   ┌──────────┐
            │  Acceso  │   │ Confirmar│
            │  Admin   │   │  Código  │
            └──────────┘   └──────────┘
```

### 3.3 Flujo de Confirmación de Pago (Webhook)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Pasarela │───▶│  Webhook │───▶│ Verificar│───▶│ Confirmar│
│ notifica │    │ recibe   │    │  Firma   │    │  Orden   │
│ pago     │    │ evento   │    │  HMAC    │    │  (RPC)   │
└──────────┘    └──────────┘    └────┬─────┘    └────┬─────┘
                                     │              │
                                     │Inválida      │OK
                                     ▼              ▼
                              ┌──────────┐    ┌──────────┐
                              │ Rechazar │    │ Restar   │
                              │ Evento   │    │ Stock    │
                              └──────────┘    └────┬─────┘
                                                   │
                                            ┌──────┴──────┐
                                            │             │
                                      ┌─────┴─────┐ ┌────┴──────┐
                                      │ Actualizar│ │ Disparar  │
                                      │ Estado    │ │ Email +   │
                                      │ Orden     │ │ Rebuild   │
                                      └───────────┘ └───────────┘
```

### 3.4 Flujo de Reconstrucción del Storefront

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Producto │───▶│ Trigger  │───▶│  Edge    │───▶│Cloudflare│
│ Cambia   │    │ DB       │    │ Function │    │Deploy    │
│ (INSERT, │    │ Notifica │    │ recibe   │    │Hook      │
│ UPDATE,  │    │          │    │ evento   │    │          │
│ DELETE)  │    └──────────┘    └──────────┘    └────┬─────┘
└──────────┘                                         │
                                                     ▼
                                              ┌──────────┐
                                              │ Rebuild  │
                                              │Storefront│
                                              │(SSG)     │
                                              └──────────┘
```

---

## 4. Modelo de Datos

### 4.1 Diagrama Entidad-Relación

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   profiles   │       │   products   │       │    orders    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ email        │       │ slug (UQ)    │       │ display_id   │
│ role (ENUM)  │       │ name         │       │ customer_id  │──┐
│ totp_secret  │       │ description  │       │ status(ENUM) │  │
│ totp_enabled │       │ price        │       │ shipping_addr│  │
│ created_at   │       │ stock_qty    │       │ total_amount │  │
│ updated_at   │       │ is_on_demand │       │ currency     │  │
└──────┬───────┘       │ is_visible   │       │ tracking_id  │  │
       │               │ created_at   │       │ carrier      │  │
       │               │ updated_at   │       │ created_at   │  │
       │               └──────────────┘       │ updated_at   │  │
       │                                      └──────┬───────┘  │
       │                                             │          │
       │               ┌──────────────┐              │          │
       │               │ order_items  │              │          │
       │               ├──────────────┤              │          │
       │               │ id (PK)      │              │          │
       └───────────────│ order_id (FK)│──────────────┘          │
                       │ product_id   │─────────────────────────┘
                       │ quantity     │
                       │ unit_price   │
                       │ fulfillment  │
                       │ _status(ENUM)│
                       └──────────────┘

┌──────────────────────┐
│ payment_credentials  │
├──────────────────────┤
│ id (PK)              │
│ vendor_id (FK)───────│──▶ profiles.id
│ gateway (ENUM)       │
│ is_enabled           │
│ credentials_encrypted│ (BYTEA, pgsodium)
│ last_rotated_at      │
│ created_at           │
│ updated_at           │
└──────────────────────┘
```

### 4.2 Tipos ENUM

```sql
user_role:              'customer' | 'vendor'
order_status:           'pending' | 'paid' | 'in_production' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
item_fulfillment_status:'pending' | 'reserved' | 'in_production' | 'ready_to_ship' | 'shipped'
payment_gateway:        'stripe' | 'paypal' | 'mercadopago' | 'hey_banco'
```

### 4.3 Relaciones

| Tabla A | Tabla B | Relación |
|---|---|---|
| profiles | auth.users | 1:1 (FK id) |
| orders | profiles | N:1 (FK customer_id) |
| order_items | orders | N:1 (FK order_id, CASCADE) |
| order_items | products | N:1 (FK product_id) |
| payment_credentials | profiles | N:1 (FK vendor_id) |

### 4.4 Índices

```sql
idx_products_last_stock_change ON products(last_stock_change)
idx_orders_customer_status ON orders(customer_id, status)
display_id UNIQUE INDEX ON orders(display_id)
vendor_gateway UNIQUE INDEX ON payment_credentials(vendor_id, gateway)
```

---

## 5. Diseño de Interfaz de Usuario

### 5.1 Storefront (tienda.com)

**Páginas:**
- `/` - Catálogo de productos con grid de ProductCard
- `/producto/[slug]` - Detalle de producto con imagen, precio, badge de stock
- `/sitemap.xml` - Sitemap dinámico
- `/robots.txt` - Configuración de crawling

**Componentes:**
- `BaseLayout.astro` - Layout principal con meta tags SEO
- `ProductCard.astro` - Tarjeta de producto con:
  - Imagen (con placeholder si no hay)
  - Nombre del producto
  - Precio formateado
  - Badge de stock (Disponible/Últimos/Agotado/Bajo Pedido)
  - Estados: normal, hover, sin imagen

### 5.2 Client Hub (cliente.tienda.com)

**Páginas:**
- `/` - Bienvenida
- `/auth/login` - Login con Google + formulario email/password
- `/auth/register` - Registro con Google + formulario email/password
- `/auth/callback` - Callback post-autenticación
- `/checkout` - Checkout multi-paso:
  - Paso 1: Dirección de envío
  - Paso 2: Selección de método de pago
  - Paso 3: Redirección a pasarela
  - Paso 4: Confirmación
- `/orders` - Lista de pedidos del cliente
- `/orders/[id]` - Detalle de pedido con timeline
- `/profile` - Perfil de usuario

**Tecnología:** Astro + React (SPA) + Supabase Realtime + hooks de estado (para checkout y timeline).

**Componentes:**
- `ClientHubLayout.astro` - Layout con header y navegación
- Timeline de pedido con 5 estados visuales (React component)
- Checkout Multi-paso (React state machine)

### 5.3 Vendor Admin (admin.tienda.com)

**Páginas:**
- `/` - Dashboard
- `/auth/login` - Login multi-paso:
  - Paso 1: Email y contraseña
  - Paso 2: Cambio de contraseña (primer ingreso)
  - Paso 3: Verificación TOTP
  - Paso 4: Configuración TOTP (QR + confirmación)
- `/products` - CRUD de productos con modal
- `/orders` - Panel de pedidos con filtros
- `/settings` - Configuración de pasarelas de pago

**Tecnología:** Astro + React (SPA) + TypeScript (Dashboard con filtros y gestión de estado compleja).

**Componentes:**
- `VendorAdminLayout.astro` - Layout con header y navegación
- Modal de creación/edición de producto (React + Zod)
- Modal de actualización de tracking
- Tabla de pedidos con filtros por estado (React Data Table)

### 5.4 Guía de Estilos Global

```css
/* Colores principales */
--primary:       #1a1a2e;
--primary-dark:  #16213e;
--success:       #2e7d32;
--success-bg:    #e8f5e9;
--warning:       #e65100;
--warning-bg:    #fff3e0;
--error:         #c62828;
--error-bg:      #ffebee;
--info:          #1565c0;
--info-bg:       #e3f2fd;

/* Tipografía */
font-family: system-ui, -apple-system, sans-serif;

/* Bordes */
border-radius: 8px (inputs), 12px (cards), 20px (badges)

/* Sombras */
box-shadow: 0 4px 12px rgba(0,0,0,0.08) (hover cards)
```

---

## 6. Diseño de Seguridad

### 6.1 Capas de Seguridad

```
┌─────────────────────────────────────────┐
│ 1. Transporte: HTTPS (Cloudflare SSL)   │
├─────────────────────────────────────────┤
│ 2. Autenticación: Supabase Auth (JWT)   │
├─────────────────────────────────────────┤
│ 3. Autorización: RLS + MFA claims       │
├─────────────────────────────────────────┤
│ 4. Encriptación: pgsodium (credenciales) │
├─────────────────────────────────────────┤
│ 5. Headers: CSP, X-Frame-Options, etc.  │
└─────────────────────────────────────────┘
```

### 6.2 Matriz de Acceso

| Operación | Visitante | Cliente | Vendedor (sin MFA) | Vendedor (con MFA) |
|---|---|---|---|---|
| Leer productos visibles | ✅ | ✅ | ✅ | ✅ |
| Registrarse | ✅ | N/A | N/A | N/A |
| Crear orden | ❌ | ✅ | ✅ | ✅ |
| Ver sus pedidos | ❌ | ✅ | ❌ | ✅ |
| Ver todos los pedidos | ❌ | ❌ | ❌ | ✅ |
| CRUD productos | ❌ | ❌ | ❌ | ✅ |
| Configurar pasarelas | ❌ | ❌ | ❌ | ✅ |

```
Login → JWT (amr: ['pwd']) → Verificar TOTP → JWT (amr: ['pwd','mfa'])
                                                      ↓
                                              RLS verifica claim 'mfa'
```

> 🔧 **Recomendación:** Usar `supabase.auth.admin.generateLink()` con `service_role` para emitir JWT con claims personalizados.

```typescript
// En Edge Function (login/verify-totp)
const { data, error } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: userEmail,
  options: { 
    data: { amr: ['pwd', 'mfa'] }
  }
});
```

---

## 7. Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     Monorepo Structure                       │
├─────────────────────────────────────────────────────────────┤
│  apps/                                                       │
│  ├── storefront/                                             │
│  │   ├── src/components/  (ProductCard, ProductGrid)        │
│  │   ├── src/layouts/     (BaseLayout)                      │
│  │   ├── src/pages/       (index, producto/[slug])          │
│  │   └── src/lib/         (catalog.ts, supabase-client.ts)  │
│  ├── client-hub/                                             │
│  │   ├── src/components/  (OrderTimeline, PaymentForm)      │
│  │   ├── src/layouts/     (ClientHubLayout)                 │
│  │   ├── src/pages/       (auth/*, checkout, orders/*)      │
│  │   └── src/lib/         (auth-client, checkout-client)    │
│  └── vendor-admin/                                           │
│      ├── src/components/  (ProductModal, OrderTable)        │
│      ├── src/layouts/     (VendorAdminLayout)               │
│      ├── src/pages/       (auth/*, products, orders)        │
│      └── src/lib/         (product-admin, order-admin)      │
├─────────────────────────────────────────────────────────────┤
│  packages/                                                   │
│  └── core/                                                   │
│      └── src/                                                │
│          ├── models/  (Product, Order, User, Payment)       │
│          ├── enums/   (OrderStatus, PaymentGateway, etc.)   │
│          ├── schemas/ (Zod schemas)                          │
│          └── utils/   (getStockBadge, calculateOrderStatus) │
├─────────────────────────────────────────────────────────────┤
│  supabase/                                                   │
│  └── functions/                                              │
│      ├── _shared/    (logger, error-handler, supabase-client)│
│      ├── _core/      (BaseController)                        │
│      ├── create-order/                                       │
│      ├── payment-webhook/                                    │
│      ├── manage-products/                                    │
│      ├── manage-orders/                                      │
│      ├── manage-payment-gateways/                            │
│      └── login/verify-totp/setup-totp/confirm-totp/         │
└─────────────────────────────────────────────────────────────┘

**Gestión del Monorepo:**
Monorepo con npm workspaces; `@micro-store/core` se linkea vía `file:../packages/core`.

---

## 8. Consideraciones de Infraestructura

### 8.1 Despliegue

| Componente | Plataforma | Plan |
|---|---|---|
| Storefront | Cloudflare Pages | Free |
| Client Hub | Cloudflare Pages | Free |
| Vendor Admin | Cloudflare Pages | Free |
| Base de Datos | Supabase | Free (500MB) |
| Auth | Supabase Auth | Free (50K MAU) |
| Edge Functions | Supabase | Free (500K/mes) |
| Storage | Supabase Storage | Free (1GB) |
| Emails | Resend | Free (100/día) |

### 8.2 Límites del Free Tier

| Recurso | Límite | Estrategia |
|---|---|---|
| Supabase DB | 500MB | Optimizar índices, limpiar logs |
| Supabase Auth | 50K MAU | Suficiente para MVP |
| Edge Functions | 500K/mes | Caché agresivo en frontend |
| Storage | 1GB | Optimizar imágenes (WebP) |
| Resend | 100 emails/día | Solo emails transaccionales |

### 8.3 Estrategia de Limpieza de Datos

Job semanal en GitHub Actions para archivar orders > 90 días y liberar espacio en Supabase.
- **Archivado:** Pedidos con más de 90 días de antigüedad se exportan a CSV y se eliminan de la base de datos principal.
- **Logs:** Limpieza automática de la tabla `webhook_events` con más de 30 días.

---
