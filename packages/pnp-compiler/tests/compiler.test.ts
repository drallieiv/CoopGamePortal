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
        physicalFallback: { format: 'sheet', instructions: 'Place on common table' }
      },
      transitions: [{ targetNodeId: 'puzzle_lock', condition: 'on_solve', revealType: 'open_envelope', targetRefId: 'Envelope #1' }]
    },
    puzzle_lock: {
      id: 'puzzle_lock',
      type: 'puzzle',
      title: 'Anubis Lock Mechanism',
      visibility: { type: 'role', roleIds: ['engineer'] },
      content: {
        visuals: [],
        narrativeText: 'Three copper gears must be aligned.',
        physicalFallback: { format: 'card', instructions: 'Inspect gear teeth' }
      },
      puzzle: {
        lockSigil: '🜲',
        solutionKey: ['▲', '●', '◆'],
        hints: ['Check gear ratios', 'Count teeth', 'Turn wheel twice']
      },
      transitions: [{ targetNodeId: 'vault', condition: 'on_solve', revealType: 'open_envelope', targetRefId: 'Envelope #2' }]
    }
  },
  initialState: { activeNodeIds: ['room_entrance'] },
  seedConfig: { defaultSeed: 'EGYPT-404', allowedGenerators: [] }
};

describe('PnpCompiler & Print & Play Templates', () => {
  it('should render valid French Fold SVG with fold guidelines and seal box', () => {
    const svg = renderFrenchFoldSvg({
      itemRefId: 'Envelope #07',
      title: 'Secret Chamber',
      lockSigil: '♈︎',
      verificationSeal: 'SEAL-42',
      interiorTitle: 'Inside the Chamber',
      interiorBody: 'You found the ancient idol.',
      singleSidedNote: 'Write 07 on back'
    });

    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('Envelope #07'));
    assert.ok(svg.includes('SEAL-42'));
    assert.ok(svg.includes('FRENCH FOLD SHEET'));
    assert.ok(svg.includes('Write 07 on back'));
  });

  it('should render valid Double Parallel Fold SVG with 4 vertical panels', () => {
    const svg = renderDoubleParallelFoldSvg({
      itemRefId: 'Item #03',
      title: 'Folded Map',
      lockSigil: '✦',
      verificationSeal: 'SEAL-MAP',
      interiorTitle: 'Map Layout',
      interiorBody: 'Left quadrant leads to the river. Right quadrant leads to ruins.'
    });

    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('DOUBLE PARALLEL FOLD'));
    assert.ok(svg.includes('SEAL-MAP'));
    assert.ok(svg.includes('panel-1-front'));
    assert.ok(svg.includes('panel-4-back'));
  });

  it('should compile full scenario into sheets, verification matrix, and player dossiers', () => {
    const output = PnpCompiler.compile(mockManifest, {
      playerCount: 2,
      foldFormat: 'french-fold',
      includeVerificationGrid: true
    });

    assert.equal(output.scenarioTitle, 'The Pharaohs Crypt');
    assert.equal(output.playerCount, 2);
    assert.equal(output.playerDossiers.length, 2);

    // Player 1 has cartographer and translator roles
    assert.deepEqual(output.playerDossiers[0].roles, ['cartographer', 'translator']);
    // Player 2 has engineer role
    assert.deepEqual(output.playerDossiers[1].roles, ['engineer']);

    // Engineer should have the puzzle_lock in their dossier
    assert.equal(output.playerDossiers[1].pages.length, 1);
    assert.equal(output.playerDossiers[1].pages[0].pageId, 'sheet-puzzle_lock');

    // Verification matrix sheet must be included in common pages
    const verificationSheet = output.commonPages.find(p => p.category === 'verification');
    assert.ok(verificationSheet, 'Verification matrix sheet must exist');
    assert.ok(verificationSheet.svg.includes('Verification Matrix'));
  });

  it('should compile with Double Parallel Fold when configured', () => {
    const output = PnpCompiler.compile(mockManifest, {
      playerCount: 3,
      foldFormat: 'double-parallel-fold',
      includeVerificationGrid: false
    });

    assert.equal(output.foldFormat, 'double-parallel-fold');
    const firstSheet = output.allPages[0];
    assert.ok(firstSheet.svg.includes('DOUBLE PARALLEL FOLD'));
  });
});
