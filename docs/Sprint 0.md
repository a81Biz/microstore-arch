# 📦 Micro-Store Arch — Sprint 0: Configuración y Setup
**Versión:** 5.0 (Final para Entrega)  
**Duración:** 1 semana  
**Responsable:** Equipo de Desarrollo / DevOps Lead  
**Principio:** `Docker-First`. Cero instalaciones locales fuera de Docker y Git.

---

## 🎯 Objetivos del Sprint
1. Inicializar el monorepo con estructura de workspaces.
2. Configurar Supabase completo dentro de Docker (sin CLI local).
3. Configurar el entorno de desarrollo con Docker Compose y hot-reload.
4. Implementar la base de datos inicial con migraciones, seed y RLS.
5. Crear el paquete `@micro-store/core` con modelos, enums, schemas y utilidades.
6. Configurar ESLint, Prettier, Husky y lint-staged.
7. Crear la estructura base de Edge Functions con helpers compartidos.
8. Generar clientes de Supabase explícitos por aplicación.
9. Configurar CI/CD con GitHub Actions.
10. Documentar y entregar un entorno listo para el Sprint 1.

---

## 📋 Requisitos Previos (Únicas Herramientas Locales)
```bash
git --version          # >= 2.30
docker --version       # >= 24.0
docker compose version # >= 2.20
```
> ❌ **No instalar:** Node.js, npm, Supabase CLI, Wrangler, Python. Todo corre en contenedores.

---

## 🚀 Paso a Paso Completo (Fases)

### Fase 1: Crear Repositorio en GitHub
1. Ve a `https://github.com/new`
2. Configura:
   - **Repository name:** `microstore-arch`
   - **Visibility:** `Private`
   - Desmarcar: `Add a README file`, `.gitignore`, `Choose a license`
3. Clonar localmente:
```bash
cd ~/Desarrollos
git clone git@github.com:a81Biz/microstore-arch.git
cd microstore-arch
```
### Fase 2: Estructura de Carpetas
```bash
# Aplicaciones
mkdir -p apps/{storefront,client-hub,vendor-admin}/src/{components,layouts,pages,lib,styles}
mkdir -p apps/{storefront,client-hub,vendor-admin}/public/styles

# Paquetes compartidos
mkdir -p packages/core/src/{models,enums,schemas,utils,__tests__}
mkdir -p packages/config-eslint/rules

# Supabase
mkdir -p supabase/migrations
mkdir -p supabase/functions/{_shared,_core,health,create-order,payment-webhook,verify-totp}

# Infraestructura & CI
mkdir -p {docker,scripts,.github/workflows,.husky,docs}
```

### Fase 3: Archivos Raíz del Proyecto

#### 3.1 `.gitignore`
```gitignore
node_modules/
dist/
.astro/
.env
.env.local
.env.*.local
.docker/
backups/*.sql.gz
*.log
.DS_Store
Thumbs.db
.vscode/
.idea/
coverage/
playwright-report/
test-results/
```

#### 3.2 `package.json`
```json
{
  "name": "microstore-arch",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "docker compose up --build",
    "dev:stop": "docker compose down",
    "dev:reset": "docker compose down -v && docker compose up --build",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "test:core": "cd packages/core && npm run test",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "check:architecture": "bash scripts/check-architecture.sh",
    "prepare": "husky install"
  },
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.4.0"
  },
  "engines": { "node": ">=20.0.0" }
}
```

#### 3.3 `tsconfig.json` (base)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist", ".astro"]
}
```

#### 3.4 `.prettierrc`
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

#### 3.5 `.env.example`
```env
# ====================================
# Micro-Store Arch: Variables de Entorno
# ====================================
# Copiar a .env: cp .env.example .env

# --- Supabase ---
# PUBLIC_ para navegador (host.docker.internal resuelve a la máquina host en Docker Desktop)
SUPABASE_URL=http://host.docker.internal:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-Qoxn1aA7U1vG4VdYkUmFp0

# --- Encriptación ---
ENCRYPTION_KEY=dev-64-char-key-not-for-production-use-only-local

# --- URLs Públicas ---
PUBLIC_STOREFRONT_URL=http://localhost:4321
PUBLIC_CLIENT_HUB_URL=http://localhost:5173
PUBLIC_VENDOR_ADMIN_URL=http://localhost:5174
```

### Fase 4: Docker Compose & Dockerfile (Corregido)

#### 4.1 `docker-compose.yml`
```yaml
version: '3.8'

services:
  # Supabase Stack (corre CLI internamente para levantar DB, Auth, Storage, Functions)
  supabase:
    image: supabase/cli:latest
    container_name: microstore-supabase
    command: start
    ports:
      - "54321:54321"  # API Gateway / Edge Functions
      - "54322:5432"   # PostgreSQL
      - "54323:3000"   # Studio
      - "54324:54324"  # Inbucket
    volumes:
      - supabase-data:/root/.supabase
      - ./supabase:/project
    environment:
      - SUPABASE_PROJECT_REF=local-dev
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:54321/health"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
    networks: [microstore-network]

  storefront:
    build: { context: ., dockerfile: docker/Dockerfile.astro }
    container_name: microstore-storefront
    ports: ["4321:4321"]
    environment:
      - PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    volumes:
      - ./apps/storefront:/app
      - ./packages:/app/packages
      - storefront_modules:/app/node_modules
    command: npm run dev -- --host 0.0.0.0
    depends_on: { supabase: { condition: service_healthy } }
    networks: [microstore-network]

  client-hub:
    build: { context: ., dockerfile: docker/Dockerfile.astro }
    container_name: microstore-client-hub
    ports: ["5173:5173"]
    environment:
      - PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - PUBLIC_API_BASE=http://host.docker.internal:54321/functions/v1
    volumes:
      - ./apps/client-hub:/app
      - ./packages:/app/packages
      - client_modules:/app/node_modules
    command: npm run dev -- --host 0.0.0.0
    depends_on: { supabase: { condition: service_healthy } }
    networks: [microstore-network]

  vendor-admin:
    build: { context: ., dockerfile: docker/Dockerfile.astro }
    container_name: microstore-vendor-admin
    ports: ["5174:5174"]
    environment:
      - PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - PUBLIC_API_BASE=http://host.docker.internal:54321/functions/v1
    volumes:
      - ./apps/vendor-admin:/app
      - ./packages:/app/packages
      - admin_modules:/app/node_modules
    command: npm run dev -- --host 0.0.0.0
    depends_on: { supabase: { condition: service_healthy } }
    networks: [microstore-network]

volumes:
  supabase-data: {}
  storefront_modules: {}
  client_modules: {}
  admin_modules: {}

networks:
  microstore-network:
    driver: bridge
```

#### 4.2 `docker/Dockerfile.astro`
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copiar manifiestos para caché de npm
COPY package.json package-lock.json* ./
COPY apps/storefront/package.json ./apps/storefront/
COPY apps/client-hub/package.json ./apps/client-hub/
COPY apps/vendor-admin/package.json ./apps/vendor-admin/
COPY packages/core/package.json ./packages/core/
COPY packages/config-eslint/package.json ./packages/config-eslint/

# Instalar dependencias de workspaces
RUN npm ci --ignore-scripts || npm install

EXPOSE 4321

# Hot-reload habilitado vía bind-mounts en docker-compose
CMD ["npm", "run", "dev"]
```

### Fase 5: Migraciones de Base de Datos
`supabase/migrations/00001_initial_schema.sql` (contiene el SQL completo aprobado: ENUMs, tablas, secuencias, funciones `update_order_status`, `generate_order_display_id`, RLS policies y seed data). *Usar exactamente el archivo validado en sprints anteriores.*

### Fase 6: Paquete Core (`@micro-store/core`)
Crear los siguientes archivos con el contenido previamente validado:
- `packages/core/package.json` & `tsconfig.json`
- `src/enums/` (order-status, fulfillment-status, payment-gateway, user-role, index.ts)
- `src/models/` (product, order, user, index.ts)
- `src/schemas/` (order.schema.ts, index.ts)
- `src/utils/` (stock-utils.ts, order-status-calculator.ts, index.ts)
- `src/index.ts` (barrel export)
- `src/__tests__/` (stock-utils.test.ts, order-status-calculator.test.ts)

### Fase 7: Edge Functions Base
Crear:
- `supabase/functions/_shared/supabase-client.ts` (instancia anon + admin)
- `supabase/functions/_shared/logger.ts`
- `supabase/functions/_shared/error-handler.ts`
- `supabase/functions/_core/base-controller.ts`
- `supabase/functions/health/index.ts`

### Fase 8: Aplicaciones Frontend + Clientes Explícitos

#### 8.1 Archivos por App (Storefront, Client Hub, Vendor Admin)
Para cada app, crear:
- `package.json`, `astro.config.mjs`, `tsconfig.json`
- `src/layouts/` (BaseLayout, ClientHubLayout, VendorAdminLayout)
- `src/pages/index.astro` (boilerplate con layout)
- `public/styles/global.css`

#### 8.2 `supabase-client.ts` (Crear en CADA app bajo `src/lib/`)
```ts
// apps/*/src/lib/supabase-client.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseClient = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: true } } // Solo para Client Hub y Admin
);
```

### Fase 9: Scripts
#### 9.1 `scripts/check-architecture.sh`
*(Copiar contenido aprobado de v4.0. Verifica HTML en .ts, estilos inline, magic strings, acceso directo a BD y dependencias de core.)*
```bash
chmod +x scripts/check-architecture.sh
```

### Fase 10: ESLint & Husky
```bash
npm install
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```
Crear `packages/config-eslint/package.json` e `index.js` con reglas aprobadas.

### Fase 11: CI/CD (Corregido)
`.github/workflows/ci.yml`
```yaml
name: CI Pipeline
on:
  push: { branches: [main, develop] }
  pull_request: { branches: [main] }

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: bash scripts/check-architecture.sh
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:core
```

### Fase 12: README.md
```markdown
# Micro-Store Arch
E-commerce Jamstack de alto rendimiento. 100% Docker-first.

## 🚀 Inicio
git clone <repo-url> && cd microstore-arch
cp .env.example .env
docker compose up

## 🌐 Servicios
- Storefront: http://localhost:4321
- Client Hub: http://localhost:5173
- Vendor Admin: http://localhost:5174
- Supabase Studio: http://localhost:54323
- Inbucket (emails): http://localhost:54324

## 📐 Reglas
- HTML → `.astro` | CSS → `.css` | Lógica → `.ts`
- Cero JSX/TSX | Enums en `@micro-store/core`
- BD escritura → Solo Edge Functions
```

### Fase 13: Commit Inicial y Validación
```bash
# 1. Iniciar y esperar a que Supabase esté healthy
docker compose up -d supabase
docker compose logs -f supabase # Esperar "Supabase started"

# 2. Iniciar apps (instalará deps automáticamente vía Dockerfile)
docker compose up -d

# 3. Ejecutar validaciones dentro de contenedor
docker compose exec storefront npm run test:core
docker compose exec storefront bash scripts/check-architecture.sh

# 4. Primer commit
git add .
git commit -m "feat(sprint0): docker-first setup, core package, RLS & CI/CD baseline"
git push -u origin main
```

---

## 📊 Definición de Terminado (DoD) Sprint 0
- [ ] `docker compose up -d` levanta los 4 servicios sin errores
- [ ] `http://localhost:4321` muestra Storefront boilerplate
- [ ] `http://localhost:5173` y `5174` responden correctamente
- [ ] Supabase Studio accesible y migración `00001` aplicada con RLS activo
- [ ] `supabase-client.ts` existe y exporta cliente funcional en las 3 apps
- [ ] `npm run test:core` pasa en verde (dentro del contenedor o local)
- [ ] `bash scripts/check-architecture.sh` no reporta violaciones
- [ ] Husky bloquea un commit con `style="inline"` o magic strings intencionales
- [ ] CI en GitHub Actions pasa en `push` y `PR`
- [ ] `README.md` contiene guía Docker-first y URLs de servicios

---

## 🎯 Retrospectiva del Sprint 0 (Template)
- ¿El setup local tomó <10 minutos tras clonar?
- ¿Docker Compose orquestó correctamente Supabase + 3 frontends?
- ¿Las reglas arquitectónicas (`check-architecture.sh`) atraparon violaciones reales?
- ¿El hot-reload funciona en los 3 contenedores al editar `.astro`/`.ts`?
- ¿Hay dependencia implícita de herramientas locales no documentadas?

