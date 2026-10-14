# Phase 2: The Studio & The Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify working implementations of **The Hub** (scenario marketplace & publishing API) and **The Studio** (creator visual node graph editor, Figma-friendly asset lifecycle manager, procedural vector generators, and live Print & Play preview).

**Architecture:**
- `packages/generators`: Seed-driven deterministic procedural puzzle asset generators (vector labyrinths, rune substitution ciphers).
- `apps/hub`: Cloud-independent REST catalog API handling scenario publishing, licensing, and package serving.
- `apps/studio`: Angular 22+ Zoneless SPA featuring an interactive SVG/Canvas node graph editor, asset stage tracking (`sketch` -> `draft` -> `final`), procedural generator tools, and live P&P compiler integration.

**Tech Stack:** TypeScript, Node.js 22, Angular 22+ (Zoneless, Signals, OnPush), SVG Canvas, `@escape-system/contracts`, `@escape-system/pnp-compiler`.

**Spec:** `docs/superpowers/specs/2026-10-12-online-boardgame-escape-system-design.md`

## Global Constraints
- Node.js >= 22.0.0, TypeScript 6.0
- Angular 22+ Zoneless by default (`provideZonelessChangeDetection`), `ChangeDetectionStrategy.OnPush`, signal inputs (`input()`), outputs (`output()`), no legacy `@Input`, no `any`, `inject()` for services
- No Cloudflare/PartyKit proprietary dependencies
- Strict TDD: Every component/service/generator must have unit tests verifying behavior

---

### Task 1: Procedural Asset Generators (`packages/generators`)

**Files:**
- Create: `packages/generators/package.json`
- Create: `packages/generators/tsconfig.json`
- Create: `packages/generators/src/index.ts`
- Create: `packages/generators/src/maze.ts`
- Create: `packages/generators/src/cipher.ts`
- Test: `packages/generators/tests/maze.test.ts`
- Test: `packages/generators/tests/cipher.test.ts`

**Interfaces:**
- Produces:
  - `generateMaze(options: { seed: string; width: number; height: number }): { grid: number[][]; svg: string; start: [number, number]; exit: [number, number] }`
  - `generateRuneCipher(options: { seed: string; message: string }): { runeKeyMap: Record<string, string>; cipherSvg: string; decodedMessage: string }`

- [ ] **Step 1: Write failing tests for deterministic maze and rune cipher generation**
- [ ] **Step 2: Implement SeededPRNG-driven maze generator (recursive backtracker) emitting clean SVG**
- [ ] **Step 3: Implement deterministic rune substitution cipher emitting glyph SVG**
- [ ] **Step 4: Run tests and verify deterministic output on identical seeds**
- [ ] **Step 5: Stage and commit Task 1**

---

### Task 2: The Hub API & Scenario Marketplace Service (`apps/hub`)

**Files:**
- Create: `apps/hub/package.json`
- Create: `apps/hub/tsconfig.json`
- Create: `apps/hub/src/index.ts`
- Create: `apps/hub/src/catalog.ts`
- Create: `apps/hub/src/server.ts`
- Test: `apps/hub/tests/hub.test.ts`

**Interfaces:**
- Consumes: `@escape-system/contracts`.
- Produces:
  - `GET /api/scenarios`: Returns scenario catalog with metadata, pricing, tags, difficulty.
  - `GET /api/scenarios/:id`: Returns full scenario manifest bundle.
  - `POST /api/scenarios/publish`: Validates manifest and stores published scenario package.
  - `GET /health`: Health check endpoint.

- [ ] **Step 1: Write failing integration test for scenario listing, fetching, and publishing**
- [ ] **Step 2: Implement ScenarioCatalog in-memory repository with preloaded sample scenarios**
- [ ] **Step 3: Implement HubServer with HTTP REST endpoints and manifest validation**
- [ ] **Step 4: Run integration tests and verify response contracts**
- [ ] **Step 5: Stage and commit Task 2**

---

### Task 3: The Studio Core & Asset Lifecycle Management (`apps/studio`)

**Files:**
- Create: `apps/studio/package.json`
- Create: `apps/studio/tsconfig.json`
- Create: `apps/studio/src/app/services/asset.service.ts`
- Create: `apps/studio/src/app/features/assets/asset-manager.component.ts`
- Test: `apps/studio/src/app/services/asset.service.spec.ts`

**Interfaces:**
- Produces:
  - `AssetService`: Tracks assets across lifecycle stages (`sketch` | `draft` | `final`), supports SVG import and layer mapping.
  - `AssetManagerComponent`: UI for filtering assets by stage, previewing SVGs, and flagging assets needing production art.

- [ ] **Step 1: Write failing test for AssetService stage transitions and Figma SVG layer parsing**
- [ ] **Step 2: Implement AssetService with signal-based reactive collections**
- [ ] **Step 3: Implement AssetManagerComponent with stage filter pills and asset preview**
- [ ] **Step 4: Run unit tests and verify stage tracking**
- [ ] **Step 5: Stage and commit Task 3**

---

### Task 4: Visual Node Graph Editor & Scenario Exporter (`apps/studio`)

**Files:**
- Create: `apps/studio/src/app/services/graph.service.ts`
- Create: `apps/studio/src/app/features/graph/node-canvas.component.ts`
- Create: `apps/studio/src/app/features/graph/node-inspector.component.ts`
- Create: `apps/studio/src/app/features/preview/pnp-preview.component.ts`
- Create: `apps/studio/src/app/app.component.ts`
- Create: `apps/studio/src/app/app.config.ts`
- Create: `apps/studio/src/main.ts`
- Test: `apps/studio/src/app/services/graph.service.spec.ts`

**Interfaces:**
- Consumes: `@escape-system/contracts`, `@escape-system/generators`, `@escape-system/pnp-compiler`.
- Produces: Complete Studio application with node graph editing, wire connections, live P&P vector sheet preview, and one-click JSON/PDF export.

- [ ] **Step 1: Write failing test for GraphService (node creation, transition linking, manifest compilation)**
- [ ] **Step 2: Implement GraphService state management**
- [ ] **Step 3: Implement NodeCanvasComponent (interactive visual nodes and connection wires)**
- [ ] **Step 4: Implement NodeInspectorComponent and PnpPreviewComponent**
- [ ] **Step 5: Build monorepo, run all test suites, stage and commit Task 4**
