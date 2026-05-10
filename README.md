# Micro-Store Arch

E-commerce Jamstack de alto rendimiento. 100% Docker-first.

## 🚀 Inicio Rápido

1. Clonar el repositorio:
   ```bash
   git clone <repo-url> && cd microstore-arch
   ```
2. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   ```
3. Levantar el entorno con Docker:
   ```bash
   docker compose up
   ```

## 🌐 Servicios

- **Storefront:** [http://localhost:4321](http://localhost:4321) (Catálogo público)
- **Client Hub:** [http://localhost:5173](http://localhost:5173) (Panel de cliente)
- **Vendor Admin:** [http://localhost:5174](http://localhost:5174) (Panel de vendedor)
- **Supabase Studio:** [http://localhost:54323](http://localhost:54323) (Gestión de BD y Auth)
- **Inbucket (Emails):** [http://localhost:54324](http://localhost:54324) (Servidor de correos local)

## 📐 Reglas de Arquitectura

- **Separación estricta:**
  - HTML → Archivos `.astro`
  - Estilos → Archivos `.css`
  - Lógica → Archivos `.ts`
- **Cero JSX/TSX:** Se utiliza Astro para el markup y Alpine.js/React para interactividad ligera/pesada, pero el markup principal reside en `.astro`.
- **Enums Compartidos:** Usar siempre `@micro-store/core` para evitar magic strings.
- **Seguridad:** Toda escritura en base de datos debe pasar por Edge Functions para validar RLS y lógica de negocio.

## 🛠️ Desarrollo

- **Check de Arquitectura:** `npm run check:architecture`
- **Tests del Core:** `npm run test:core`
- **Linting:** `npm run lint`

---
© 2026 Alberto Jacinto Martínez Torres.
