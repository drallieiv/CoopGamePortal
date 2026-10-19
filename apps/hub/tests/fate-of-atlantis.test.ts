import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PnpCompiler } from '@escape-system/pnp-compiler';
import { resolveRolesForPlayerCount, SigilResonanceMatrix, type ScenarioManifest } from '@escape-system/contracts';

const samplePath = path.resolve(import.meta.dirname, '../../../samples/fate-of-atlantis.json');
const fateOfAtlantisManifest: ScenarioManifest = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));

describe('Indiana Jones and the Fate of Atlantis Scenario (JSON Loaded)', () => {
  it('should define the 3 asymmetric roles with exclusive dossiers from json', () => {
    assert.equal(fateOfAtlantisManifest.roles.length, 3);
    const roleIds = fateOfAtlantisManifest.roles.map(r => r.id);
    assert.ok(roleIds.includes('indy'));
    assert.ok(roleIds.includes('sophia'));
    assert.ok(roleIds.includes('marcus'));

    const indy = fateOfAtlantisManifest.roles.find(r => r.id === 'indy');
    assert.ok(indy?.exclusiveDossiers.includes('whip_and_tools_guide'));

    const sophia = fateOfAtlantisManifest.roles.find(r => r.id === 'sophia');
    assert.ok(sophia?.exclusiveDossiers.includes('nur_ab_sal_telepathy_ledger'));

    const marcus = fateOfAtlantisManifest.roles.find(r => r.id === 'marcus');
    assert.ok(marcus?.exclusiveDossiers.includes('global_expedition_coordinates_ledger'));
  });

  it('should correctly partition roles for 2 players (Indy vs Sophia+Marcus)', () => {
    const slots = resolveRolesForPlayerCount(fateOfAtlantisManifest.roleAggregation, 2);
    assert.equal(slots.length, 2);
    assert.deepEqual(slots[0].roles, ['indy']);
    assert.deepEqual(slots[1].roles, ['sophia', 'marcus']);
  });

  it('should compile complete Print & Play package with sealed envelopes and dossiers', () => {
    const pnp = PnpCompiler.compile(fateOfAtlantisManifest, {
      playerCount: 3,
      foldFormat: 'french-fold',
      includeVerificationGrid: true
    });

    assert.equal(pnp.scenarioTitle, 'Indiana Jones and the Fate of Atlantis: The Lost Dialogue');
    assert.equal(pnp.playerDossiers.length, 3);
    assert.ok(pnp.summary.sealedEnvelopesCount >= 4);

    // Verify Envelope #4 (Lost Dialogue) is marked as a sealed reward with its seal
    const dialoguePage = pnp.allPages.find(p => p.pageId === 'sheet-envelope_lost_dialogue');
    assert.ok(dialoguePage);
    assert.equal(dialoguePage.isSealedReward, true);
    assert.equal(dialoguePage.verificationSeal, '♈︎ 99');
  });

  it('should verify intersection solutions with SigilResonanceMatrix', () => {
    const matrix = new SigilResonanceMatrix('ATLANTIS-1939');

    // Register the horned figurine intersection puzzle
    const puzzle = fateOfAtlantisManifest.nodes['puzzle_horned_figurine'];
    assert.ok(puzzle?.puzzle);

    matrix.registerPuzzle(
      'puzzle_horned_figurine',
      puzzle.puzzle.lockSigil,
      puzzle.puzzle.solutionKey.join(''),
      '♈︎ 84',
      'Envelope #1 (Orichalcum Bead)',
      puzzle.puzzle.inputConfig?.orderMode
    );

    // Unordered input: reverse order of common symbols must match!
    const reverseSolution = [...puzzle.puzzle.solutionKey].reverse();
    const res = matrix.verify('puzzle_horned_figurine', reverseSolution);
    assert.equal(res.valid, true);
    assert.equal(res.seal, '♈︎ 84');
    assert.equal(res.targetEnvelope, 'Envelope #1 (Orichalcum Bead)');
  });
});
