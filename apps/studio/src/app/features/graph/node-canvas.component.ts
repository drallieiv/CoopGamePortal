import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphService, type StudioNode } from '../../services/graph.service.js';
import { calculateCommonGlyphs } from '@escape-system/contracts';

interface WireRender {
  key: string;
  d: string;
  midX: number;
  midY: number;
  label?: string;
  isCombineInput?: boolean;
  revealType?: string;
}

@Component({
  selector: 'app-node-canvas',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="canvas-viewport"
      (mousemove)="onMouseMove($event)"
      (mouseup)="onMouseUp()"
    >
      <svg class="graph-svg" width="2800" height="1800">
        <!-- Definitions: Arrowhead markers -->
        <defs>
          <marker id="arrow-envelope" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e76f51" />
          </marker>
          <marker id="arrow-clue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#457b9d" />
          </marker>
          <marker id="arrow-combine" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#0077b6" />
          </marker>
        </defs>

        <!-- Wires between nodes -->
        @for (wire of wirePaths(); track wire.key) {
          <g class="wire-group">
            <path
              [attr.d]="wire.d"
              [class.wire-envelope]="wire.revealType === 'open_envelope'"
              [class.wire-clue]="wire.revealType && wire.revealType !== 'open_envelope'"
              [class.wire-combine]="wire.isCombineInput"
              [attr.marker-end]="wire.isCombineInput ? 'url(#arrow-combine)' : (wire.revealType === 'open_envelope' ? 'url(#arrow-envelope)' : 'url(#arrow-clue)')"
            />
            <!-- Wire Badge at midpoint -->
            @if (wire.label) {
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
                {{ wire.label }}
              </text>
            }
          </g>
        }

        <!-- Visual Nodes -->
        @for (node of graphService.nodes(); track node.id) {
          @if (node.type === 'combine') {
            <!-- SPECIAL ITEM COMBINE BLOCK (DUAL INPUTS & OUTPUT) -->
            <g
              class="node-group combine-node"
              [class.selected]="graphService.selectedNodeId() === node.id"
              [attr.transform]="'translate(' + node.x + ',' + node.y + ')'"
              (mousedown)="onNodeMouseDown(node, $event)"
            >
              <rect width="250" height="140" rx="8" class="node-box" />
              <rect width="250" height="28" rx="8" class="node-header" data-type="combine" />
              <text x="12" y="19" class="node-type-label">🔀 ITEM COMBINE INTERSECTION</text>
              
              <!-- Input A Slot Display -->
              <text x="16" y="50" class="combine-slot-title">Port A: {{ getNodeTitle(node.combineSourceAId) }}</text>
              <text x="16" y="65" class="combine-slot-symbols">{{ getNodeSymbols(node.combineSourceAId) }}</text>

              <!-- Input B Slot Display -->
              <text x="16" y="92" class="combine-slot-title">Port B: {{ getNodeTitle(node.combineSourceBId) }}</text>
              <text x="16" y="107" class="combine-slot-symbols">{{ getNodeSymbols(node.combineSourceBId) }}</text>

              <!-- Expected Intersection Output -->
              <rect x="8" y="116" width="234" height="20" rx="4" fill="#e0f2fe" />
              <text x="125" y="130" class="combine-output-text" text-anchor="middle">
                Output Match ({{ getIntersectionCount(node) }}): {{ getIntersectionGlyphs(node) }}
              </text>

              <!-- Dual Input Ports on Left -->
              <circle cx="0" cy="48" r="6" class="port-in" />
              <circle cx="0" cy="98" r="6" class="port-in" />

              <!-- Output Port on Right -->
              <circle cx="250" cy="70" r="6" class="port-out" />
            </g>
          } @else {
            <!-- STANDARD NODE -->
            <g
              class="node-group"
              [class.selected]="graphService.selectedNodeId() === node.id"
              [attr.transform]="'translate(' + node.x + ',' + node.y + ')'"
              (mousedown)="onNodeMouseDown(node, $event)"
            >
              <rect width="220" height="110" rx="8" class="node-box" />
              <rect width="220" height="28" rx="8" class="node-header" [attr.data-type]="node.type" />
              <text x="12" y="19" class="node-type-label">{{ node.type | uppercase }}</text>
              @if (node.lockSigil) {
                <text x="204" y="20" class="node-sigil" text-anchor="end">{{ node.lockSigil }}</text>
              }

              <text x="14" y="55" class="node-title">{{ node.title.length > 22 ? node.title.slice(0, 20) + '...' : node.title }}</text>

              @if (node.solutionKey && node.solutionKey.length > 0) {
                <text x="14" y="75" class="node-symbols">Symbols: [ {{ node.solutionKey.join(' ') }} ]</text>
              }

              @if (node.revealType) {
                <text x="14" y="95" class="node-sub">
                  Rewards: {{ node.revealType === 'open_envelope' ? 'Sealed Envelope' : 'Partial Clue' }}
                </text>
              } @else {
                <text x="14" y="95" class="node-sub">Standard Game Element</text>
              }

              <circle cx="0" cy="55" r="5" class="port-in" />
              <circle cx="220" cy="55" r="5" class="port-out" />
            </g>
          }
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
    .wire-combine { stroke: #0077b6; stroke-dasharray: 4 2; stroke-width: 2; }
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
    .node-header[data-type="combine"] { fill: #0077b6; }
    .node-header[data-type="dossier"] { fill: #3a86ff; }
    .node-type-label { font-family: monospace; font-size: 11px; font-weight: bold; fill: #ffffff; }
    .node-sigil { font-size: 16px; fill: #ffd166; }
    .node-title { font-family: sans-serif; font-size: 13px; font-weight: bold; fill: #212529; }
    .node-symbols { font-family: monospace; font-size: 11px; fill: #7209b7; font-weight: bold; }
    .node-sub { font-family: sans-serif; font-size: 11px; fill: #6c757d; }

    .combine-slot-title { font-size: 10px; font-weight: bold; fill: #0077b6; }
    .combine-slot-symbols { font-family: monospace; font-size: 11px; fill: #334155; }
    .combine-output-text { font-family: monospace; font-size: 10px; font-weight: bold; fill: #0369a1; }
    .port-in, .port-out { fill: #ffffff; stroke: #495057; stroke-width: 2; }
    .combine-node .port-in { stroke: #0077b6; }
    .combine-node .port-out { stroke: #0077b6; }
  `]
})
export class NodeCanvasComponent {
  protected readonly graphService = inject(GraphService);

  protected draggingNode: StudioNode | null = null;
  protected dragOffset = { x: 0, y: 0 };

  readonly wirePaths = computed<WireRender[]>(() => {
    const nodes = this.graphService.nodes();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const wires: WireRender[] = [];

    // 1. Regular node transitions
    for (const node of nodes) {
      if (node.targetNodeId && node.revealType) {
        const tgt = nodeMap.get(node.targetNodeId);
        if (tgt) {
          const isCombine = node.type === 'combine';
          const startX = node.x + (isCombine ? 250 : 220);
          const startY = node.y + (isCombine ? 70 : 55);
          const endX = tgt.x;
          const endY = tgt.y + 55;

          const deltaX = Math.abs(endX - startX) * 0.5;
          const d = `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;
          wires.push({
            key: `${node.id}-${tgt.id}`,
            d,
            midX: (startX + endX) / 2,
            midY: (startY + endY) / 2,
            label: node.revealType === 'open_envelope' ? '✉️ Envelope' : '💡 Clue',
            revealType: node.revealType
          });
        }
      }

      // 2. Combine block dual input wires
      if (node.type === 'combine') {
        if (node.combineSourceAId) {
          const srcA = nodeMap.get(node.combineSourceAId);
          if (srcA) {
            const startX = srcA.x + 220;
            const startY = srcA.y + 55;
            const endX = node.x;
            const endY = node.y + 48;
            const deltaX = Math.abs(endX - startX) * 0.5;
            wires.push({
              key: `combine-a-${srcA.id}-${node.id}`,
              d: `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`,
              midX: (startX + endX) / 2,
              midY: (startY + endY) / 2,
              label: 'Input A',
              isCombineInput: true
            });
          }
        }

        if (node.combineSourceBId) {
          const srcB = nodeMap.get(node.combineSourceBId);
          if (srcB) {
            const startX = srcB.x + 220;
            const startY = srcB.y + 55;
            const endX = node.x;
            const endY = node.y + 98;
            const deltaX = Math.abs(endX - startX) * 0.5;
            wires.push({
              key: `combine-b-${srcB.id}-${node.id}`,
              d: `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`,
              midX: (startX + endX) / 2,
              midY: (startY + endY) / 2,
              label: 'Input B',
              isCombineInput: true
            });
          }
        }
      }
    }

    return wires;
  });

  getNodeTitle(id?: string): string {
    if (!id) return '-- None --';
    const node = this.graphService.nodes().find(n => n.id === id);
    return node ? node.title.slice(0, 18) : '--';
  }

  getNodeSymbols(id?: string): string {
    if (!id) return '[ empty ]';
    const node = this.graphService.nodes().find(n => n.id === id);
    if (!node?.solutionKey || node.solutionKey.length === 0) return '[ empty ]';
    return `[ ${node.solutionKey.join(' ')} ]`;
  }

  getIntersectionGlyphs(node: StudioNode): string {
    const nodes = this.graphService.nodes();
    const a = nodes.find(n => n.id === node.combineSourceAId);
    const b = nodes.find(n => n.id === node.combineSourceBId);
    if (!a?.solutionKey || !b?.solutionKey) return 'none';
    const common = calculateCommonGlyphs(a.solutionKey, b.solutionKey);
    return common.length > 0 ? `[ ${common.join(' ')} ]` : 'none';
  }

  getIntersectionCount(node: StudioNode): number {
    const nodes = this.graphService.nodes();
    const a = nodes.find(n => n.id === node.combineSourceAId);
    const b = nodes.find(n => n.id === node.combineSourceBId);
    if (!a?.solutionKey || !b?.solutionKey) return 0;
    return calculateCommonGlyphs(a.solutionKey, b.solutionKey).length;
  }

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
