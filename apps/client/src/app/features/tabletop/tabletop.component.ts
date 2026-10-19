import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransportService } from '../../services/transport.service.js';
import { CursorCanvasComponent } from './cursor-canvas.component.js';
import type { CursorMovePayload, PlayerPresence } from '@escape-system/contracts';

interface TabletopZone {
  id: string;
  title: string;
  description: string;
  sigil: string;
  symbols?: string[];
  visualSvg?: string;
}

@Component({
  selector: 'app-tabletop',
  imports: [CommonModule, FormsModule, CursorCanvasComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tabletop-shell">
      <!-- Top Navigation & Presence Bar -->
      <header class="top-bar">
        <div class="room-info">
          <button class="btn-leave" (click)="onLeave()">← Leave</button>
          <h2>Room: {{ roomId() }}</h2>
          <span class="status-indicator" [class.online]="transport.statusSignal() === 'connected'">
            {{ transport.statusSignal() }}
          </span>
          @if (isHost()) {
            <span class="host-pill">👑 Host</span>
          }
        </div>

        <div class="players-presence">
          @for (p of transport.players(); track p.playerId) {
            <div class="player-badge" [style.border-color]="p.color">
              <span class="avatar-dot" [style.background-color]="p.color"></span>
              <span class="name">{{ p.playerName }}</span>
              @if (p.seatName) {
                <span class="seat-badge">🪑 {{ p.seatName }}</span>
              } @else {
                <span class="queue-badge">⏳ In Queue</span>
              }
              @if (p.focusedElementId) {
                <span class="inspecting" [style.color]="p.color">👁 {{ getZoneTitle(p.focusedElementId) }}</span>
              }
            </div>
          }
        </div>
      </header>

      <!-- Host Control Panel (Visible only to Host) -->
      @if (isHost()) {
        <div class="host-panel">
          <div class="host-header">
            <h4>👑 Host Seat & Queue Manager</h4>
            <div class="host-links">
              <button class="btn-link" (click)="copyPlayerInvite()">🔗 Copy Player Link</button>
              <button class="btn-link secret" (click)="copyHostLink()">🔑 Copy Host Secret Link</button>
            </div>
          </div>

          <div class="seats-assignment-grid">
            @for (seat of availableSeats(); track seat.id) {
              <div class="seat-slot">
                <span class="seat-title">{{ seat.name }}</span>
                @if (getSeatedPlayer(seat.id); as seated) {
                  <div class="assigned-player">
                    <span class="player-name">{{ seated.playerName }}</span>
                    <button class="btn-unseat" (click)="unseatPlayer(seated.playerId)">✕ Unseat</button>
                  </div>
                } @else {
                  <div class="empty-seat">
                    <select (change)="onAssignSeat(seat.id, seat.name, $event)">
                      <option value="">-- Assign Player --</option>
                      @for (w of waitingPlayers(); track w.playerId) {
                        <option [value]="w.playerId">{{ w.playerName }}</option>
                      }
                    </select>
                    @if (!isLocalSeated()) {
                      <button class="btn-take-seat" (click)="takeSeat(seat.id, seat.name)">Take Seat</button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Unseated Player Waiting Room Overlay (Hidden from game until seated) -->
      @if (!isSeated() && !isHost()) {
        <div class="waiting-room-overlay">
          <div class="waiting-box">
            <span class="waiting-icon">⏳</span>
            <h3>Waiting for Host to Assign Seat</h3>
            <p>Connected to Room: <strong>{{ roomId() }}</strong></p>
            <p class="waiting-sub">
              You are in the waiting queue as <strong>{{ playerName() }}</strong>.
              The host is assigning player roles. Your tabletop will appear as soon as you are seated.
            </p>
            <button class="btn-leave-queue" (click)="onLeave()">← Return to Lobby</button>
          </div>
        </div>
      } @else {
        <!-- Main Layout: Split into Common Table & Private Sanctum -->
        <main class="tabletop-grid">
          <!-- Left: The Common Table -->
          <section class="common-area">
            <div class="section-title">
              <h3>Common Table (Shared Interactive Elements)</h3>
              <span class="version">Sync Version #{{ transport.stateVersion() }}</span>
            </div>

            <!-- Focus Zone Selector Strip -->
            <div class="zones-bar">
              <span class="bar-label">Interactive Zones:</span>
              @for (zone of zones(); track zone.id) {
                <button
                  class="zone-btn"
                  [class.active]="focusedElementId() === zone.id"
                  (click)="setFocus(zone.id)"
                >
                  <span class="zone-sigil">{{ zone.sigil }}</span>
                  <span class="zone-name">{{ zone.title }}</span>
                  @if (getZoneViewers(zone.id).length > 0) {
                    <span class="viewers-count">👁 {{ getZoneViewers(zone.id).length }}</span>
                  }
                </button>
              }
            </div>

            <!-- Active Zone Inspector Canvas with Live Synchronized Cursors -->
            @if (activeZone(); as zone) {
              <div class="zone-stage">
                <div class="stage-header">
                  <div class="title-wrap">
                    <h4>{{ zone.sigil }} {{ zone.title }}</h4>
                    <p>{{ zone.description }}</p>
                  </div>

                  <!-- Zone Viewers indicator -->
                  <div class="active-viewers-box">
                    <span class="viewers-label">Looking at this element:</span>
                    <div class="viewer-tags">
                      @for (v of getZoneViewers(zone.id); track v.playerId) {
                        <span class="viewer-tag" [style.background-color]="v.color">
                          👁 {{ v.playerName }}
                        </span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Cursor Canvas covering the interactive graphic -->
                <div class="canvas-wrapper-box">
                  <app-cursor-canvas
                    [localPlayerId]="localPlayerId()"
                    [activeElementId]="zone.id"
                    [remoteCursors]="transport.remoteCursors()"
                    [players]="transport.players()"
                    (cursorMoved)="onCursorMoved($event)"
                  >
                    <div class="interactive-graphic-stage">
                      <div class="artifact-visual">
                        <svg viewBox="0 0 400 240" class="graphic-svg">
                          <rect x="20" y="20" width="360" height="200" rx="12" fill="#2b2d42" />
                          <circle cx="200" cy="110" r="60" fill="#1f2421" stroke="#f4a261" stroke-width="3" />
                          <text x="200" y="118" fill="#ffd166" font-size="28" text-anchor="middle" font-family="monospace">
                            {{ zone.sigil }}
                          </text>
                          @if (zone.symbols) {
                            <g transform="translate(60, 190)">
                              @for (s of zone.symbols; track $index) {
                                <rect [attr.x]="$index * 56" y="0" width="48" height="24" rx="4" fill="#3a405a" />
                                <text [attr.x]="$index * 56 + 24" y="16" fill="#f8f9fa" font-size="13" text-anchor="middle" font-family="monospace">
                                  {{ s }}
                                </text>
                              }
                            </g>
                          }
                        </svg>
                      </div>

                      <div class="stage-footer">
                        <p class="live-hint">Move your mouse across this artifact to point out clues to other players inspecting this zone in real time!</p>
                        <button class="btn-action" (click)="triggerSolveAction($event)">
                          ⚡ Test Interaction
                        </button>
                      </div>
                    </div>
                  </app-cursor-canvas>
                </div>
              </div>
            }
          </section>

          <!-- Right: Player's Private Sanctum -->
          <aside class="private-sanctum">
            <div class="section-title">
              <h3>Private Sanctum</h3>
              <span class="role-badge">{{ localRoleTitle() }}</span>
            </div>

            <div class="dossier-card">
              <h4>🔒 Confidential Role Dossier</h4>
              <p>
                <strong>Role:</strong> {{ localRoleTitle() }}<br />
                This dossier contains private secrets, coordinates, and telepathic guidance that only your seat can see.
              </p>
            </div>
          </aside>
        </main>
      }
    </div>
  `,
  styles: [`
    .tabletop-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 640px;
      background: #f8f9fa;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: #ffffff;
      border-bottom: 1px solid #dee2e6;
    }
    .room-info { display: flex; align-items: center; gap: 12px; }
    .btn-leave { background: none; border: 1px solid #ced4da; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; color: #495057; }
    .btn-leave:hover { background: #fee2e2; border-color: #fca5a5; color: #b91c1c; }
    .room-info h2 { margin: 0; font-size: 16px; color: #1d3557; }
    .status-indicator { font-size: 11px; text-transform: uppercase; font-weight: bold; padding: 2px 8px; border-radius: 12px; background: #e9ecef; color: #6c757d; }
    .status-indicator.online { background: #d4edda; color: #155724; }
    .host-pill { background: #fef3c7; color: #92400e; font-weight: bold; font-size: 12px; padding: 2px 8px; border-radius: 12px; }

    .players-presence { display: flex; gap: 8px; }
    .player-badge { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 16px; border: 1.5px solid; background: #ffffff; font-size: 12px; }
    .avatar-dot { width: 8px; height: 8px; border-radius: 50%; }
    .seat-badge { font-weight: bold; color: #0284c7; font-size: 11px; margin-left: 4px; }
    .queue-badge { color: #d97706; font-size: 11px; margin-left: 4px; }
    .inspecting { font-size: 11px; font-weight: bold; margin-left: 4px; }

    /* Host Panel */
    .host-panel { background: #fffbeb; border-bottom: 2px solid #fde68a; padding: 12px 20px; }
    .host-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .host-header h4 { margin: 0; font-size: 14px; color: #92400e; }
    .host-links { display: flex; gap: 8px; }
    .btn-link { background: #ffffff; border: 1px solid #d97706; color: #92400e; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 4px; cursor: pointer; }
    .btn-link.secret { background: #d97706; color: #ffffff; }
    .seats-assignment-grid { display: flex; gap: 12px; flex-wrap: wrap; }
    .seat-slot { background: #ffffff; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; min-width: 220px; }
    .seat-title { font-size: 12px; font-weight: bold; color: #1d3557; }
    .assigned-player { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
    .player-name { font-weight: 600; color: #059669; }
    .btn-unseat { background: none; border: none; color: #dc2626; font-size: 11px; cursor: pointer; font-weight: bold; }
    .empty-seat { display: flex; gap: 6px; align-items: center; }
    .empty-seat select { font-size: 12px; padding: 4px 6px; border: 1px solid #ced4da; border-radius: 4px; flex: 1; }
    .btn-take-seat { background: #0284c7; color: #fff; border: none; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 4px; cursor: pointer; }

    /* Waiting Room */
    .waiting-room-overlay { flex: 1; display: flex; justify-content: center; align-items: center; padding: 40px; }
    .waiting-box { background: #ffffff; border: 1px solid #dee2e6; border-radius: 12px; padding: 36px; max-width: 440px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .waiting-icon { font-size: 48px; margin-bottom: 16px; display: block; }
    .waiting-box h3 { margin: 0 0 12px 0; color: #1d3557; }
    .waiting-sub { font-size: 14px; color: #6c757d; line-height: 1.5; margin: 16px 0 24px 0; }
    .btn-leave-queue { background: #f8f9fa; border: 1px solid #ced4da; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; }

    /* Tabletop Grid */
    .tabletop-grid { display: grid; grid-template-columns: 2.2fr 1fr; flex: 1; gap: 16px; padding: 16px; overflow: hidden; }
    .common-area, .private-sanctum { background: #ffffff; border-radius: 8px; border: 1px solid #dee2e6; display: flex; flex-direction: column; overflow: hidden; }
    .section-title { padding: 12px 16px; background: #f8f9fa; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; }
    .section-title h3 { margin: 0; font-size: 14px; color: #1d3557; }
    .version { font-size: 11px; color: #6c757d; font-family: monospace; }
    .role-badge { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }

    /* Zones Strip */
    .zones-bar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; overflow-x: auto; }
    .bar-label { font-size: 12px; font-weight: bold; color: #475569; white-space: nowrap; }
    .zone-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 6px; font-size: 12px; cursor: pointer; white-space: nowrap; transition: all 0.15s; }
    .zone-btn:hover { border-color: #0284c7; background: #f0f9ff; }
    .zone-btn.active { border-color: #e76f51; background: #fff5f0; font-weight: bold; color: #e76f51; }
    .zone-sigil { font-size: 14px; }
    .viewers-count { background: #0284c7; color: #fff; font-size: 10px; padding: 1px 5px; border-radius: 8px; margin-left: 4px; font-weight: bold; }

    /* Zone Stage & Cursor Canvas */
    .zone-stage { flex: 1; display: flex; flex-direction: column; padding: 16px; overflow: hidden; }
    .stage-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .title-wrap h4 { margin: 0 0 4px 0; font-size: 16px; color: #1d3557; }
    .title-wrap p { margin: 0; font-size: 12px; color: #64748b; }
    .active-viewers-box { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .viewers-label { font-size: 11px; color: #64748b; }
    .viewer-tags { display: flex; gap: 6px; }
    .viewer-tag { color: #ffffff; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

    .canvas-wrapper-box { flex: 1; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f8fafc; position: relative; }
    .interactive-graphic-stage { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; box-sizing: border-box; }
    .graphic-svg { width: 100%; max-width: 480px; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .stage-footer { margin-top: 16px; display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 480px; }
    .live-hint { font-size: 11px; color: #64748b; margin: 0; flex: 1; line-height: 1.4; padding-right: 12px; }
    .btn-action { background: #2a9d8f; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 12px; cursor: pointer; white-space: nowrap; }

    .dossier-card { padding: 16px; margin: 16px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; }
    .dossier-card h4 { margin: 0 0 8px 0; color: #e76f51; font-size: 14px; }
    .dossier-card p { font-size: 13px; line-height: 1.5; color: #343a40; margin: 0; }
  `]
})
export class TabletopComponent {
  protected readonly transport = inject(TransportService);

  readonly roomId = input<string>('TOMB-ROOM-01');
  readonly localPlayerId = input<string>('player-alice');
  readonly playerName = input<string>('Alice');
  readonly assignedRole = input<string>('Indiana Jones (The Field Archaeologist)');
  readonly hostSecret = input<string | undefined>(undefined);

  readonly leaveRoom = output<void>();

  readonly focusedElementId = signal<string>('horned_figurine');

  readonly zones = signal<TabletopZone[]>([
    {
      id: 'horned_figurine',
      sigil: '🜲',
      title: 'Horned Figurine & Miniature Key',
      description: 'Interact with the 5 symbols to identify the 3 common spring triggers.',
      symbols: ['▲', '●', '◆', '■', '★']
    },
    {
      id: 'barnett_archives',
      sigil: '🏛️',
      title: 'Barnett College Archives Table',
      description: 'Inspect archive locker labels, reference indexes, and telegram clues.',
      symbols: ['0', '4', '8', '2']
    },
    {
      id: 'ghost_machine',
      sigil: '⚡',
      title: 'The Ghost Machine Levers',
      description: 'Three lever dials controlling the spectral frequency on stage.',
      symbols: ['▼', '▲', '▼']
    },
    {
      id: 'expedition_map',
      sigil: '🧭',
      title: 'Global Navigation Chart',
      description: 'Align GPS coordinates with celestial constellations for Iceland and Tikal.',
      symbols: ['N', 'NE', 'NW']
    }
  ]);

  readonly activeZone = computed(() => {
    return this.zones().find(z => z.id === this.focusedElementId()) ?? this.zones()[0];
  });

  readonly availableSeats = signal([
    { id: 'indy', name: 'Indiana Jones (The Field Archaeologist)' },
    { id: 'sophia', name: 'Sophia Hapgood (The Medium & Psychic)' },
    { id: 'marcus', name: 'Marcus Brody (The Curator & Navigator)' }
  ]);

  readonly localPresence = computed<PlayerPresence | undefined>(() => {
    return this.transport.players().find(p => p.playerId === this.localPlayerId());
  });

  readonly isHost = computed<boolean>(() => {
    return Boolean(this.hostSecret() || this.localPresence()?.isHost);
  });

  readonly isSeated = computed<boolean>(() => {
    return Boolean(this.localPresence()?.seatId);
  });

  readonly isLocalSeated = computed<boolean>(() => {
    return Boolean(this.localPresence()?.seatId);
  });

  readonly waitingPlayers = computed<PlayerPresence[]>(() => {
    return this.transport.players().filter(p => !p.seatId);
  });

  readonly localRoleTitle = computed<string>(() => {
    const seatName = this.localPresence()?.seatName;
    if (seatName) return seatName;
    return this.assignedRole() || 'Field Investigator';
  });

  constructor() {
    effect(async () => {
      const rId = this.roomId();
      const pId = this.localPlayerId();
      const name = this.playerName();
      const secret = this.hostSecret();
      if (this.transport.status === 'disconnected') {
        try {
          await this.transport.connect();
          this.transport.joinRoom(rId, pId, name, undefined, secret);
          // Set default focus
          this.transport.focusElement(this.focusedElementId());
        } catch (err) {
          console.error('[Tabletop] Failed to connect WebSocket:', err);
        }
      }
    });
  }

  getZoneTitle(elementId?: string): string {
    if (!elementId) return '';
    const zone = this.zones().find(z => z.id === elementId);
    return zone ? zone.title.slice(0, 14) : elementId;
  }

  getZoneViewers(zoneId: string): PlayerPresence[] {
    return this.transport.players().filter(p => p.focusedElementId === zoneId);
  }

  getSeatedPlayer(seatId: string): PlayerPresence | undefined {
    return this.transport.players().find(p => p.seatId === seatId);
  }

  onAssignSeat(seatId: string, seatName: string, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const playerId = select.value;
    if (playerId) {
      this.transport.assignSeat(playerId, seatId, seatName, [seatId]);
      select.value = '';
    }
  }

  takeSeat(seatId: string, seatName: string): void {
    this.transport.assignSeat(this.localPlayerId(), seatId, seatName, [seatId]);
  }

  unseatPlayer(playerId: string): void {
    this.transport.assignSeat(playerId, null, null, []);
  }

  copyPlayerInvite(): void {
    const url = `${window.location.origin}/?room=${encodeURIComponent(this.roomId())}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Player invite link copied! Send this to friends: ' + url);
    });
  }

  copyHostLink(): void {
    const secret = this.hostSecret() || 'secret';
    const url = `${window.location.origin}/?room=${encodeURIComponent(this.roomId())}&secret=${encodeURIComponent(secret)}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Host secret link copied! Keep this safe to manage seats: ' + url);
    });
  }

  onLeave(): void {
    this.transport.disconnect();
    this.leaveRoom.emit();
  }

  setFocus(elementId: string): void {
    this.focusedElementId.set(elementId);
    this.transport.focusElement(elementId);
  }

  onCursorMoved(cursor: CursorMovePayload): void {
    this.transport.sendCursor(cursor);
  }

  triggerSolveAction(event: MouseEvent): void {
    event.stopPropagation();
    this.transport.dispatchAction('solve_puzzle', {
      puzzleId: this.focusedElementId(),
      solutionKey: ['▲', '●', '◆']
    });
  }
}
