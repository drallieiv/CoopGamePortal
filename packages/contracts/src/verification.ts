import { SeededPRNG } from './seed.js';

export interface VerificationResult {
  valid: boolean;
  seal?: string;
  targetEnvelope?: string;
}

export interface GridCell {
  seal?: string;
  targetEnvelope?: string;
  isDecoy: boolean;
}

export interface GridRow {
  puzzleId: string;
  lockSigil: string;
  isDecoy: boolean;
  cells: Record<string, GridCell | null>;
}

export interface GridMatrix {
  columns: string[];
  rows: GridRow[];
}

export interface GenerateGridOptions {
  decoyColCount?: number;
  decoyRowCount?: number;
}

export interface RegisteredPuzzle {
  puzzleId: string;
  lockSigil: string;
  solutionKey: string;
  seal: string;
  envelopeRef: string;
  orderMode?: 'ordered' | 'unordered';
}

const DECOY_SIGILS = [
  '🜲', '☽', '🧭', '🗝', '⚡', '👁', '⏳', '⚔', '⚚', '⚜',
  '♈︎', '♉︎', '♊︎', '♋︎', '♌︎', '♍︎', '♎︎', '♏︎', '♐︎', '♑︎', '♒︎', '♓︎',
];

const DECOY_KEY_PREFIXES = [
  'SIG', 'HEX', 'RUN', 'VAL', 'ARC', 'VEX', 'SOL', 'LUM', 'OBS', 'NOVA', 'ECHO', 'VOID',
];

const DECOY_SEAL_SYMBOLS = [
  '♈︎', '♉︎', '♊︎', '♋︎', '♌︎', '♍︎', '♎︎', '♏︎', '♐︎', '♑︎', '♒︎', '♓︎',
];

/**
 * Offline Sigil Resonance Verification Matrix.
 * Validates solutions and deterministically generates printable verification tables.
 */
export class SigilResonanceMatrix {
  protected readonly seed: string;
  protected readonly puzzles: Map<string, RegisteredPuzzle> = new Map();

  constructor(seed: string) {
    if (typeof seed !== 'string') {
      throw new Error('Seed must be a string');
    }
    this.seed = seed;
  }

  /**
   * Registers a puzzle mapping for verification and grid generation.
   */
  registerPuzzle(
    puzzleId: string,
    lockSigil: string,
    solutionKey: string,
    seal: string,
    envelopeRef: string,
    orderMode: 'ordered' | 'unordered' = 'ordered'
  ): void {
    if (
      !puzzleId ||
      !lockSigil ||
      !solutionKey ||
      !seal ||
      !envelopeRef ||
      !puzzleId.trim() ||
      !lockSigil.trim() ||
      !solutionKey.trim() ||
      !seal.trim() ||
      !envelopeRef.trim()
    ) {
      throw new Error('All puzzle registration parameters must be non-empty strings');
    }

    this.puzzles.set(puzzleId, {
      puzzleId: puzzleId.trim(),
      lockSigil: lockSigil.trim(),
      solutionKey: solutionKey.trim(),
      seal: seal.trim(),
      envelopeRef: envelopeRef.trim(),
      orderMode
    });
  }

  /**
   * Verifies an input key against a registered puzzle.
   * Supports ordered and unordered matching, accepts string or array of symbols.
   */
  verify(puzzleId: string, inputKey: string | string[]): VerificationResult {
    const puzzle = this.puzzles.get(puzzleId);
    if (!puzzle || !inputKey) {
      return { valid: false };
    }

    const inputArr = Array.isArray(inputKey)
      ? inputKey.map(s => s.trim().toUpperCase())
      : (inputKey.includes(',')
          ? inputKey.split(',').map(s => s.trim().toUpperCase())
          : Array.from(inputKey.trim().toUpperCase()));

    const solArr = puzzle.solutionKey.includes(',')
      ? puzzle.solutionKey.split(',').map(s => s.trim().toUpperCase())
      : Array.from(puzzle.solutionKey.trim().toUpperCase());

    const isMatch = puzzle.orderMode === 'unordered'
      ? [...inputArr].sort().join('') === [...solArr].sort().join('')
      : inputArr.join('') === solArr.join('');

    if (isMatch) {
      return {
        valid: true,
        seal: puzzle.seal,
        targetEnvelope: puzzle.envelopeRef,
      };
    }

    return { valid: false };
  }

  /**
   * Generates a deterministic printable verification grid with anti-spoiler decoys.
   */
  generateLookupGrid(options?: GenerateGridOptions): GridMatrix {
    if (this.puzzles.size === 0) {
      throw new Error('No puzzles registered to generate grid');
    }

    const prng = new SeededPRNG(this.seed);
    const decoyColCount = options?.decoyColCount ?? 0;
    const decoyRowCount = options?.decoyRowCount ?? 0;

    const registeredList = Array.from(this.puzzles.values());
    const realColumns = [...new Set(registeredList.map((p) => p.solutionKey))];

    const columnSet = new Set<string>(realColumns);
    const decoyColumns: string[] = [];

    let attempt = 1;
    while (decoyColumns.length < decoyColCount) {
      const prefix = prng.pick(DECOY_KEY_PREFIXES);
      const num = prng.nextInt(10, 99);
      const candidate = `${prefix}-${num}`;
      if (!columnSet.has(candidate)) {
        columnSet.add(candidate);
        decoyColumns.push(candidate);
      }
      attempt++;
      if (attempt > 1000) {
        const fallback = `DEC-${decoyColumns.length + 1}`;
        columnSet.add(fallback);
        decoyColumns.push(fallback);
      }
    }

    const allColumns = prng.shuffle([...realColumns, ...decoyColumns]);
    const allRealSeals = registeredList.map((p) => p.seal);

    const rows: GridRow[] = [];

    // Construct real puzzle rows
    for (const puzzle of registeredList) {
      const cells: Record<string, GridCell | null> = {};
      for (const col of allColumns) {
        if (col === puzzle.solutionKey) {
          cells[col] = {
            isDecoy: false,
            seal: puzzle.seal,
            targetEnvelope: puzzle.envelopeRef,
          };
        } else {
          cells[col] = {
            isDecoy: true,
            seal: this.generateDecoySeal(prng, [puzzle.seal]),
            targetEnvelope: this.generateDecoyEnvelope(prng),
          };
        }
      }

      rows.push({
        puzzleId: puzzle.puzzleId,
        lockSigil: puzzle.lockSigil,
        isDecoy: false,
        cells,
      });
    }

    // Construct decoy rows
    for (let i = 0; i < decoyRowCount; i++) {
      const decoyId = `decoy-pz-${i + 1}`;
      const sigil = prng.pick(DECOY_SIGILS);
      const cells: Record<string, GridCell | null> = {};

      for (const col of allColumns) {
        cells[col] = {
          isDecoy: true,
          seal: this.generateDecoySeal(prng, allRealSeals),
          targetEnvelope: this.generateDecoyEnvelope(prng),
        };
      }

      rows.push({
        puzzleId: decoyId,
        lockSigil: sigil,
        isDecoy: true,
        cells,
      });
    }

    const shuffledRows = prng.shuffle(rows);

    return {
      columns: allColumns,
      rows: shuffledRows,
    };
  }

  /**
   * Generates a decoy seal distinct from forbidden seals.
   */
  protected generateDecoySeal(prng: SeededPRNG, forbiddenSeals: string[]): string {
    const forbidden = new Set(forbiddenSeals);
    for (let i = 0; i < 50; i++) {
      const sym = prng.pick(DECOY_SEAL_SYMBOLS);
      const num = prng.nextInt(10, 99);
      const seal = `${sym} ${num}`;
      if (!forbidden.has(seal)) {
        return seal;
      }
    }
    return `SEAL-${prng.nextInt(100, 999)}`;
  }

  /**
   * Generates a decoy envelope reference.
   */
  protected generateDecoyEnvelope(prng: SeededPRNG): string {
    const num = prng.nextInt(1, 99);
    return `ENV-${String(num).padStart(2, '0')}`;
  }
}
