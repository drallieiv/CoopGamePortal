# 🗝️ CoopGamePortal

A modern, cloud-independent platform for designing, publishing, and playing **tabletop escape room and deduction games** (in the vein of *Unlock!*, *Exit: The Game*, *We Were Here*, and *Keep Talking and Nobody Explodes*).

---

## 🌟 Core Pillars

1. **Board Game-First Print & Play Engine:**
   - 100% offline-playable physical paper game nights.
   - Vector SVG compiler producing **Bi-Fold French Seal** and **Double Parallel Fold** sheets with 3mm bleeds and trim marks.
   - **Spoiler-Proof Sigil Resonance Matrix:** Self-checking validation table using verification seals on outer flaps to prevent accidental spoilers.
   - **Chained Puzzle Logic:** Differentiates between solving a puzzle to get an informational clue vs. unlocking a physical sealed envelope.

2. **Angular 22+ Client (`apps/client`):**
   - **📱 Companion Quick-Check:** Mobile-first digital validator for paper play. Enter seed, select lock sigil, test combinations, and progressively unlock 3 tiers of hints.
   - **🖥️ Virtual Tabletop (VTT):** Full remote play with a common board, confidential Private Sanctum role dossiers, and real-time cursor/focus tracking.

3. **Escape Studio (`apps/studio`):**
   - Visual Scenario Node Graph with Bezier transition wires.
   - Figma-friendly asset lifecycle manager (`Sketch` $\to$ `Draft` $\to$ `Final Art`).
   - Procedural vector asset generators (labyrinths and runic substitution ciphers with the Rosetta Ledger).
   - Live Print & Play vector preview and manifest JSON exporter.

4. **Scenario Hub API (`apps/hub`):**
   - Scenario catalog and marketplace REST API.
   - Publisher verification and bundle distribution.

5. **Unified Gateway (`apps/gateway`):**
   - Single-container HTTP + WebSocket router running on a single port for zero-config deployments.

---

## 🚀 Quickstart (Local Development)

### Prerequisites
- Node.js >= 22.0.0
- npm >= 10.0.0

```bash
# 1. Install dependencies
npm install

# 2. Run all tests (60 unit and integration tests)
npm test

# 3. Build all packages and web bundles
npm run build

# 4. Start unified portal
npm start
```

Access locally at:
- **Player Companion & VTT:** [http://localhost:3000/](http://localhost:3000/)
- **Escape Studio:** [http://localhost:3000/studio](http://localhost:3000/studio)
- **Hub Marketplace API:** [http://localhost:3000/api/scenarios](http://localhost:3000/api/scenarios)
- **Health Check:** [http://localhost:3000/health](http://localhost:3000/health)

---

## 🐳 Docker Deployment

### Run with Docker Compose
```bash
docker compose up --build
```

### Run with Docker CLI
```bash
docker build -t coop-game-portal .
docker run -d --name coop-portal -p 3000:3000 coop-game-portal
```

---

## ☁️ Deploying to Render

This repository includes a `render.yaml` Blueprint specification.

### 1-Click Deployment:
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** $\to$ **Blueprint**.
3. Connect your repository: `drallieiv/CoopGamePortal`.
4. Render will automatically read `render.yaml`, build the multi-stage Docker container, and assign you a live HTTPS + WebSocket URL.
5. In your Render service settings under **Environment**, you can fill in your custom credentials and secrets whenever you are ready.
