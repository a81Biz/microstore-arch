# Especificación de Requisitos de Software (SRS)

**Proyecto:** Micro-Store Arch
**Versión:** 1.0
**Fecha:** Mayo 2026
**Arquitecto:** Alberto Jacinto Martínez Torres

---

## 1. Introducción

### 1.1 Propósito
Este documento define los requisitos funcionales y no funcionales del ecosistema de e-commerce Micro-Store Arch. Está dirigido al equipo de desarrollo, stakeholders y auditores del proyecto.

### 1.2 Alcance del Sistema
Micro-Store Arch es un ecosistema de comercio electrónico Jamstack compuesto por tres módulos:
- **Storefront:** Tienda pública con catálogo de productos
- **Client Hub:** Portal de clientes para checkout y seguimiento de pedidos
- **Vendor Admin:** Panel de administración para gestión de negocio

### 1.3 Definiciones y Acrónimos
| Término | Definición |
|---|---|
| SSG | Static Site Generation - Generación estática del sitio |
| SPA | Single Page Application - Aplicación de página única |
| JWT | JSON Web Token - Token de autenticación |
| MFA | Multi-Factor Authentication - Autenticación de múltiples factores |
| TOTP | Time-based One-Time Password - Contraseña temporal |
| RLS | Row Level Security - Seguridad a nivel de fila en BD |
| RPC | Remote Procedure Call - Llamada a procedimiento remoto |

---

## 2. Descripción General

### 2.1 Perspectiva del Producto
Sistema de e-commerce auto-contenido diseñado para operar con costo operativo tendiente a cero, utilizando exclusivamente servicios con free tier generoso (Cloudflare Pages, Supabase).

### 2.2 Funcionalidades Principales
1. Catálogo de productos con generación estática (SSG)
2. Autenticación de clientes (Google OAuth + Email/Password)
3. Autenticación de vendedor con MFA obligatorio (TOTP)
4. Checkout con múltiples pasarelas de pago
5. Seguimiento de pedidos en tiempo real
6. Panel de administración seguro

### 2.3 Perfiles de Usuario
| Perfil | Descripción | Privilegios |
|---|---|---|
| **Visitante** | Usuario no autenticado | Ver catálogo, ver productos |
| **Cliente** | Usuario registrado y verificado | Comprar, ver pedidos, ver perfil |
| **Vendedor** | Administrador único | Gestionar productos, pedidos, pasarelas, configuración |

### 2.4 Stack Tecnológico
| Capa | Tecnología | Justificación |
|---|---|---|
| Storefront | Astro (SSG) + Alpine.js | Máximo rendimiento SEO, interactividad ligera |
| Client Hub | Astro + React (SPA) + TypeScript | Estado complejo de checkout, suscripciones realtime, validación de formularios |
| Vendor Admin | Astro + React (SPA) + TypeScript | Dashboard con filtros, modales de CRUD, gestión de credenciales seguras |
| Shared Core | packages/core con Zod, enums, tipos TS | Reutilización de contratos entre frontend y Edge Functions |

---

## 3. Requisitos Funcionales

### RF-01: Catálogo de Productos
| ID | Descripción | Prioridad |
|---|---|---|
| RF-01.1 | El sistema debe mostrar un listado de productos visibles | Alta |
| RF-01.2 | El catálogo debe generarse estáticamente (SSG) para máximo rendimiento | Alta |
| RF-01.3 | Cada producto debe mostrar badge de disponibilidad (Disponible, Últimos, Agotado, Bajo Pedido) | Alta |
| RF-01.4 | El sistema debe mostrar página de detalle por producto (/producto/[slug]) | Alta |
| RF-01.5 | El catálogo debe reconstruirse automáticamente al cambiar stock o precio | Alta |
| RF-01.6 | Se debe generar sitemap.xml dinámico con todos los productos visibles | Media |

### RF-02: Autenticación de Cliente
| ID | Descripción | Prioridad |
|---|---|---|
| RF-02.1 | El cliente debe poder registrarse con email y contraseña | Alta |
| RF-02.2 | El cliente debe poder registrarse/iniciar sesión con Google OAuth | Alta |
| RF-02.3 | El sistema debe enviar email de verificación al registrarse | Alta |
| RF-02.4 | El cliente debe poder recuperar su contraseña | Media |
| RF-02.5 | El cliente debe poder ver y editar su perfil | Baja |

### RF-03: Autenticación de Vendedor
| ID | Descripción | Prioridad |
|---|---|---|
| RF-03.1 | El vendedor debe ingresar con credenciales pre-configuradas | Alta |
| RF-03.2 | El sistema debe forzar cambio de contraseña en el primer ingreso | Alta |
| RF-03.3 | La nueva contraseña debe tener mínimo 12 caracteres complejos | Alta |
| RF-03.4 | El sistema debe requerir activación de MFA (TOTP) mediante Google Authenticator | Alta |
| RF-03.5 | Cada inicio de sesión debe requerir código TOTP después de la activación | Alta |
| RF-03.6 | Las operaciones administrativas deben validar el segundo factor | Alta |

### RF-04: Checkout y Pagos
| ID | Descripción | Prioridad |
|---|---|---|
| RF-04.1 | El cliente debe poder seleccionar productos y proceder al checkout | Alta |
| RF-04.2 | El sistema debe validar stock atómicamente antes de crear la orden | Alta |
| RF-04.3 | El cliente debe seleccionar método de pago entre los disponibles | Alta |
| RF-04.4 | El sistema debe integrar Stripe como pasarela de pago | Alta |
| RF-04.5 | El sistema debe integrar PayPal como pasarela de pago | Media |
| RF-04.6 | El sistema debe integrar Mercado Pago como pasarela de pago | Media |
| RF-04.7 | El sistema debe integrar Hey Banco como método de transferencia (El estado se actualiza vía polling o confirmación manual del vendedor) | Baja |
| RF-04.8 | El checkout solo debe mostrar métodos de pago activos | Alta |
| RF-04.9 | El sistema debe enviar email de confirmación al completar el pago | Alta |

### RF-05: Gestión de Pedidos
| ID | Descripción | Prioridad |
|---|---|---|
| RF-05.1 | El cliente debe ver lista de todos sus pedidos | Alta |
| RF-05.2 | El cliente debe ver detalle de pedido con timeline visual | Alta |
| RF-05.3 | El timeline debe mostrar estados: Pendiente → Pagado → En Producción → Enviado → Entregado | Alta |
| RF-05.4 | El cliente debe recibir actualizaciones en tiempo real del estado | Media |
| RF-05.5 | El cliente debe ver tracking ID cuando el pedido sea enviado | Alta |
| RF-05.6 | El vendedor debe poder filtrar pedidos por estado | Alta |
| RF-05.7 | El vendedor debe poder buscar pedidos por email o ID | Media |
| RF-05.8 | El vendedor debe poder cambiar estado de pedido manualmente | Alta |
| RF-05.9 | El vendedor debe poder ingresar tracking ID y paquetería | Alta |
| RF-05.10 | El sistema debe enviar email automático al actualizar el estado | Media |

### RF-06: Gestión de Productos (Admin)
| ID | Descripción | Prioridad |
|---|---|---|
| RF-06.1 | El vendedor debe poder crear nuevos productos | Alta |
| RF-06.2 | El vendedor debe poder editar productos existentes | Alta |
| RF-06.3 | El vendedor debe poder eliminar productos | Media |
| RF-06.4 | El vendedor debe poder activar/desactivar modo "bajo pedido" | Alta |
| RF-06.5 | El vendedor debe poder ocultar/mostrar productos en tienda | Alta |
| RF-06.6 | El vendedor debe poder subir imágenes de producto | Media |

### RF-07: Configuración de Pasarelas
| ID | Descripción | Prioridad |
|---|---|---|
| RF-07.1 | El vendedor debe poder configurar credenciales de cada pasarela | Alta |
| RF-07.2 | Las credenciales deben almacenarse encriptadas (nunca texto plano) | Alta |
| RF-07.3 | Las credenciales nunca deben exponerse al frontend | Alta |
| RF-07.4 | El vendedor debe poder activar/desactivar pasarelas | Alta |

---

## 4. Requisitos No Funcionales

### 4.1 Rendimiento
| ID | Descripción | Métrica |
|---|---|---|
| RNF-01 | El Storefront debe cargar en menos de 2 segundos (LCP) | < 2s |
| RNF-02 | Las Edge Functions deben responder en menos de 500ms | < 500ms |
| RNF-03 | La base de datos debe soportar concurrencia en operaciones de stock | Atomicidad |
| RNF-04 | El tiempo de rebuild del Storefront debe ser menor a 30 segundos (Si el rebuild excede 30s, usar cache stale-while-revalidate) | < 30s |

### 4.2 Seguridad
| ID | Descripción | Implementación |
|---|---|---|
| RNF-05 | Todas las comunicaciones deben ser sobre HTTPS | Cloudflare SSL |
| RNF-06 | Las contraseñas deben almacenarse con hash (nunca texto plano) | Supabase Auth |
| RNF-07 | Las credenciales de pasarelas deben encriptarse | pgsodium |
| RNF-08 | La base de datos debe tener Row Level Security | RLS en todas las tablas |
| RNF-09 | El admin requiere MFA para operaciones sensibles | TOTP (Implementado vía `user_metadata.mfa_verified` para compatibilidad Free Tier) |
| RNF-10 | Headers de seguridad HTTP (CSP, X-Frame-Options, etc.) | _headers |
| RNF-11 | Protección contra CSRF en operaciones de escritura | JWT + SameSite |

### 4.3 Disponibilidad
| ID | Descripción | Meta |
|---|---|---|
| RNF-12 | El Storefront debe estar disponible 99.9% del tiempo | Cloudflare SLA |
| RNF-13 | La API debe tener health check endpoint | /health |
| RNF-14 | Backups automáticos diarios de la base de datos | GitHub Actions |

### 4.4 Mantenibilidad
| ID | Descripción | Evidencia |
|---|---|---|
| RNF-15 | Separación estricta de HTML, CSS y lógica | Reglas ESLint |
| RNF-16 | Cero magic strings (usar enums) | ESLint + check:architecture |
| RNF-17 | Tipado fuerte (no any) | TypeScript strict |
| RNF-18 | Documentación de Edge Functions | README por función |

### 4.5 Escalabilidad
| ID | Descripción |
|---|---|
| RNF-19 | El sistema debe operar en free tiers sin costos |
| RNF-20 | La arquitectura debe permitir migración a planes pagos sin cambios |
| RNF-21 | Las Edge Functions deben ser stateless |

### 4.6 Accesibilidad y SEO
| ID | Descripción |
|---|---|
| RNF-22 | El Storefront debe generar meta tags dinámicos (OG, Twitter) |
| RNF-23 | Las imágenes deben tener atributos alt |
| RNF-24 | Se debe generar sitemap.xml y robots.txt |
| RNF-25 | El sitio debe ser navegable sin JavaScript |

---

## 5. Restricciones de Diseño

| ID | Restricción |
|---|---|
| C-01 | Todo el markup HTML debe estar exclusivamente en archivos .astro |
| C-02 | Todos los estilos CSS deben estar exclusivamente en archivos .css |
| C-03 | Toda la lógica debe estar exclusivamente en archivos .ts o frontmatter de Astro |
| C-04 | React permitido solo en Client Hub y Vendor Admin con directivas `client:*` de Astro |
| C-05 | Para interactividad solo se permite Alpine.js |
| C-06 | El acceso a base de datos desde frontend es solo lectura |
| C-07 | Toda operación de escritura debe pasar por Edge Functions |
| C-08 | Los enums deben centralizarse en @micro-store/core |

---

## 6. Trazabilidad de Requisitos

| Historia de Usuario | Requisitos Funcionales | Sprints |
|---|---|---|
| HU-01: Catálogo | RF-01.1 a RF-01.6 | Sprint 2 |
| HU-02: Registro/Login | RF-02.1 a RF-02.5 | Sprint 1 |
| HU-03: Pagos | RF-04.1 a RF-04.9 | Sprint 3 |
| HU-04: Seguimiento | RF-05.1 a RF-05.10 | Sprint 4 |
| HU-05: Inventario | RF-06.1 a RF-06.6 | Sprint 2 |
| HU-06: Pasarelas | RF-07.1 a RF-07.4 | Sprint 3 |
| HU-07: 2FA Admin | RF-03.1 a RF-03.6 | Sprint 1 |
| HU-08: Tracking | RF-05.6 a RF-05.10 | Sprint 4 |

---

## 7. Aprobación

| Rol | Nombre | Firma | Fecha |
|---|---|---|---|
| Arquitecto | Alberto Jacinto Martínez Torres | | Mayo 2026 |
| Product Owner | | | |
| Líder Técnico | | | |

---