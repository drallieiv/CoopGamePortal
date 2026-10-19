import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SigilResonanceMatrix,
  type VerificationResult,
  type SymbolItem,
  type PuzzleInputConfig,
  SYMBOL_PRESETS
} from '@escape-system/contracts';

interface CompanionPuzzle {
  id: string;
  sigil: string;
  title: string;
  solution: string;
  seal: string;
  envelope: string;
  inputConfig: PuzzleInputConfig;
  hints: [string, string, string];
}

@Component({
  selector: 'app-quick-check',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="quick-check-card">
      <div class="header">
        <button class="btn-back" (click)="exit.emit()">← Lobby</button>
        <h2>{{ scenarioTitle() }}</h2>
        <span class="seed-badge">SEED: {{ seed() }}</span>
      </div>

      <div class="puzzle-selection">
        <label for="puzzle-select">Active Puzzle:</label>
        <select
          id="puzzle-select"
          [ngModel]="selectedPuzzleId()"
          (ngModelChange)="onPuzzleSelected($event)"
        >
          @for (p of puzzles(); track p.id) {
            <option [value]="p.id">{{ p.sigil }} {{ p.title }}</option>
          }
        </select>
      </div>

      <!-- Selected Symbol Slots -->
      <div class="slots-container">
        <div class="slots-header">
          <label>Selected Symbols ({{ selectedSymbols().length }}/{{ activeInputConfig().length }}):</label>
          <span class="rule-badge" [class.unordered]="activeInputConfig().orderMode === 'unordered'">
            {{ activeInputConfig().orderMode === 'unordered' ? '🔀 Any Order' : '➡️ Ordered Sequence' }}
            {{ activeInputConfig().allowRepetition ? '• Duplicates OK' : '• No Duplicates' }}
          </span>
        </div>

        <div class="slots-row">
          @for (slot of slotPlaceholders(); track $index) {
            <div
              class="slot-cell"
              [class.filled]="selectedSymbols()[$index]"
              (click)="removeSymbolAt($index)"
              title="Click to remove"
            >
              {{ selectedSymbols()[$index] ?? '·' }}
            </div>
          }
        </div>
      </div>

      <!-- Interactive Symbol Keypad Grid -->
      <div class="keypad-section">
        <div class="keypad-grid">
          @for (sym of activeSymbols(); track sym.id) {
            <button
              type="button"
              class="keypad-btn"
              [disabled]="isSymbolDisabled(sym.glyph)"
              [class.used]="isSymbolDisabled(sym.glyph)"
              (click)="selectSymbol(sym.glyph)"
            >
              <span class="glyph">{{ sym.glyph }}</span>
              @if (sym.name) {
                <span class="name">{{ sym.name }}</span>
              }
            </button>
          }
        </div>

        <div class="keypad-controls">
          <button
            type="button"
            class="btn-ctrl clear"
            (click)="clearSymbols()"
            [disabled]="selectedSymbols().length === 0"
          >
            Clear
          </button>
          <button
            type="button"
            class="btn-ctrl backspace"
            (click)="popSymbol()"
            [disabled]="selectedSymbols().length === 0"
          >
            ⌫ Backspace
          </button>
          <button
            type="button"
            class="btn-verify"
            (click)="verifySolution()"
            [disabled]="selectedSymbols().length === 0"
          >
            Verify Resonance
          </button>
        </div>
      </div>

      <!-- Verification Result Display -->
      @if (verificationResult(); as res) {
        <div class="result-banner" [class.success]="res.valid" [class.failure]="!res.valid">
          @if (res.valid) {
            <div class="success-content">
              <h3>✨ SOLUTION VERIFIED</h3>
              <p class="seal">Verification Seal: <strong>{{ res.seal }}</strong></p>
              <p class="envelope">Check outer seal matches on: <strong>{{ res.targetEnvelope }}</strong> before opening!</p>
            </div>
          } @else {
            <div class="failure-content">
              <h3>❌ COMBINATION RESONANCE FAILED</h3>
              <p>The energy pattern does not match. Do not open any envelopes!</p>
            </div>
          }
        </div>
      }

      <!-- Tiered Hints -->
      <div class="hints-section">
        <div class="hints-header">
          <h4>Tiered Hints ({{ unlockedHintTier() }}/{{ maxHints() }})</h4>
          @if (unlockedHintTier() < maxHints()) {
            <button class="btn-hint" (click)="requestNextHint()">
              Unlock Hint {{ unlockedHintTier() + 1 }}
            </button>
          }
        </div>

        <div class="hints-list">
          @for (hint of visibleHints(); track $index) {
            <div class="hint-pill">
              <span class="hint-tier">Tier {{ $index + 1 }}:</span>
              <span class="hint-text">{{ hint }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .quick-check-card {
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 12px;
      padding: 24px;
      max-width: 520px;
      margin: 0 auto;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      font-family: system-ui, -apple-system, sans-serif;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .btn-back {
      background: none;
      border: none;
      color: #457b9d;
      font-weight: bold;
      cursor: pointer;
      font-size: 13px;
    }
    .header h2 { margin: 0; font-size: 18px; color: #212529; }
    .seed-badge {
      font-family: monospace;
      background: #e9ecef;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: #495057;
    }
    .puzzle-selection { margin-bottom: 20px; display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 13px; font-weight: 600; color: #495057; }
    select {
      padding: 10px 12px;
      border: 1px solid #ced4da;
      border-radius: 6px;
      font-size: 15px;
    }

    /* Slots */
    .slots-container { margin-bottom: 20px; }
    .slots-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .rule-badge {
      font-size: 11px;
      font-weight: bold;
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .rule-badge.unordered { background: #fef3c7; color: #92400e; }
    .slots-row {
      display: flex;
      gap: 10px;
      justify-content: center;
      background: #f8f9fa;
      padding: 12px;
      border-radius: 8px;
      border: 1.5px dashed #ced4da;
      min-height: 52px;
      align-items: center;
    }
    .slot-cell {
      width: 48px;
      height: 48px;
      background: #ffffff;
      border: 2px solid #ced4da;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
      color: #1d3557;
      cursor: pointer;
      transition: all 0.15s;
    }
    .slot-cell.filled {
      border-color: #e76f51;
      background: #fff5f0;
      color: #e76f51;
      box-shadow: 0 2px 6px rgba(231, 111, 81, 0.2);
    }

    /* Keypad Grid */
    .keypad-section { margin-bottom: 24px; }
    .keypad-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .keypad-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 10px 4px;
      background: #ffffff;
      border: 1.5px solid #ced4da;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
      min-height: 58px;
    }
    .keypad-btn:hover:not(:disabled) {
      border-color: #1d3557;
      background: #f0f7ff;
      transform: translateY(-1px);
    }
    .keypad-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      background: #f8f9fa;
      border-color: #e9ecef;
    }
    .keypad-btn .glyph { font-size: 22px; color: #1d3557; line-height: 1.2; }
    .keypad-btn .name { font-size: 9px; color: #6c757d; margin-top: 2px; text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .keypad-controls { display: flex; gap: 8px; }
    .btn-ctrl {
      padding: 10px 14px;
      border-radius: 6px;
      border: 1px solid #ced4da;
      background: #ffffff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-ctrl:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ctrl.clear { color: #dc3545; }
    .btn-ctrl.backspace { color: #495057; }
    .btn-verify {
      flex: 1;
      padding: 12px;
      background: #1d3557;
      color: #fff;
      font-weight: bold;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.15s;
    }
    .btn-verify:hover:not(:disabled) { background: #2a9d8f; }
    .btn-verify:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Result Banner */
    .result-banner { padding: 16px; border-radius: 8px; margin-bottom: 20px; }
    .result-banner.success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
    .result-banner.failure { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
    .result-banner h3 { margin: 0 0 6px 0; font-size: 15px; }
    .seal { font-size: 18px; margin: 4px 0; }
    .envelope { font-size: 13px; margin: 0; }

    /* Hints */
    .hints-section { border-top: 1px solid #e9ecef; padding-top: 16px; }
    .hints-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .hints-header h4 { margin: 0; font-size: 14px; color: #343a40; }
    .btn-hint {
      background: #e76f51;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    .hints-list { display: flex; flex-direction: column; gap: 8px; }
    .hint-pill { background: #f8f9fa; border-left: 4px solid #e76f51; padding: 8px 12px; font-size: 13px; }
    .hint-tier { font-weight: bold; color: #495057; margin-right: 6px; }
  `]
})
export class QuickCheckComponent {
  readonly scenarioTitle = input<string>('The Lost Tomb');
  readonly seed = input<string>('TOMB-902');

  readonly exit = output<void>();

  readonly puzzles = signal<CompanionPuzzle[]>([
    {
      id: 'puzzle_scarab',
      sigil: '🜲',
      title: 'Scarab Dial (Ordered Sequence)',
      solution: '▲●◆',
      seal: '♈︎ 84',
      envelope: 'Envelope #2',
      inputConfig: {
        orderMode: 'ordered',
        allowRepetition: false,
        length: 3,
        preset: 'alchemy',
        availableSymbols: SYMBOL_PRESETS.alchemy
      },
      hints: [
        'Inspect the wall hieroglyphs closely.',
        'The scarabs point clockwise in order of brightness.',
        'The correct key order is ▲ then ● then ◆.'
      ]
    },
    {
      id: 'puzzle_hieroglyphs',
      sigil: '☽',
      title: 'Hieroglyphic Stele (Any Order)',
      solution: '𓁹𓆣',
      seal: '♎︎ 19',
      envelope: 'Envelope #3',
      inputConfig: {
        orderMode: 'unordered',
        allowRepetition: false,
        length: 2,
        preset: 'egyptian',
        availableSymbols: SYMBOL_PRESETS.egyptian
      },
      hints: [
        'Find the two sacred guardians etched in stone.',
        'The Eye of Horus protects against the Scarab.',
        'Select the Eye and the Scarab in any order.'
      ]
    },
    {
      id: 'puzzle_keypad',
      sigil: '🔢',
      title: 'Vault Code Keypad (Digits)',
      solution: '427',
      seal: '♌︎ 55',
      envelope: 'Envelope #4',
      inputConfig: {
        orderMode: 'ordered',
        allowRepetition: true,
        length: 3,
        preset: 'alphanumeric',
        availableSymbols: SYMBOL_PRESETS.alphanumeric
      },
      hints: [
        'Count the number of pillars in each quadrant.',
        'The answer is 4, 2, 7.',
        'Type 4 then 2 then 7.'
      ]
    },
    {
      id: 'puzzle_compass',
      sigil: '🧭',
      title: 'Navigation Astrolabe (Compass Points)',
      solution: 'N,E,SE,S',
      seal: '♐︎ 71',
      envelope: 'Envelope #5',
      inputConfig: {
        orderMode: 'ordered',
        allowRepetition: true,
        length: 4,
        preset: 'compass',
        availableSymbols: SYMBOL_PRESETS.compass
      },
      hints: [
        'Orient the astrolabe against the magnetic meridian.',
        'Follow the prevailing trade winds from North clockwise.',
        'The sequence is North, East, South-East, South.'
      ]
    },
    {
      id: 'puzzle_arrows',
      sigil: '🏹',
      title: 'Labyrinth Step Sequence (Arrows)',
      solution: '▲,▶,▼,◀',
      seal: '♈︎ 99',
      envelope: 'Envelope #6',
      inputConfig: {
        orderMode: 'ordered',
        allowRepetition: true,
        length: 4,
        preset: 'arrows',
        availableSymbols: SYMBOL_PRESETS.arrows
      },
      hints: [
        'Follow the footsteps inscribed on the floor tiles.',
        'Step forward, right, back, left.',
        'The sequence is ▲, ▶, ▼, ◀.'
      ]
    }
  ]);

  readonly selectedPuzzleId = signal('puzzle_scarab');
  readonly selectedSymbols = signal<string[]>([]);
  readonly verificationResult = signal<VerificationResult | null>(null);
  readonly unlockedHintTier = signal<number>(0);

  protected matrix: SigilResonanceMatrix | null = null;

  readonly activePuzzle = computed(() => {
    return this.puzzles().find((p) => p.id === this.selectedPuzzleId());
  });

  readonly activeInputConfig = computed<PuzzleInputConfig>(() => {
    return this.activePuzzle()?.inputConfig ?? {
      orderMode: 'ordered',
      allowRepetition: false,
      length: 3,
      preset: 'alchemy',
      availableSymbols: SYMBOL_PRESETS.alchemy
    };
  });

  readonly activeSymbols = computed<SymbolItem[]>(() => {
    return this.activeInputConfig().availableSymbols;
  });

  readonly slotPlaceholders = computed(() => {
    const len = this.activeInputConfig().length;
    return Array.from({ length: len });
  });

  readonly maxHints = computed(() => {
    return this.activePuzzle()?.hints.length ?? 0;
  });

  readonly visibleHints = computed(() => {
    const puzzle = this.activePuzzle();
    if (!puzzle) return [];
    return puzzle.hints.slice(0, this.unlockedHintTier());
  });

  constructor() {
    this.initMatrix();
  }

  protected initMatrix(): void {
    this.matrix = new SigilResonanceMatrix(this.seed());
    for (const p of this.puzzles()) {
      this.matrix.registerPuzzle(
        p.id,
        p.sigil,
        p.solution,
        p.seal,
        p.envelope,
        p.inputConfig.orderMode
      );
    }
  }

  onPuzzleSelected(puzzleId: string): void {
    this.selectedPuzzleId.set(puzzleId);
    this.clearSymbols();
    this.verificationResult.set(null);
    this.unlockedHintTier.set(0);
  }

  selectSymbol(glyph: string): void {
    const current = this.selectedSymbols();
    const config = this.activeInputConfig();

    if (current.length >= config.length) {
      return;
    }

    if (!config.allowRepetition && current.includes(glyph)) {
      return;
    }

    this.selectedSymbols.update((list) => [...list, glyph]);
    this.verificationResult.set(null);
  }

  popSymbol(): void {
    this.selectedSymbols.update((list) => list.slice(0, -1));
    this.verificationResult.set(null);
  }

  removeSymbolAt(index: number): void {
    this.selectedSymbols.update((list) => list.filter((_, i) => i !== index));
    this.verificationResult.set(null);
  }

  clearSymbols(): void {
    this.selectedSymbols.set([]);
    this.verificationResult.set(null);
  }

  isSymbolDisabled(glyph: string): boolean {
    const current = this.selectedSymbols();
    const config = this.activeInputConfig();

    if (current.length >= config.length) {
      return true;
    }

    if (!config.allowRepetition && current.includes(glyph)) {
      return true;
    }

    return false;
  }

  verifySolution(): void {
    if (!this.matrix) {
      this.initMatrix();
    }
    const entered = this.selectedSymbols();
    const res = this.matrix!.verify(this.selectedPuzzleId(), entered);
    this.verificationResult.set(res);
  }

  requestNextHint(): void {
    if (this.unlockedHintTier() < this.maxHints()) {
      this.unlockedHintTier.update((t) => t + 1);
    }
  }
}
