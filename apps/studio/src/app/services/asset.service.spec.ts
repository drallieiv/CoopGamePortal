import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AssetService } from './asset.service.js';

describe('AssetService (Figma-friendly Asset Lifecycle)', () => {
  let service: AssetService;

  beforeEach(() => {
    service = new AssetService();
  });

  it('should initialize with empty assets and correct stats', () => {
    assert.equal(service.assets().length, 0);
    assert.deepEqual(service.stats(), {
      total: 0,
      sketch: 0,
      draft: 0,
      final: 0,
      isProductionReady: false
    });
  });

  it('should add asset with sketch stage and update stage to final', () => {
    const asset = service.addAsset({
      name: 'Vault Door Sketch',
      type: 'vector',
      stage: 'sketch'
    });

    assert.equal(service.assets().length, 1);
    assert.equal(service.stats().sketch, 1);
    assert.equal(service.stats().isProductionReady, false);

    service.updateStage(asset.id, 'final');
    assert.equal(service.stats().final, 1);
    assert.equal(service.stats().sketch, 0);
    assert.equal(service.stats().isProductionReady, true);
  });

  it('should parse Figma SVG layers and auto-tag sketch markers', () => {
    const figmaSvg = `<svg xmlns="http://www.w3.org/2000/svg">
      <g id="background-plate"><rect /></g>
      <g id="lock-sigil"><circle /></g>
      <g id="rough-wireframe-lines"><line /></g>
    </svg>`;

    const imported = service.importFigmaSvg(figmaSvg, 'Crypt Door Frame');

    assert.equal(imported.stage, 'sketch', 'Should be tagged as sketch due to wireframe keyword');
    assert.deepEqual(imported.figmaLayers, ['background-plate', 'lock-sigil', 'rough-wireframe-lines']);
  });

  it('should filter assets by stage correctly', () => {
    service.addAsset({ name: 'A1', stage: 'sketch' });
    service.addAsset({ name: 'A2', stage: 'draft' });
    service.addAsset({ name: 'A3', stage: 'final' });

    assert.equal(service.filteredAssets().length, 3);

    service.setFilter('draft');
    assert.equal(service.filteredAssets().length, 1);
    assert.equal(service.filteredAssets()[0].name, 'A2');

    service.setFilter('final');
    assert.equal(service.filteredAssets().length, 1);
    assert.equal(service.filteredAssets()[0].name, 'A3');
  });
});
