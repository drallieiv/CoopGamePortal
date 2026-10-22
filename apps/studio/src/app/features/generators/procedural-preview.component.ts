import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import {
  generateMaze,
  generateRuneCipher,
  generateCaesarCipher,
  generateMorseCode
} from '@escape-system/generators';
import { AssetService } from '../../services/asset.service.js';

export type GeneratorType = 'caesar' | 'morse' | 'cipher' | 'labyrinth' | 'custom_script';

export interface CustomScriptedTemplate {
  name: string;
  type: string;
  seed?: string;
  svg: string;
  description?: string;
}

@Component({
  selector: 'app-procedural-preview',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="procedural-preview-root">
      @if (!selectedType()) {
        <!-- Empty Default State with Template Picker -->
        <div class="empty-state-card">
          <div class="empty-icon">⚡</div>
          <h3>Procedural Element Generator</h3>
          <p class="subtitle">
            Generate mathematical, cryptological, or topological assets dynamically from a deterministic seed.
            Choose a generic template below or load a custom scripted element:
          </p>

          <div class="templates-grid">
            <div class="template-card" (click)="selectTemplate('caesar')">
              <span class="tpl-icon">🔤</span>
              <h4>Caesar Cipher Wheel</h4>
              <p>Rotational alphabet shift cipher with encrypted inscription and decoder wheel.</p>
              <button class="btn-create">Create Element →</button>
            </div>

            <div class="template-card" (click)="selectTemplate('morse')">
              <span class="tpl-icon">📻</span>
              <h4>Morse Code Telegraph</h4>
              <p>Audio/visual telegraph tape with punched dots & dashes and reference sheet.</p>
              <button class="btn-create">Create Element →</button>
            </div>

            <div class="template-card" (click)="selectTemplate('cipher')">
              <span class="tpl-icon">ᚠ</span>
              <h4>Runic Cipher & Rosetta</h4>
              <p>Ancient glyph substitution carving and companion translation ledger.</p>
              <button class="btn-create">Create Element →</button>
            </div>

            <div class="template-card" (click)="selectTemplate('labyrinth')">
              <span class="tpl-icon">🌀</span>
              <h4>Procedural Labyrinth</h4>
              <p>Recursive backtracker maze with guaranteed entrance-to-exit solution.</p>
              <button class="btn-create">Create Element →</button>
            </div>

            <label class="template-card upload">
              <span class="tpl-icon">📜</span>
              <h4>Scripted Template (JSON)</h4>
              <p>Load custom procedural element definition or script from JSON file.</p>
              <span class="btn-create upload">Upload JSON →</span>
              <input type="file" accept=".json" (change)="onUploadScript($event)" style="display:none;" />
            </label>
          </div>
        </div>
      } @else {
        <!-- Active Generator Workspace -->
        <div class="preview-toolbar">
          <div class="active-title-wrap">
            <button class="btn-back" (click)="selectedType.set(null)">← Templates</button>
            <h3>{{ getActiveTitle() }}</h3>
          </div>

          <div class="seed-controller">
            <label>Seed:</label>
            <input
              type="text"
              [ngModel]="seed()"
              (ngModelChange)="seed.set($event)"
            />
            <button class="btn-random" (click)="randomizeSeed()">🎲 Randomize</button>
            <button class="btn-close" (click)="selectedType.set(null)">✕ Close</button>
          </div>
        </div>

        <div class="preview-layout">
          <!-- Sidebar: Parameters -->
          <aside class="controls-panel">
            @switch (selectedType()) {
              @case ('caesar') {
                <h4>Caesar Parameters</h4>
                <div class="control-group">
                  <label>Secret Message:</label>
                  <input type="text" [ngModel]="caesarMessage()" (ngModelChange)="caesarMessage.set($event)" />
                </div>
                <div class="control-group">
                  <label>Shift (1-25): {{ caesarShift() }}</label>
                  <input type="range" min="1" max="25" [ngModel]="caesarShift()" (ngModelChange)="caesarShift.set(+$event)" />
                </div>
              }
              @case ('morse') {
                <h4>Morse Parameters</h4>
                <div class="control-group">
                  <label>Secret Message:</label>
                  <input type="text" [ngModel]="morseMessage()" (ngModelChange)="morseMessage.set($event)" />
                </div>
              }
              @case ('cipher') {
                <h4>Runic Parameters</h4>
                <div class="control-group">
                  <label>Secret Message:</label>
                  <input type="text" [ngModel]="cipherMessage()" (ngModelChange)="cipherMessage.set($event)" />
                </div>
              }
              @case ('labyrinth') {
                <h4>Maze Dimensions</h4>
                <div class="control-group">
                  <label>Columns (Width): {{ mazeCols() }}</label>
                  <input type="range" min="5" max="25" [ngModel]="mazeCols()" (ngModelChange)="mazeCols.set(+$event)" />
                </div>
                <div class="control-group">
                  <label>Rows (Height): {{ mazeRows() }}</label>
                  <input type="range" min="5" max="25" [ngModel]="mazeRows()" (ngModelChange)="mazeRows.set(+$event)" />
                </div>
              }
              @case ('custom_script') {
                <h4>Custom Scripted Element</h4>
                @if (customScripted(); as cs) {
                  <p class="custom-note">{{ cs.description ?? 'Imported custom procedural generator definition.' }}</p>
                }
              }
            }

            <div class="actions">
              <button class="btn-save" (click)="saveToAssets()">
                📥 Save to Asset Manager
              </button>
            </div>
          </aside>

          <!-- Main Stage: Live SVG Rendering -->
          <main class="viewport-panel">
            <div class="viewport-header">
              <h4>Live Vector SVG Rendering</h4>
              <span class="seed-badge">SEED: {{ seed() }}</span>
            </div>

            <div class="svg-stage">
              @switch (selectedType()) {
                @case ('caesar') {
                  <div class="duo-stage">
                    <div class="box">
                      <h5>Encrypted Inscription:</h5>
                      <div class="render-frame" [innerHTML]="safeCaesar().inscription"></div>
                    </div>
                    <div class="box">
                      <h5>Decryption Decoder Wheel:</h5>
                      <div class="render-frame" [innerHTML]="safeCaesar().wheel"></div>
                    </div>
                  </div>
                }
                @case ('morse') {
                  <div class="duo-stage">
                    <div class="box">
                      <h5>Punched Telegraph Tape:</h5>
                      <div class="render-frame" [innerHTML]="safeMorse().tape"></div>
                    </div>
                    <div class="box">
                      <h5>International Morse Code Guide:</h5>
                      <div class="render-frame" [innerHTML]="safeMorse().guide"></div>
                    </div>
                  </div>
                }
                @case ('cipher') {
                  <div class="duo-stage">
                    <div class="box">
                      <h5>Stone Inscription Tile:</h5>
                      <div class="render-frame" [innerHTML]="safeRunic().inscription"></div>
                    </div>
                    <div class="box">
                      <h5>Rosetta Translation Ledger Sheet:</h5>
                      <div class="render-frame" [innerHTML]="safeRunic().rosetta"></div>
                    </div>
                  </div>
                }
                @case ('labyrinth') {
                  <div class="single-frame" [innerHTML]="safeLabyrinth()"></div>
                }
                @case ('custom_script') {
                  @if (customScripted(); as cs) {
                    <div class="single-frame" [innerHTML]="safeCustom(cs.svg)"></div>
                  }
                }
              }
            </div>
          </main>
        </div>
      }
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
      overflow: hidden;
    }

    /* Empty State */
    .empty-state-card {
      max-width: 900px;
      margin: 40px auto;
      text-align: center;
      padding: 32px;
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.05);
    }
    .empty-icon { font-size: 48px; margin-bottom: 12px; }
    .empty-state-card h3 { margin: 0 0 8px 0; font-size: 22px; color: #1d3557; }
    .subtitle { color: #64748b; font-size: 14px; max-width: 600px; margin: 0 auto 32px auto; line-height: 1.5; }
    
    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      text-align: left;
    }
    .template-card {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 20px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      transition: all 0.2s;
    }
    .template-card:hover {
      border-color: #0284c7;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.1);
    }
    .template-card.upload { border-style: dashed; border-color: #94a3b8; }
    .tpl-icon { font-size: 28px; margin-bottom: 8px; }
    .template-card h4 { margin: 0 0 6px 0; font-size: 15px; color: #1d3557; }
    .template-card p { font-size: 12px; color: #64748b; line-height: 1.4; margin: 0 0 16px 0; flex: 1; }
    .btn-create {
      background: #0284c7;
      color: #fff;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      text-align: center;
    }
    .btn-create.upload { background: #475569; display: block; }

    /* Active Generator Toolbar */
    .preview-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px;
      background: #ffffff;
      border-bottom: 1px solid #dee2e6;
    }
    .active-title-wrap { display: flex; align-items: center; gap: 12px; }
    .active-title-wrap h3 { margin: 0; font-size: 16px; color: #1d3557; }
    .btn-back { background: none; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; }
    .seed-controller { display: flex; align-items: center; gap: 8px; }
    .seed-controller label { font-size: 12px; font-weight: bold; }
    .seed-controller input { padding: 6px 10px; border: 1px solid #ced4da; border-radius: 4px; font-family: monospace; font-size: 13px; width: 140px; }
    .btn-random { background: #f4a261; border: none; padding: 6px 12px; border-radius: 4px; color: #fff; font-weight: bold; cursor: pointer; }
    .btn-close { background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; padding: 6px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; }

    .preview-layout { display: flex; flex: 1; overflow: hidden; }
    .controls-panel { width: 300px; background: #ffffff; border-right: 1px solid #dee2e6; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .controls-panel h4 { margin: 0; font-size: 15px; color: #1d3557; }
    .control-group { display: flex; flex-direction: column; gap: 6px; }
    .control-group label { font-size: 12px; font-weight: 600; color: #475569; }
    .control-group input[type="text"] { padding: 8px 10px; border: 1px solid #ced4da; border-radius: 4px; font-size: 13px; }
    .actions { margin-top: auto; }
    .btn-save { width: 100%; padding: 12px; background: #2a9d8f; color: #fff; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; }

    .viewport-panel { flex: 1; display: flex; flex-direction: column; overflow: auto; padding: 24px; }
    .viewport-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .viewport-header h4 { margin: 0; font-size: 16px; }
    .seed-badge { font-family: monospace; background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .svg-stage { display: flex; justify-content: center; align-items: center; background: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; padding: 24px; min-height: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .duo-stage { display: flex; flex-direction: column; gap: 20px; width: 100%; max-width: 650px; }
    .box h5 { margin: 0 0 8px 0; font-size: 13px; color: #475569; }
    .render-frame svg, .single-frame svg { max-width: 100%; max-height: 520px; border-radius: 6px; }
  `]
})
export class ProceduralPreviewComponent {
  protected readonly assetService = inject(AssetService);
  protected readonly sanitizer = inject(DomSanitizer);

  // Empty by default
  readonly selectedType = signal<GeneratorType | null>(null);
  readonly seed = signal('GEN-4091');

  // Parameters
  readonly caesarMessage = signal('FIND THE PHARAOH');
  readonly caesarShift = signal(4);
  readonly morseMessage = signal('SOS ATLANTIS');
  readonly cipherMessage = signal('SEEK THE GOLDEN SCARAB');
  readonly mazeCols = signal(14);
  readonly mazeRows = signal(14);

  readonly customScripted = signal<CustomScriptedTemplate | null>(null);

  selectTemplate(type: GeneratorType): void {
    this.selectedType.set(type);
  }

  getActiveTitle(): string {
    switch (this.selectedType()) {
      case 'caesar': return '🔤 Caesar Cipher Wheel';
      case 'morse': return '📻 Morse Code Telegraph';
      case 'cipher': return 'ᚠ Runic Substitution & Rosetta';
      case 'labyrinth': return '🌀 Procedural Labyrinth';
      case 'custom_script': return `📜 ${this.customScripted()?.name ?? 'Custom Scripted Generator'}`;
      default: return 'Generator';
    }
  }

  randomizeSeed(): void {
    this.seed.set('GEN-' + Math.floor(Math.random() * 90000 + 10000));
  }

  readonly safeCaesar = computed(() => {
    const out = generateCaesarCipher({
      seed: this.seed(),
      message: this.caesarMessage(),
      shift: this.caesarShift()
    });
    return {
      inscription: this.sanitizer.bypassSecurityTrustHtml(out.visualSvg),
      wheel: this.sanitizer.bypassSecurityTrustHtml(out.wheelSvg),
      raw: out
    };
  });

  readonly safeMorse = computed(() => {
    const out = generateMorseCode({
      seed: this.seed(),
      message: this.morseMessage()
    });
    return {
      tape: this.sanitizer.bypassSecurityTrustHtml(out.tapeSvg),
      guide: this.sanitizer.bypassSecurityTrustHtml(out.referenceCardSvg),
      raw: out
    };
  });

  readonly safeRunic = computed(() => {
    const out = generateRuneCipher({
      seed: this.seed(),
      message: this.cipherMessage()
    });
    return {
      inscription: this.sanitizer.bypassSecurityTrustHtml(out.inscriptionSvg),
      rosetta: this.sanitizer.bypassSecurityTrustHtml(out.rosettaSheetSvg),
      raw: out
    };
  });

  readonly safeLabyrinth = computed(() => {
    const out = generateMaze({
      seed: this.seed(),
      cols: this.mazeCols(),
      rows: this.mazeRows()
    });
    return this.sanitizer.bypassSecurityTrustHtml(out.svg);
  });

  safeCustom(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  onUploadScript(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string) as CustomScriptedTemplate;
        if (!json.svg) {
          throw new Error('Scripted generator must include svg output');
        }
        this.customScripted.set(json);
        this.selectedType.set('custom_script');
      } catch (err) {
        alert('Invalid scripted generator JSON: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  }

  saveToAssets(): void {
    const t = this.selectedType();
    if (t === 'caesar') {
      const c = this.safeCaesar().raw;
      this.assetService.addAsset({
        name: `Caesar Inscription (${this.seed()})`,
        type: 'vector',
        stage: 'final',
        svgContent: c.visualSvg
      });
      this.assetService.addAsset({
        name: `Caesar Decoder Wheel (${this.seed()})`,
        type: 'vector',
        stage: 'final',
        svgContent: c.wheelSvg
      });
      alert('Caesar Inscription & Wheel saved to Asset Manager!');
    } else if (t === 'morse') {
      const m = this.safeMorse().raw;
      this.assetService.addAsset({
        name: `Morse Tape (${this.seed()})`,
        type: 'vector',
        stage: 'final',
        svgContent: m.tapeSvg
      });
      this.assetService.addAsset({
        name: `Morse Reference Card (${this.seed()})`,
        type: 'vector',
        stage: 'final',
        svgContent: m.referenceCardSvg
      });
      alert('Morse Tape & Reference Guide saved to Asset Manager!');
    } else if (t === 'cipher') {
      const r = this.safeRunic().raw;
      this.assetService.addAsset({
        name: `Runic Inscription (${this.seed()})`,
        type: 'vector',
        stage: 'final',
        svgContent: r.inscriptionSvg
      });
      this.assetService.addAsset({
        name: `Rosetta Ledger (${this.seed()})`,
        type: 'vector',
        stage: 'final',
        svgContent: r.rosettaSheetSvg
      });
      alert('Runic Inscription & Rosetta Ledger saved to Asset Manager!');
    } else if (t === 'labyrinth') {
      const maze = generateMaze({
        seed: this.seed(),
        cols: this.mazeCols(),
        rows: this.mazeRows()
      });
      this.assetService.addAsset({
        name: `Procedural Maze (${this.seed()})`,
        type: 'vector',
        stage: 'final',
        svgContent: maze.svg
      });
      alert('Maze saved to Asset Manager!');
    } else if (t === 'custom_script') {
      const cs = this.customScripted();
      if (cs) {
        this.assetService.addAsset({
          name: cs.name,
          type: 'vector',
          stage: 'final',
          svgContent: cs.svg
        });
        alert('Custom scripted asset saved to Asset Manager!');
      }
    }
  }
}
