import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GraphService } from './graph.service.js';

describe('GraphService (Studio Visual Scenario Node Graph)', () => {
  let service: GraphService;

  beforeEach(() => {
    service = new GraphService();
  });

  it('should initialize with a blank project containing only the starting chamber node', () => {
    assert.equal(service.nodes().length, 1);
    assert.equal(service.transitions().length, 0);
    assert.equal(service.nodes()[0].title, 'Starting Chamber');
    assert.equal(service.nodes()[0].type, 'room');
    assert.equal(service.selectedNodeId(), service.nodes()[0].id);
  });

  it('should add new node and update coordinates', () => {
    const initialCount = service.nodes().length;
    const node = service.addNode({
      type: 'machine',
      title: 'Power Generator',
      x: 50,
      y: 50
    });

    assert.equal(service.nodes().length, initialCount + 1);
    assert.equal(service.selectedNodeId(), node.id);

    service.moveNode(node.id, 250, 400);
    const updated = service.nodes().find(n => n.id === node.id);
    assert.equal(updated?.x, 250);
    assert.equal(updated?.y, 400);
  });

  it('should connect nodes with transition wires and compile valid ScenarioManifest', () => {
    const puzzle = service.addNode({
      type: 'puzzle',
      title: 'Ancient Lock',
      x: 400,
      y: 150
    });

    const startNode = service.nodes()[0];
    service.connectNodes(startNode.id, puzzle.id, 'provide_clue', 'Clue: Keypad');

    assert.equal(service.transitions().length, 1);
    assert.equal(service.transitions()[0].sourceId, startNode.id);
    assert.equal(service.transitions()[0].targetId, puzzle.id);
    assert.equal(service.transitions()[0].revealType, 'provide_clue');

    const manifest = service.compileManifest();
    assert.equal(manifest.title, 'New Scenario');
    assert.ok(manifest.nodes[startNode.id]);
    assert.ok(manifest.nodes[puzzle.id]);
    assert.equal(manifest.nodes[startNode.id].transitions[0].targetNodeId, puzzle.id);
  });

  it('should delete node and remove associated transitions', () => {
    const puzzle = service.addNode({
      type: 'puzzle',
      title: 'Ancient Lock',
      x: 400,
      y: 150
    });

    const startNode = service.nodes()[0];
    service.connectNodes(startNode.id, puzzle.id, 'provide_clue');
    assert.equal(service.transitions().length, 1);

    service.deleteNode(puzzle.id);
    assert.ok(!service.nodes().some(n => n.id === puzzle.id));
    assert.equal(service.transitions().length, 0);
  });

  it('should load full scenario manifest from JSON', () => {
    service.loadManifest({
      id: 'test-scenario',
      version: '1.0.0',
      title: 'Loaded Adventure',
      author: { id: 'a1', name: 'Author' },
      difficulty: 4,
      playerCount: { min: 1, max: 4, recommended: 2 },
      roles: [],
      roleAggregation: {},
      nodes: {
        n1: {
          id: 'n1',
          type: 'room',
          title: 'Room One',
          visibility: { type: 'common' },
          content: { visuals: [], physicalFallback: { format: 'french_fold', label: 'Sheet #1' } },
          transitions: [{ targetNodeId: 'n2', condition: 'on_solve', revealType: 'open_envelope', targetRefId: 'Envelope #2' }]
        },
        n2: {
          id: 'n2',
          type: 'puzzle',
          title: 'Puzzle Two',
          visibility: { type: 'common' },
          content: { visuals: [], physicalFallback: { format: 'card', label: 'Card #1' } },
          transitions: []
        }
      },
      initialState: { unlockedNodeIds: ['n1'], solvedPuzzleIds: [], activeDossiers: [], inventory: [] },
      seedConfig: { defaultSeed: 'TEST-SEED' }
    });

    assert.equal(service.scenarioTitle(), 'Loaded Adventure');
    assert.equal(service.nodes().length, 2);
    assert.equal(service.transitions().length, 1);
  });
});
