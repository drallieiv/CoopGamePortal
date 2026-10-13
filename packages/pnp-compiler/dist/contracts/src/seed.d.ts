/**
 * Seeded pseudo-random number generator using Mulberry32.
 * Provides deterministic float, integer, pick, and shuffle operations.
 */
export declare class SeededPRNG {
    protected state: number;
    constructor(seed: string);
    /**
     * Hashes a string seed into a 32-bit unsigned integer using xmur3.
     */
    protected static hashSeed(seed: string): number;
    /**
     * Generates a deterministic pseudo-random float in [0, 1).
     */
    next(): number;
    /**
     * Generates a deterministic pseudo-random integer in [min, max] inclusive.
     */
    nextInt(min: number, max: number): number;
    /**
     * Randomly picks one element from a non-empty array.
     */
    pick<T>(arr: T[]): T;
    /**
     * Returns a shuffled shallow copy of the array using Fisher-Yates algorithm.
     */
    shuffle<T>(arr: T[]): T[];
}
//# sourceMappingURL=seed.d.ts.map