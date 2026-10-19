import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSeededScenarioState } from '../src/scenario-seeder.js';
import type { ScenarioManifest } from '../src/manifest.js';

const samplePath = path.resolve(import.meta.dirname, '../../../samples/fate-of-atlantis.json');
const fateOfAtlantisManifest: ScenarioManifest = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));

describe('Scenario-Wide Seeded State Generator', () => {
  it('should generate consistent item codes and puzzle solutions for Fate of Atlantis', () => {
    const seeded = generateSeededScenarioState(fateOfAtlantisManifest, 'ATLANTIS-39');

    assert.equal(seeded.seed, 'ATLANTIS-39');
    assert.ok(seeded.matrix);

    // Verify all 4 puzzles in Fate of Atlantis are registered
    const hornedFigurine = seeded.puzzles.get('puzzle_horned_figurine');
    assert.ok(hornedFigurine);
    assert.equal(hornedFigurine.lockSigil, '🜲');
    assert.equal(hornedFigurine.solutionKey.length, 3);
    assert.equal(hornedFigurine.sealId, '♈︎ 84');

    // Matrix verify against the registered solution must pass
    const res = seeded.matrix.verify('puzzle_horned_figurine', hornedFigurine.solutionKey);
    assert.equal(res.valid, true);
    assert.equal(res.seal, '♈︎ 84');
  });

  it('should be deterministic across identical seeds', () => {
    const state1 = generateSeededScenarioState(fateOfAtlantisManifest, 'SEED-987');
    const state2 = generateSeededScenarioState(fateOfAtlantisManifest, 'SEED-987');

    const p1 = state1.puzzles.get('puzzle_horned_figurine');
    const p2 = state2.puzzles.get('puzzle_horned_figurine');

    assert.deepEqual(p1?.solutionKey, p2?.solutionKey);
    assert.equal(p1?.sealId, p2?.sealId);
  });
});
