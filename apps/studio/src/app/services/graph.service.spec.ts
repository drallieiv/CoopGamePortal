import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GraphService } from './graph.service.js';

describe('GraphService (Studio Visual Scenario Node Graph)', () => {
  let service: GraphService;

  beforeEach(() => {
    service = new GraphService();
  });

  it('should initialize with default nodes and chained transitions', () => {
    assert.equal(service.nodes().length, 4);
    assert.equal(service.transitions().length, 3);

    // Verify chained reward types
    const clueWire = service.transitions().find(t => t.revealType === 'provide_clue');
    const envelopeWire = service.transitions().find(t => t.revealType === 'open_envelope');

    assert.ok(clueWire, 'Must have transition providing clue');
    assert.ok(envelopeWire, 'Must have transition opening envelope');
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

  it('should compile valid ScenarioManifest ready for Hub publishing', () => {
    const manifest = service.compileManifest();

    assert.equal(manifest.title, 'The Pharaohs Crypt');
    assert.ok(manifest.nodes);
    assert.ok(Object.keys(manifest.nodes).length >= 4);

    // Verify lock puzzle has transition to sealed envelope
    const lockNode = Object.values(manifest.nodes).find(n => n.title.includes('Anubis'));
    assert.ok(lockNode);
    assert.equal(lockNode!.transitions[0]?.revealType, 'open_envelope');
  });

  it('should delete node and remove associated transitions', () => {
    const initialTransitions = service.transitions().length;
    const lockNode = service.nodes().find(n => n.title.includes('Anubis'));
    assert.ok(lockNode);

    service.deleteNode(lockNode!.id);

    assert.ok(!service.nodes().some(n => n.id === lockNode!.id));
    assert.ok(service.transitions().length < initialTransitions);
  });
});
