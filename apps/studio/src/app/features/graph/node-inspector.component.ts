import {
  Component,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { GraphService, type StudioNode } from '../../services/graph.service.js';
import { AssetService } from '../../services/asset.service.js';
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
          <h3>Node Parameters Pane</h3>
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
            <option value="combine">🔀 Item Combine (Intersection)</option>
            <option value="machine">Interactive Machine / Widget</option>
            <option value="dossier">Confidential Role Dossier</option>
          </select>
        </div>

        <!-- Interactive Zone Assignment -->
        <div class="form-group">
          <label>Interactive Tabletop Zone:</label>
          <select
            [ngModel]="node.zoneId ?? 'common_table'"
            (ngModelChange)="onUpdate(node.id, { zoneId: $event })"
          >
            <option value="common_table">🌐 Common Table (Shared Interactive Area)</option>
            <option value="private_sanctum">🔒 Private Sanctum (Role-Restricted)</option>
            <option value="zone_archives">🏛️ Archives Table Zone</option>
            <option value="zone_altar">🗿 Altar / Stele Zone</option>
            <option value="zone_furnace">🔥 Boiler / Furnace Zone</option>
            <option value="zone_map">🧭 Navigation Chart Zone</option>
          </select>
        </div>

        <!-- Graphical Asset Picker & Live Thumbnail -->
        <div class="form-group asset-picker-box">
          <label>Attached Graphical Asset:</label>
          <select
            [ngModel]="node.assetId"
            (ngModelChange)="onSelectAsset(node.id, $event)"
          >
            <option [value]="undefined">-- No Asset Assigned (Default Placeholder) --</option>
            @for (asset of assetService.assets(); track asset.id) {
              <option [value]="asset.id">{{ asset.name }} ({{ asset.stage | uppercase }})</option>
            }
          </select>

          @if (selectedAssetSvg(node); as safeSvg) {
            <div class="asset-preview-thumb">
              <span class="thumb-label">Live Visual Preview:</span>
              <div class="thumb-frame" [innerHTML]="safeSvg"></div>
            </div>
          }
        </div>

        @if (node.type === 'combine') {
          <div class="combine-config-box">
            <h4>🔀 Dual Input Intersection Setup</h4>
            
            <div class="form-group">
              <label>Input Port A (Source Element 1):</label>
              <select
                [ngModel]="node.combineSourceAId"
                (ngModelChange)="onUpdate(node.id, { combineSourceAId: $event })"
              >
                <option [value]="undefined">-- Select First Element --</option>
                @for (other of otherNodes(node.id); track other.id) {
                  <option [value]="other.id">{{ other.type | uppercase }}: {{ other.title }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label>Input Port B (Source Element 2):</label>
              <select
                [ngModel]="node.combineSourceBId"
                (ngModelChange)="onUpdate(node.id, { combineSourceBId: $event })"
              >
                <option [value]="undefined">-- Select Second Element --</option>
                @for (other of otherNodes(node.id); track other.id) {
                  <option [value]="other.id">{{ other.type | uppercase }}: {{ other.title }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label>Target Intersection Match Count:</label>
              <select
                [ngModel]="node.combineCommonCount ?? 3"
                (ngModelChange)="onUpdate(node.id, { combineCommonCount: +$event })"
              >
                <option [value]="2">2 Common Symbols</option>
                <option [value]="3">3 Common Symbols</option>
              </select>
            </div>

            <!-- Downstream Checker Output Target -->
            <div class="form-group" style="margin-top: 14px; border-top: 1px solid #dee2e6; padding-top: 10px;">
              <label>Output Port ➔ Downstream Checker Node:</label>
              <select
                [ngModel]="node.targetNodeId"
                (ngModelChange)="onTargetChange(node.id, $event)"
              >
                <option [value]="undefined">-- Select Checker Node --</option>
                @for (other of otherNodes(node.id); track other.id) {
                  <option [value]="other.id">{{ other.type | uppercase }}: {{ other.title }}</option>
                }
              </select>
              <p class="hint" style="font-size: 11px; color: #6c757d; margin: 4px 0 0 0;">
                The derived intersection symbols will be routed to this downstream checker node.
              </p>
            </div>
          </div>
        }

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
                <div class="link-target-row">
                  <select
                    [ngModel]="node.targetNodeId"
                    (ngModelChange)="onTargetChange(node.id, $event)"
                  >
                    <option [value]="undefined">-- None (Terminal) --</option>
                    @for (other of otherNodes(node.id); track other.id) {
                      <option [value]="other.id">{{ other.type | uppercase }}: {{ other.title }}</option>
                    }
                  </select>
                  @if (node.targetNodeId) {
                    <button class="btn-disconnect" (click)="onTargetChange(node.id, undefined)">✕</button>
                  }
                </div>
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
      width: 360px;
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
    .asset-picker-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px;
      border-radius: 6px;
    }
    .asset-preview-thumb { margin-top: 8px; }
    .thumb-label { font-size: 11px; font-weight: bold; color: #64748b; display: block; margin-bottom: 4px; }
    .thumb-frame {
      max-height: 120px;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 4px;
      padding: 8px;
      overflow: hidden;
    }
    .thumb-frame svg { max-width: 100%; max-height: 100px; }

    .puzzle-fields {
      margin-top: 16px;
      border-top: 2px solid #e9ecef;
      padding-top: 12px;
    }
    .puzzle-fields h4 { margin: 0 0 10px 0; font-size: 14px; color: #7209b7; }
    .combine-config-box, .symbol-config-box, .reward-box {
      background: #f8f9fa;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      margin-top: 12px;
    }
    .combine-config-box h4 { margin: 0 0 8px 0; font-size: 13px; color: #0077b6; }
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
    .link-target-row { display: flex; gap: 6px; }
    .link-target-row select { flex: 1; }
    .btn-disconnect { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; border-radius: 4px; font-weight: bold; cursor: pointer; padding: 0 8px; }
    .empty-selection { color: #6c757d; font-size: 13px; padding-top: 40px; text-align: center; }
  `]
})
export class NodeInspectorComponent {
  protected readonly graphService = inject(GraphService);
  protected readonly assetService = inject(AssetService);
  protected readonly sanitizer = inject(DomSanitizer);

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

  selectedAssetSvg(node: StudioNode): SafeHtml | null {
    if (!node.assetId) return null;
    const asset = this.assetService.assets().find(a => a.id === node.assetId);
    if (!asset?.svgContent) return null;
    return this.sanitizer.bypassSecurityTrustHtml(asset.svgContent);
  }

  onSelectAsset(nodeId: string, assetId?: string): void {
    if (!assetId) {
      this.graphService.updateNode(nodeId, { assetId: undefined, assetSvg: undefined });
      return;
    }
    const asset = this.assetService.assets().find(a => a.id === assetId);
    this.graphService.updateNode(nodeId, {
      assetId,
      assetSvg: asset?.svgContent
    });
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
