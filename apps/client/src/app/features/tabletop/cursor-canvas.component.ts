import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  ElementRef,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { CursorMovePayload, PlayerPresence } from '@escape-system/contracts';

@Component({
  selector: 'app-cursor-canvas',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="canvas-container"
      (mousemove)="onMouseMove($event)"
      (mouseleave)="onMouseLeave()"
    >
      <ng-content></ng-content>

      <!-- Overlay for real-time remote cursors -->
      <svg class="cursor-overlay">
        @for (item of activeRemoteCursors(); track item.playerId) {
          <g [attr.transform]="'translate(' + item.pixelX + ',' + item.pixelY + ')'">
            <!-- Cursor Arrow -->
            <path
              d="M0,0 L0,16 L4.5,12.5 L8,20 L11,18.5 L7.5,11 L13,11 Z"
              [attr.fill]="item.color"
              stroke="#ffffff"
              stroke-width="1.5"
            />
            <!-- Player Name Badge -->
            <rect
              x="14"
              y="10"
              [attr.width]="item.nameWidth"
              height="20"
              rx="4"
              [attr.fill]="item.color"
            />
            <text x="20" y="24" fill="#ffffff" font-size="11" font-weight="bold" font-family="sans-serif">
              {{ item.playerName }}
            </text>
          </g>
        }
      </svg>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .canvas-container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      user-select: none;
    }
    .cursor-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
    }
  `]
})
export class CursorCanvasComponent {
  protected readonly elementRef = inject(ElementRef);

  readonly activeElementId = input<string | undefined>();
  readonly localPlayerId = input.required<string>();
  readonly remoteCursors = input<Map<string, CursorMovePayload>>(new Map());
  readonly players = input<PlayerPresence[]>([]);

  readonly cursorMoved = output<CursorMovePayload>();

  readonly activeRemoteCursors = computed(() => {
    const cursors = this.remoteCursors();
    const playerList = this.players();
    const currentElem = this.activeElementId();
    const hostEl = this.elementRef.nativeElement as HTMLElement;
    const rect = hostEl.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    const result: Array<{
      playerId: string;
      playerName: string;
      color: string;
      pixelX: number;
      pixelY: number;
      nameWidth: number;
    }> = [];

    for (const [playerId, cursor] of cursors.entries()) {
      if (playerId === this.localPlayerId()) {
        continue;
      }
      // If scoped to element, filter matching
      if (cursor.elementId && cursor.elementId !== currentElem) {
        continue;
      }

      const player = playerList.find((p) => p.playerId === playerId);
      const name = player?.playerName ?? playerId;
      const color = player?.color ?? '#e63946';

      result.push({
        playerId,
        playerName: name,
        color,
        pixelX: cursor.x * width,
        pixelY: cursor.y * height,
        nameWidth: Math.max(name.length * 8 + 14, 45)
      });
    }

    return result;
  });

  onMouseMove(event: MouseEvent): void {
    const hostEl = this.elementRef.nativeElement as HTMLElement;
    const rect = hostEl.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const normX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    this.cursorMoved.emit({
      x: normX,
      y: normY,
      elementId: this.activeElementId()
    });
  }

  onMouseLeave(): void {
    // Optionally send inactive cursor or element blur
  }
}
