import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateIntersectionPair,
  calculateCommonGlyphs,
  validateIntersectionAnswer
} from '../src/intersection.js';
import { SYMBOL_PRESETS } from '../src/manifest.js';

describe('5-Symbol Item Intersection System', () => {
  it('should generate two items with 5 symbols sharing exactly 3 symbols', () => {
    const pair = generateIntersectionPair('ATLANTIS-39', 'horned_statue', 'mini_key', 3, SYMBOL_PRESETS.alchemy);

    assert.equal(pair.itemA.symbols.length, 5);
    assert.equal(pair.itemB.symbols.length, 5);
    assert.equal(pair.commonCount, 3);
    assert.equal(pair.commonSymbols.length, 3);

    // Verify calculated intersection matches
    const glyphsA = pair.itemA.symbols.map(s => s.glyph);
    const glyphsB = pair.itemB.symbols.map(s => s.glyph);
    const intersection = calculateCommonGlyphs(glyphsA, glyphsB);

    assert.equal(intersection.length, 3);
    assert.deepEqual(intersection.sort(), pair.commonGlyphs.sort());
  });

  it('should generate two items with 5 symbols sharing exactly 2 symbols when requested', () => {
    const pair = generateIntersectionPair('TIKAL-JUNGLE', 'eel_statue', 'orichalcum_bead', 2, SYMBOL_PRESETS.egyptian);

    assert.equal(pair.itemA.symbols.length, 5);
    assert.equal(pair.itemB.symbols.length, 5);
    assert.equal(pair.commonCount, 2);
    assert.equal(pair.commonSymbols.length, 2);

    const glyphsA = pair.itemA.symbols.map(s => s.glyph);
    const glyphsB = pair.itemB.symbols.map(s => s.glyph);
    const intersection = calculateCommonGlyphs(glyphsA, glyphsB);

    assert.equal(intersection.length, 2);
  });

  it('should validate correct submitted answers regardless of order', () => {
    const glyphsA = ['▲', '●', '◆', '■', '★'];
    const glyphsB = ['●', '★', '⬡', '▼', '◆'];

    // Common are: ●, ◆, ★
    assert.equal(validateIntersectionAnswer(glyphsA, glyphsB, ['●', '◆', '★']), true);
    // Any order must match!
    assert.equal(validateIntersectionAnswer(glyphsA, glyphsB, ['★', '●', '◆']), true);
    assert.equal(validateIntersectionAnswer(glyphsA, glyphsB, ['◆', '★', '●']), true);

    // Wrong count or wrong symbols fail
    assert.equal(validateIntersectionAnswer(glyphsA, glyphsB, ['●', '◆']), false);
    assert.equal(validateIntersectionAnswer(glyphsA, glyphsB, ['●', '◆', '▲']), false);
  });

  it('should be deterministic for identical seeds', () => {
    const pair1 = generateIntersectionPair('ICELAND-HEEK', 'wax_cat', 'furnace', 3);
    const pair2 = generateIntersectionPair('ICELAND-HEEK', 'wax_cat', 'furnace', 3);

    assert.deepEqual(pair1.commonGlyphs, pair2.commonGlyphs);
    assert.equal(pair1.itemA.itemCode, pair2.itemA.itemCode);
  });
});
