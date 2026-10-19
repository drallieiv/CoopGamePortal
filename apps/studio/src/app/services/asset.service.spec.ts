import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AssetService } from './asset.service.js';

describe('AssetService (Vector Asset Lifecycle)', () => {
  let service: AssetService;

  beforeEach(() => {
    service = new AssetService();
  });

  it('should initialize with empty assets and correct stats', () => {
    assert.equal(service.assets().length, 0);
    assert.deepEqual(service.assetStats(), {
      total: 0,
      sketch: 0,
      draft: 0,
      final: 0
    });
  });

  it('should add asset with sketch stage and update stage to final', () => {
    const asset = service.addAsset({
      name: 'Crypt Door Sketch',
      type: 'vector',
      stage: 'sketch',
      notes: 'Initial rough sketch'
    });

    assert.equal(service.assets().length, 1);
    assert.equal(service.assetStats().sketch, 1);

    service.updateStage(asset.id, 'final');
    const updated = service.assets().find((a) => a.id === asset.id);
    assert.equal(updated?.stage, 'final');
    assert.equal(service.assetStats().final, 1);
    assert.equal(service.assetStats().sketch, 0);
  });

  it('should parse SVG layers and auto-tag sketch markers', () => {
    const vectorSvg = `<svg xmlns="http://www.w3.org/2000/svg">
      <g id="background-plate"><rect width="100" height="100"/></g>
      <g id="lock-sigil"><circle cx="50" cy="50" r="20"/></g>
      <g id="rough-wireframe-lines"><path d="M 10 10 L 90 90"/></g>
    </svg>`;

    const imported = service.importVectorSvg(vectorSvg, 'Crypt Door Frame');

    assert.equal(imported.stage, 'sketch', 'Should detect rough wireframe layer');
    assert.deepEqual(imported.vectorLayers, ['background-plate', 'lock-sigil', 'rough-wireframe-lines']);
  });

  it('should filter assets by stage correctly', () => {
    service.addAsset({ name: 'Sketch A', type: 'vector', stage: 'sketch' });
    service.addAsset({ name: 'Draft B', type: 'vector', stage: 'draft' });
    service.addAsset({ name: 'Final C', type: 'vector', stage: 'final' });

    assert.equal(service.assetStats().total, 3);
    assert.equal(service.assetStats().sketch, 1);
    assert.equal(service.assetStats().draft, 1);
    assert.equal(service.assetStats().final, 1);
  });
});
