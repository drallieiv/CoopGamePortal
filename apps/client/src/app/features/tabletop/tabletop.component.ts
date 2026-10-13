import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransportService } from '../../services/transport.service.js';
import { CursorCanvasComponent } from './cursor-canvas.component.js';
import type { CursorMovePayload } from '@escape-system/contracts';

@Component({
  selector: 'app-tabletop',
  imports: [CommonModule, CursorCanvasComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tabletop-root">
      <!-- Top Navigation & Presence Bar -->
      <header class="top-bar">
        <div class="room-info">
          <h2>Room: {{ roomId() }}</h2>
          <span class="status-indicator" [class.online]="transport.statusSignal() === 'connected'">
            {{ transport.statusSignal() }}
          </span>
        </div>

        <div class="players-presence">
          @for (p of transport.players(); track p.playerId) {
            <div class="player-badge" [style.border-color]="p.color">
              <span class="avatar-dot" [style.background-color]="p.color"></span>
              <span class="name">{{ p.playerName }}</span>
              @if (p.focusedElementId) {
                <span class="inspecting">👁 {{ p.focusedElementId }}</span>
              }
            </div>
          }
        </div>
      </header>

      <!-- Main Layout: Split into Common Area & Private Sanctum -->
      <main class="tabletop-grid">
        <!-- Left: The Common Table -->
        <section class="common-area">
          <div class="section-title">
            <h3>Common Table (Shared)</h3>
            <span class="version">State Rev #{{ transport.stateVersion() }}</span>
          </div>

          <!-- Synchronized Cursor Canvas covering inspectable elements -->
          <app-cursor-canvas
            [localPlayerId]="localPlayerId()"
            [activeElementId]="focusedElementId()"
            [remoteCursors]="transport.remoteCursors()"
            [players]="transport.players()"
            (cursorMoved)="onCursorMoved($event)"
          >
            <div class="canvas-items">
              <div
                class="board-card"
                [class.active]="focusedElementId() === 'antechamber'"
                (click)="setFocus('antechamber')"
              >
                <h4>Tomb Antechamber (Common Area)</h4>
                <p>A stone room with hieroglyphs carved into the basalt walls.</p>
                <button class="btn-focus">
                  {{ focusedElementId() === 'antechamber' ? 'Inspecting' : 'Inspect' }}
                </button>
              </div>

              <div
                class="board-card"
                [class.active]="focusedElementId() === 'gear_puzzle'"
                (click)="setFocus('gear_puzzle')"
              >
                <h4>Anubis Gear Puzzle</h4>
                <p>Align the three copper gear wheels.</p>
                <button class="btn-focus">
                  {{ focusedElementId() === 'gear_puzzle' ? 'Inspecting' : 'Inspect' }}
                </button>
                <button class="btn-action" (click)="triggerSolveAction($event)">
                  Solve Lock
                </button>
              </div>
            </div>
          </app-cursor-canvas>
        </section>

        <!-- Right: Private Sanctum (Role Dossier) -->
        <aside class="private-sanctum">
          <div class="section-title">
            <h3>Private Sanctum (Confidential)</h3>
            <span class="role-tag">{{ assignedRole() }}</span>
          </div>

          <div class="dossier-card">
            <h4>Role Instructions</h4>
            <p><strong>Strictly Confidential:</strong> Do not show this screen to other players!</p>
            <hr />
            <div class="dossier-content">
              <h5>The Cartographer's Star Chart</h5>
              <p>The symbols correspond to star positions: North = ▲, Equator = ●, South = ◆.</p>
              <p>Communicate these alignments verbally to the Engineer!</p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  `,
  styles: [`
    .tabletop-root {
      display: flex;
      flex-direction: column;
      height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f8f9fa;
      color: #212529;
    }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px;
      background: #ffffff;
      border-bottom: 1px solid #dee2e6;
    }
    .room-info { display: flex; align-items: center; gap: 12px; }
    .room-info h2 { margin: 0; font-size: 18px; }
    .status-indicator {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 12px;
      background: #e9ecef;
      text-transform: uppercase;
      font-weight: bold;
    }
    .status-indicator.online { background: #d4edda; color: #155724; }
    .players-presence { display: flex; gap: 8px; }
    .player-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: #ffffff;
      border: 1.5px solid #ced4da;
      border-radius: 16px;
      font-size: 13px;
    }
    .avatar-dot { width: 8px; height: 8px; border-radius: 50%; }
    .inspecting { font-size: 11px; color: #6c757d; }
    .tabletop-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      flex: 1;
      overflow: hidden;
    }
    .common-area {
      display: flex;
      flex-direction: column;
      padding: 20px;
      border-right: 1px solid #dee2e6;
    }
    .private-sanctum {
      padding: 20px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .section-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .section-title h3 { margin: 0; font-size: 16px; }
    .version, .role-tag { font-size: 12px; font-weight: bold; color: #495057; }
    .canvas-items { display: flex; gap: 16px; flex-wrap: wrap; padding: 20px 0; }
    .board-card {
      background: #ffffff;
      border: 2px solid #dee2e6;
      border-radius: 8px;
      padding: 16px;
      width: 260px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      transition: border-color 0.2s;
    }
    .board-card.active { border-color: #e76f51; }
    .board-card h4 { margin: 0 0 8px 0; font-size: 15px; }
    .board-card p { font-size: 13px; color: #6c757d; margin: 0 0 12px 0; }
    .btn-focus, .btn-action {
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      border: none;
      margin-right: 8px;
    }
    .btn-focus { background: #e9ecef; color: #212529; }
    .btn-action { background: #2a9d8f; color: #fff; font-weight: bold; }
    .dossier-card {
      background: #fffdfa;
      border: 1px solid #f4a261;
      border-radius: 8px;
      padding: 16px;
    }
    .dossier-card h4 { margin: 0 0 8px 0; color: #e76f51; font-size: 14px; }
    .dossier-card p { font-size: 13px; line-height: 1.5; color: #343a40; }
  `]
})
export class TabletopComponent {
  protected readonly transport = inject(TransportService);

  readonly roomId = input<string>('TOMB-ROOM-01');
  readonly localPlayerId = input<string>('player-alice');
  readonly assignedRole = input<string>('Cartographer');

  readonly focusedElementId = signal<string | undefined>('antechamber');

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
      puzzleId: 'gear_puzzle',
      solutionKey: ['▲', '●', '◆']
    });
  }
}
