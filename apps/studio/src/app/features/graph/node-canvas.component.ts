import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphService, type StudioNode } from '../../services/graph.service.js';

@Component({
  selector: 'app-node-canvas',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="canvas-viewport"
      (mousemove)="onMouseMove($event)"
      (mouseup)="onMouseUp()"
      (mouseleave)="onMouseUp()"
    >
      <svg class="graph-svg" width="2400" height="1600">
        <!-- Definitions: Arrowhead markers -->
        <defs>
          <marker id="arrow-envelope" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e76f51" />
          </marker>
          <marker id="arrow-clue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#457b9d" />
          </marker>
        </defs>

        <!-- Wires between nodes -->
        @for (wire of wirePaths(); track wire.key) {
          <g class="wire-group">
            <path
              [attr.d]="wire.d"
              [class.wire-envelope]="wire.revealType === 'open_envelope'"
              [class.wire-clue]="wire.revealType !== 'open_envelope'"
              [attr.marker-end]="wire.revealType === 'open_envelope' ? 'url(#arrow-envelope)' : 'url(#arrow-clue)'"
            />
            <!-- Wire Badge at midpoint -->
            <rect
              [attr.x]="wire.midX - 45"
              [attr.y]="wire.midY - 12"
              width="90"
              height="24"
              rx="12"
              class="wire-badge-bg"
            />
            <text
              [attr.x]="wire.midX"
              [attr.y]="wire.midY + 4"
              class="wire-label"
              text-anchor="middle"
            >
              {{ wire.revealType === 'open_envelope' ? '✉️ Envelope' : '💡 Clue' }}
            </text>
          </g>
        }

        <!-- Visual Nodes -->
        @for (node of graphService.nodes(); track node.id) {
          <g
            class="node-group"
            [class.selected]="graphService.selectedNodeId() === node.id"
            [attr.transform]="'translate(' + node.x + ',' + node.y + ')'"
            (mousedown)="onNodeMouseDown(node, $event)"
          >
            <!-- Card Body -->
            <rect width="220" height="110" rx="8" class="node-box" />

            <!-- Type Color Banner -->
            <rect width="220" height="28" rx="8" class="node-header" [attr.data-type]="node.type" />
            <!-- Header Text -->
            <text x="12" y="19" class="node-type-label">{{ node.type | uppercase }}</text>
            @if (node.lockSigil) {
              <text x="204" y="20" class="node-sigil" text-anchor="end">{{ node.lockSigil }}</text>
            }

            <!-- Node Title -->
            <text x="14" y="55" class="node-title">{{ node.title.length > 22 ? node.title.slice(0, 20) + '...' : node.title }}</text>

            <!-- Metadata info -->
            @if (node.revealType) {
              <text x="14" y="80" class="node-sub">
                Rewards: {{ node.revealType === 'open_envelope' ? 'Sealed Envelope' : 'Partial Clue' }}
              </text>
            } @else {
              <text x="14" y="80" class="node-sub">Standard Game Element</text>
            }

            <!-- Connection Ports -->
            <circle cx="0" cy="55" r="5" class="port-in" />
            <circle cx="220" cy="55" r="5" class="port-out" />
          </g>
        }
      </svg>
    </div>
  `,
  styles: [`
    .canvas-viewport {
      width: 100%;
      height: 100%;
      overflow: auto;
      background: radial-gradient(#dee2e6 1.5px, transparent 1.5px);
      background-size: 24px 24px;
      background-color: #f8f9fa;
      cursor: grab;
      position: relative;
    }
    .canvas-viewport:active { cursor: grabbing; }
    .wire-group path { fill: none; stroke-width: 2.5; stroke-linecap: round; }
    .wire-envelope { stroke: #e76f51; stroke-dasharray: 6 3; }
    .wire-clue { stroke: #457b9d; }
    .wire-badge-bg { fill: #ffffff; stroke: #ced4da; stroke-width: 1; }
    .wire-label { font-family: sans-serif; font-size: 11px; font-weight: bold; fill: #495057; }
    .node-group { cursor: move; }
    .node-box {
      fill: #ffffff;
      stroke: #ced4da;
      stroke-width: 1.5;
      filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.05));
      transition: stroke 0.15s;
    }
    .node-group.selected .node-box {
      stroke: #e76f51;
      stroke-width: 2.5;
    }
    .node-header { fill: #6c757d; }
    .node-header[data-type="room"] { fill: #1d3557; }
    .node-header[data-type="puzzle"] { fill: #7209b7; }
    .node-header[data-type="item"] { fill: #2a9d8f; }
    .node-header[data-type="machine"] { fill: #f4a261; }
    .node-header[data-type="dossier"] { fill: #3a86ff; }
    .node-type-label { font-family: monospace; font-size: 11px; font-weight: bold; fill: #ffffff; }
    .node-sigil { font-size: 16px; fill: #ffd166; }
    .node-title { font-family: sans-serif; font-size: 13px; font-weight: bold; fill: #212529; }
    .node-sub { font-family: sans-serif; font-size: 11px; fill: #6c757d; }
    .port-in, .port-out { fill: #ffffff; stroke: #495057; stroke-width: 2; }
  `]
})
export class NodeCanvasComponent {
  protected readonly graphService = inject(GraphService);

  protected draggingNode: StudioNode | null = null;
  protected dragOffset = { x: 0, y: 0 };

  readonly wirePaths = computed(() => {
    const nodes = this.graphService.nodes();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const wires = this.graphService.transitions();

    return wires.map(wire => {
      const src = nodeMap.get(wire.sourceId);
      const tgt = nodeMap.get(wire.targetId);

      if (!src || !tgt) {
        return { key: `${wire.sourceId}-${wire.targetId}`, d: '', midX: 0, midY: 0, revealType: wire.revealType };
      }

      const startX = src.x + 220;
      const startY = src.y + 55;
      const endX = tgt.x;
      const endY = tgt.y + 55;

      const deltaX = Math.abs(endX - startX) * 0.5;
      const cp1X = startX + deltaX;
      const cp1Y = startY;
      const cp2X = endX - deltaX;
      const cp2Y = endY;

      const d = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;

      return {
        key: `${wire.sourceId}-${wire.targetId}`,
        d,
        midX,
        midY,
        revealType: wire.revealType
      };
    });
  });

  onNodeMouseDown(node: StudioNode, event: MouseEvent): void {
    event.stopPropagation();
    this.graphService.selectNode(node.id);
    this.draggingNode = node;
    this.dragOffset = {
      x: event.clientX - node.x,
      y: event.clientY - node.y
    };
  }

  onMouseMove(event: MouseEvent): void {
    if (this.draggingNode) {
      const newX = event.clientX - this.dragOffset.x;
      const newY = event.clientY - this.dragOffset.y;
      this.graphService.moveNode(this.draggingNode.id, Math.max(10, newX), Math.max(10, newY));
    }
  }

  onMouseUp(): void {
    this.draggingNode = null;
  }
}
