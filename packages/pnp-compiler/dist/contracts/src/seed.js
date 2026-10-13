/**
 * Seeded pseudo-random number generator using Mulberry32.
 * Provides deterministic float, integer, pick, and shuffle operations.
 */
export class SeededPRNG {
    state;
    constructor(seed) {
        if (typeof seed !== 'string') {
            throw new Error('Seed must be a string');
        }
        this.state = SeededPRNG.hashSeed(seed);
    }
    /**
     * Hashes a string seed into a 32-bit unsigned integer using xmur3.
     */
    static hashSeed(seed) {
        let h = 1779033703 ^ seed.length;
        for (let i = 0; i < seed.length; i++) {
            h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
            h = (h << 13) | (h >>> 19);
        }
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
    /**
     * Generates a deterministic pseudo-random float in [0, 1).
     */
    next() {
        let t = (this.state = (this.state + 0x6d2b79f5) | 0);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    /**
     * Generates a deterministic pseudo-random integer in [min, max] inclusive.
     */
    nextInt(min, max) {
        if (!Number.isInteger(min) || !Number.isInteger(max)) {
            throw new Error('min and max must be integers');
        }
        if (min > max) {
            throw new Error(`min (${min}) cannot be greater than max (${max})`);
        }
        const range = max - min + 1;
        return Math.floor(this.next() * range) + min;
    }
    /**
     * Randomly picks one element from a non-empty array.
     */
    pick(arr) {
        if (!arr || arr.length === 0) {
            throw new Error('Cannot pick from an empty array');
        }
        const index = this.nextInt(0, arr.length - 1);
        return arr[index];
    }
    /**
     * Returns a shuffled shallow copy of the array using Fisher-Yates algorithm.
     */
    shuffle(arr) {
        const result = [...arr];
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            const temp = result[i];
            result[i] = result[j];
            result[j] = temp;
        }
        return result;
    }
}
//# sourceMappingURL=seed.js.map