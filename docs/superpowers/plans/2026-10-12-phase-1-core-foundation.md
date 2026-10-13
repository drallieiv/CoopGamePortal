# Phase 1: Core Foundation & Working Prototypes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the monorepo workspace and implement working drafts of the four primary pillars: Shared Contracts (manifest schema, deterministic PRNG seed engine, Sigil Resonance Matrix), Standalone WebSocket Server (room management, presence, live cursor sync), Print & Play Vector Layout Engine, and Angular WebApp (Companion Quick-Check + Virtual Tabletop player).

**Architecture:** An npm-workspaces monorepo containing:
- `packages/contracts`: Core domain models, state machine, PRNG seed engine, and verification matrix logic.
- `packages/server`: Cloud-agnostic Node.js WebSocket server managing room lifecycle, state transitions, and high-frequency cursor/focus streaming.
- `packages/pnp-compiler`: PDF and SVG layout generator supporting French Fold, Double Parallel Fold, and physical Verification booklets.
- `apps/client`: Angular 22+ application with Zoneless change detection, signal-driven state, companion quick-check, and live multiplayer table.

**Tech Stack:** TypeScript, Node.js v22, Angular 22+, `ws` (WebSockets), Vitest / Node Test Runner, SVG/Canvas.

**Spec:** `docs/superpowers/specs/2026-10-12-online-boardgame-escape-system-design.md`

## Global Constraints
- Node.js >= 22.0.0
- NPM workspaces for monorepo package orchestration
- Angular client MUST use modern Angular patterns: Zoneless by default, `ChangeDetectionStrategy.OnPush`, signal inputs (`input()`, `input.required()`), outputs (`output()`), `inject()` for services, no `any`, and no legacy `@Input` decorators
- No Cloudflare/PartyKit proprietary dependencies; the server must run as a standard portable Node.js process
- Strict TDD: Every logic module must have unit tests verifying behavior before and after implementation

---

### Task 1: Monorepo Scaffolding & Core Contracts

**Files:**
- Create: `package.json` (Root monorepo configuration with npm workspaces)
- Create: `tsconfig.base.json`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/manifest.ts`
- Create: `packages/contracts/src/roles.ts`
- Create: `packages/contracts/src/transport.ts`
- Test: `packages/contracts/tests/roles.test.ts`

**Interfaces:**
- Produces: `ScenarioManifest`, `ScenarioNode`, `RoleDefinition`, `RoleAggregationMatrix`, `resolveRolesForPlayerCount(matrix, count)`, `SessionTransport`.

- [ ] **Step 1: Write root workspace configuration and tsconfig**
- [ ] **Step 2: Write failing test for role aggregation resolver**
- [ ] **Step 3: Implement contracts schema and role aggregation logic**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Stage and commit Task 1**

---

### Task 2: Deterministic PRNG Seed Engine & Sigil Resonance Verification Matrix

**Files:**
- Create: `packages/contracts/src/seed.ts`
- Create: `packages/contracts/src/verification.ts`
- Test: `packages/contracts/tests/seed.test.ts`
- Test: `packages/contracts/tests/verification.test.ts`

**Interfaces:**
- Produces:
  - `class SeededPRNG`: `constructor(seed: string)`, `next(): number`, `nextInt(min, max): number`, `pick<T>(arr: T[]): T`.
  - `class SigilResonanceMatrix`: `constructor(seed: string)`, `registerPuzzle(puzzleId: string, lockSigil: string, solutionKey: string, seal: string, envelopeRef: string)`, `verify(puzzleId: string, inputKey: string): { valid: boolean; seal?: string; targetEnvelope?: string }`, `generateLookupGrid(): GridMatrix`.

- [ ] **Step 1: Write failing tests for SeededPRNG and SigilResonanceMatrix**
- [ ] **Step 2: Implement SeededPRNG (Mulberry32 or SplitMix32 algorithm)**
- [ ] **Step 3: Implement SigilResonanceMatrix with decoy lookups to prevent false-positive spoilers**
- [ ] **Step 4: Run tests and verify all pass**
- [ ] **Step 5: Stage and commit Task 2**

---

### Task 3: Standalone Real-Time WebSocket Server

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/src/index.ts`
- Create: `packages/server/src/room.ts`
- Create: `packages/server/src/protocol.ts`
- Test: `packages/server/tests/server.test.ts`

**Interfaces:**
- Consumes: `SessionTransport` messages from `packages/contracts`.
- Produces: `GameServer` listening on a configurable port with room join/leave, state actions, and ephemeral cursor broadcasting.

- [ ] **Step 1: Write failing integration test for WebSocket room creation, player joining, action dispatch, and cursor broadcasting**
- [ ] **Step 2: Implement protocol messages and Room state machine**
- [ ] **Step 3: Implement WebSocket server event routing**
- [ ] **Step 4: Run integration test and verify communication**
- [ ] **Step 5: Stage and commit Task 3**

---

### Task 4: Print & Play Layout Engine (French Fold & Double Parallel Fold)

**Files:**
- Create: `packages/pnp-compiler/package.json`
- Create: `packages/pnp-compiler/tsconfig.json`
- Create: `packages/pnp-compiler/src/index.ts`
- Create: `packages/pnp-compiler/src/templates/french-fold.ts`
- Create: `packages/pnp-compiler/src/templates/parallel-fold.ts`
- Create: `packages/pnp-compiler/src/templates/resonance-grid.ts`
- Create: `packages/pnp-compiler/src/compiler.ts`
- Test: `packages/pnp-compiler/tests/compiler.test.ts`

**Interfaces:**
- Consumes: `ScenarioManifest`, `SigilResonanceMatrix`.
- Produces: `PnpCompiler.compile(manifest, options): PnpOutput` (SVG/HTML vector printable pages with fold indicators and exterior flap seals).

- [ ] **Step 1: Write failing test verifying generation of French fold and Double Parallel fold sheet layouts**
- [ ] **Step 2: Implement fold templates with exterior seals and concealed interior panels**
- [ ] **Step 3: Implement printable Sigil Resonance Matrix booklet generator**
- [ ] **Step 4: Run tests and verify markup and fold positioning**
- [ ] **Step 5: Stage and commit Task 4**

---

### Task 5: Angular Companion & Player Client (Zoneless, Signals)

**Files:**
- Create: `apps/client/package.json`
- Create: `apps/client/angular.json`
- Create: `apps/client/src/main.ts`
- Create: `apps/client/src/app/app.config.ts`
- Create: `apps/client/src/app/app.component.ts`
- Create: `apps/client/src/app/services/transport.service.ts`
- Create: `apps/client/src/app/features/companion/quick-check.component.ts`
- Create: `apps/client/src/app/features/tabletop/tabletop.component.ts`
- Create: `apps/client/src/app/features/tabletop/cursor-canvas.component.ts`
- Test: `apps/client/src/app/features/companion/quick-check.component.spec.ts`

**Interfaces:**
- Consumes: `@escape-system/contracts`, `@escape-system/server`.
- Produces: Interactive web client supporting Companion Quick-Check and Real-Time Virtual Tabletop with live cursor broadcasting.

- [ ] **Step 1: Scaffold Angular 22+ zoneless client configuration**
- [ ] **Step 2: Implement WebSocket TransportService adhering to SessionTransport**
- [ ] **Step 3: Implement QuickCheckComponent (seed input, sigil selector, solution key check, tiered hints)**
- [ ] **Step 4: Implement TabletopComponent with multi-tiered visibility and CursorCanvasComponent for normalized cursor tracking**
- [ ] **Step 5: Build, verify test suite, stage and commit Task 5**
