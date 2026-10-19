import { SeededPRNG } from './seed.js';
import { SymbolItem, SYMBOL_PRESETS } from './manifest.js';

export interface ItemSymbolSet {
  itemId: string;
  itemCode: string;
  symbols: SymbolItem[];
}

export interface IntersectionPuzzlePair {
  itemA: ItemSymbolSet;
  itemB: ItemSymbolSet;
  commonCount: 2 | 3;
  commonSymbols: SymbolItem[];
  commonGlyphs: string[];
}

/**
 * Deterministically generates two items each with 5 symbols such that they share
 * exactly `commonCount` (2 or 3) symbols in common.
 */
export function generateIntersectionPair(
  seed: string,
  itemAId: string,
  itemBId: string,
  commonCount: 2 | 3 = 3,
  pool: SymbolItem[] = SYMBOL_PRESETS.alchemy
): IntersectionPuzzlePair {
  if (pool.length < 8) {
    throw new Error('Symbol pool must contain at least 8 unique symbols to generate 5-symbol pairs with 2-3 intersection');
  }

  const rng = new SeededPRNG(`${seed}-intersect-${itemAId}-${itemBId}`);
  const shuffledPool = [...pool];

  // Fisher-Yates shuffle with SeededPRNG
  for (let i = shuffledPool.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
  }

  // 1. Pick the exact common symbols (2 or 3)
  const commonSymbols = shuffledPool.slice(0, commonCount);

  // Remaining pool for non-overlapping symbols
  const remainingPool = shuffledPool.slice(commonCount);

  // 2. Item A gets commonSymbols + (5 - commonCount) unique symbols
  const neededForA = 5 - commonCount;
  const uniqueA = remainingPool.slice(0, neededForA);
  const symbolsA = [...commonSymbols, ...uniqueA];

  // 3. Item B gets commonSymbols + (5 - commonCount) distinct unique symbols
  const uniqueB = remainingPool.slice(neededForA, neededForA + neededForA);
  const symbolsB = [...commonSymbols, ...uniqueB];

  // Shuffle individual item symbol lists so common ones aren't always in first slots
  shuffleWithRng(symbolsA, rng);
  shuffleWithRng(symbolsB, rng);

  const codeA = `ITM-${itemAId.toUpperCase().slice(0, 6)}-${rng.nextInt(10, 99)}`;
  const codeB = `ITM-${itemBId.toUpperCase().slice(0, 6)}-${rng.nextInt(10, 99)}`;

  return {
    itemA: {
      itemId: itemAId,
      itemCode: codeA,
      symbols: symbolsA
    },
    itemB: {
      itemId: itemBId,
      itemCode: codeB,
      symbols: symbolsB
    },
    commonCount,
    commonSymbols,
    commonGlyphs: commonSymbols.map(s => s.glyph)
  };
}

/**
 * Finds the intersection (common glyphs) between two sets of glyphs.
 */
export function calculateCommonGlyphs(glyphsA: string[], glyphsB: string[]): string[] {
  const setB = new Set(glyphsB.map(g => g.trim().toUpperCase()));
  return Array.from(new Set(glyphsA.filter(g => setB.has(g.trim().toUpperCase()))));
}

/**
 * Validates if the player's submitted glyphs match the exact common intersection between Item A and Item B.
 */
export function validateIntersectionAnswer(
  glyphsA: string[],
  glyphsB: string[],
  submitted: string[]
): boolean {
  const common = calculateCommonGlyphs(glyphsA, glyphsB);
  if (submitted.length !== common.length) {
    return false;
  }

  const sortedCommon = [...common].sort();
  const sortedSubmitted = [...submitted.map(s => s.trim().toUpperCase())].sort();

  return sortedCommon.every((glyph, idx) => glyph === sortedSubmitted[idx]);
}

function shuffleWithRng<T>(arr: T[], rng: SeededPRNG): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
