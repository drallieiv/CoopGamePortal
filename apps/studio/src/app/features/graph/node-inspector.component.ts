import {
  Component,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraphService, type StudioNode } from '../../services/graph.service.js';
import {
  type RevealType,
  type SymbolSetPreset,
  type SymbolItem,
  SYMBOL_PRESETS
} from '@escape-system/contracts';

@Component({
  selector: 'app-node-inspector',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inspector-panel">
      @if (graphService.selectedNode(); as node) {
        <div class="inspector-header">
          <h3>Node Inspector</h3>
          <button class="btn-delete" (click)="graphService.deleteNode(node.id)">Delete Node</button>
        </div>

        <div class="form-group">
          <label>Title:</label>
          <input
            type="text"
            [ngModel]="node.title"
            (ngModelChange)="onUpdate(node.id, { title: $event })"
          />
        </div>

        <div class="form-group">
          <label>Node Type:</label>
          <select
            [ngModel]="node.type"
            (ngModelChange)="onUpdate(node.id, { type: $event })"
          >
            <option value="room">Room / Location</option>
            <option value="puzzle">Puzzle / Lock</option>
            <option value="item">Physical Item / Card</option>
            <option value="machine">Interactive Machine / Widget</option>
            <option value="dossier">Confidential Role Dossier</option>
          </select>
        </div>

        <div class="form-group">
          <label>Narrative / Clue Text:</label>
          <textarea
            rows="3"
            [ngModel]="node.narrativeText"
            (ngModelChange)="onUpdate(node.id, { narrativeText: $event })"
          ></textarea>
        </div>

        @if (node.type === 'puzzle') {
          <div class="puzzle-fields">
            <h4>Lock & Solution Settings</h4>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>Lock Sigil:</label>
                <input
                  type="text"
                  placeholder="e.g. 🜲 or ☽"
                  [ngModel]="node.lockSigil"
                  (ngModelChange)="onUpdate(node.id, { lockSigil: $event })"
                />
              </div>

              <div class="form-group flex-2">
                <label>Solution Key (comma-separated):</label>
                <input
                  type="text"
                  placeholder="e.g. ▲,●,◆ or 1234"
                  [ngModel]="formatKey(node.solutionKey)"
                  (ngModelChange)="onKeyChanged(node.id, $event)"
                />
              </div>
            </div>

            <!-- Symbol Set & Keypad Configuration -->
            <div class="symbol-config-box">
              <h4>Companion Keypad & Symbol Set</h4>

              <div class="form-group">
                <label>Symbol Set Preset:</label>
                <select
                  [ngModel]="node.inputConfig?.preset ?? 'alchemy'"
                  (ngModelChange)="onPresetChange(node.id, $event)"
                >
                  <option value="arrows">Directional Arrows (▲, ▼, ◀, ▶)</option>
                  <option value="compass">Compass Directions (N, NE, E, SE, S, SW, W, NW)</option>
                  <option value="alchemy">Alchemical & Geometric (▲, ●, ◆, ■, ★, ⬡)</option>
                  <option value="egyptian">Egyptian Hieroglyphs (𓁹, 𓆣, 𓋹, 𓅓, 𓇋, 𓈖)</option>
                  <option value="runes">Ancient Runes (ᚠ, ᚢ, ᚦ, ᚨ, ᚱ, ᚲ)</option>
                  <option value="alphanumeric">Alphanumeric Digits (0 - 9)</option>
                  <option value="custom">Custom Pictograms</option>
                </select>
              </div>

              <div class="form-group">
                <label>Input Matching Rule:</label>
                <div class="radio-row">
                  <label>
                    <input
                      type="radio"
                      name="orderMode"
                      value="ordered"
                      [checked]="(node.inputConfig?.orderMode ?? 'ordered') === 'ordered'"
                      (change)="onOrderModeChange(node.id, 'ordered')"
                    />
                    <strong>Specific Sequence (Ordered)</strong>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="orderMode"
                      value="unordered"
                      [checked]="node.inputConfig?.orderMode === 'unordered'"
                      (change)="onOrderModeChange(node.id, 'unordered')"
                    />
                    <strong>Set in Any Order (Unordered)</strong>
                  </label>
                </div>
              </div>

              <div class="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    [checked]="node.inputConfig?.allowRepetition ?? false"
                    (change)="onRepetitionToggle(node.id, $event)"
                  />
                  Allow Symbol Repetition (Duplicates)
                </label>
              </div>

              <!-- Symbol Palette -->
              <div class="palette-preview">
                <span class="palette-label">Click symbol to append to solution key:</span>
                <div class="symbols-strip">
                  @for (sym of activeSymbols(node); track sym.id) {
                    <button
                      type="button"
                      class="btn-sym"
                      [title]="sym.name ?? sym.glyph"
                      (click)="appendSymbol(node.id, sym.glyph)"
                    >
                      {{ sym.glyph }}
                    </button>
                  }
                </div>
              </div>
            </div>

            <!-- Reward Configuration: Clue vs Sealed Envelope -->
            <div class="reward-box">
              <h4>Solving this puzzle rewards:</h4>
              <div class="radio-option">
                <label>
                  <input
                    type="radio"
                    name="revealType"
                    value="provide_clue"
                    [checked]="node.revealType === 'provide_clue'"
                    (change)="onRevealTypeChange(node.id, 'provide_clue')"
                  />
                  <strong>💡 Informational Clue</strong> (partial code / insight for another puzzle)
                </label>
              </div>

              <div class="radio-option">
                <label>
                  <input
                    type="radio"
                    name="revealType"
                    value="open_envelope"
                    [checked]="node.revealType === 'open_envelope'"
                    (change)="onRevealTypeChange(node.id, 'open_envelope')"
                  />
                  <strong>✉️ Sealed Physical Envelope</strong> (registers in offline verification matrix with seal)
                </label>
              </div>

              <div class="form-group" style="margin-top: 10px;">
                <label>Connected Target Node:</label>
                <select
                  [ngModel]="node.targetNodeId"
                  (ngModelChange)="onTargetChange(node.id, $event)"
                >
                  <option [value]="undefined">-- None (Terminal) --</option>
                  @for (other of otherNodes(node.id); track other.id) {
                    <option [value]="other.id">{{ other.type | uppercase }}: {{ other.title }}</option>
                  }
                </select>
              </div>

              @if (node.revealType === 'open_envelope') {
                <div class="form-group">
                  <label>Envelope Reference Label:</label>
                  <input
                    type="text"
                    placeholder="e.g. Envelope #2 (Sarcophagus)"
                    [ngModel]="node.targetRefId"
                    (ngModelChange)="onUpdate(node.id, { targetRefId: $event })"
                  />
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <div class="empty-selection">
          <p>Click any node on the canvas to inspect and configure its puzzle mechanics.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .inspector-panel {
      width: 340px;
      background: #ffffff;
      border-left: 1px solid #dee2e6;
      padding: 20px;
      overflow-y: auto;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .inspector-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-bottom: 1px solid #eee;
      padding-bottom: 8px;
    }
    .inspector-header h3 { margin: 0; font-size: 16px; color: #1d3557; }
    .btn-delete {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
    }
    .form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .form-group.checkbox { flex-direction: row; align-items: center; }
    .form-row { display: flex; gap: 8px; }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    label { font-size: 12px; font-weight: 600; color: #495057; }
    input, select, textarea {
      padding: 8px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 13px;
    }
    .puzzle-fields {
      margin-top: 16px;
      border-top: 2px solid #e9ecef;
      padding-top: 12px;
    }
    .puzzle-fields h4 { margin: 0 0 10px 0; font-size: 14px; color: #7209b7; }
    .symbol-config-box, .reward-box {
      background: #f8f9fa;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      margin-top: 12px;
    }
    .symbol-config-box h4, .reward-box h4 { margin: 0 0 8px 0; font-size: 13px; color: #212529; }
    .radio-row { display: flex; flex-direction: column; gap: 6px; font-size: 12px; margin-top: 4px; }
    .radio-option { margin-bottom: 6px; font-size: 12px; }
    .palette-preview { margin-top: 8px; }
    .palette-label { font-size: 11px; color: #6c757d; display: block; margin-bottom: 6px; }
    .symbols-strip { display: flex; flex-wrap: wrap; gap: 6px; }
    .btn-sym {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-sym:hover { background: #e0f2fe; border-color: #0369a1; }
    .empty-selection { color: #6c757d; font-size: 13px; padding-top: 40px; text-align: center; }
  `]
})
export class NodeInspectorComponent {
  protected readonly graphService = inject(GraphService);

  otherNodes(currentId: string): StudioNode[] {
    return this.graphService.nodes().filter(n => n.id !== currentId);
  }

  activeSymbols(node: StudioNode): SymbolItem[] {
    const preset = node.inputConfig?.preset ?? 'alchemy';
    if (preset === 'custom') {
      return node.inputConfig?.availableSymbols ?? [];
    }
    return SYMBOL_PRESETS[preset] ?? SYMBOL_PRESETS.alchemy;
  }

  formatKey(key?: string[]): string {
    return key ? key.join(',') : '';
  }

  onKeyChanged(id: string, raw: string): void {
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    this.graphService.updateNode(id, { solutionKey: parts });
  }

  appendSymbol(id: string, glyph: string): void {
    const node = this.graphService.selectedNode();
    const current = node?.solutionKey ?? [];
    this.graphService.updateNode(id, { solutionKey: [...current, glyph] });
  }

  onPresetChange(id: string, preset: SymbolSetPreset): void {
    const node = this.graphService.selectedNode();
    const symbols = preset === 'custom' ? [] : (SYMBOL_PRESETS[preset] ?? SYMBOL_PRESETS.alchemy);
    const existing = node?.inputConfig;

    this.graphService.updateNode(id, {
      inputConfig: {
        orderMode: existing?.orderMode ?? 'ordered',
        allowRepetition: existing?.allowRepetition ?? false,
        length: existing?.length ?? 3,
        preset,
        availableSymbols: symbols
      }
    });
  }

  onOrderModeChange(id: string, orderMode: 'ordered' | 'unordered'): void {
    const node = this.graphService.selectedNode();
    const existing = node?.inputConfig;
    const preset = existing?.preset ?? 'alchemy';
    this.graphService.updateNode(id, {
      inputConfig: {
        orderMode,
        allowRepetition: existing?.allowRepetition ?? false,
        length: existing?.length ?? 3,
        preset,
        availableSymbols: existing?.availableSymbols ?? SYMBOL_PRESETS.alchemy
      }
    });
  }

  onRepetitionToggle(id: string, event: Event): void {
    const allowRepetition = (event.target as HTMLInputElement).checked;
    const node = this.graphService.selectedNode();
    const existing = node?.inputConfig;
    const preset = existing?.preset ?? 'alchemy';
    this.graphService.updateNode(id, {
      inputConfig: {
        orderMode: existing?.orderMode ?? 'ordered',
        allowRepetition,
        length: existing?.length ?? 3,
        preset,
        availableSymbols: existing?.availableSymbols ?? SYMBOL_PRESETS.alchemy
      }
    });
  }

  onUpdate(id: string, partial: Partial<StudioNode>): void {
    this.graphService.updateNode(id, partial);
  }

  onRevealTypeChange(id: string, type: RevealType): void {
    this.graphService.updateNode(id, { revealType: type });
  }

  onTargetChange(id: string, targetId?: string): void {
    const node = this.graphService.selectedNode();
    const revealType = node?.revealType ?? 'open_envelope';
    this.graphService.updateNode(id, { targetNodeId: targetId });
    if (targetId) {
      this.graphService.connectNodes(id, targetId, revealType, node?.targetRefId);
    }
  }
}
