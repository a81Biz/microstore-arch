# design.md — PT-014: astro@5→7 upgrade

**PT:** PT-014 · **Tipo:** BUG MAJOR · **Fecha:** 2026-06-25

---

## Contexto

Migración de `astro@5.18.1` → `astro@7.x` en los 3 apps del monorepo para cerrar 7 HIGH CVEs (5 en astro, 2 en vite). El upgrade es de 2 major versions (v5 → v6 → v7 en el ecosistema, pero ejecutado en un solo paso).

---

## Decisiones de Diseño

### D-1: Herramienta — `npx @astrojs/upgrade`

**Decisión:** Usar el migration tool oficial de Astro en lugar de bump manual o `npm audit fix --force`.

**Rationale:**
- Resuelve automáticamente peer deps de todas las integraciones (`@astrojs/react`, `@astrojs/alpinejs`, `@astrojs/check`)
- Ejecuta codemods de configuración donde aplique
- Elimina el riesgo de instalar combinaciones incompatibles entre integraciones
- `npm audit fix --force` instalaría `astro@7` pero dejaría las integraciones en versiones incompatibles → build garantizadamente roto

**Contexto de monorepo:** Si `@astrojs/upgrade` en la raíz no actualiza los 3 apps (npm workspaces), el fallback es ejecutarlo en cada app por separado (`cd src/apps/storefront && npx @astrojs/upgrade`, etc.).

---

### D-2: Salto directo v5→v7 (no secuencial)

**Decisión:** Intentar el salto directo astro@5→v7 en un solo paso, sin pasar por v6 como checkpoint intermedio.

**Rationale:**
- Investigación de migration guides confirmó 0 deprecated APIs usadas en el código (Astro.glob, ViewTransitions, import.meta.env assertions)
- 0 archivos `src/fetch.ts` (reservado en v7)
- HTML bien formado en todos los .astro (riesgo mínimo del compilador Rust de v7)
- El salto directo reduce el número de ciclos de fix+test

**Fallback (D-2-F):** Si `@astrojs/upgrade` produce errores irrecuperables en el salto directo, aplicar Alternativa C: secuencial v5→v6 (testeando en ese punto) luego v6→v7.

---

### D-3: Actualización de `engines.node`

**Decisión:** Cambiar `"node": ">=22.0.0"` → `">=22.12.0"` en el root `package.json`.

**Rationale:** Astro v6 eleva el requisito mínimo de Node de 18/20 a 22.12.0. El CI ya usa Node 22 LTS (que es ≥22.12.0), por lo que no hay impacto en el pipeline. Solo es una actualización de la spec declarada en `package.json`.

---

### D-4: Código fuente sin modificar (additive-only en un escenario ideal)

**Decisión:** No modificar archivos de lógica de negocio ni tests. Si el compilador Rust de v7 rechaza HTML, las correcciones son de markup (void elements, tags no cerrados) — nunca lógica de negocio.

**Rationale:** Los 126 tests son mock-based (Edge Functions Vitest) y core TS puro — no dependen del runtime de Astro. No deberían verse afectados por el upgrade en absoluto.

---

## Hallazgos críticos de STATE 2

| Hallazgo | Impacto en implementación |
|:--|:--|
| 0 usos de `Astro.glob()` | Sin codemods de contenido requeridos |
| 0 usos de `<ViewTransitions />` | Sin reemplazos de componente requeridos |
| 0 archivos `src/fetch.ts` | Sin renombrado de archivos requerido |
| HTML void elements correctos en todos los .astro | Riesgo del compilador Rust: BAJO |
| `import.meta.env` solo como string en layouts | Sin type assertion changes requeridas |
| `@astrojs/react` solo en `client-hub` | `vendor-admin` y `storefront` no tienen React — menor scope |

---

## Archivos esperados a modificar

| Archivo | Cambio esperado |
|:--|:--|
| `package.json` (root) | `engines.node` → `>=22.12.0` |
| `src/apps/storefront/package.json` | `astro` + `@astrojs/alpinejs` + `@astrojs/check` bumped |
| `src/apps/client-hub/package.json` | `astro` + `@astrojs/react` + `@astrojs/alpinejs` + `@astrojs/check` bumped |
| `src/apps/vendor-admin/package.json` | `astro` + `@astrojs/alpinejs` + `@astrojs/check` bumped |
| `package-lock.json` | Regenerado por npm install |
| `src/apps/*/astro.config.mjs` | **Solo si** el tool aplica codemods. Configs actuales son mínimas — probable que no cambien. |

**Archivos que NO deben modificarse:** Ningún `.astro`, `.ts`, `.tsx`, `.css`, tests, Edge Functions, migraciones, CI/CD workflows.

---

## Riesgo residual post-investigación

**Único riesgo no despejado: comportamiento de `@astrojs/upgrade` en npm workspaces.**

La documentación oficial del tool no especifica el comportamiento en monorepos con npm workspaces. Si el tool opera sobre un solo `package.json` a la vez (no detecta workspaces), habrá que ejecutarlo 3 veces (una por app). Esto se descubrirá en PT-014.2 y se aplica el fallback sin impacto en el resultado final.
