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
}
/**
 * Offline Sigil Resonance Verification Matrix.
 * Validates solutions and deterministically generates printable verification tables.
 */
export declare class SigilResonanceMatrix {
    protected readonly seed: string;
    protected readonly puzzles: Map<string, RegisteredPuzzle>;
    constructor(seed: string);
    /**
     * Registers a puzzle mapping for verification and grid generation.
     */
    registerPuzzle(puzzleId: string, lockSigil: string, solutionKey: string, seal: string, envelopeRef: string): void;
    /**
     * Verifies an input key against a registered puzzle.
     * Tolerates leading/trailing whitespace and is case-insensitive.
     */
    verify(puzzleId: string, inputKey: string): VerificationResult;
    /**
     * Generates a deterministic printable verification grid with anti-spoiler decoys.
     */
    generateLookupGrid(options?: GenerateGridOptions): GridMatrix;
    /**
     * Generates a decoy seal distinct from forbidden seals.
     */
    protected generateDecoySeal(prng: SeededPRNG, forbiddenSeals: string[]): string;
    /**
     * Generates a decoy envelope reference.
     */
    protected generateDecoyEnvelope(prng: SeededPRNG): string;
}
//# sourceMappingURL=verification.d.ts.map