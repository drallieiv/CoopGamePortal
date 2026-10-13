import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SeededPRNG } from '../src/seed.js';

describe('SeededPRNG', () => {
  it('nextShouldReturnConsistentFloatBetweenZeroAndOneWhenCalledWithSameSeed', () => {
    const prng1 = new SeededPRNG('session-alpha');
    const prng2 = new SeededPRNG('session-alpha');

    const seq1: number[] = [];
    const seq2: number[] = [];

    for (let i = 0; i < 20; i++) {
      const val1 = prng1.next();
      const val2 = prng2.next();
      assert.ok(val1 >= 0 && val1 < 1, `Value ${val1} should be in [0, 1)`);
      seq1.push(val1);
      seq2.push(val2);
    }

    assert.deepEqual(seq1, seq2);
  });

  it('nextShouldProduceDifferentSequencesWhenSeedDiffers', () => {
    const prng1 = new SeededPRNG('session-alpha');
    const prng2 = new SeededPRNG('session-beta');

    const seq1 = Array.from({ length: 5 }, () => prng1.next());
    const seq2 = Array.from({ length: 5 }, () => prng2.next());

    assert.notDeepEqual(seq1, seq2);
  });

  it('nextIntShouldReturnInclusiveIntegersWhenMinAndMaxGiven', () => {
    const prng = new SeededPRNG('int-seed');
    const min = 5;
    const max = 15;
    const seen = new Set<number>();

    for (let i = 0; i < 100; i++) {
      const val = prng.nextInt(min, max);
      assert.ok(Number.isInteger(val), `Expected integer but got ${val}`);
      assert.ok(val >= min && val <= max, `Expected ${val} between ${min} and ${max}`);
      seen.add(val);
    }

    // Over 100 draws from range [5, 15] we expect multiple distinct values
    assert.ok(seen.size > 5, 'Expected distribution over multiple distinct values');
  });

  it('nextIntShouldReturnSameValueWhenMinEqualsMax', () => {
    const prng = new SeededPRNG('single-int-seed');
    assert.equal(prng.nextInt(42, 42), 42);
  });

  it('nextIntShouldThrowWhenMinGreaterThanMax', () => {
    const prng = new SeededPRNG('invalid-range');
    assert.throws(
      () => prng.nextInt(10, 5),
      /min \(10\) cannot be greater than max \(5\)/
    );
  });

  it('pickShouldSelectElementFromArrayWhenArrayIsNotEmpty', () => {
    const prng = new SeededPRNG('pick-seed');
    const items = ['alpha', 'beta', 'gamma', 'delta'];

    const chosen = prng.pick(items);
    assert.ok(items.includes(chosen));

    // Verify determinism
    const prngRepeat = new SeededPRNG('pick-seed');
    assert.equal(prngRepeat.pick(items), chosen);
  });

  it('pickShouldThrowWhenArrayIsEmpty', () => {
    const prng = new SeededPRNG('empty-array');
    assert.throws(
      () => prng.pick([]),
      /Cannot pick from an empty array/
    );
  });

  it('constructorShouldThrowWhenSeedIsNotString', () => {
    assert.throws(
      () => new SeededPRNG(null as unknown as string),
      /Seed must be a string/
    );
  });
});
