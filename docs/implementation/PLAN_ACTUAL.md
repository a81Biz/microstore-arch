# PLAN_ACTUAL.md — STATE 2
# PT-014: astro@5→7 upgrade (7 HIGH CVEs)
# Updated: 2026-06-25

---

## PT: PT-014 · Tipo: BUG · Complejidad: MAJOR · Estado: STATE 2

---

## Contexto de Investigación (STATE 1-B → STATE 2)

La Architecture Confidence en STATE 1-B era **65%** (debajo del umbral de 70%) porque los breaking changes exactos de astro@5→7 eran desconocidos. STATE 2 comenzó con investigación obligatoria.

### Hallazgos de investigación

**Versiones actuales instaladas:**
| Paquete | Versión instalada | Afectado |
|:--|:--|:--|
| `astro` | 5.18.1 | ✅ Upgrade requerido |
| `@astrojs/alpinejs` | 0.5.0 | ✅ Upgrade requerido (todas las apps) |
| `@astrojs/check` | 0.9.9 | ✅ Upgrade requerido (todas las apps) |
| `@astrojs/react` | 4.4.2 | ✅ Upgrade requerido (client-hub only) |

**CVEs confirmadas (npm audit --audit-level=high):**
- `astro ≤6.4.5` — 5 HIGH: XSS (define:vars, slot name, spread props), server-island replay, Host header SSRF
- `vite ≤6.4.2` — 2 HIGH: NTLMv2 hash disclosure (Windows), `server.fs.deny` bypass (Windows)
- Fix disponible: `astro@7.0.2` (cierra las 5 astro CVEs + upgrades vite internamente)

**Inventario de breaking changes relevantes al proyecto:**

| Breaking change | Versión | Afecta al proyecto |
|:--|:--|:--|
| `Astro.glob()` → `import.meta.glob()` | v6 | ❌ NO — 0 usos detectados |
| `<ViewTransitions />` → `<ClientRouter />` | v6 | ❌ NO — 0 usos detectados |
| `import.meta.env` type assertions | v6 | ❌ NO — solo acceso string simple |
| Node ≥22.12.0 requerido | v6 | ⚠️ engines spec requiere actualización |
| Compilador Rust — HTML estricto | v7 | ⚠️ BAJO — HTML bien formado en todos los .astro |
| `src/fetch.ts` reservado | v7 | ❌ NO — archivo no existe en ningún app |
| `@astrojs/db` eliminado | v7 | ❌ NO — no usado |
| Container API imports cambian | v7 | ❌ NO — no se usa Container API en tests |

**Architecture Confidence actualizada: 88%** ✅ (supera el umbral de 70%)

---

## Objetivo

Eliminar los 7 HIGH CVEs (5 astro + 2 vite) actualizando astro@5.18.1 → astro@7.x en los 3 apps del monorepo, sin regresiones en builds ni en la suite de 126 tests.

---

## Solución Propuesta

### Herramienta: `npx @astrojs/upgrade`

Ejecutar el **migration tool oficial de Astro** en el workspace monorepo. Este comando:
- Detecta la versión actual de astro y de todas las integraciones `@astrojs/*`
- Actualiza astro y todas las integraciones a versiones compatibles (resuelve peer deps)
- Ejecuta codemods de configuración donde aplique

**Rationale de elección:** Es la herramienta oficial; maneja automáticamente los peer deps de `@astrojs/react`, `@astrojs/alpinejs`, `@astrojs/check` sin cálculo manual de versiones. La alternativa manual tiene alto riesgo de instalar combinaciones incompatibles.

### Pasos de la estrategia (alto nivel — atomización en STATE 3)

1. **Preparación**: Confirmar branch limpia, tests en verde (baseline: 126 tests).
2. **Upgrade automático**: Ejecutar `npx @astrojs/upgrade` desde la raíz del monorepo o por app (según comportamiento del tool en workspaces).
3. **Node spec**: Actualizar `engines.node` en root `package.json`: `">=22.0.0"` → `">=22.12.0"`.
4. **Verificar builds**: `npm run build --workspaces --if-present` para los 3 apps.
5. **Verificar typecheck**: `npm run typecheck --workspaces --if-present`.
6. **Verificar tests**: `npm run test --workspaces --if-present` → 126 tests ALL GREEN.
7. **Confirmar CVE cierre**: `npm audit --audit-level=high` → 0 vulnerabilidades.
8. **Cierre H-013**: Notificar a PTSA.

---

## Alternativas Consideradas

### Alternativa A: Manual `npm install astro@7 @astrojs/react@5 ...`
- Calcular manualmente las versiones correctas de todas las integraciones
- **Rechazada:** Riesgo de versiones incompatibles entre sí; requiere conocer peer deps exactos de cada integración para astro@7. El tool oficial elimina este riesgo.

### Alternativa B: `npm audit fix --force` directo
- npm instalaría `astro@7.0.2` pero NO actualizaría las integraciones
- **Rechazada:** `@astrojs/alpinejs@0.5`, `@astrojs/react@4.4.2`, `@astrojs/check@0.9.9` quedarían en versiones incompatibles con astro@7, causando fallos de build. Este path garantiza broken builds.

### Alternativa C: Upgrade secuencial v5→v6 luego v6→v7
- Dos rondas de `@astrojs/upgrade`, probando entre cada una
- **No rechazada pero no seleccionada**: Es válida si el salto directo v5→v7 falla. Se convierte en **fallback** del plan si `@astrojs/upgrade` no resuelve bien el salto de 2 majors en un paso.

---

## Dependencias

- Ninguna dependencia bloqueante. PT-014 es independiente de todos los PTs en vuelo.
- **PT-020 desbloquea** cuando PT-014 cierre (H-013 → CERRADA, `npm audit --audit-level=high` → 0).

---

## Análisis de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|:--|:--|:--|:--|
| `@astrojs/upgrade` no opera bien en npm workspaces | MEDIA | ALTO | Ejecutar por app si falla en root. Fallback: Alternativa C. |
| Compilador Rust rechaza HTML existente | BAJA | MEDIO | HTML bien formado verificado. En caso de error: fix localizado por archivo. |
| Integración `@astrojs/alpinejs` sin versión estable para astro@7 | BAJA | MEDIO | Verificar releases de `@astrojs/alpinejs`. Si no hay v1+: evaluar pin a última compatible. |
| Tests de `@micro-store/client-hub` fallan (React + Astro) | BAJA | BAJO | Los 12 tests client-hub son React puro (no dependen del runtime de Astro). |
| Builds de Cloudflare Pages cambian formato de output | MUY BAJA | ALTO | Los 3 apps son estáticos (sin adapter). El output estático es estable entre versiones. |

---

## Análisis de Regresión (MAJOR — obligatorio)

### Workflows afectados
- **CI pipeline** (`ci.yml`): Debe pasar `npm run build --workspaces` y `npm run test --workspaces` post-upgrade.
- **Deploy pipeline** (`deploy.yml`): Builds de Cloudflare Pages, actualmente basados en astro@5. Deben producir output compatible post-upgrade.

### Componentes en riesgo
| Componente | Riesgo | Razón |
|:--|:--|:--|
| `src/apps/*/astro.config.mjs` | BAJO | Configs mínimas (integrations + server.port + vite.optimizeDeps). El API `defineConfig` es estable. |
| `src/apps/*/src/**/*.astro` | MUY BAJO | Zero deprecated APIs. HTML bien formado. |
| `src/apps/client-hub/src/**/*.tsx` | MUY BAJO | React 18 sin cambios. `@astrojs/react` actualizado por upgrade tool. |
| Tests `@micro-store/edge-functions-tests` | NULO | Tests mock-based en Vitest — independientes de Astro runtime. |
| Tests `@micro-store/client-hub` | MUY BAJO | 12 tests React puros, no renderizan Astro. |
| Tests `@micro-store/core` | NULO | Paquete TS puro, sin dependencia de Astro. |

### Comportamientos que DEBEN preservarse exactamente
1. Los 3 apps buildean a output estático sin errores.
2. Los 126 tests actuales pasan sin modificación de código fuente de tests.
3. El output de build es compatible con Cloudflare Pages (HTML estático, assets hasheados).
4. `check-architecture.sh` sigue en EXIT 0.

---

## Constraints

- Node ≥22.12.0 en el entorno de ejecución (CI usa ubuntu-latest con Node LTS — verificar en ci.yml).
- No modificar código fuente de Edge Functions (siguen en Deno runtime, no afectadas por Astro).
- No modificar los 126 tests existentes (solo el upgrade de dependencias).
- Los 3 apps deben buildear con un solo comando (`npm run build --workspaces`).

---

## Criterios de Éxito

1. `npm audit --audit-level=high` → **0 vulnerabilidades HIGH** ✅
2. `npm run build --workspaces --if-present` → EXIT 0 para los 3 apps ✅
3. `npm run typecheck --workspaces --if-present` → 0 errores TypeScript ✅
4. `npm run test --workspaces --if-present` → **126 tests ALL GREEN** ✅
5. `bash src/scripts/check-architecture.sh` → EXIT 0 ✅
6. H-013 cerrada → PTSA D2=100 → Health=100 ✅

---

## Estado de PTs restantes (referencia)

| PT | Estado actual |
|:---|:---|
| PT-014 | **STATE 2** — este documento |
| PT-015 | STATE 1-E — pendiente STATE 2 |
| PT-016 | STATE 1-B — pendiente STATE 2, may be BLOCKED |
| PT-017 | STATE 1-E — pendiente STATE 2 |
| PT-020 | STATE 1-E EXPRESS — **BLOQUEADO** por PT-014 |
| PT-021 | DONE ✅ |
| PT-022 | STATE 1-E — BLOQUEADO por PT-016 |
| PT-023 | DONE ✅ |
