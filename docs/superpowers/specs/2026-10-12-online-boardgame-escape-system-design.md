# System Architecture & Design Specification: Online Escape Room & Board Game Platform

**Date:** 2026-10-12  
**Status:** Approved Draft  
**Scope:** Architecture, Studio (Creator App), Engine (Player & Companion App), Hub (Marketplace), Print & Play Pipeline

---

## 1. Executive Summary & Vision

The system is a generic, modular platform for designing, publishing, and playing **tabletop escape room and deduction games** (in the vein of *Unlock!*, *Exit: The Game*, *We Were Here*, and *Keep Talking and Nobody Explodes*). 

The platform is **Board Game-First**: every scenario is natively playable on physical paper using self-checking offline verification mechanics and sealed dossiers. The digital web application serves as both an interactive **companion app** (timer, soundscape, instant QR verification, tiered hints) and a full **remote Virtual Tabletop (VTT)** featuring real-time presence, multi-tiered visibility zones, and live cursor tracking.

The ecosystem empowers independent creators (game designers, artists, writers, and web developers) to create, share, and monetize scenarios and modular puzzle widgets ("Machines").

---

## 2. High-Level Architecture

The platform consists of three core applications and a shared contract package:

```
               ┌────────────────────────────────────────────────────────┐
               │                        THE HUB                         │
               │  - Creator Portal & Community Marketplace              │
               │  - Scenario Catalog (Free / Paid / Demos / Bundles)    │
               │  - Revenue Sharing & Package Hosting                   │
               └───────────────────────────┬────────────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
       ┌─────────────────────────┐                   ┌─────────────────────────┐
       │       THE STUDIO        │                   │   COMPANION & ENGINE    │
       │   (Visual Creator App)  │                   │     (Player WebApp)     │
       │                         │                   │                         │
       │ • Visual Node Graph     │  Compiled Scenario│ • Quick-Check / Hints   │
       │ • Procedural Generators │  Manifest (JSON)  │ • Host Session Setup    │
       │ • Role Aggregation Rules│ ────────────────> │ • Realtime Remote Play  │
       │ • Developer Widget SDK  │                   │ • Live Presence Cursors │
       │ • Print & Play Compiler │                   │ • Soundscape / Timer    │
       └─────────────────────────┘                   └─────────────────────────┘
```

1. **The Hub (Marketplace & Identity Backend):**
   - User account management (Creators vs. Players).
   - Scenario storefront, licensing, community reviews, and revenue sharing.
   - Hosts scenario packages (Manifest JSON + vector/raster assets + widget bundles).

2. **The Studio (Creator Workspace):**
   - Responsive Angular Single Page Application.
   - Node-based visual scenario editor.
   - Procedural asset generation engine (deterministic vector mazes, ciphers, symbol locks).
   - Figma-friendly asset lifecycle manager (`Sketch` -> `Draft / Temp` -> `Final Production`).
   - Print & Play export compiler generating print-ready vector PDFs.

3. **The Engine (Companion & Live VTT WebApp):**
   - Responsive Angular application supporting both mobile smartphones (tabletop companion) and desktop/tablets (full remote play).
   - WebSockets for state synchronization and real-time cursor/viewport telemetry.
   - Dual execution modes: **Headless Scripted** (automatic progression) and **Game Master Console** (manual god-mode controls).

4. **Shared Contracts (`@escape-system/contracts`):**
   - TypeScript definitions for the Scenario Manifest, Node Graph, PRNG Seed Engine, and Developer Machine SDK.

---

## 3. The Studio: Creator Workspace & Asset Pipeline

### 3.1 Figma-Friendly Asset Management
To facilitate smooth handoffs between game designers and visual artists, the asset pipeline supports:
- **Vector-First Architecture:** Native SVG storage ensuring lossless scaling for both screen and 300+ DPI physical print.
- **Three-Tier Asset Lifecycle:**
  - `Sketch / Wireframe`: Visual greybox bounding box with text placeholders and rough geometry.
  - `Draft / Temp`: Functional placeholder art used for playtesting puzzle logic.
  - `Final Production`: Signed-off, high-resolution final artwork.
- **Figma Interop:** Direct SVG copy/paste and file drag-and-drop into the canvas, mapping SVG layer IDs (e.g., `#lock-sigil`, `#cut-guide`, `#dossier-text`) directly to scenario graph parameters.

### 3.2 Dual Scenario Authoring: Abstract Deduction vs. Narrative
The Studio supports two foundational game styles (which can be blended):
- **Abstract Logic Chains (e.g., *Sudokuvania*, *Sudoku Mansion*):**
  - Graph nodes model mathematical grids, constraint modifiers (e.g., Anti-Knight rules, thermosudoku lines), and deduction matrices.
  - Solving sub-grids unlocks physical or digital constraint tokens needed to progress.
- **Narrative & Art Escapes:**
  - Graph nodes model physical locations, environmental inspections, item cards, character diaries, and dialogue trees.

### 3.3 Visual Node Graph Model
The scenario is defined as a directed acyclic state graph (DAG) with conditional branch triggers:

```typescript
interface ScenarioManifest {
  id: string;
  version: string;
  title: string;
  author: { id: string; name: string };
  difficulty: 1 | 2 | 3 | 4 | 5;
  playerCount: { min: number; max: number; recommended: number };
  roles: RoleDefinition[];
  roleAggregation: RoleAggregationMatrix;
  nodes: Record<string, ScenarioNode>;
  initialState: GameState;
  seedConfig: SeedConfiguration;
}

interface ScenarioNode {
  id: string;
  type: 'room' | 'puzzle' | 'item' | 'machine' | 'dossier' | 'narrative';
  title: string;
  visibility: VisibilityScope;
  content: {
    visuals: AssetReference[];
    narrativeText?: string;
    physicalFallback: PhysicalCardSpec;
  };
  puzzle?: {
    lockSigil: string;             // Thematic glyph (e.g. 🜲)
    solutionKey: string[];         // Target code (e.g. ["▲", "●", "◆"] or ["3", "7"])
    hints: [string, string, string]; // [Nudge, Insight, Solution]
  };
  transitions: Array<{
    targetNodeId: string;
    condition: 'on_solve' | 'on_gm_trigger' | 'on_item_combine';
    revealType: 'open_envelope' | 'draw_card' | 'display_terminal';
    targetRefId: string;           // E.g. "Envelope #12"
  }>;
}
```

---

## 4. Roles, Asymmetry & Knowledge Dossiers

### 4.1 Symmetric vs. Asymmetric Roles
- **Standard Symmetric Mode:** All players share a default "Investigator" role with identical access to the common board and inventory.
- **Asymmetric Multi-Role Mode:** Players take on specialized roles (e.g., *Cartographer*, *Cryptographer*, *Field Agent*, *Historian*).
- **Hybrid Mode:** All players possess standard common capabilities, but specific phases or puzzles require specialized secret dossiers.

### 4.2 Dynamic Role Aggregation Matrix ($M \ge N$)
Scenarios can define $M$ specialized roles that automatically bundle when $N$ players participate:

```yaml
roles:
  - id: R_NAV
    name: "Navigator"
    exclusiveDossiers: [map_archive, star_charts]
  - id: R_DEC
    name: "Decoder"
    exclusiveDossiers: [rosetta_manual, cipher_wheels]
  - id: R_ENG
    name: "Engineer"
    exclusiveDossiers: [schematics_vol_1, wiring_guides]
  - id: R_HIS
    name: "Historian"
    exclusiveDossiers: [expedition_log, royal_lineage]

aggregation_rules:
  4_players:
    - roles: [R_NAV]
    - roles: [R_DEC]
    - roles: [R_ENG]
    - roles: [R_HIS]
  3_players:
    - roles: [R_NAV]
    - roles: [R_DEC, R_HIS]
    - roles: [R_ENG]
  2_players:
    - roles: [R_NAV, R_HIS]
    - roles: [R_DEC, R_ENG]
  1_player_solo:
    - roles: [R_NAV, R_DEC, R_ENG, R_HIS]
```

---

## 5. The Verification & Clue System

The platform provides a dual-validation pipeline: an **offline physical symbol grid** and an **online companion quick-check**.

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 SOLVING A PUZZLE                        │
                  │  1. Puzzle has a Lock Sigil (e.g., 🜲) and ID #07       │
                  │  2. Players deduce a 3-Glyph Key (e.g., [▲, ●, ◆])       │
                  └───────────────┬─────────────────────────┬───────────────┘
                                  │                         │
                     (Offline / Paper)               (Digital Companion)
                                  ▼                         ▼
             ┌─────────────────────────────┐   ┌─────────────────────────────┐
             │   SIGIL RESONANCE MATRIX    │   │     COMPANION APP / QR      │
             │   Row: 🜲 (#07)             │   │                             │
             │   Col: [▲, ●, ◆]            │   │ • Enter seed / Scan QR      │
             │   Result: Seal [♈︎ 84]       │   │ • Instant pass/fail check   │
             │       to Envelope #12       │   │ • Multi-tier hint dispenser │
             └──────────────┬──────────────┘   └─────────────────────────────┘
                            ▼
             ┌─────────────────────────────┐
             │      OUTER ENVELOPE #12     │
             │  Outer Seal on flap: [♈︎ 84] │
             │  -> Matches! Open flap.     │
             │  -> Mismatch? Don't open!   │
             └─────────────────────────────┘
```

### 5.1 Offline Verification: The Sigil Resonance Matrix
- Every puzzle features a thematic **Lock Sigil** (an icon/symbol) and an ID number.
- When players solve the puzzle, they derive a 2-to-4 character **Solution Key** (symbols, coordinates, or digits).
- The player consults the **Sigil Resonance Table** in the rulebook:
  - Row = Lock Sigil & ID.
  - Column = Deduced Solution Key.
  - The cell intersection yields a **Verification Seal** (e.g., `[♈︎ 84]`) and a target item (e.g., `Envelope #12`).
- **Spoiler-Proof Double Seal Check:** The exterior flap of `Envelope #12` displays its official Verification Seal. If the flap seal matches the table output, the solution is correct, and players open it. If it mismatches or points to a null entry, players know they made an error **without opening or spoiling the contents**.

### 5.2 Hybrid & Digital Companion Verification
- **Quick-Check:** Players scan a QR code on the physical card or select the puzzle in the web app and enter the solution code.
- **Deterministic Check:** Evaluates the input against the active session seed.
- **Audio-Visual Stinger:** Plays audio cues, advances the live session state, and logs progress.
- **Tiered Hint Dispenser:**
  - *Tier 1 (Nudge):* Hints where to look without spoiling methodology.
  - *Tier 2 (Insight):* Clarifies the deduction mechanism.
  - *Tier 3 (Full Solution):* Explicit step-by-step walk-through.

---

## 6. Print & Play (P&P) Export Pipeline

### 6.1 Host Export Pre-Flight Wizard
Before printing or dispatching, the host configures:
1. **Player Count ($N$):** Applies the designer's aggregation matrix.
2. **Session Seed:** Generates a random seed (e.g. `#VOID-882`) or accepts a custom seed.
3. **Verification Mode Toggles:**
   - `[x] Print Offline Sigil Resonance Matrix` (generates the offline verification booklet).
   - `[x] Embed Companion QR Codes / Quick-Links` (prints scan-targets on puzzle elements).
4. **Distribution Packaging:**
   - *Master Print Package:* Single multi-page PDF for two-sided home printing.
   - *Per-Player Confidential Dossiers:* $N$ separate PDFs (`Player_1_Confidential.pdf`, etc.) for direct email or Discord bot delivery.

### 6.2 Folding Formats & Anti-Spoiler Assembly
To prevent players and hosts from spoiling themselves while cutting and prepping:
- **Option A: 1-Side French Fold (Quarter-Fold):**
  - Standard A4 / US Letter paper folded in half horizontally, then in half vertically.
  - Outer face displays only the Item ID, Lock Sigil, and Verification Seal.
  - Inside panels contain the hidden puzzle, narrative, or map.
- **Option B: Double Parallel Fold:**
  - Folded in half, then in half again in the same direction, creating a compact 4-panel accordion booklet.
- **Printing Compatibility:**
  - Supports **Duplex (Two-Sided) Printing** with aligned back-printing.
  - Supports **Single-Sided Printing with Manual Pen Mark:** Front contains the content; designated cut/fold margins include an explicit guide for the host to write the reference/glyph on the back with a pen before folding.

---

## 7. The Engine: Live Multiplayer, Real-Time Presence & Developer Machines

### 7.1 Real-Time Spatial Awareness (CodinGame Escape Model)
- **Macro Presence:** Cards, rooms, and terminals show avatar badge indicators for every player currently inspecting them.
- **Micro Presence (Live Focus Cursor Tracking):**
  - When two or more players focus on the same graphical element, map, or interactive machine, the view synchronizes to a shared normalized coordinate plane $(x: 0.0 \to 1.0, y: 0.0 \to 1.0)$.
  - Displays real-time color-coded mouse cursors, click ripples, and drag highlights with player names.

### 7.2 Multi-Tiered Visibility Zones
1. **Common Table (Shared Board):** Unlocked room maps, common inventory, shared game clock, audio ambiance.
2. **Private Sanctum:** Drawer strictly locked to the player's role, housing their confidential instructions, personal inventory, and reference books.
3. **On-Demand Whisper Zones / Sub-Rooms:** Ad-hoc groupings where only authorized players can view items, inspect machines, or communicate.

### 7.3 Game Master Controls
- **Scripted Mode (Headless):** Auto-evaluates transitions via WebSockets without human oversight.
- **Live GM Console:** Provides a real-time god-view of all player viewports, active cursors, and inputs, with manual overrides to force-reveal items, push hints, or trigger sound stingers.

### 7.4 Developer "Machines" (Interactive Widget SDK)
Developers can author standalone, reusable interactive mini-games (e.g., safe keypads, wire patching, oscilloscopes).
- **Sandboxed Execution:** Hosted inside isolated iframes or Web Components.
- **SDK Contract:**
  ```typescript
  export interface GameMachine {
    initialize(config: {
      seed: string;
      playerRole: string;
      difficulty: 'easy' | 'hard';
      themeTokens: Record<string, string>;
    }): void;

    onStateChange: Observable<Record<string, unknown>>;
    onSolve: Observable<{ solutionKey: string }>;
    onAudioTrigger: Observable<{ soundId: string }>;
  }
  ```
- **Mandatory Physical Fallback:** Every developer machine must include an exportable static diagram and a paper lookup table for the GM booklet and offline P&P export.

---

## 8. Technology Stack (Cloud-Independent & Self-Hostable)

| Component | Technology | Rationale |
|---|---|---|
| **Studio & Engine WebApp** | **Angular 22+ (Zoneless, Signals, OnPush)** | Full modern signal architecture (`input()`, `output()`, `linkedSignal()`, `resource()`, Signal Forms), zoneless change detection by default (`provideExperimentalZonelessChangeDetection` / native zoneless), strict typing, and high-performance canvas bindings. |
| **Real-Time Sync Server** | **Node.js / Bun + `ws` / Fastify WebSocket** | 100% self-hostable and cloud-agnostic. Runs in standard Docker containers anywhere (VPS, bare metal, home server) without vendor lock-in. |
| **Transport Layer Architecture** | **Decoupled `SessionTransport` Adapter** | Clean interface separating real-time networking from client game logic. Enables in-memory mock transports for automated tests and scalable Redis pub/sub adapters for multi-node deployments. |
| **P&P Vector PDF Compiler** | **PDFMake / SVG-to-PDFKit** | Pure vector rendering, high DPI, precise millimeter alignment for folds, trims, and bleeds. |
| **Interactive Canvas Engine** | **Konva.js / PixiJS / SVG Canvas** | High-performance 2D canvas for node graphs, live cursors, and spatial zooming. |
| **Machine Sandboxing** | **Custom Web Components / Sandboxed iFrame** | Total security isolation preventing untrusted widget code from compromising player state. |

---

## 9. Implementation Phases

1. **Phase 1: Core Engine & Data Model**
   - `@escape-system/contracts` package (Manifest schema, PRNG seed generator).
   - Core state machine and verification matrix logic.
2. **Phase 2: Print & Play Export Pipeline**
   - PDF generation engine with French Fold and Double Parallel Fold templates.
   - Host configuration wizard and pre-flight validation.
3. **Phase 3: The Companion WebApp**
   - Mobile-first quick-check, QR code reader, countdown timer, sound player, and tiered hints.
4. **Phase 4: The Live Engine & Real-Time Presence**
   - WebSocket room orchestration, multi-tiered visibility zones, live cursor telemetry.
5. **Phase 5: The Studio (Node Graph & Asset Manager)**
   - Visual canvas editor, asset tagging (`sketch`/`temp`/`final`), and procedural generators.
6. **Phase 6: Developer Machine SDK & The Hub Marketplace**
   - Sandboxed widget harness and community publishing portal.
