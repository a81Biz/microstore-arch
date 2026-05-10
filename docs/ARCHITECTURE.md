# Micro-Store Arch - Documento de Arquitectura

## Visión General

Micro-Store Arch es un ecosistema de e-commerce Jamstack de alto rendimiento compuesto por 3 aplicaciones distribuidas y una infraestructura serverless.

## Diagrama de Arquitectura

```mermaid
graph TD
    User((Usuario)) --> SF[Storefront - Astro SSG]
    User --> CH[Client Hub - Astro SPA]
    Admin((Vendedor)) --> VA[Vendor Admin - Astro SPA]

    SF --> SB[Supabase API]
    CH --> SB
    VA --> SB

    subgraph Supabase
        SB --> Auth[Auth Service]
        SB --> DB[(PostgreSQL + RLS)]
        SB --> EF[Edge Functions]
        SB --> Storage[Storage Buckets]
    end

    EF --> Pay[Payment Gateways]
    EF --> Email[Resend Email Service]
```

## Decisiones Técnicas Clave

1. **Jamstack puro:** Despliegue en el borde (Cloudflare Pages) sin servidores fijos.
2. **Astro para todo el frontend:** Enfoque en islas de interactividad y rendimiento.
3. **Supabase Edge Functions:** Lógica de negocio distribuida y escalable.
4. **Seguridad Multi-capa:** RLS en base de datos, MFA en admin, y encriptación pgsodium.
5. **Costo Operativo Mínimo:** Optimizado para capas gratuitas (Cloudflare/Supabase).

## Estructura del Proyecto

- `apps/*`: Aplicaciones frontend.
- `packages/*`: Lógica compartida y configuraciones.
- `supabase/*`: Infraestructura de base de datos y backend.
- `scripts/*`: Automatización de ops y seguridad.
