# test-scenarios.md — PT-014: astro@5→7 upgrade

**PT:** PT-014 · **Fecha:** 2026-06-25

---

## Estrategia de Verificación

Este PT es un upgrade de dependencias de build — no añade lógica de negocio.
Los criterios de éxito son el paso de herramientas existentes (npm audit, build, typecheck, tests, architecture check).
No se crean tests nuevos. Los 126 tests existentes actúan como regression guard.

---

## Escenarios de Verificación (Success Criteria)

### TS-1: Zero CVEs HIGH post-upgrade

**Comando:** `npm audit --audit-level=high`  
**Esperado:** EXIT 0, output `"found 0 vulnerabilities"` o equivalente.  
**Evidencia:** Captura de output en `evidence/PT-014/post-upgrade-audit.md`.

---

### TS-2: Build exitoso — storefront

**Comando:** `npm run build -w @micro-store/storefront`  
**Esperado:** EXIT 0. Output contiene "build complete" o similar de astro@7.  
**Evidencia:** Captura de output de build.

---

### TS-3: Build exitoso — client-hub (con React)

**Comando:** `npm run build -w @micro-store/client-hub`  
**Esperado:** EXIT 0. La integración `@astrojs/react` funciona correctamente con astro@7.  
**Evidencia:** Captura de output de build.

---

### TS-4: Build exitoso — vendor-admin

**Comando:** `npm run build -w @micro-store/vendor-admin`  
**Esperado:** EXIT 0. La config con `vite.optimizeDeps` no produce errores.  
**Evidencia:** Captura de output de build.

---

### TS-5: Typecheck limpio

**Comando:** `npm run typecheck --workspaces --if-present`  
**Esperado:** EXIT 0, 0 errores TypeScript en los 3 apps.  
**Evidencia:** Captura de output.

---

### TS-6: Suite de tests sin regresión (126 tests)

**Comando:** `npm run test --workspaces --if-present`  
**Esperado:** 126 tests, 0 failures, 0 errors. El count no debe bajar de 126.  
**Evidencia:** Output completo con desglose por workspace.

---

### TS-7: Architecture check limpio

**Comando:** `bash src/scripts/check-architecture.sh`  
**Esperado:** EXIT 0. El upgrade no introduce inline styles ni imports prohibidos.  
**Evidencia:** Captura de output.

---

## Escenarios de Regresión a Monitorear

### TR-1: Compilador Rust rechaza HTML existente (riesgo BAJO)

**Síntoma:** Error de build en algún `.astro` del tipo "unclosed tag" o "invalid nesting".  
**Acción si ocurre:** Localizar el archivo y tag específico, corregir el markup, re-ejecutar build. No es un bloqueante — es un fix puntual.

### TR-2: `@astrojs/alpinejs` sin versión compatible con astro@7 (riesgo BAJO)

**Síntoma:** Error de peer dep durante `npm install` post-upgrade, o error de integración en build.  
**Acción si ocurre:** Consultar releases de `@astrojs/alpinejs`; si no hay versión estable para astro@7, evaluar pin o alternativa.

### TR-3: Client-hub tests fallan post-upgrade (riesgo MUY BAJO)

**Síntoma:** Los 12 tests de `@micro-store/client-hub` fallan post-upgrade.  
**Contexto:** Los tests son React puro con Vitest — no dependen del runtime de Astro. Sería un efecto colateral no anticipado.  
**Acción si ocurre:** Investigar como sub-bug de PT-014 antes de continuar.
