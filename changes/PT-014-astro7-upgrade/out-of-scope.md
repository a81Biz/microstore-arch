# out-of-scope.md — PT-014: astro@5→7 upgrade

**PT:** PT-014 · **Fecha:** 2026-06-25

---

## Fuera de Scope de PT-014

### 1. Cambios de lógica de negocio en los apps

PT-014 actualiza dependencias. No introduce nuevas features, no modifica comportamiento de rutas, no cambia estados de la UI. Cualquier "mejora" aprovechando APIs nuevas de astro@7 va en un PT separado.

### 2. Modificación de Edge Functions (Supabase / Deno)

Las 22 Edge Functions corren en Deno runtime y no tienen ninguna dependencia de Astro. No se tocan en este PT.

### 3. Tests de integración con Supabase real

PT-015 (MAJOR FEATURE, STATE 1-E). Independiente de PT-014.

### 4. Tests de frontend (storefront + vendor-admin)

PT-017 (MAJOR FEATURE, STATE 1-E). Independiente aunque puede ejecutarse post-PT-014 para aprovechar la versión actualizada.

### 5. Configuración de alertas Logflare

PT-022 (STANDARD FEATURE, BLOCKED). No relacionado.

### 6. npm audit gate en CI

PT-020 (FEATURE TRIVIAL, BLOQUEADO por PT-014). PT-020 se desbloquea una vez PT-014 cierra H-013. No es parte de PT-014 — es su consecuencia directa.

### 7. Actualización de otras dependencias no relacionadas con el CVE

Si durante el upgrade aparecen otras dependencias desactualizadas, se documentan en Technical Debt (10-Technical-Debt.md) para un PT futuro. No se actualizan aquí.

### 8. Migración a features nuevas de astro@7

Server islands (v5+), nuevo compilador Rust para optimizaciones, nuevas APIs de contenido, etc. Son features del nuevo major, no parte de este fix.

### 9. Cambios en Docker, nginx o CI/CD workflows

`ci.yml` y `deploy.yml` no necesitan cambios — ya usan Node 22 LTS que cumple el requisito `>=22.12.0`. El `Dockerfile.astro` usa `node:22-alpine` que también cumple.
