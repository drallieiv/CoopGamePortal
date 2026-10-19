import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuickCheckComponent } from './features/companion/quick-check.component.js';
import { TabletopComponent } from './features/tabletop/tabletop.component.js';
import { PnpCompiler, type PnpOutput } from '@escape-system/pnp-compiler';
import { resolveRolesForPlayerCount } from '@escape-system/contracts';

// Minimal mock manifest for preview in client
const mockManifest = {
  id: 'pharaoh-crypt-01',
  version: '1.0.0',
  title: 'The Pharaohs Crypt',
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
      type: 'room' as const,
      title: 'Tomb Antechamber',
      visibility: { type: 'common' as const },
      content: { visuals: [], narrativeText: 'The walls echo.', physicalFallback: { format: 'sheet' as const, label: 'Sheet #1' } },
      transitions: [{ targetNodeId: 'lock_1', condition: 'on_solve' as const, revealType: 'open_envelope' as const, targetRefId: 'Envelope #2' }]
    },
    lock_1: {
      id: 'lock_1',
      type: 'puzzle' as const,
      title: 'Anubis Lock Mechanism',
      visibility: { type: 'role' as const, roleIds: ['engineer'] },
      content: { visuals: [], narrativeText: 'Turn the gears.', physicalFallback: { format: 'card' as const, label: 'Card #1' } },
      puzzle: {
        lockSigil: '🜲',
        solutionKey: ['▲', '●', '◆'],
        hints: ['Check gear ratios', 'Count teeth', 'Turn wheel twice'] as [string, string, string]
      },
      transitions: []
    }
  },
  initialState: { unlockedNodeIds: ['room_1'], solvedPuzzleIds: [], activeDossiers: [], inventory: [] },
  seedConfig: { defaultSeed: 'EGYPT-404' }
};

type ViewState = 'lobby' | 'host_setup' | 'pnp_dispatch' | 'tabletop' | 'companion';

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
      </nav>

      <main class="content-container">
        @switch (activeView()) {
          
          @case ('lobby') {
            <div class="lobby-container">
              <div class="lobby-card host-card">
                <div class="card-icon">👑</div>
                <h2>Host a Game</h2>
                <p>Select a scenario, configure the session, and invite players or prepare Print & Play files.</p>
                <button class="btn-primary" (click)="activeView.set('host_setup')">Configure New Session</button>
              </div>

              <div class="lobby-card join-card">
                <div class="card-icon">🕵️</div>
                <h2>Join a Game</h2>
                <p>Enter a room code provided by your host to join an online Virtual Tabletop session.</p>
                <div class="join-form">
                  <input type="text" placeholder="Room Code (e.g. CRYPT-902)" [ngModel]="joinRoomCode()" (ngModelChange)="joinRoomCode.set($event)" />
                  <input type="text" placeholder="Your Name" [ngModel]="joinPlayerName()" (ngModelChange)="joinPlayerName.set($event)" />
                  <button class="btn-secondary" (click)="joinOnlineGame()">Join Session</button>
                </div>
              </div>
            </div>
          }

          @case ('host_setup') {
            <div class="setup-container">
              <button class="btn-back" (click)="activeView.set('lobby')">← Back to Lobby</button>
              <h2>Host Session Configuration</h2>
              
              <div class="config-group">
                <h3>1. Select Scenario</h3>
                <select [ngModel]="selectedScenarioId()" (ngModelChange)="selectedScenarioId.set($event)">
                  <option value="pharaoh-crypt-01">The Pharaoh's Crypt</option>
                  <option value="cyber-vault-99">The Cybernetic Vault</option>
                </select>
              </div>

              <div class="config-group">
                <h3>2. Players & Roles</h3>
                <div class="inline-inputs">
                  <label>Player Count:
                    <select [ngModel]="playerCount()" (ngModelChange)="playerCount.set(+$event)">
                      <option [value]="1">1 Player (Solo)</option>
                      <option [value]="2">2 Players</option>
                      <option [value]="3">3 Players</option>
                      <option [value]="4">4 Players</option>
                    </select>
                  </label>
                </div>
              </div>

              <div class="config-group">
                <h3>3. Session Seed</h3>
                <div class="seed-input-row">
                  <input type="text" [ngModel]="hostSeed()" (ngModelChange)="hostSeed.set($event)" />
                  <button class="btn-outline" (click)="randomizeSeed()">🎲 Randomize</button>
                </div>
                <p class="hint">The seed guarantees everyone plays the exact same randomized puzzles.</p>
              </div>

              <div class="config-group mode-selection">
                <h3>4. Play Mode</h3>
                
                <label class="radio-card" [class.selected]="playMode() === 'online'">
                  <input type="radio" name="mode" value="online" [checked]="playMode() === 'online'" (change)="playMode.set('online')" />
                  <div class="radio-content">
                    <span class="mode-icon">🌐</span>
                    <div class="mode-text">
                      <strong>Online (Virtual Tabletop)</strong>
                      <span>Real-time multi-device play with live cursors and shared board.</span>
                    </div>
                  </div>
                </label>

                <label class="radio-card" [class.selected]="playMode() === 'pnp'">
                  <input type="radio" name="mode" value="pnp" [checked]="playMode() === 'pnp'" (change)="playMode.set('pnp')" />
                  <div class="radio-content">
                    <span class="mode-icon">🖨️</span>
                    <div class="mode-text">
                      <strong>Print & Play (Physical Tabletop)</strong>
                      <span>Generate printable PDFs and envelopes for offline play.</span>
                    </div>
                  </div>
                </label>

                @if (playMode() === 'pnp') {
                  <div class="sub-mode-selection">
                    <label class="radio-card small" [class.selected]="pnpSubMode() === 'hybrid'">
                      <input type="radio" name="submode" value="hybrid" [checked]="pnpSubMode() === 'hybrid'" (change)="pnpSubMode.set('hybrid')" />
                      <div class="mode-text">
                        <strong>📱 Companion App (Hybrid)</strong>
                        <span>Paper puzzles + Phone webapp for quick-checks and hints.</span>
                      </div>
                    </label>
                    <label class="radio-card small" [class.selected]="pnpSubMode() === 'paper'">
                      <input type="radio" name="submode" value="paper" [checked]="pnpSubMode() === 'paper'" (change)="pnpSubMode.set('paper')" />
                      <div class="mode-text">
                        <strong>📄 Full Paper (100% Unplugged)</strong>
                        <span>Print offline Sigil Resonance Matrix verification booklet.</span>
                      </div>
                    </label>
                  </div>
                }
              </div>

              <div class="setup-actions">
                @if (playMode() === 'online') {
                  <button class="btn-primary large" (click)="launchOnlineGame()">Launch Online Tabletop</button>
                } @else {
                  <button class="btn-primary large" (click)="goToPnpDispatch()">Continue to Print & Documents →</button>
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
                  <span class="badge">Scenario: {{ selectedScenarioId() }}</span>
                  <span class="badge">Seed: {{ hostSeed() }}</span>
                  <span class="badge">Players: {{ playerCount() }}</span>
                  <span class="badge" [class.hybrid]="pnpSubMode() === 'hybrid'">
                    {{ pnpSubMode() === 'hybrid' ? '📱 Hybrid (App)' : '📄 Unplugged' }}
                  </span>
                </div>
              </div>

              <div class="dispatch-actions">
                <div class="action-column">
                  <h3>Document Downloads</h3>
                  <button class="btn-action download">
                    <span class="icon">📥</span>
                    <div class="text">
                      <strong>Download Master Print Package (PDF)</strong>
                      <span>All sheets, crop marks, and shared documents.</span>
                    </div>
                  </button>
                  <button class="btn-action download">
                    <span class="icon">📂</span>
                    <div class="text">
                      <strong>Download Per-Player Dossiers (.zip)</strong>
                      <span>Discrete sealed PDFs mapped to the {{ playerCount() }} player roles.</span>
                    </div>
                  </button>
                </div>

                <div class="action-column">
                  <h3>Distribution & Companion</h3>
                  <button class="btn-action bot">
                    <span class="icon">🤖</span>
                    <div class="text">
                      <strong>Dispatch via Discord Bot</strong>
                      <span>Send individual dossiers directly to players via DM.</span>
                    </div>
                  </button>
                  @if (pnpSubMode() === 'hybrid') {
                    <button class="btn-action launch" (click)="activeView.set('companion')">
                      <span class="icon">📱</span>
                      <div class="text">
                        <strong>Open Companion Quick-Check App</strong>
                        <span>Launch the digital verifier pre-loaded with seed {{ hostSeed() }}.</span>
                      </div>
                    </button>
                  }
                </div>
              </div>

              <div class="sheets-preview-section">
                <h3>Live Document Preview (Generated for Seed {{ hostSeed() }})</h3>
                <div class="sheets-gallery">
                  @for (page of pnpSheets(); track page.pageId) {
                    <div class="sheet-container">
                      <div class="sheet-meta">
                        <span class="sheet-category" [class]="page.category">{{ page.category | uppercase }}</span>
                        <span class="sheet-title">{{ page.title }}</span>
                        @if (page.verificationSeal) {
                          <span class="seal-pill">SEAL: {{ page.verificationSeal }}</span>
                        }
                      </div>
                      <div class="sheet-svg-frame" [innerHTML]="page.svg"></div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          @case ('companion') {
            <app-quick-check
              scenarioTitle="The Pharaohs Crypt"
              [seed]="hostSeed()"
              (exit)="activeView.set('pnp_dispatch')"
            />
          }

          @case ('tabletop') {
            <app-tabletop
              [roomId]="joinRoomCode() || 'ROOM-' + hostSeed()"
              [localPlayerId]="joinPlayerName().toLowerCase() || 'host'"
              [playerName]="joinPlayerName() || 'Host'"
              assignedRole="Cartographer"
              (leaveRoom)="activeView.set('lobby')"
            />
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
    
    .content-container { flex: 1; padding: 32px 24px; background: #f1faee; overflow-y: auto; }
    
    .btn-back { background: transparent; border: none; font-size: 14px; font-weight: bold; color: #457b9d; cursor: pointer; padding: 0; margin-bottom: 16px; }
    .btn-back:hover { color: #1d3557; text-decoration: underline; }

    /* Lobby */
    .lobby-container { display: flex; gap: 32px; max-width: 900px; margin: 0 auto; justify-content: center; }
    .lobby-card { background: #fff; border-radius: 12px; padding: 32px; flex: 1; box-shadow: 0 4px 16px rgba(0,0,0,0.05); text-align: center; border: 2px solid transparent; transition: transform 0.2s; }
    .lobby-card:hover { transform: translateY(-4px); }
    .host-card { border-color: #e76f51; }
    .join-card { border-color: #457b9d; }
    .card-icon { font-size: 48px; margin-bottom: 16px; }
    .lobby-card h2 { margin: 0 0 16px 0; color: #1d3557; }
    .lobby-card p { color: #6c757d; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
    .join-form { display: flex; flex-direction: column; gap: 12px; }
    .join-form input { padding: 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 15px; }

    /* Buttons */
    .btn-primary { background: #e76f51; color: #fff; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 15px; cursor: pointer; width: 100%; transition: background 0.2s; }
    .btn-primary:hover { background: #d00000; }
    .btn-primary.large { font-size: 18px; padding: 16px; margin-top: 16px; }
    .btn-secondary { background: #457b9d; color: #fff; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 15px; cursor: pointer; width: 100%; }
    .btn-outline { background: #fff; color: #1d3557; border: 2px solid #1d3557; padding: 10px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }

    /* Setup Wizard */
    .setup-container { max-width: 680px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
    .setup-container h2 { margin: 0 0 24px 0; color: #1d3557; border-bottom: 2px solid #e9ecef; padding-bottom: 12px; }
    .config-group { margin-bottom: 24px; }
    .config-group h3 { font-size: 15px; color: #343a40; margin: 0 0 12px 0; }
    .config-group select, .config-group input[type="text"] { width: 100%; padding: 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 15px; box-sizing: border-box; }
    .seed-input-row { display: flex; gap: 12px; }
    .seed-input-row input { flex: 1; }
    .hint { font-size: 12px; color: #6c757d; margin-top: 8px; }

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

    .dispatch-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px; }
    .action-column h3 { font-size: 16px; color: #343a40; border-bottom: 1px solid #dee2e6; padding-bottom: 8px; margin-bottom: 16px; }
    .btn-action { display: flex; align-items: center; gap: 16px; width: 100%; padding: 16px; background: #fff; border: 2px solid #dee2e6; border-radius: 8px; cursor: pointer; text-align: left; margin-bottom: 12px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .btn-action:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05); }
    .btn-action.download:hover { border-color: #2a9d8f; }
    .btn-action.bot:hover { border-color: #7209b7; }
    .btn-action.launch { background: #e76f51; border-color: #e76f51; color: #fff; }
    .btn-action.launch:hover { background: #d00000; border-color: #d00000; }
    .btn-action.launch .text strong, .btn-action.launch .text span { color: #fff; }
    .btn-action .icon { font-size: 28px; }
    .btn-action .text { display: flex; flex-direction: column; gap: 4px; }
    .btn-action .text strong { font-size: 15px; color: #1d3557; }
    .btn-action .text span { font-size: 13px; color: #6c757d; }

    .sheets-preview-section h3 { font-size: 18px; color: #1d3557; margin-bottom: 16px; }
    .sheets-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 24px; }
    .sheet-container { background: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
    .sheet-meta { padding: 10px 16px; background: #fafafa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
    .sheet-category { font-weight: bold; padding: 2px 6px; border-radius: 4px; }
    .sheet-category.common { background: #e0f2fe; color: #0369a1; }
    .sheet-category.dossier { background: #fef3c7; color: #92400e; }
    .sheet-category.verification { background: #fee2e2; color: #991b1b; }
    .seal-pill { background: #dcfce7; color: #166534; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
    .sheet-svg-frame { padding: 16px; background: #fdfdfd; display: flex; justify-content: center; align-items: center; max-height: 480px; overflow: auto; }
    .sheet-svg-frame svg { max-width: 100%; height: auto; }
  `]
})
export class AppComponent {
  readonly activeView = signal<ViewState>('lobby');

  // Lobby Join State
  readonly joinRoomCode = signal('');
  readonly joinPlayerName = signal('');

  // Host Setup State
  readonly selectedScenarioId = signal('pharaoh-crypt-01');
  readonly playerCount = signal(2);
  readonly hostSeed = signal('CRYPT-' + Math.floor(Math.random() * 9000 + 1000));
  readonly playMode = signal<'online' | 'pnp'>('pnp');
  readonly pnpSubMode = signal<'hybrid' | 'paper'>('hybrid');

  readonly pnpSheets = computed(() => {
    // Generate preview using the mock manifest
    const out = PnpCompiler.compile(mockManifest, {
      playerCount: this.playerCount(),
      seed: this.hostSeed(),
      foldFormat: 'french-fold',
      includeVerificationGrid: this.playMode() === 'pnp' && this.pnpSubMode() === 'paper',
      singleSidedManualMark: false
    });
    return out.allPages;
  });

  randomizeSeed(): void {
    this.hostSeed.set('CRYPT-' + Math.floor(Math.random() * 9000 + 1000));
  }

  joinOnlineGame(): void {
    if (this.joinRoomCode().trim()) {
      this.activeView.set('tabletop');
    }
  }

  launchOnlineGame(): void {
    this.joinRoomCode.set('ROOM-' + this.hostSeed());
    this.joinPlayerName.set('Host');
    this.activeView.set('tabletop');
  }

  goToPnpDispatch(): void {
    this.activeView.set('pnp_dispatch');
  }
}
