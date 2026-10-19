import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateMaze, generateRuneCipher } from '@escape-system/generators';
import { AssetService } from '../../services/asset.service.js';

type GeneratorType = 'labyrinth' | 'cipher';

@Component({
  selector: 'app-procedural-preview',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="procedural-preview-root">
      <!-- Toolbar -->
      <div class="preview-toolbar">
        <div class="generator-types">
          <button
            class="type-btn"
            [class.active]="selectedType() === 'labyrinth'"
            (click)="selectedType.set('labyrinth')"
          >
            🌀 Procedural Labyrinth
          </button>
          <button
            class="type-btn"
            [class.active]="selectedType() === 'cipher'"
            (click)="selectedType.set('cipher')"
          >
            ᚠ Runic Cipher & Rosetta
          </button>
        </div>

        <div class="seed-controller">
          <label>Seed:</label>
          <input
            type="text"
            [ngModel]="seed()"
            (ngModelChange)="seed.set($event)"
          />
          <button class="btn-random" (click)="randomizeSeed()">🎲 Randomize</button>
        </div>
      </div>

      <!-- Controls & Live Preview Split -->
      <div class="preview-layout">
        <!-- Controls Sidebar -->
        <aside class="controls-panel">
          @if (selectedType() === 'labyrinth') {
            <h3>Maze Parameters</h3>
            <div class="control-group">
              <label>Columns (Width): {{ mazeCols() }}</label>
              <input type="range" min="5" max="25" [ngModel]="mazeCols()" (ngModelChange)="mazeCols.set(+$event)" />
            </div>
            <div class="control-group">
              <label>Rows (Height): {{ mazeRows() }}</label>
              <input type="range" min="5" max="25" [ngModel]="mazeRows()" (ngModelChange)="mazeRows.set(+$event)" />
            </div>
            <p class="info-note">Deterministic recursive backtracker maze with guaranteed solvable path between green entrance and red exit.</p>
          } @else {
            <h3>Cipher Parameters</h3>
            <div class="control-group">
              <label>Secret Message to Encode:</label>
              <input type="text" [ngModel]="cipherMessage()" (ngModelChange)="cipherMessage.set($event)" />
            </div>
            <p class="info-note">Generates both an encrypted stone inscription tile and the corresponding Rosetta translation key sheet.</p>
          }

          <div class="actions">
            <button class="btn-save" (click)="saveToAssets()">
              📥 Save to Asset Manager
            </button>
          </div>
        </aside>

        <!-- Live Vector SVG Canvas Preview -->
        <main class="viewport-panel">
          <div class="viewport-header">
            <h4>Live Vector SVG Rendering</h4>
            <span class="seed-badge">SEED: {{ seed() }}</span>
          </div>

          <div class="svg-stage">
            @if (selectedType() === 'labyrinth') {
              <div class="svg-render-box" [innerHTML]="mazeOutput().svg"></div>
            } @else {
              <div class="cipher-duo">
                <div class="cipher-box">
                  <h5>Stone Inscription Tile:</h5>
                  <div [innerHTML]="cipherOutput().inscriptionSvg"></div>
                </div>
                <div class="cipher-box">
                  <h5>Rosetta Translation Ledger Sheet:</h5>
                  <div [innerHTML]="cipherOutput().rosettaSheetSvg"></div>
                </div>
              </div>
            }
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .procedural-preview-root {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f8f9fa;
      color: #212529;
    }
    .preview-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px;
      background: #ffffff;
      border-bottom: 1px solid #dee2e6;
    }
    .generator-types { display: flex; gap: 8px; }
    .type-btn {
      background: #e9ecef;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .type-btn.active { background: #1d3557; color: #fff; }
    .seed-controller { display: flex; align-items: center; gap: 8px; }
    .seed-controller label { font-size: 12px; font-weight: bold; color: #495057; }
    .seed-controller input {
      padding: 6px 10px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 13px;
      font-family: monospace;
      width: 160px;
    }
    .btn-random {
      padding: 6px 12px;
      background: #f4a261;
      border: none;
      border-radius: 4px;
      color: #fff;
      font-weight: bold;
      cursor: pointer;
    }
    .preview-layout { display: flex; flex: 1; overflow: hidden; }
    .controls-panel {
      width: 320px;
      background: #ffffff;
      border-right: 1px solid #dee2e6;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .controls-panel h3 { margin: 0; font-size: 16px; color: #1d3557; }
    .control-group { display: flex; flex-direction: column; gap: 6px; }
    .control-group label { font-size: 13px; font-weight: 600; color: #495057; }
    .control-group input[type="text"] {
      padding: 8px 12px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 14px;
    }
    .info-note { font-size: 12px; color: #6c757d; line-height: 1.5; background: #f8f9fa; padding: 10px; border-radius: 6px; border-left: 3px solid #2a9d8f; }
    .actions { margin-top: auto; }
    .btn-save {
      width: 100%;
      padding: 12px;
      background: #2a9d8f;
      color: #fff;
      font-weight: bold;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .viewport-panel { flex: 1; display: flex; flex-direction: column; overflow: auto; padding: 24px; }
    .viewport-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .viewport-header h4 { margin: 0; font-size: 16px; }
    .seed-badge { font-family: monospace; background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .svg-stage { display: flex; justify-content: center; align-items: center; background: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; padding: 24px; min-height: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .svg-render-box svg { max-width: 100%; max-height: 550px; }
    .cipher-duo { display: flex; flex-direction: column; gap: 24px; width: 100%; max-width: 650px; }
    .cipher-box h5 { margin: 0 0 8px 0; font-size: 13px; color: #495057; }
    .cipher-box svg { width: 100%; height: auto; border-radius: 6px; }
  `]
})
export class ProceduralPreviewComponent {
  protected readonly assetService = inject(AssetService);

  readonly selectedType = signal<GeneratorType>('labyrinth');
  readonly seed = signal('EGYPT-CRYPT-42');

  readonly mazeCols = signal(14);
  readonly mazeRows = signal(14);

  readonly cipherMessage = signal('SEEK THE GOLDEN SCARAB');

  readonly mazeOutput = computed(() => {
    return generateMaze({
      seed: this.seed(),
      cols: this.mazeCols(),
      rows: this.mazeRows()
    });
  });

  readonly cipherOutput = computed(() => {
    return generateRuneCipher({
      seed: this.seed(),
      message: this.cipherMessage()
    });
  });

  randomizeSeed(): void {
    this.seed.set('GEN-' + Math.floor(Math.random() * 90000 + 10000));
  }

  saveToAssets(): void {
    if (this.selectedType() === 'labyrinth') {
      const maze = this.mazeOutput();
      this.assetService.addAsset({
        name: `Labyrinth Maze (${this.seed()})`,
        type: 'vector',
        stage: 'final',
        svgContent: maze.svg,
        notes: `Procedural maze ${this.mazeCols()}x${this.mazeRows()}`
      });
      alert('Maze SVG saved to Asset Manager!');
    } else {
      const cipher = this.cipherOutput();
      this.assetService.addAsset({
        name: `Rune Cryptogram (${this.seed()})`,
        type: 'vector',
        stage: 'final',
        svgContent: cipher.inscriptionSvg,
        notes: `Runic message: "${this.cipherMessage()}"`
      });
      this.assetService.addAsset({
        name: `Rosetta Ledger (${this.seed()})`,
        type: 'vector',
        stage: 'final',
        svgContent: cipher.rosettaSheetSvg,
        notes: `Rosetta translation key for ${this.seed()}`
      });
      alert('Rune Inscription and Rosetta Ledger saved to Asset Manager!');
    }
  }
}
