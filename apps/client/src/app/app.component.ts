import {
  Component,
  ChangeDetectionStrategy,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuickCheckComponent } from './features/companion/quick-check.component.js';
import { TabletopComponent } from './features/tabletop/tabletop.component.js';

@Component({
  selector: 'app-root',
  imports: [CommonModule, QuickCheckComponent, TabletopComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell">
      <nav class="app-nav">
        <div class="brand">
          <span class="logo">🗝️</span>
          <h1>Coop Game Portal</h1>
        </div>
        <div class="mode-toggles">
          <button
            class="toggle-btn"
            [class.active]="activeMode() === 'companion'"
            (click)="activeMode.set('companion')"
          >
            📱 Companion Quick-Check
          </button>
          <button
            class="toggle-btn"
            [class.active]="activeMode() === 'tabletop'"
            (click)="activeMode.set('tabletop')"
          >
            🖥️ Virtual Tabletop (VTT)
          </button>
        </div>
      </nav>

      <main class="content-container">
        @if (activeMode() === 'companion') {
          <app-quick-check scenarioTitle="The Pharaohs Crypt" seed="EGYPT-404" />
        } @else {
          <app-tabletop roomId="ROOM-EGYPT-404" localPlayerId="player-1" assignedRole="Cartographer" />
        }
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .app-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px;
      background: #1d3557;
      color: #fff;
    }
    .brand { display: flex; align-items: center; gap: 8px; }
    .brand h1 { margin: 0; font-size: 18px; font-weight: bold; }
    .logo { font-size: 22px; }
    .mode-toggles { display: flex; gap: 8px; }
    .toggle-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.4);
      color: #fff;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }
    .toggle-btn.active {
      background: #e76f51;
      border-color: #e76f51;
      font-weight: bold;
    }
    .content-container {
      flex: 1;
      padding: 24px 0;
      background: #f1faee;
    }
  `]
})
export class AppComponent {
  readonly activeMode = signal<'companion' | 'tabletop'>('companion');
}
