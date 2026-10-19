import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { QuickCheckComponent } from './features/companion/quick-check.component.js';
import { TabletopComponent } from './features/tabletop/tabletop.component.js';
import { PnpCompiler, type PnpPage } from '@escape-system/pnp-compiler';
import type { ScenarioManifest } from '@escape-system/contracts';

export interface DisplayPage extends PnpPage {
  safeSvg: SafeHtml;
}

export interface AdminRoomInfo {
  roomId: string;
  scenarioId: string;
  scenarioTitle: string;
  seed: string;
  playMode: string;
  playerCount: number;
  createdAt: string;
  hostSecret: string;
  activeSocketsCount: number;
  members: Array<{
    playerId: string;
    playerName: string;
    seatId?: string;
    seatName?: string;
    isHost?: boolean;
    focusedElementId?: string;
  }>;
}

const defaultCryptManifest: ScenarioManifest = {
  id: 'pharaoh-crypt-01',
  version: '1.0.0',
  title: "The Pharaoh's Crypt",
  author: { id: 'a1', name: 'Dr. Jones' },
  difficulty: 3,
  playerCount: { min: 1, max: 4, recommended: 3 },
  roles: [
    { id: 'cartographer', name: 'Cartographer', exclusiveDossiers: [] },
    { id: 'engineer', name: 'Engineer', exclusiveDossiers: [] }
  ],
  roleAggregation: {
    '2_players': [{ roles: ['cartographer'] }, { roles: ['engineer'] }],
    '1_player_solo': [{ roles: ['cartographer', 'engineer'] }]
  },
  nodes: {
    room_1: {
      id: 'room_1',
      type: 'room',
      title: 'Tomb Antechamber',
      visibility: { type: 'common' },
      content: { visuals: [], narrativeText: 'The walls echo.', physicalFallback: { format: 'french_fold', label: 'Sheet #1' } },
      transitions: [{ targetNodeId: 'lock_1', condition: 'on_solve', revealType: 'open_envelope', targetRefId: 'Envelope #2' }]
    },
    lock_1: {
      id: 'lock_1',
      type: 'puzzle',
      title: 'Anubis Lock Mechanism',
      visibility: { type: 'role', roleIds: ['engineer'] },
      content: { visuals: [], narrativeText: 'Turn the gears.', physicalFallback: { format: 'card', label: 'Card #1' } },
      puzzle: {
        lockSigil: '🜲',
        solutionKey: ['▲', '●', '◆'],
        hints: ['Check gear ratios', 'Count teeth', 'Turn wheel twice']
      },
      transitions: []
    }
  },
  initialState: { unlockedNodeIds: ['room_1'], solvedPuzzleIds: [], activeDossiers: [], inventory: [] },
  seedConfig: { defaultSeed: 'e4k8x2m9' }
};

type ViewState = 'lobby' | 'host_setup' | 'pnp_dispatch' | 'tabletop' | 'companion' | 'admin';

// Pure generic alphanumeric seed generator with no fixed prefix
function generateGenericSeed(length = 10): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars[Math.floor(Math.random() * chars.length)];
  }
  return res;
}

function generateThematicRoomId(scenarioId: string): string {
  const prefix = scenarioId.includes('atlantis')
    ? 'ATLANTIS'
    : scenarioId.includes('crypt')
    ? 'CRYPT'
    : 'VAULT';
  return `${prefix}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, QuickCheckComponent, TabletopComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell">
      <nav class="app-nav">
        <div class="brand">
          <span class="logo">🗝️</span>
          <h1>Coop Game Portal</h1>
        </div>
        <div class="nav-links">
          <a href="/studio/" class="nav-link">🛠️ Escape Studio</a>
          <button class="nav-link btn-admin-link" (click)="openAdminView()">🔒 Superadmin</button>
        </div>
      </nav>

      <main class="content-container">
        @switch (activeView()) {
          
          @case ('lobby') {
            <!-- 3-Block Landing Page: Host, Join, Studio -->
            <div class="lobby-container">
              <!-- Block 1: Host a Game -->
              <div class="lobby-card host-card">
                <div class="card-icon">👑</div>
                <h2>Host a Game</h2>
                <p>Create a game room, select from official scenarios like <em>Fate of Atlantis</em>, configure player roles, and invite friends.</p>
                <button class="btn-primary" (click)="activeView.set('host_setup')">Host New Game →</button>
              </div>

              <!-- Block 2: Join a Game -->
              <div class="lobby-card join-card">
                <div class="card-icon">🕵️</div>
                <h2>Join a Game</h2>
                <p>Entering an active session? Type the Room Code provided by your host to join the table.</p>
                <div class="join-form">
                  <input
                    type="text"
                    placeholder="Room Code (e.g. CRYPT-5817)"
                    [ngModel]="joinRoomCode()"
                    (ngModelChange)="joinRoomCode.set($event)"
                  />
                  <input
                    type="text"
                    placeholder="Your Name (e.g. Indy)"
                    [ngModel]="joinPlayerName()"
                    (ngModelChange)="joinPlayerName.set($event)"
                  />
                  <button
                    class="btn-secondary"
                    [disabled]="!joinRoomCode().trim()"
                    (click)="joinOnlineGame()"
                  >
                    Join Session →
                  </button>
                </div>
              </div>

              <!-- Block 3: Escape Studio (Design Your Own Game) -->
              <div class="lobby-card studio-card">
                <div class="card-icon">🛠️</div>
                <h2>Escape Studio</h2>
                <p>Design your own escape room with visual node graph, procedural generators, Figma assets, and P&P vector compiler.</p>
                <a href="/studio/" class="btn-studio">Launch Studio →</a>
              </div>
            </div>
          }

          @case ('host_setup') {
            <div class="setup-container">
              <button class="btn-back" (click)="activeView.set('lobby')">← Back to Lobby</button>
              <h2>Host Session Configuration</h2>
              
              <!-- 1. Scenario Selection -->
              <div class="config-group">
                <h3>1. Select Scenario</h3>
                <div class="scenario-picker-row">
                  <select [ngModel]="selectedScenarioId()" (ngModelChange)="onScenarioSelected($event)">
                    <option value="fate-of-atlantis-01">
                      Indiana Jones and the Fate of Atlantis: The Lost Dialogue (Asymmetric, 3 Roles)
                    </option>
                    <option value="pharaoh-crypt-01">The Pharaoh's Crypt (Mystery, 2 Roles)</option>
                    @if (customUploadedScenario(); as custom) {
                      <option [value]="custom.id">Uploaded: {{ custom.title }}</option>
                    }
                  </select>
                  <label class="btn-upload-json">
                    📂 Upload JSON
                    <input type="file" accept=".json" (change)="onUploadCustomScenario($event)" style="display:none;" />
                  </label>
                </div>
                <p class="hint">Includes 5-symbol item intersection mechanics, GPS travel coordinates, and private dossiers.</p>
              </div>

              <!-- 2. Play Mode -->
              <div class="config-group mode-selection">
                <h3>2. Play Mode</h3>
                
                <label class="radio-card" [class.selected]="playMode() === 'online'">
                  <input type="radio" name="mode" value="online" [checked]="playMode() === 'online'" (change)="playMode.set('online')" />
                  <div class="radio-content">
                    <span class="mode-icon">🌐</span>
                    <div class="mode-text">
                      <strong>Online (Virtual Tabletop)</strong>
                      <span>Real-time multi-device play with live cursors, shared table, and secret sanctum.</span>
                    </div>
                  </div>
                </label>

                <label class="radio-card" [class.selected]="playMode() === 'pnp'">
                  <input type="radio" name="mode" value="pnp" [checked]="playMode() === 'pnp'" (change)="playMode.set('pnp')" />
                  <div class="radio-content">
                    <span class="mode-icon">🖨️</span>
                    <div class="mode-text">
                      <strong>Print & Play (Physical Tabletop)</strong>
                      <span>Generate printable PDFs, sealed envelopes, and dossiers for table play.</span>
                    </div>
                  </div>
                </label>

                @if (playMode() === 'pnp') {
                  <div class="sub-mode-selection">
                    <label class="radio-card small" [class.selected]="pnpSubMode() === 'hybrid'">
                      <input type="radio" name="submode" value="hybrid" [checked]="pnpSubMode() === 'hybrid'" (change)="pnpSubMode.set('hybrid')" />
                      <div class="mode-text">
                        <strong>📱 Companion App (Hybrid)</strong>
                        <span>Paper sheets + Phone webapp for quick-checks and progressive hints.</span>
                      </div>
                    </label>
                    <label class="radio-card small" [class.selected]="pnpSubMode() === 'paper'">
                      <input type="radio" name="submode" value="paper" [checked]="pnpSubMode() === 'paper'" (change)="pnpSubMode.set('paper')" />
                      <div class="mode-text">
                        <strong>📄 Full Paper (100% Unplugged)</strong>
                        <span>Includes printed Sigil Resonance Matrix verification booklet.</span>
                      </div>
                    </label>
                  </div>
                }
              </div>

              <!-- 3. Players & Roles -->
              <div class="config-group">
                <h3>3. Players & Role Partitioning</h3>
                <div class="inline-inputs">
                  <label>Player Count:
                    <select [ngModel]="playerCount()" (ngModelChange)="playerCount.set(+$event)">
                      <option [value]="1">1 Player (Solo - All Roles)</option>
                      <option [value]="2">2 Players (Indy vs Sophia+Marcus)</option>
                      <option [value]="3">3 Players (Indy, Sophia, Marcus)</option>
                    </select>
                  </label>
                </div>
                <div class="roles-preview">
                  <span class="roles-title">Active Role Dossiers:</span>
                  <div class="roles-pills">
                    @for (role of activeScenario().roles; track role.id) {
                      <div class="role-pill">
                        <strong>{{ role.name }}</strong>
                        <span class="dossiers-count">{{ role.exclusiveDossiers.length }} private documents</span>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <!-- 4. Room Code & Seed -->
              <div class="config-group">
                <h3>4. Game Room ID & Deterministic Seed</h3>
                
                <div class="room-id-box">
                  <label>Room Name-ID (Share with players to join):</label>
                  <div class="seed-input-row">
                    <input
                      type="text"
                      class="room-code-display"
                      [ngModel]="hostRoomCode()"
                      (ngModelChange)="hostRoomCode.set($event)"
                    />
                    <button class="btn-outline" (click)="randomizeRoomCode()">🎲 New ID</button>
                  </div>
                </div>

                <div class="seed-box" style="margin-top: 14px;">
                  <label>Procedural Session Seed (Generic String, No Prefix):</label>
                  <div class="seed-input-row">
                    <input
                      type="text"
                      class="seed-input"
                      [ngModel]="hostSeed()"
                      (ngModelChange)="hostSeed.set($event)"
                    />
                    <button class="btn-outline" (click)="randomizeSeed()">🎲 Randomize</button>
                  </div>
                  <p class="hint">Pure generic alphanumeric seed independent of the room code.</p>
                </div>
              </div>

              <!-- Launch Action Button -->
              <div class="setup-actions">
                @if (playMode() === 'online') {
                  <button class="btn-primary large" (click)="launchOnlineGame()">
                    🚀 Launch Game Table (Room: {{ hostRoomCode() }})
                  </button>
                } @else {
                  <button class="btn-primary large" (click)="goToPnpDispatch()">
                    Continue to Print Documents (Seed: {{ hostSeed() }}) →
                  </button>
                }
              </div>
            </div>
          }

          @case ('pnp_dispatch') {
            <div class="pnp-dispatch-container">
              <div class="dispatch-header">
                <button class="btn-back" (click)="activeView.set('host_setup')">← Back to Setup</button>
                <h2>🖨️ Print & Play Document Center</h2>
                <div class="dispatch-meta">
                  <span class="badge">Scenario: {{ activeScenario().title }}</span>
                  <span class="badge">Room ID: {{ hostRoomCode() }}</span>
                  <span class="badge">Seed: {{ hostSeed() }}</span>
                  <span class="badge">Players: {{ playerCount() }}</span>
                  <span class="badge" [class.hybrid]="pnpSubMode() === 'hybrid'">
                    {{ pnpSubMode() === 'hybrid' ? '📱 Hybrid (App)' : '📄 Unplugged' }}
                  </span>
                </div>
              </div>

              <!-- Document Actions Bar -->
              <div class="dispatch-actions">
                <div class="action-column">
                  <h3>Document Downloads</h3>
                  <button class="btn-action download" (click)="downloadMasterPrintPackage()">
                    <span class="icon">📥</span>
                    <div class="text">
                      <strong>Download Master Package (All Pages HTML/PDF)</strong>
                      <span>All location sheets, 5-symbol cards, crop marks, and dossiers.</span>
                    </div>
                  </button>
                  <button class="btn-action download" (click)="downloadPlayerDossiers()">
                    <span class="icon">📂</span>
                    <div class="text">
                      <strong>Download Per-Player Dossiers</strong>
                      <span>Separate files sorted for {{ activeScenario().roles.length }} player roles.</span>
                    </div>
                  </button>
                  <button class="btn-action download" (click)="exportManifestJson()">
                    <span class="icon">💾</span>
                    <div class="text">
                      <strong>Export Scenario Manifest JSON</strong>
                      <span>Download machine-readable scenario package.</span>
                    </div>
                  </button>
                </div>

                <div class="action-column">
                  <h3>Distribution & Companion</h3>
                  <button class="btn-action bot disabled" disabled>
                    <span class="icon">🤖</span>
                    <div class="text">
                      <strong>Dispatch via Discord Bot <span class="coming-soon">(Coming Soon)</span></strong>
                      <span>Direct automated DM delivery of player dossiers.</span>
                    </div>
                  </button>
                  @if (pnpSubMode() === 'hybrid') {
                    <button class="btn-action launch" (click)="activeView.set('companion')">
                      <span class="icon">📱</span>
                      <div class="text">
                        <strong>Open Companion Quick-Check App</strong>
                        <span>Launch the digital symbol keypad verifier with seed {{ hostSeed() }}.</span>
                      </div>
                    </button>
                  }
                </div>
              </div>

              <!-- Interactive Multi-Page Document Reader UX -->
              <div class="document-viewer-card">
                <div class="viewer-header">
                  <div class="viewer-nav">
                    <button class="btn-nav" [disabled]="currentPageIndex() === 0" (click)="prevPage()">◀ Previous</button>
                    <span class="page-counter">
                      Page <strong>{{ currentPageIndex() + 1 }}</strong> of <strong>{{ pnpSheets().length }}</strong>
                    </span>
                    <button class="btn-nav" [disabled]="currentPageIndex() >= pnpSheets().length - 1" (click)="nextPage()">Next ▶</button>
                  </div>

                  <div class="viewer-actions">
                    <button class="btn-print-doc" (click)="printCurrentSheet()">🖨️ Print This Page</button>
                    <button class="btn-print-doc all" (click)="openPrintAllWindow()">📄 Print All Pages</button>
                  </div>
                </div>

                <!-- Page Tabs Strip -->
                <div class="page-tabs-strip">
                  @for (sheet of pnpSheets(); track sheet.pageId; let idx = $index) {
                    <button
                      class="page-tab"
                      [class.active]="currentPageIndex() === idx"
                      (click)="currentPageIndex.set(idx)"
                    >
                      <span class="tab-num">#{{ idx + 1 }}</span>
                      <span class="tab-label">{{ sheet.title.slice(0, 16) }}</span>
                    </button>
                  }
                </div>

                <!-- Active Page Render Stage -->
                @if (currentPage(); as curPage) {
                  <div class="active-sheet-stage">
                    <div class="sheet-meta-bar">
                      <span class="sheet-badge" [class]="curPage.category">{{ curPage.category | uppercase }}</span>
                      <h4>{{ curPage.title }}</h4>
                      @if (curPage.verificationSeal) {
                        <span class="seal-pill">SEAL: {{ curPage.verificationSeal }}</span>
                      }
                    </div>

                    <div class="sheet-svg-frame" [innerHTML]="curPage.safeSvg"></div>
                  </div>
                }
              </div>
            </div>
          }

          @case ('companion') {
            <app-quick-check
              [scenarioTitle]="activeScenario().title"
              [seed]="hostSeed()"
              (exit)="activeView.set('pnp_dispatch')"
            />
          }

          @case ('tabletop') {
            <app-tabletop
              [roomId]="activeTableRoomId()"
              [localPlayerId]="joinPlayerName().toLowerCase().replace(' ', '_') || 'player_1'"
              [playerName]="joinPlayerName() || 'Investigator'"
              [assignedRole]="'Indiana Jones (The Field Archaeologist)'"
              [hostSecret]="hostSecretToken()"
              (leaveRoom)="activeView.set('lobby')"
            />
          }

          @case ('admin') {
            <div class="admin-container">
              <button class="btn-back" (click)="activeView.set('lobby')">← Back to Lobby</button>
              <h2>🔒 Secret Superadmin Room Manager</h2>

              @if (!adminAuthenticated()) {
                <div class="admin-auth-card">
                  <h3>Enter Superadmin Password</h3>
                  <div class="auth-row">
                    <input
                      type="password"
                      placeholder="Admin Password"
                      [ngModel]="adminPassword()"
                      (ngModelChange)="adminPassword.set($event)"
                      (keydown.enter)="loginAdmin()"
                    />
                    <button class="btn-primary" (click)="loginAdmin()">Authenticate</button>
                  </div>
                  @if (adminAuthError()) {
                    <p class="auth-error">{{ adminAuthError() }}</p>
                  }
                </div>
              } @else {
                <div class="admin-dashboard">
                  <div class="dashboard-header">
                    <h3>Active Game Sessions & WebSocket Rooms ({{ adminRooms().length }})</h3>
                    <button class="btn-outline" (click)="fetchAdminRooms()">🔄 Refresh</button>
                  </div>

                  @if (adminRooms().length === 0) {
                    <p class="empty-rooms">No active game rooms registered on server.</p>
                  } @else {
                    <div class="rooms-table-wrap">
                      <table class="rooms-table">
                        <thead>
                          <tr>
                            <th>Room ID</th>
                            <th>Scenario</th>
                            <th>Session Seed</th>
                            <th>Mode</th>
                            <th>Sockets</th>
                            <th>Members</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (r of adminRooms(); track r.roomId) {
                            <tr>
                              <td class="mono"><strong>{{ r.roomId }}</strong></td>
                              <td>{{ r.scenarioTitle }}</td>
                              <td class="mono">{{ r.seed }}</td>
                              <td><span class="mode-pill">{{ r.playMode }}</span></td>
                              <td>{{ r.activeSocketsCount }}</td>
                              <td>
                                <div class="members-cell">
                                  @for (m of r.members; track m.playerId) {
                                    <span class="m-tag" [class.seated]="m.seatId">
                                      {{ m.playerName }} ({{ m.seatName ?? 'Queue' }})
                                    </span>
                                  }
                                </div>
                              </td>
                              <td>
                                <button class="btn-terminate" (click)="terminateRoom(r.roomId)">
                                  Terminate
                                </button>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      </main>
    </div>
  `,
  styles: [`
    .app-shell { display: flex; flex-direction: column; min-height: 100vh; font-family: system-ui, -apple-system, sans-serif; }
    .app-nav { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: #1d3557; color: #fff; }
    .brand { display: flex; align-items: center; gap: 8px; }
    .brand h1 { margin: 0; font-size: 18px; font-weight: bold; }
    .logo { font-size: 22px; }
    .nav-links { display: flex; align-items: center; gap: 12px; }
    .nav-link { color: #f1faee; text-decoration: none; font-size: 13px; font-weight: 600; padding: 6px 12px; border-radius: 4px; background: rgba(255, 255, 255, 0.15); border: none; cursor: pointer; }
    .nav-link:hover { background: rgba(255, 255, 255, 0.25); }
    .btn-admin-link { background: rgba(231, 111, 81, 0.3); color: #ffd166; }

    .content-container { flex: 1; padding: 32px 24px; background: #f1faee; overflow-y: auto; }
    
    .btn-back { background: transparent; border: none; font-size: 14px; font-weight: bold; color: #457b9d; cursor: pointer; padding: 0; margin-bottom: 16px; }
    .btn-back:hover { color: #1d3557; text-decoration: underline; }

    /* Lobby: 3 Blocks */
    .lobby-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1080px; margin: 0 auto; }
    .lobby-card { background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); text-align: center; border: 2px solid transparent; transition: transform 0.2s; display: flex; flex-direction: column; }
    .lobby-card:hover { transform: translateY(-4px); }
    .host-card { border-color: #e76f51; }
    .join-card { border-color: #457b9d; }
    .studio-card { border-color: #2a9d8f; }
    .card-icon { font-size: 44px; margin-bottom: 14px; }
    .lobby-card h2 { margin: 0 0 12px 0; color: #1d3557; font-size: 20px; }
    .lobby-card p { color: #6c757d; font-size: 13px; line-height: 1.5; margin-bottom: 20px; flex: 1; }
    .join-form { display: flex; flex-direction: column; gap: 10px; }
    .join-form input { padding: 10px; border: 1px solid #ced4da; border-radius: 6px; font-size: 14px; }
    .btn-studio { display: block; background: #2a9d8f; color: #fff; padding: 12px; border-radius: 6px; font-weight: bold; text-decoration: none; font-size: 14px; }
    .btn-studio:hover { background: #21867a; }

    /* Buttons */
    .btn-primary { background: #e76f51; color: #fff; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer; width: 100%; transition: background 0.2s; }
    .btn-primary:hover { background: #d00000; }
    .btn-primary.large { font-size: 18px; padding: 16px; margin-top: 16px; }
    .btn-secondary { background: #457b9d; color: #fff; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer; width: 100%; }
    .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-outline { background: #fff; color: #1d3557; border: 2px solid #1d3557; padding: 8px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; white-space: nowrap; font-size: 13px; }

    /* Setup Wizard */
    .setup-container { max-width: 720px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
    .setup-container h2 { margin: 0 0 24px 0; color: #1d3557; border-bottom: 2px solid #e9ecef; padding-bottom: 12px; }
    .config-group { margin-bottom: 24px; }
    .config-group h3 { font-size: 15px; color: #343a40; margin: 0 0 12px 0; }
    .scenario-picker-row { display: flex; gap: 8px; }
    .scenario-picker-row select { flex: 1; }
    .btn-upload-json { background: #2a9d8f; color: #fff; padding: 10px 14px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; white-space: nowrap; display: flex; align-items: center; }
    .config-group select, .config-group input[type="text"] { width: 100%; padding: 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 15px; box-sizing: border-box; }
    .seed-input-row { display: flex; gap: 12px; }
    .seed-input-row input { flex: 1; }
    .room-code-display { font-family: monospace; font-size: 18px; font-weight: bold; color: #1d3557; letter-spacing: 1px; }
    .seed-input { font-family: monospace; }
    .hint { font-size: 12px; color: #6c757d; margin-top: 8px; }

    /* Roles Preview */
    .roles-preview { margin-top: 12px; background: #f8f9fa; padding: 12px; border-radius: 8px; }
    .roles-title { font-size: 12px; font-weight: bold; color: #495057; display: block; margin-bottom: 8px; }
    .roles-pills { display: flex; flex-direction: column; gap: 6px; }
    .role-pill { display: flex; justify-content: space-between; font-size: 13px; background: #fff; padding: 6px 12px; border-radius: 4px; border: 1px solid #dee2e6; }
    .dossiers-count { color: #2a9d8f; font-weight: 600; font-size: 12px; }

    /* Mode Selection */
    .radio-card { display: block; border: 2px solid #dee2e6; border-radius: 8px; padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; }
    .radio-card input { display: none; }
    .radio-card.selected { border-color: #2a9d8f; background: #f0fdfa; }
    .radio-content { display: flex; align-items: center; gap: 16px; }
    .mode-icon { font-size: 28px; }
    .mode-text { display: flex; flex-direction: column; gap: 4px; }
    .mode-text strong { color: #1d3557; font-size: 15px; }
    .mode-text span { color: #6c757d; font-size: 13px; }
    .sub-mode-selection { padding-left: 44px; margin-top: 8px; border-left: 2px solid #dee2e6; margin-left: 24px; }
    .radio-card.small { padding: 12px; margin-bottom: 8px; }
    .radio-card.small.selected { border-color: #e76f51; background: #fff5f0; }

    /* PNP Dispatch Center */
    .pnp-dispatch-container { max-width: 1100px; margin: 0 auto; }
    .dispatch-header { margin-bottom: 32px; }
    .dispatch-header h2 { margin: 0 0 12px 0; color: #1d3557; font-size: 24px; }
    .dispatch-meta { display: flex; gap: 12px; flex-wrap: wrap; }
    .badge { background: #e9ecef; color: #495057; padding: 6px 12px; border-radius: 16px; font-size: 13px; font-weight: bold; border: 1px solid #ced4da; }
    .badge.hybrid { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }

    .dispatch-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .action-column h3 { font-size: 16px; color: #343a40; border-bottom: 1px solid #dee2e6; padding-bottom: 8px; margin-bottom: 16px; }
    .btn-action { display: flex; align-items: center; gap: 16px; width: 100%; padding: 16px; background: #fff; border: 2px solid #dee2e6; border-radius: 8px; cursor: pointer; text-align: left; margin-bottom: 12px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .btn-action:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05); }
    .btn-action.download:hover { border-color: #2a9d8f; }
    .btn-action.bot:hover { border-color: #7209b7; }
    .btn-action.disabled { opacity: 0.55; cursor: not-allowed; background: #f8f9fa; border-color: #dee2e6; box-shadow: none; }
    .btn-action.disabled:hover { transform: none; border-color: #dee2e6; }
    .coming-soon { font-size: 11px; color: #6c757d; font-weight: normal; margin-left: 4px; }
    .btn-action.launch { background: #e76f51; border-color: #e76f51; color: #fff; }
    .btn-action.launch:hover { background: #d00000; border-color: #d00000; }
    .btn-action.launch .text strong, .btn-action.launch .text span { color: #fff; }
    .btn-action .icon { font-size: 28px; }
    .btn-action .text { display: flex; flex-direction: column; gap: 4px; }
    .btn-action .text strong { font-size: 15px; color: #1d3557; }
    .btn-action .text span { font-size: 13px; color: #6c757d; }

    /* Multi-Page Document Reader UX */
    .document-viewer-card {
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    }
    .viewer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }
    .viewer-nav { display: flex; align-items: center; gap: 14px; }
    .btn-nav {
      padding: 8px 14px;
      background: #fff;
      border: 1.5px solid #ced4da;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #1d3557;
      cursor: pointer;
    }
    .btn-nav:hover:not(:disabled) { border-color: #1d3557; background: #e0f2fe; }
    .btn-nav:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-counter { font-size: 14px; color: #495057; }
    .viewer-actions { display: flex; gap: 10px; }
    .btn-print-doc {
      padding: 8px 16px;
      background: #ffffff;
      border: 1.5px solid #1d3557;
      color: #1d3557;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-print-doc.all { background: #1d3557; color: #fff; }

    .page-tabs-strip {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 10px 20px;
      background: #e9ecef;
      border-bottom: 1px solid #ced4da;
    }
    .page-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: #ffffff;
      border: 1px solid #ced4da;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
    }
    .page-tab.active { background: #1d3557; color: #fff; border-color: #1d3557; font-weight: bold; }
    .tab-num { font-family: monospace; font-size: 11px; opacity: 0.8; }

    .active-sheet-stage { padding: 24px; background: #ffffff; display: flex; flex-direction: column; align-items: center; }
    .sheet-meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      max-width: 860px;
      margin-bottom: 16px;
    }
    .sheet-meta-bar h4 { margin: 0; font-size: 16px; color: #1d3557; }
    .sheet-badge { font-weight: bold; font-size: 12px; padding: 2px 8px; border-radius: 4px; }
    .sheet-badge.common { background: #e0f2fe; color: #0369a1; }
    .sheet-badge.dossier { background: #fef3c7; color: #92400e; }
    .sheet-badge.verification { background: #fee2e2; color: #991b1b; }
    .seal-pill { background: #dcfce7; color: #166534; font-weight: bold; font-size: 12px; padding: 2px 8px; border-radius: 4px; }

    .sheet-svg-frame {
      width: 100%;
      max-width: 860px;
      background: #fdfdfd;
      border: 1px solid #ced4da;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      display: flex;
      justify-content: center;
      overflow: auto;
    }
    .sheet-svg-frame svg { width: 100%; max-width: 820px; height: auto; }

    /* Superadmin UI */
    .admin-container { max-width: 1000px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .admin-container h2 { margin: 0 0 20px 0; color: #1d3557; border-bottom: 2px solid #e9ecef; padding-bottom: 12px; }
    .admin-auth-card { max-width: 440px; margin: 40px auto; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 24px; text-align: center; }
    .auth-row { display: flex; gap: 8px; margin-top: 16px; }
    .auth-row input { flex: 1; padding: 10px; border: 1px solid #ced4da; border-radius: 6px; font-size: 14px; }
    .auth-error { color: #dc2626; font-size: 12px; margin-top: 8px; }
    .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .rooms-table-wrap { overflow-x: auto; border: 1px solid #dee2e6; border-radius: 8px; }
    .rooms-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    .rooms-table th, .rooms-table td { padding: 12px 14px; border-bottom: 1px solid #eee; }
    .rooms-table th { background: #f8f9fa; font-weight: 600; color: #495057; }
    .mono { font-family: monospace; }
    .mode-pill { background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .members-cell { display: flex; gap: 4px; flex-wrap: wrap; }
    .m-tag { font-size: 11px; padding: 2px 6px; background: #f1f5f9; border-radius: 4px; }
    .m-tag.seated { background: #dcfce7; color: #166534; font-weight: bold; }
    .btn-terminate { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; }
    .btn-terminate:hover { background: #dc2626; color: #fff; }
    .empty-rooms { text-align: center; padding: 40px; color: #6c757d; }
  `]
})
export class AppComponent {
  protected readonly sanitizer = inject(DomSanitizer);

  readonly activeView = signal<ViewState>('lobby');

  // Lobby Join State
  readonly joinRoomCode = signal('');
  readonly joinPlayerName = signal('');
  readonly hostSecretToken = signal<string | undefined>(undefined);

  // Host Setup State
  readonly selectedScenarioId = signal('fate-of-atlantis-01');
  readonly customUploadedScenario = signal<ScenarioManifest | null>(null);
  readonly playerCount = signal(3);
  readonly hostSeed = signal(generateGenericSeed(10));
  readonly hostRoomCode = signal(generateThematicRoomId('fate-of-atlantis-01'));
  readonly playMode = signal<'online' | 'pnp'>('online');
  readonly pnpSubMode = signal<'hybrid' | 'paper'>('hybrid');

  // Multi-page document viewer state
  readonly currentPageIndex = signal(0);

  // Admin state
  readonly adminAuthenticated = signal(false);
  readonly adminPassword = signal('');
  readonly adminAuthError = signal('');
  readonly adminRooms = signal<AdminRoomInfo[]>([]);

  readonly activeScenario = computed<ScenarioManifest>(() => {
    const custom = this.customUploadedScenario();
    if (custom && custom.id === this.selectedScenarioId()) {
      return custom;
    }
    return defaultCryptManifest;
  });

  readonly activeTableRoomId = computed(() => {
    return this.joinRoomCode().trim() || this.hostRoomCode();
  });

  readonly pnpRawOutput = computed(() => {
    const scenario = this.activeScenario();
    return PnpCompiler.compile(scenario, {
      playerCount: this.playerCount(),
      seed: this.hostSeed(),
      foldFormat: 'french-fold',
      includeVerificationGrid: this.playMode() === 'pnp' && this.pnpSubMode() === 'paper',
      singleSidedManualMark: false
    });
  });

  readonly pnpSheets = computed<DisplayPage[]>(() => {
    const raw = this.pnpRawOutput();
    return raw.allPages.map(page => ({
      ...page,
      safeSvg: this.sanitizer.bypassSecurityTrustHtml(page.svg)
    }));
  });

  readonly currentPage = computed<DisplayPage | null>(() => {
    const sheets = this.pnpSheets();
    const idx = this.currentPageIndex();
    return sheets[idx] ?? sheets[0] ?? null;
  });

  constructor() {
    // Check URL query parameters for direct room joining (?room=XYZ&secret=ABC) or admin (?view=admin)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      const secret = params.get('secret');
      const view = params.get('view');

      if (view === 'admin') {
        this.activeView.set('admin');
      } else if (room) {
        this.joinRoomCode.set(room);
        if (secret) {
          this.hostSecretToken.set(secret);
          this.joinPlayerName.set('Host');
        } else {
          this.joinPlayerName.set('Player_' + Math.floor(Math.random() * 900 + 100));
        }
        this.activeView.set('tabletop');
      }
    }
  }

  openAdminView(): void {
    this.activeView.set('admin');
    if (this.adminAuthenticated()) {
      this.fetchAdminRooms();
    }
  }

  loginAdmin(): void {
    const pass = this.adminPassword().trim();
    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass })
    })
      .then(res => {
        if (res.ok) {
          this.adminAuthenticated.set(true);
          this.adminAuthError.set('');
          this.fetchAdminRooms();
        } else {
          this.adminAuthError.set('Invalid password');
        }
      })
      .catch(err => {
        this.adminAuthError.set('Login failed: ' + (err as Error).message);
      });
  }

  fetchAdminRooms(): void {
    const pass = this.adminPassword().trim() || 'atlantis-admin';
    fetch('/api/admin/rooms', {
      headers: { Authorization: `Bearer ${pass}` }
    })
      .then(res => res.json())
      .then(data => {
        this.adminRooms.set(data.rooms ?? []);
      })
      .catch(() => {});
  }

  terminateRoom(roomId: string): void {
    const pass = this.adminPassword().trim() || 'atlantis-admin';
    if (!confirm(`Are you sure you want to terminate room ${roomId}?`)) return;

    fetch(`/api/admin/rooms/${encodeURIComponent(roomId)}/terminate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pass}` }
    })
      .then(() => {
        this.fetchAdminRooms();
      })
      .catch(() => {});
  }

  onScenarioSelected(scenarioId: string): void {
    this.selectedScenarioId.set(scenarioId);
    this.hostRoomCode.set(generateThematicRoomId(scenarioId));
    this.currentPageIndex.set(0);
  }

  onUploadCustomScenario(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string) as ScenarioManifest;
        this.customUploadedScenario.set(json);
        this.selectedScenarioId.set(json.id);
        this.hostRoomCode.set(generateThematicRoomId(json.id));
        alert(`Loaded scenario "${json.title}"!`);
      } catch (err) {
        alert('Invalid JSON scenario: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  }

  randomizeSeed(): void {
    this.hostSeed.set(generateGenericSeed(10));
    this.currentPageIndex.set(0);
  }

  randomizeRoomCode(): void {
    this.hostRoomCode.set(generateThematicRoomId(this.selectedScenarioId()));
  }

  prevPage(): void {
    if (this.currentPageIndex() > 0) {
      this.currentPageIndex.update(i => i - 1);
    }
  }

  nextPage(): void {
    if (this.currentPageIndex() < this.pnpSheets().length - 1) {
      this.currentPageIndex.update(i => i + 1);
    }
  }

  joinOnlineGame(): void {
    const code = this.joinRoomCode().trim().toUpperCase();
    if (!code) return;

    // Check backend in-memory session
    fetch(`/api/sessions/${encodeURIComponent(code)}`)
      .then(res => res.ok ? res.json() : null)
      .then(session => {
        if (session?.seed) {
          this.hostSeed.set(session.seed);
        }
      })
      .catch(() => {})
      .finally(() => {
        this.activeView.set('tabletop');
      });
  }

  launchOnlineGame(): void {
    const secret = generateGenericSeed(12);
    this.hostSecretToken.set(secret);
    this.joinRoomCode.set(this.hostRoomCode());
    this.joinPlayerName.set('Host');

    // Register session in memory in the backend
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: this.hostRoomCode(),
        hostSecret: secret,
        scenarioId: this.activeScenario().id,
        scenarioTitle: this.activeScenario().title,
        seed: this.hostSeed(),
        playerCount: this.playerCount(),
        playMode: this.playMode(),
        pnpSubMode: this.pnpSubMode()
      })
    }).catch(() => {});

    this.activeView.set('tabletop');
  }

  goToPnpDispatch(): void {
    this.currentPageIndex.set(0);
    this.activeView.set('pnp_dispatch');
  }

  downloadMasterPrintPackage(): void {
    const raw = this.pnpRawOutput();
    const scenario = this.activeScenario();
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${scenario.title} - Master Print Package</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    body { margin: 0; padding: 0; background: #444; }
    .print-sheet {
      page-break-after: always;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #ffffff;
      width: 100vw;
      height: 100vh;
      box-sizing: border-box;
      padding: 0;
    }
    svg { width: 100%; height: 100%; max-height: 100vh; }
    @media print {
      body { background: none; }
      .print-sheet { width: 100%; height: 100vh; page-break-after: always; }
    }
  </style>
</head>
<body>
  ${raw.allPages.map(page => `<div class="print-sheet">${page.svg}</div>`).join('')}
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    this.triggerDownload(`${scenario.id}-${this.hostSeed()}-master-print-package.html`, html, 'text/html');
  }

  downloadPlayerDossiers(): void {
    const raw = this.pnpRawOutput();
    const scenario = this.activeScenario();

    raw.playerDossiers.forEach(dossier => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${scenario.title} - Player ${dossier.playerIndex} Dossier</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    body { margin: 0; padding: 0; background: #fff; font-family: sans-serif; }
    .cover { padding: 40px; text-align: center; page-break-after: always; }
    .print-sheet { page-break-after: always; display: flex; justify-content: center; align-items: center; width: 100vw; height: 100vh; }
    svg { width: 100%; height: 100%; max-height: 100vh; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>CONFIDENTIAL PLAYER DOSSIER</h1>
    <h2>${scenario.title}</h2>
    <p><strong>Player Slot:</strong> ${dossier.playerIndex} of ${raw.playerCount}</p>
    <p><strong>Assigned Roles:</strong> ${dossier.roles.join(', ')}</p>
    <p><em>Do not open or read until instructed during game setup!</em></p>
  </div>
  ${dossier.pages.map(page => `<div class="print-sheet">${page.svg}</div>`).join('')}
</body>
</html>`;

      this.triggerDownload(`${scenario.id}-Player_${dossier.playerIndex}_Dossier.html`, html, 'text/html');
    });
  }

  exportManifestJson(): void {
    const scenario = this.activeScenario();
    const jsonStr = JSON.stringify(scenario, null, 2);
    this.triggerDownload(`${scenario.id}-manifest.json`, jsonStr, 'application/json');
  }

  printCurrentSheet(): void {
    const cur = this.currentPage();
    if (!cur) return;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<!DOCTYPE html><html><head><title>${cur.title}</title><style>@page { size: A4; margin: 0; } body { margin: 0; display: flex; justify-content: center; align-items: center; width: 100vw; height: 100vh; } svg { width: 100%; height: 100%; }</style></head><body>${cur.svg}<script>window.onload = () => window.print();</script></body></html>`);
      win.document.close();
    }
  }

  openPrintAllWindow(): void {
    const raw = this.pnpRawOutput();
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<!DOCTYPE html><html><head><title>Print All Sheets</title><style>@page { size: A4; margin: 0; } body { margin: 0; } .print-sheet { page-break-after: always; display: flex; justify-content: center; align-items: center; width: 100vw; height: 100vh; } svg { width: 100%; height: 100%; }</style></head><body>${raw.allPages.map(p => `<div class="print-sheet">${p.svg}</div>`).join('')}<script>window.onload = () => window.print();</script></body></html>`);
      win.document.close();
    }
  }

  protected triggerDownload(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
