# CLAUDE.md — MicroStore-Arch

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Graphify — Knowledge Graph Context

Este repositorio tiene un grafo de conocimiento vivo en `graphify-out/`.

**OBLIGATORIO antes de explorar archivos:**
1. Lee `graphify-out/GRAPH_REPORT.md` — contiene god nodes, comunidades, conexiones sorprendentes y preguntas sugeridas.
2. Consulta `graphify-out/graph.json` o usa `/graphify query "<pregunta>"` para localizar nodos antes de abrir archivos individuales.
3. Ejecuta `/graphify . --update` después de cualquier cambio significativo de código para mantener el grafo actualizado.

El grafo reduce el costo de exploración en ~32x. Úsalo como primer punto de entrada, no los archivos directamente.

---

## Commands

```bash
# Development (Docker — primary workflow)
docker compose up --build                              # Start all services
docker compose down                                    # Stop services
docker compose down -v && docker compose up --build   # Full reset
docker compose restart storefront                     # Recargar rutas SSG (local dev)

# Workspace-wide
npm run build --workspaces --if-present
npm run lint --workspaces --if-present
npm run typecheck --workspaces --if-present
npm run test --workspaces --if-present

# Core package only
npm run test:core                                      # Run tests in src/packages/core
cd src/packages/core && npm run test:watch            # Watch mode

# Architecture validation (runs in CI)
bash src/scripts/check-architecture.sh
```

---

## Architecture Overview

E-commerce monorepo with **npm workspaces** deploying to Cloudflare Pages + Supabase.

### Apps (`src/apps/`)

| App | Framework | Port | Purpose |
|-----|-----------|------|---------|
| `storefront` | Astro 5 + Alpine.js | 4321 | Public catalog and product browsing |
| `client-hub` | Astro 5 + React 18 + Alpine.js | 5173 | Customer dashboard (auth, orders, checkout) |
| `vendor-admin` | Astro 5 + React 18 + Alpine.js | 5174 | Vendor panel (products, orders, settings) |

All apps use the **Astro + Islands pattern**: Astro handles static markup and SSR; React only for interactive UI components. Alpine.js acceptable for minimal interactivity.

### Packages (`src/packages/`)

- **`@micro-store/core`** — Shared domain layer: TypeScript interfaces (Order, Product, User), enums (OrderStatus, ItemFulfillmentStatus, PaymentGateway, UserRole), Zod schemas, and utilities. Tested with Vitest.
- **`@micro-store/eslint-config`** — Shared ESLint config (Astro + React + Prettier plugins).

### Backend: Supabase + Edge Functions (`src/supabase/`)

All business logic lives in Supabase Edge Functions (Deno runtime) under `src/supabase/functions/`.
Database migrations live in `src/supabase/migrations/` (numbered `00001_` → `00037_`).

| Function | Role |
|----------|------|
| `create-order` | Order creation with stock reservation and RLS validation |
| `manage-orders` | Read/update/delete orders, status, tracking, fulfillment |
| `manage-products` | Product CRUD + image gallery (max 10 images) |
| `manage-payment-gateways` | Payment config CRUD |
| `payment-webhook` | Idempotent webhook handling |
| `login`, `change-password`, `confirm-totp` | Auth operations |
| `manage-cart` | Persistent cart sync (localStorage → DB) |
| `manage-addresses` | Customer address CRUD |

### Infrastructure (`src/docker/`, `src/nginx/`, `src/scripts/`)

- `src/docker/Dockerfile.astro` — Multi-stage image for all Astro apps
- `src/nginx/` — Reverse proxy config (localhost, client.localhost, admin.localhost)
- `src/scripts/check-architecture.sh` — CI-enforced architecture rules

---

## Architecture Rules (Enforced by CI)

`src/scripts/check-architecture.sh` blocks PRs that violate these:

1. **No HTML in `.ts` files** — markup belongs in `.astro` or `.tsx`.
2. **No inline styles in `.astro`** — use external `.css` files.
3. **No magic strings for order statuses** — always import from `@micro-store/core/enums`.
4. **No direct Supabase writes in frontend** — all writes (insert/update/delete/upsert) must call an Edge Function.
5. **Core package purity** — `src/packages/core` must not import from `astro`, `react`, or `supabase`.

## Key Conventions

- **TypeScript strict mode** everywhere; no `any` types.
- **Prettier**: 100-char line width, 2-space indent, single quotes.
- **Pre-commit hook** (Husky): runs `npm test` before every commit.
- Enums from `@micro-store/core` are the source of truth — never hardcode status strings.
- RLS policies enforced at DB level; Edge Functions add a second validation layer.

## Environment Variables

Copy `.env.example` to `.env`. Required:

```
SUPABASE_URL / SUPABASE_INTERNAL_URL
SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
ENCRYPTION_KEY                   # 64-char hex key for dev
PUBLIC_STOREFRONT_URL
PUBLIC_CLIENT_HUB_URL
PUBLIC_VENDOR_ADMIN_URL
```

Local Supabase ports: `8000` (API/Kong), `54322` (Postgres), `8323` (Studio UI), `8025` (Inbucket email).

## CI/CD

- **`ci.yml`**: On push/PR → architecture check → lint → typecheck → core tests.
- **`deploy.yml`**: On push to `main` → build all apps → deploy to Cloudflare Pages → deploy Edge Functions → migrations → health check.
- Node requirement: `>=22.0.0` (Node 22 LTS).

---

# Part 1 — Foundation Protocol: Reverse-Engineering Prerequisite

Foundation Protocol is the **mandatory prerequisite** for the full methodology suite. It reverse-engineers
the repository into verified documentation (`docs/enterprise-documentation/`) so that FDGE, PTSA and FPGE
have architecture, conventions and domain context to operate on instead of assumptions.

## Authority

The canonical method lives in `docs/methodology/Foundation-Protocol.md`.
The operational process (phases, templates, citation rules) lives in `docs/methodology/Foundation-Implementation.md`.
This section is the binding ruleset (rules in force). When detail is missing here, those documents prevail.

## Trigger Rule

**ONLY** activate Foundation Protocol mode when the user explicitly invokes:

* `[START FOUNDATION]` — full reverse-engineering run. Optionally followed by a scope:
  `[START FOUNDATION] scope: src/ + docker-compose.yml + src/supabase/migrations/`

Otherwise, operate as a normal assistant. Foundation Protocol never self-activates.

## What it does

When triggered, the agent:

1. Reads the repository (Phase 0 — Reconnaissance) before writing a single line.
   Reading order: README → CLAUDE.md → package.json → docker-compose.yml →
   .env.example → src/supabase/migrations/ → entry points → full folder structure → routes → tests.
2. Generates `docs/enterprise-documentation/` with the following documents:

   **Always:**
   01-Platform-Overview.md · 02-PRD.md · 03-TRD.md · 04-App-Flow.md · 06-Backend-Architecture.md ·
   09-Security-Architecture.md · 10-Technical-Debt.md · 11-Conventions.md

   **Conditional:**
   05-UIUX-Brief.md (frontend exists ✓) · 07-Database-Architecture.md (database exists ✓) ·
   08-API-Catalog.md (HTTP API exists ✓)

   **Inventory (always):**
   `inventory/routes.md` · `inventory/endpoints.md` · `inventory/entities.md` ·
   `inventory/components.md` · `inventory/services.md` · `inventory/integrations.md`

   **README:** `docs/enterprise-documentation/README.md` — index with generation date and scope.

3. Stops and waits for human validation.

## Core Rule: Nothing is invented

Every fact in the generated documents must be traceable to its source (file path + line number).
If a fact cannot be cited, it is not documented — it is registered as "Not determined" in `10-Technical-Debt.md`.

## Re-execution (overwrite, no merge)

If `docs/enterprise-documentation/` already exists, a new run **overwrites** all documents completely.
Re-execution is required when: the main architecture changes (new service, new DB, new pattern),
a major module is added, or more than 3 months of active development pass without re-execution.

## Human ACK requirement

Foundation Protocol is complete only after the developer validates with:

```
[FOUNDATION VALIDATED]
PRD reviewed: ✓ / ✗ [notes]
TRD reviewed: ✓ / ✗ [notes]
Conventions reviewed: ✓ / ✗ [notes]
Discrepancies found: [list or "none"]
```

**FDGE may not start its first session until `[FOUNDATION VALIDATED]` is issued.**

## Document 11 — Conventions (critical)

`11-Conventions.md` is the most critical output. It must contain at minimum:

* Folder structure logic and rules
* Naming conventions (files, classes, functions, DB tables/columns, test files) — with real examples
* Architectural patterns in use — with real code examples and the rule the agent must follow
* At least 3 Hard Rules in `RULE-NN` format (what NOT to do, why, correct/incorrect code examples)
* Files requiring extra care before modification
* Delta Log (for incremental additions between full re-runs)

---

# Part 2 — FDGE: Framework de Desarrollo Gobernado por Evidencia

FDGE is the binding **development framework** for this repository. All implementation, bug fixing,
refactoring, investigation, planning, documentation, and validation activities must follow FDGE.
No alternative workflow may bypass FDGE states.

## Authority

The canonical method lives in `docs/methodology/Framework-FDGE.md`.
The operational implementation (artifacts, templates, folder structure, git workflow) lives in
`docs/methodology/FDGE-Implementation.md`. This section is the binding ruleset (rules in force).
When detail is missing here, those documents prevail.

When uncertainty exists:

1. Consult `docs/methodology/Framework-FDGE.md`.
2. Consult `docs/enterprise-documentation/` (architecture, PRD, TRD, Conventions).
3. Consult Graphify (`graphify-out/`).
4. Consult `docs/implementation/HISTORY.log`.
5. Consult `docs/implementation/HANDOFF.md`.

Documentation is authoritative. Assumptions are not.

## Core Principle

The agent must never optimize for speed at the expense of understanding.

Primary objective: **Understanding → Strategy → Execution → Evidence → Validation**

Not: Request → Code

## Complexity Classification

Every request must be classified before planning.

### TRIVIAL
Examples: typo correction, label update, text replacement, simple CSS adjustment.
Requirements: State 1 (any variant, abbreviated), Implementation, Evidence, History/Handoff.
Strategy and atomization may be condensed. Use STATE 1-EXPRESS path (see `docs/methodology/instrucctions.md`).

### STANDARD
Examples: typical bug fixes, CRUD modifications, business rule changes, validation changes.
Requirements: Full FDGE workflow.

### MAJOR
Examples: new modules, new workflows, architectural changes, new services, DB redesign.
Requirements: Full FDGE workflow + mandatory risk analysis + mandatory regression analysis + Proposal Package.

## Request Type — State 1 Variants

Every request enters STATE 1 through one of three variants depending on its type:

| Type | State 1 Variant | Primary Artifact | Core Questions |
|:---|:---|:---|:---|
| **BUG** | **STATE 1-B** — Discovery & Architecture | `DISCOVERY.md` | What / Where / When / How / Why |
| **FEATURE** | **STATE 1-E** — Enrichment & Architecture | `ENRICHMENT.md` | Criteria / Scenarios / NFRs / Out-of-scope |
| **REFACTOR** | **STATE 1-R** — Scope & Architecture | `REFACTOR_SCOPE.md` | Scope / Quality bar / Regression risk |

Classifying the request as INVESTIGATION uses STATE 1-B (Discovery, investigation mode).

## Cognitive State Pipeline

The following states are sequential. No state may be skipped.
Condensing (TRIVIAL) is permitted; collapsing (skipping) is never permitted.

### STATE 1-B — Discovery & Architecture (BUG / INVESTIGATION)

Artifacts: `DISCOVERY.md`, `CONTEXT_ANALYSIS.md`

Actions:
1. Generate a new PT-XXX identifier.
2. Classify complexity.
3. Expand the request: What / Where / When / How / Why (if known).
4. Document reproduction steps, expected behavior, actual behavior.
5. Identify affected users, business impact.
6. Consult `docs/enterprise-documentation/` (architecture, PRD, TRD, Conventions, Graphify).
7. Identify: Components / Services / Dependencies / Data flows / Risks / Constraints.
8. Record Root Cause Confidence (%), Architecture Confidence (%), Solution Confidence (%).

Output: Append entries to `DISCOVERY.md`, `CONTEXT_ANALYSIS.md`.

STOP. Wait for explicit human ACK.
Forbidden: Solution design, code modification, task execution.

#### Investigation Gate
If any condition exists: root cause unknown · architecture impact unknown · dependencies unknown ·
confidence below 70% — classify as INVESTIGATION immediately. Implementation planning is forbidden
until investigation completes.

### STATE 1-E — Enrichment & Architecture (FEATURE)

Artifacts: `ENRICHMENT.md`, `CONTEXT_ANALYSIS.md`

Actions:
1. Generate a new PT-XXX identifier.
2. Classify complexity.
3. Enrich the request:
   - Acceptance Criteria: measurable, verifiable list.
   - Test Scenarios: concrete cases (happy path + edge cases + failure cases).
   - NFRs: performance, security, accessibility constraints.
   - Out-of-scope: explicit list of what this feature does NOT cover.
4. Consult `docs/enterprise-documentation/` (architecture, PRD, TRD, Conventions, Graphify).
5. Identify: affected components, integration points, data model impact, risks.
6. Document Architecture Confidence (%), Implementation Confidence (%).

A FEATURE without acceptance criteria, test scenarios, and out-of-scope is not a specification.
Implementing it without enriching first produces the most expensive rework in the cycle.

Output: Create or overwrite `ENRICHMENT.md`.

STOP. Wait for explicit human ACK.
Forbidden: Proposal design, code modification, task execution.

### STATE 1-R — Scope & Architecture (REFACTOR)

Artifacts: `REFACTOR_SCOPE.md`, `CONTEXT_ANALYSIS.md`

Actions:
1. Generate a new PT-XXX identifier.
2. Classify complexity.
3. Define scope:
   - What changes and what does NOT change (explicit boundary).
   - Quality bar: the measurable threshold that proves the refactor is complete.
   - Regression risk: which behaviors must be preserved exactly.
4. Consult `docs/enterprise-documentation/` (architecture, PRD, TRD, Conventions, Graphify).
5. Identify: coupling, test coverage gaps, breaking change risk, rollback strategy.

Output: Create or overwrite `REFACTOR_SCOPE.md`.

STOP. Wait for explicit human ACK.
Forbidden: Solution design, code modification, task execution.

### STATE 2 — Classification & Strategy

Artifact: `PLAN_ACTUAL.md`

Design the strategy. Required sections: Objective · Proposed solution · Alternatives considered ·
Alternatives rejected · Dependencies · Risks · Constraints · Success criteria.

Mandatory Regression Analysis: explicitly identify what may break, affected workflows, services, APIs,
UI flows, data integrity risks.

Output: Overwrite `PLAN_ACTUAL.md`.

STOP. Wait for explicit human ACK.
Forbidden: Code modification, task execution.

### STATE 3 — Atomic Planning & Proposal Package

For STANDARD/MAJOR: generate a **Proposal Package** at `changes/[PT-ID]-[slug]/`:
* `design.md` — architecture decisions and rationale
* `tasks.md` — atomic task list with PT-ID.N identifiers
* `spec-changes.md` — specification changes required
* `test-scenarios.md` — test cases that verify acceptance criteria
* `out-of-scope.md` — explicit exclusions for this PT

Each task must contain: Objective, Inputs, Outputs, Validation method, Status.

Output: `changes/[PT-ID]-[slug]/` (full package) + update `PENDING_TASKS.md`.

**PROPOSAL GATE — STOP. Wait for explicit human ACK before opening any git branch.**
The agent may not create a branch, modify source code, or begin implementation until the human
approves the Proposal Package. This is an absolute gate with no exceptions.

For TRIVIAL: `PLAN_ACTUAL.md` is sufficient; Proposal Package is not required.

### STATE 4 — Implementation (git workflow)

Execute only after Proposal Gate ACK. Execute only approved tasks. No undocumented modifications.

**Git workflow (ordered):**
1. Create branch: `feature/PT-XXX-slug` · `fix/PT-XXX-slug` · `refactor/PT-XXX-slug`
2. Write tests first (RED) — tests must fail before writing any implementation code.
3. Update documentation (in-code docs, README, architecture docs if applicable).
4. Write implementation code until tests go GREEN.
5. Run testing report: all tests pass, no regressions.
6. Update Proposal Package (`tasks.md` status, `design.md` if decisions changed).
7. Commit atomically: `feat: PT-XXX description` · `fix: PT-XXX description` ·
   `refactor: PT-XXX description` · `test: PT-XXX description` · `docs: PT-XXX description`

**Tests-first is not optional.** Writing code before writing a failing test is a violation.
**Atomic commits are not optional.** One logical change per commit, named and traceable to PT-XXX.

Rule: Before this state, 0 lines of source code may be modified.

### STATE 5 — Evidence Generation & Self-Review

Artifact: `docs/implementation/evidence/PT-XXX/`

**Code is not evidence. Execution is evidence.** Every implementation must generate evidence:
* Technical: test results, coverage reports, build logs, DB verification, API response logs.
* Functional: screenshots (before/after), workflow completion, UI verification.

**Self-Review checklist** (complete before presenting to human):
- [ ] All acceptance criteria from ENRICHMENT.md verified?
- [ ] All test scenarios from Proposal Package passing?
- [ ] No unintended side effects in related components?
- [ ] `11-Conventions.md` rules respected (naming, patterns, hard rules)?
- [ ] Commits atomic, named with convention, traceable to PT-XXX?
- [ ] No debugging artifacts, console.log, commented-out code left?
- [ ] Documentation updated if public API changed?

Record Self-Review result in `docs/implementation/evidence/PT-XXX/self-review.md`.

### STATE 6 — Validation Gate

#### BUG
Required status: `VALIDATION_PENDING`. The agent may not close bugs. Human confirmation mandatory.
Flow: Implementation → Evidence → VALIDATION_PENDING → Human Validation → CLOSED.

#### FEATURE
May be marked `DONE` only if: tests pass, evidence exists, acceptance criteria verified.

#### REFACTOR
May be marked `DONE` only if: existing behavior preserved (verified by tests), evidence exists.

#### INVESTIGATION
May be marked `CLOSED` after findings are documented in `DISCOVERY.md`.

### STATE 7 — History & Handoff

Artifacts: `docs/implementation/HISTORY.log`, `docs/implementation/HANDOFF.md`

Append to `HISTORY.log`:
```
## PT-XXX — [Type]: [Title]
Date: YYYY-MM-DD
Status: [DONE / VALIDATION_PENDING / CLOSED]
Branch: [feature/fix/refactor/PT-XXX-slug]
Objective: [one line]
Root cause: [if BUG]
Solution: [what was done]
Modified files: [list]
Evidence: docs/implementation/evidence/PT-XXX/
Delta (real vs planned): [what changed from the Proposal Package and why]
PTSA reference: [H-XXX if this PT closes a finding — else omit]
```

Update `HANDOFF.md` (current state only — overwrite):
Active branch · Current system state · Open bugs (VALIDATION_PENDING) · Pending validations ·
Active investigations · Risks · Recommended next actions.

Rules: `HISTORY.log` is append-only. Never rewrite history. `HANDOFF.md` represents current state only.

If files were created, moved, or deleted during this PT: notify that `/graphify . --update` should be run.

## Allowed Status Values

`PENDING` · `IN_PROGRESS` · `BLOCKED` · `DONE` · `VALIDATION_PENDING` · `CLOSED`

## Mandatory Knowledge Sources

Before strategy or implementation, consult all relevant sources:

* `docs/enterprise-documentation/` (Platform Overview, PRD, TRD, Conventions, Backend Architecture)
* Graphify (`graphify-out/`)
* `docs/implementation/HISTORY.log`
* `docs/implementation/HANDOFF.md`
* Active `ENRICHMENT.md` / `DISCOVERY.md` / `REFACTOR_SCOPE.md`
* `changes/[PT-ID]-[slug]/` (if work in progress)

The agent must never design solutions without first consulting the architecture and conventions.

## Absolute Constraints

### No Foundation Skip
If `docs/enterprise-documentation/` does not exist, issue `[START FOUNDATION]` before any FDGE work.
FDGE State 2 (Architecture) requires verified documentation — not assumptions.

### No Solution First
Never design before understanding.

### No Architecture Blindness
Never modify code before consulting architecture documentation, Conventions (11-Conventions.md), Graphify.

### No Phase Collapse
Never skip FDGE states. Condensing (TRIVIAL) is not collapsing. Every state still happens and is recorded.
Skipping discovery, enrichment, evidence, self-review, validation, or History/Handoff is always forbidden.

### No Proposal Gate Skip
Never create a git branch or modify source code before the Proposal Package ACK.
The Proposal Gate is absolute — no exceptions for urgency, TRIVIAL requests, or familiarity with the code.
Exception: TRIVIAL requests may omit the full Proposal Package but still require a brief ACK on `PLAN_ACTUAL.md`.

### No Tests After Code
Tests must be written and failing (RED) before implementation code is written.

### No Memory-Driven Development
Never act from memory. Always verify from artifacts and documentation.

### No Bug Auto-Close
Bugs require human validation. The agent has no authority to close bugs.

### No Missing Evidence
Every implementation must generate evidence. No exceptions.

### No Dirty Commits
No "WIP", "fix", "changes" commit messages. No commit mixing multiple logical changes.
Every commit must be atomic, named with convention (`feat/fix/refactor/test/docs: PT-XXX description`),
and traceable to its PT.

### No Request Waste
A FEATURE without acceptance criteria, test scenarios, and explicit out-of-scope is not a specification.
Implementing it without enriching first (STATE 1-E) is forbidden.

### No Hidden Reasoning
Strategic reasoning must be materialized in project artifacts. Important decisions must not exist only in chat.

## Framework Compliance Rule

If any FDGE phase is incomplete: STOP. Report the blocking condition. Do not continue until the required
phase is completed or the human explicitly authorizes continuation.

---

# Part 3 — PTSA V3: Continuous Audit & Certification Framework

PTSA is the binding **audit & certification framework** for this repository. It is independent from FDGE:
FDGE governs how code is *built*; PTSA governs how generated *products* are *audited and certified*.
PTSA never bypasses FDGE and FDGE never bypasses PTSA.

## Authority

The canonical, normative specification lives in `docs/methodology/PTSA/PTSA-V3-Especificacion-Oficial.md`
(the exhaustive standard — definitions, schemas, algorithms, templates).
The working protocol lives in `PTSA/PTSA.md`; the operational agent manual in `PTSA/Motor-PTSA.md`.
This section is the binding ruleset (rules in force). When detail is missing here, the official specification prevails.

## Trigger Rule

**ONLY** activate PTSA mode when the user explicitly invokes one of:

* `[START PTSA]` — start audit from F-1.
* `resume PTSA` / `continue PTSA` — resume / run Delta Sync.
* `status PTSA` — report status without modifying artifacts.
* `audit PTSA` — a discrete audit operation (e.g. close a finding).

Otherwise, operate as a normal assistant. PTSA never self-activates.

## Purpose

PTSA does not verify that code runs without errors. It proves, with evidence, that the products the
system generates are **legally, operationally and semantically valid** for the business domain declared in
F-1, and computes a System Health Score based exclusively on evidence. The unit of audit is the **product**,
not the component. If technical execution passes but domain requirements fail, register a D1 finding.

## Core Principles

* **Evidence over opinion (A1)** — Unsupported claims become findings, never conclusions.
* **Product over implementation (A2)** — Audit products, not isolated folders/modules.
* **Inverse traceability (A3)** — Always start at the product: `Product ← Transformation ← Service ← Rule ← Data Source ← User Action`.
* **Domain supremacy / Potable-Water Rule (A4)** — Technical correctness never compensates a domain failure. If `D1 < 60`, Health is capped at D1.
* **Autonomous audit (A5)** — If you have shell/DB/log access, gather evidence yourself; never ask the user to run diagnostics for you.
* **Auditable immutability (A6)** — Findings are closed, never deleted; evidence is replaced by revisions, never overwritten.
* **Continuous certification (A7)** — Audit is permanent; every score expires (freshness).
* **Declared coverage (A8)** — No score is valid without declared coverage and freshness.

## Quality Model (5 dimensions)

| Dim | Evaluates | Weight |
|:--:|:--|:--|
| **D1 — Domain Alignment** | Business rules, product quality, rubric compliance | 30% + global cap |
| **D2 — Architectural Integrity** | Code, security, tech debt, DB integrity | 30% |
| **D3 — Observability & Recovery** | Logs, traceability, fallbacks, recovery | 30% |
| **D4 — Documentary Fidelity** | Docs ↔ reality coherence | 10% |
| **D5 — Operational Reliability** | Stability, drift, reproducibility | modulator |

## Scoring

```
Score_Dn   = max(0, 100 − Σ penalty(active Dn findings))      # penalty: 30/15/5/1 = CRITICA/ALTA/MEDIA/BAJA
Health     = (D1×0.30)+(D2×0.30)+(D3×0.30)+(D4×0.10)
             IF D1 < 60: Health = min(Health, D1)              # Potable-Water Rule
Risk_Score = min(100, Risk_bruto × 4)
Confidence = coverage×0.40 + freshness×0.25 + evidence_validity×0.20 + autonomy×0.15
```

Classification: **A** Health ≥ 90 · **B** 75–89 · **C** 60–74 · **F** < 60.

## Operating Rules (binding)

* **Materialize reasoning** — every conclusion lives in a `PTSA/` artifact, not only in chat.
* **Evidence before conclusion** — capture `E-XXX.md` first.
* **Verify in the real source** — derive states/scores from direct observation, never inference or memory.
* **Never auto-close BUG/DOMAIN findings** — take them to CORREGIDA/VERIFICADA/VALIDATION_PENDING and stop; human validates and closes.
* **Never overwrite** findings or evidence; **never duplicate rows** in RESUMEN.md.

For the full operating manual see `docs/methodology/PTSA/PTSA-V3-Especificacion-Oficial.md`.

---

# Part 4 — FPGE: Priorización Gobernada por Evidencia

FPGE is the binding **prioritization framework** that closes the loop
`FDGE (build) → PTSA (audit) → FPGE (prioritize) → FDGE (build next)`.
It answers: **what should we build next, and why?**

## Authority

The canonical method lives in `docs/methodology/Framework-FPGE.md`.
The operational implementation lives in `docs/methodology/FPGE-Implementation.md`.
This section is the binding ruleset. When detail is missing here, those documents prevail.

## Trigger Rule

**ONLY** activate FPGE mode when the user explicitly invokes one of:

* `[START FPGE]` / `roadmap FPGE` / `prioritize FPGE` — full run.
* `promote FPGE R-XXX` — promote an approved roadmap item to FDGE STATE 1 with a new PT-XXX.
* `status FPGE` — report the current roadmap without recomputing.

Otherwise, operate as a normal assistant. FPGE never self-activates.

## Core Principles

* **Evidence-governed prioritization** — every proposed item must cite its origin evidence (`H-XXX`, a `HISTORY.log` entry, a `HANDOFF.md` recommendation). No evidence → not a candidate.
* **Framework independence** — FPGE is **read-only** over FDGE and PTSA artifacts; writes only `ROADMAP.md` and `ROADMAP_HISTORY.log`.
* **Inherited domain supremacy** — D1 (domain) items outrank D2/D3/D4 at equal priority (1.5× domain multiplier).
* **Human gate** — FPGE *proposes*; the human *disposes*. Never starts FDGE itself nor auto-converts findings to tasks.
* **Reproducibility** — same evidence ⇒ same priority order (deterministic algorithm).

## Prioritization Algorithm

```
Priority(item) = (EvidenceWeight × ScoreImpact × Urgency × DomainMultiplier) / Effort
```

* `EvidenceWeight` — originating finding's PTSA risk (Impact×Probability, 1–16).
* `ScoreImpact` — expected Health gain.
* `Urgency` — 1.0 base; +0.5 if `audit_due` overdue; +0.5 if dimension STALE or regressing.
* `DomainMultiplier` — 1.5 for D1 else 1.0.
* `Effort` — 1 (S) / 2 (M) / 4 (L).

## Closing the loop

Full run ends by emitting `docs/implementation/ROADMAP.md` (all items `PROPUESTO`) and **stopping**.
Human marks items `APROBADO` / `DIFERIDO` / `DESCARTADO`.
Each `APROBADO` is promoted (`promote FPGE R-XXX`) to a new `PT-XXX` handed to FDGE STATE 1.

For the full method and algorithm detail see `docs/methodology/Framework-FPGE.md`.
