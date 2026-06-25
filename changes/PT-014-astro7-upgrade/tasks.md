# tasks.md — PT-014: astro@5→7 upgrade

**PT:** PT-014 · **Estado:** STATE 3  
**Fecha:** 2026-06-25

---

## Tareas Atómicas

### PT-014.1 — Baseline pre-upgrade

**Objetivo:** Establecer baseline verificado antes de cualquier cambio.

**Inputs:**
- Repositorio en rama `fix/PT-014-astro7-upgrade` (nueva, desde `feature/PT-023-ef-phase2-tests` o `main`)

**Acciones:**
1. Crear branch `fix/PT-014-astro7-upgrade`
2. `npm run test --workspaces --if-present` → confirmar 126 tests GREEN
3. `npm audit --audit-level=high` → confirmar 7 HIGH CVEs
4. Capturar output como evidencia pre-upgrade

**Outputs:**
- Branch `fix/PT-014-astro7-upgrade` creada
- Evidencia: `docs/implementation/evidence/PT-014/pre-upgrade-audit.md`

**Validación:** Tests en verde, 7 CVEs confirmados.

**Status:** PENDING

---

### PT-014.2 — Ejecutar `@astrojs/upgrade`

**Objetivo:** Actualizar astro@5→v7 y todas las integraciones con el tool oficial.

**Inputs:**
- Root `package.json` + 3 app `package.json`
- Tool: `npx @astrojs/upgrade`

**Acciones:**
1. Ejecutar `npx @astrojs/upgrade` desde la raíz del monorepo
2. Si el tool no detecta los 3 apps automáticamente: ejecutar en cada app por separado
   ```
   cd src/apps/storefront   && npx @astrojs/upgrade && cd -
   cd src/apps/client-hub   && npx @astrojs/upgrade && cd -
   cd src/apps/vendor-admin && npx @astrojs/upgrade && cd -
   ```
3. Verificar que los 3 app `package.json` muestran astro@7.x y versiones de integración actualizadas
4. `npm install` para regenerar lockfile

**Outputs:**
- `src/apps/*/package.json` actualizados con astro@7.x + integraciones
- `package-lock.json` regenerado
- Evidencia: versiones post-upgrade capturadas

**Validación:** `npm list astro --workspaces` → astro@7.x en las 3 apps. Sin errores de peer deps.

**Status:** PENDING

---

### PT-014.3 — Actualizar engines.node

**Objetivo:** Actualizar la spec declarada de Node en root `package.json`.

**Inputs:**
- `package.json` root — línea `"node": ">=22.0.0"`

**Acciones:**
1. Editar `package.json` root: `"node": ">=22.0.0"` → `"node": ">=22.12.0"`

**Outputs:**
- `package.json` root con `engines.node` actualizado

**Validación:** `cat package.json | grep node` muestra `>=22.12.0`.

**Status:** PENDING

---

### PT-014.4 — Verificar y corregir builds

**Objetivo:** Confirmar que los 3 apps buildean con astro@7.

**Inputs:**
- 3 apps con astro@7 instalado (post PT-014.2)
- `npm run build --workspaces --if-present`

**Acciones:**
1. Ejecutar `npm run build --workspaces --if-present`
2. Si hay errores del compilador Rust (HTML estricto): localizar el .astro problemático y corregir el tag
3. Si hay errores de API de configuración: actualizar `astro.config.mjs` según el error
4. Re-ejecutar hasta EXIT 0 para los 3 apps

**Outputs:**
- Los 3 apps buildean sin errores
- Evidencia: output de build capturado

**Validación:** `npm run build --workspaces --if-present` → EXIT 0.

**Status:** PENDING

---

### PT-014.5 — Verificar typecheck

**Objetivo:** Confirmar 0 errores TypeScript post-upgrade.

**Inputs:**
- `npm run typecheck --workspaces --if-present`

**Acciones:**
1. Ejecutar `npm run typecheck --workspaces --if-present`
2. Si hay errores: corregir solo los causados por cambios de API de astro@7 (no reescribir lógica de negocio)

**Outputs:**
- 0 errores TypeScript en los 3 apps

**Validación:** `npm run typecheck --workspaces --if-present` → EXIT 0.

**Status:** PENDING

---

### PT-014.6 — Verificar suite de tests completa

**Objetivo:** Confirmar que el upgrade no rompe ningún test existente.

**Inputs:**
- `npm run test --workspaces --if-present`
- Baseline: 126 tests (88 edge-functions + 26 core + 12 client-hub)

**Acciones:**
1. Ejecutar `npm run test --workspaces --if-present`
2. Verificar count ≥126 tests, 0 failures
3. (No se esperan cambios de tests — todos son mock-based o TS puro)

**Outputs:**
- 126 tests ALL GREEN post-upgrade

**Validación:** `npm run test --workspaces --if-present` → EXIT 0, 0 failures.

**Status:** PENDING

---

### PT-014.7 — Confirmar cierre de CVEs

**Objetivo:** Verificar que `npm audit` reporta 0 HIGH vulnerabilities post-upgrade.

**Inputs:**
- `npm audit --audit-level=high`

**Acciones:**
1. `npm audit --audit-level=high` → debe retornar 0 vulnerabilities
2. Si vite CVE persiste (no cerrado transitivamente por astro@7): ejecutar `npm audit fix` (sin --force) para cerrarlo
3. Capturar output como evidencia

**Outputs:**
- `npm audit --audit-level=high` → EXIT 0, 0 vulnerabilities
- Evidencia: `docs/implementation/evidence/PT-014/post-upgrade-audit.md`

**Validación:** 0 HIGH CVEs en npm audit.

**Status:** PENDING

---

### PT-014.8 — Verificar architecture check

**Objetivo:** Confirmar que `check-architecture.sh` sigue en EXIT 0 post-upgrade.

**Inputs:**
- `bash src/scripts/check-architecture.sh`

**Acciones:**
1. Ejecutar `bash src/scripts/check-architecture.sh`
2. Esperado: EXIT 0 (el upgrade no introduce inline styles ni imports prohibidos)

**Outputs:**
- EXIT 0

**Validación:** EXIT 0.

**Status:** PENDING

---

## Resumen de Archivos a Modificar

| Archivo | Acción |
|:--|:--|
| `package.json` (root) | MODIFICAR — engines.node: >=22.12.0 |
| `src/apps/storefront/package.json` | MODIFICAR — astro + integraciones (vía tool) |
| `src/apps/client-hub/package.json` | MODIFICAR — astro + integraciones (vía tool) |
| `src/apps/vendor-admin/package.json` | MODIFICAR — astro + integraciones (vía tool) |
| `package-lock.json` | REGENERAR — vía npm install |
| `src/apps/*/astro.config.mjs` | MODIFICAR solo si tool aplica codemods |

**Archivos NO modificables:** `.astro`, `.ts`, `.tsx`, tests, Edge Functions, migraciones, `ci.yml`, `deploy.yml`.

## Notas de Implementación

- El Husky pre-commit hook ejecuta `npm test` — todos los tests deben pasar antes de cada commit.
- Commits atómicos: un commit por bloque de cambio lógico (upgrade de paquetes / engine spec / fixes de build si aplica).
- Si PT-014.2 requiere ejecutar el tool por app: hacer commits separados por app no es necesario — un commit único con todos los `package.json` y el lockfile es correcto para esta PT.
- Fallback documentado en `design.md` D-2-F: si el salto directo v5→v7 falla, aplicar Alternativa C (secuencial).
