import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SigilResonanceMatrix, VerificationResult } from '@escape-system/contracts';

@Component({
  selector: 'app-quick-check',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="quick-check-card">
      <div class="header">
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

      <div class="input-section">
        <label for="solution-input">Enter Deduced Key / Code:</label>
        <input
          id="solution-input"
          type="text"
          placeholder="e.g. ▲ ● ◆ or 1234"
          [ngModel]="enteredKey()"
          (ngModelChange)="enteredKey.set($event)"
          (keydown.enter)="verifySolution()"
        />
        <button class="btn-verify" (click)="verifySolution()">Verify Resonance</button>
      </div>

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
      max-width: 480px;
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
    .header h2 { margin: 0; font-size: 20px; color: #212529; }
    .seed-badge {
      font-family: monospace;
      background: #e9ecef;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 13px;
      color: #495057;
    }
    .puzzle-selection, .input-section { margin-bottom: 18px; display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 14px; font-weight: 600; color: #495057; }
    select, input {
      padding: 10px 12px;
      border: 1px solid #ced4da;
      border-radius: 6px;
      font-size: 15px;
    }
    .btn-verify {
      margin-top: 8px;
      padding: 12px;
      background: #1d3557;
      color: #fff;
      font-weight: bold;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .result-banner {
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .result-banner.success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
    .result-banner.failure { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
    .result-banner h3 { margin: 0 0 8px 0; font-size: 16px; }
    .seal { font-size: 18px; margin: 4px 0; }
    .envelope { font-size: 14px; margin: 0; }
    .hints-section { border-top: 1px solid #e9ecef; padding-top: 16px; }
    .hints-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .hints-header h4 { margin: 0; font-size: 15px; color: #343a40; }
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
    .hint-pill {
      background: #f8f9fa;
      border-left: 4px solid #e76f51;
      padding: 8px 12px;
      font-size: 14px;
    }
    .hint-tier { font-weight: bold; color: #495057; margin-right: 6px; }
  `]
})
export class QuickCheckComponent {
  readonly scenarioTitle = input<string>('The Lost Tomb');
  readonly seed = input<string>('TOMB-902');

  readonly puzzles = signal([
    {
      id: 'puzzle_scarab',
      sigil: '🜲',
      title: 'Scarab Dial',
      solution: '▲●◆',
      seal: '♈︎ 84',
      envelope: 'Envelope #2',
      hints: [
        'Inspect the wall hieroglyphs closely.',
        'The scarabs point clockwise in order of brightness.',
        'The correct key order is ▲ then ● then ◆.'
      ]
    },
    {
      id: 'puzzle_weights',
      sigil: '⚖',
      title: 'Anubis Scales',
      solution: '42',
      seal: '♎︎ 19',
      envelope: 'Envelope #3',
      hints: [
        'Balance the feather against the lead ingots.',
        'Each ingot weighs 7 units.',
        'The answer is 42.'
      ]
    }
  ]);

  readonly selectedPuzzleId = signal('puzzle_scarab');
  readonly enteredKey = signal('');
  readonly verificationResult = signal<VerificationResult | null>(null);
  readonly unlockedHintTier = signal<number>(0);

  protected matrix: SigilResonanceMatrix | null = null;

  readonly activePuzzle = computed(() => {
    return this.puzzles().find((p) => p.id === this.selectedPuzzleId());
  });

  readonly maxHints = computed(() => {
    return this.activePuzzle()?.hints.length ?? 0;
  });

  readonly visibleHints = computed(() => {
    const puzzle = this.activePuzzle();
    if (!puzzle) {
      return [];
    }
    return puzzle.hints.slice(0, this.unlockedHintTier());
  });

  constructor() {
    this.initMatrix();
  }

  protected initMatrix(): void {
    this.matrix = new SigilResonanceMatrix(this.seed());
    for (const p of this.puzzles()) {
      this.matrix.registerPuzzle(p.id, p.sigil, p.solution, p.seal, p.envelope);
    }
  }

  onPuzzleSelected(puzzleId: string): void {
    this.selectedPuzzleId.set(puzzleId);
    this.enteredKey.set('');
    this.verificationResult.set(null);
    this.unlockedHintTier.set(0);
  }

  verifySolution(): void {
    if (!this.matrix) {
      this.initMatrix();
    }
    const res = this.matrix!.verify(this.selectedPuzzleId(), this.enteredKey());
    this.verificationResult.set(res);
  }

  requestNextHint(): void {
    if (this.unlockedHintTier() < this.maxHints()) {
      this.unlockedHintTier.update((t) => t + 1);
    }
  }
}
