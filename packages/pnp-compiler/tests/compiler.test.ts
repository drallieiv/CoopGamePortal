import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PnpCompiler } from '../src/compiler.js';
import { renderFrenchFoldSvg } from '../src/templates/french-fold.js';
import { renderDoubleParallelFoldSvg } from '../src/templates/parallel-fold.js';
import type { ScenarioManifest } from '@escape-system/contracts';

const mockManifest: ScenarioManifest = {
  id: 'manifest-tomb-01',
  version: '1.0.0',
  title: 'The Pharaohs Crypt',
  author: { id: 'auth-1', name: 'Dr. Jones' },
  difficulty: 3,
  playerCount: { min: 1, max: 4, recommended: 3 },
  roles: [
    { id: 'cartographer', name: 'Cartographer', exclusiveDossiers: ['map_sheet'] },
    { id: 'translator', name: 'Translator', exclusiveDossiers: ['rosetta_stone'] },
    { id: 'engineer', name: 'Engineer', exclusiveDossiers: ['gear_schematics'] }
  ],
  roleAggregation: {
    '3_players': [{ roles: ['cartographer'] }, { roles: ['translator'] }, { roles: ['engineer'] }],
    '2_players': [{ roles: ['cartographer', 'translator'] }, { roles: ['engineer'] }],
    '1_player_solo': [{ roles: ['cartographer', 'translator', 'engineer'] }]
  },
  nodes: {
    room_entrance: {
      id: 'room_entrance',
      type: 'room',
      title: 'Tomb Antechamber',
      visibility: { type: 'common' },
      content: {
        visuals: [],
        narrativeText: 'You stand before a heavy basalt door.',
        physicalFallback: { format: 'sheet', label: 'Sheet #1', instructions: 'Place on common table' }
      },
      transitions: []
    },
    puzzle_clue: {
      id: 'puzzle_clue',
      type: 'puzzle',
      title: 'Hieroglyphic Stele',
      visibility: { type: 'role', roleIds: ['translator'] },
      content: {
        visuals: [],
        narrativeText: 'A riddle carved in stone gives part of a combination.',
        physicalFallback: { format: 'card', label: 'Clue Card #A' }
      },
      puzzle: {
        lockSigil: '☽',
        solutionKey: ['RA'],
        hints: ['Translate falcon symbol', 'Sun god name', 'RA']
      },
      // Note: Solving this clue puzzle provides information, but does NOT unlock a sealed physical envelope
      transitions: [{ targetNodeId: 'puzzle_lock', condition: 'on_solve', revealType: 'display_terminal' }]
    },
    puzzle_lock: {
      id: 'puzzle_lock',
      type: 'puzzle',
      title: 'Anubis Lock Mechanism',
      visibility: { type: 'role', roleIds: ['engineer'] },
      content: {
        visuals: [],
        narrativeText: 'Three copper gears must be aligned with the deciphered key.',
        physicalFallback: { format: 'card', label: 'Lock Terminal #B' }
      },
      puzzle: {
        lockSigil: '🜲',
        solutionKey: ['▲', '●', '◆'],
        hints: ['Check gear ratios', 'Count teeth', 'Turn wheel twice']
      },
      // Solving this lock rewards access to the sealed physical Envelope #2 (vault_room)
      transitions: [{ targetNodeId: 'vault_room', condition: 'on_solve', revealType: 'open_envelope', targetRefId: 'Envelope #2' }]
    },
    vault_room: {
      id: 'vault_room',
      type: 'room',
      title: 'Inner Burial Chamber',
      visibility: { type: 'common' },
      content: {
        visuals: [],
        narrativeText: 'The golden sarcophagus glitters before you.',
        physicalFallback: { format: 'envelope', label: 'Envelope #2', sealId: '♈︎ 84' }
      },
      transitions: []
    }
  },
  initialState: { activeNodeIds: ['room_entrance'] },
  seedConfig: { defaultSeed: 'EGYPT-404', allowedGenerators: [] }
};

describe('PnpCompiler & Print & Play Templates', () => {
  it('should render French Fold SVG with bleed margins, crop marks, and mm dimensions', () => {
    const svg = renderFrenchFoldSvg({
      sheetId: 'Envelope #07',
      title: 'Secret Chamber',
      lockSigil: '♈︎',
      verificationSeal: '♈︎ 84',
      interiorTitle: 'Inside the Chamber',
      interiorBody: 'You found the ancient idol.',
      singleSidedNote: 'Write 07 on back'
    });

    assert.ok(svg.includes('width="216mm"'));
    assert.ok(svg.includes('height="303mm"'));
    assert.ok(svg.includes('class="trim-mark"'));
    assert.ok(svg.includes('Envelope #07'));
    assert.ok(svg.includes('♈︎ 84'));
    assert.ok(svg.includes('FRENCH FOLD'));
  });

  it('should render Double Parallel Fold SVG with crop marks and mm dimensions', () => {
    const svg = renderDoubleParallelFoldSvg({
      sheetId: 'Item #03',
      title: 'Folded Map',
      lockSigil: '✦',
      verificationSeal: 'SEAL-MAP',
      interiorTitle: 'Map Layout',
      interiorBody: 'Left quadrant leads to river. Right quadrant leads to ruins.'
    });

    assert.ok(svg.includes('width="303mm"'));
    assert.ok(svg.includes('height="216mm"'));
    assert.ok(svg.includes('class="trim-mark"'));
    assert.ok(svg.includes('DOUBLE PARALLEL FOLD'));
    assert.ok(svg.includes('SEAL-MAP'));
  });

  it('should only place verification seal on rewarded sealed envelope and not on clue puzzles', () => {
    const output = PnpCompiler.compile(mockManifest, {
      playerCount: 2,
      foldFormat: 'french-fold',
      includeVerificationGrid: true
    });

    assert.equal(output.scenarioTitle, 'The Pharaohs Crypt');
    assert.equal(output.playerCount, 2);

    // vault_room is the sealed reward -> must have isSealedReward = true and seal "♈︎ 84"
    const vaultSheet = output.allPages.find(p => p.pageId === 'sheet-vault_room');
    assert.ok(vaultSheet, 'vault sheet must exist');
    assert.equal(vaultSheet.isSealedReward, true);
    assert.equal(vaultSheet.verificationSeal, '♈︎ 84');
    assert.ok(vaultSheet.svg.includes('♈︎ 84'));

    // puzzle_clue gives partial info -> must NOT be a sealed reward and NOT have a verification seal
    const clueSheet = output.allPages.find(p => p.pageId === 'sheet-puzzle_clue');
    assert.ok(clueSheet, 'clue sheet must exist');
    assert.equal(clueSheet.isSealedReward, false);
    assert.equal(clueSheet.verificationSeal, undefined);
    assert.ok(clueSheet.svg.includes('UNSEALED GAME ELEMENT'));

    // Verification matrix sheet must exist and only index puzzle_lock (which unlocked Envelope #2)
    const verificationSheet = output.commonPages.find(p => p.category === 'verification');
    assert.ok(verificationSheet, 'Verification matrix sheet must exist');
    assert.ok(verificationSheet.svg.includes('Verification Matrix'));
    assert.ok(verificationSheet.svg.includes('Envelope #2'));
  });

  it('should correctly partition role dossiers for 2 players (Cartographer+Translator vs Engineer)', () => {
    const output = PnpCompiler.compile(mockManifest, {
      playerCount: 2,
      foldFormat: 'french-fold'
    });

    assert.equal(output.playerDossiers.length, 2);
    // Player 1 has cartographer and translator
    assert.deepEqual(output.playerDossiers[0].roles, ['cartographer', 'translator']);
    // Player 1 receives puzzle_clue (which is restricted to translator)
    assert.ok(output.playerDossiers[0].pages.some(p => p.pageId === 'sheet-puzzle_clue'));

    // Player 2 has engineer
    assert.deepEqual(output.playerDossiers[1].roles, ['engineer']);
    // Player 2 receives puzzle_lock (restricted to engineer)
    assert.ok(output.playerDossiers[1].pages.some(p => p.pageId === 'sheet-puzzle_lock'));
  });
});
