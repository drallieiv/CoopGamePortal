import { Injectable, signal, computed } from '@angular/core';

export type AssetStage = 'sketch' | 'draft' | 'final';

export interface AssetItem {
  id: string;
  name: string;
  type: 'vector' | 'raster';
  stage: AssetStage;
  nodeId?: string;
  svgContent?: string;
  figmaLayers?: string[];
  notes?: string;
  updatedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class AssetService {
  protected readonly _assets = signal<AssetItem[]>([]);
  protected readonly _stageFilter = signal<'all' | AssetStage>('all');

  readonly assets = computed(() => this._assets());
  readonly stageFilter = computed(() => this._stageFilter());

  readonly filteredAssets = computed(() => {
    const filter = this._stageFilter();
    const list = this._assets();
    if (filter === 'all') {
      return list;
    }
    return list.filter(a => a.stage === filter);
  });

  readonly stats = computed(() => {
    const list = this._assets();
    const sketch = list.filter(a => a.stage === 'sketch').length;
    const draft = list.filter(a => a.stage === 'draft').length;
    const final = list.filter(a => a.stage === 'final').length;
    return {
      total: list.length,
      sketch,
      draft,
      final,
      isProductionReady: list.length > 0 && sketch === 0 && draft === 0
    };
  });

  setFilter(filter: 'all' | AssetStage): void {
    this._stageFilter.set(filter);
  }

  addAsset(data: {
    name: string;
    type?: 'vector' | 'raster';
    stage?: AssetStage;
    nodeId?: string;
    svgContent?: string;
    figmaLayers?: string[];
    notes?: string;
  }): AssetItem {
    const asset: AssetItem = {
      id: `asset-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: data.name,
      type: data.type ?? 'vector',
      stage: data.stage ?? 'sketch',
      nodeId: data.nodeId,
      svgContent: data.svgContent,
      figmaLayers: data.figmaLayers ?? [],
      notes: data.notes,
      updatedAt: Date.now()
    };

    this._assets.update(list => [...list, asset]);
    return asset;
  }

  updateStage(id: string, stage: AssetStage): void {
    this._assets.update(list =>
      list.map(a => (a.id === id ? { ...a, stage, updatedAt: Date.now() } : a))
    );
  }

  linkToNode(assetId: string, nodeId?: string): void {
    this._assets.update(list =>
      list.map(a => (a.id === assetId ? { ...a, nodeId, updatedAt: Date.now() } : a))
    );
  }

  deleteAsset(id: string): void {
    this._assets.update(list => list.filter(a => a.id !== id));
  }

  importFigmaSvg(svgText: string, name: string): AssetItem {
    // Parse SVG layer IDs (e.g. id="lock-sigil", id="background", id="wire-frame")
    const layerRegex = /id=["']([^"']+)["']/g;
    const layers: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = layerRegex.exec(svgText)) !== null) {
      if (match[1] && !layers.includes(match[1])) {
        layers.push(match[1]);
      }
    }

    // Determine initial stage: if layers or text contain "sketch" or "wireframe", tag as sketch
    const isSketch = svgText.toLowerCase().includes('sketch') || svgText.toLowerCase().includes('wireframe');
    const stage: AssetStage = isSketch ? 'sketch' : 'draft';

    return this.addAsset({
      name,
      type: 'vector',
      stage,
      svgContent: svgText,
      figmaLayers: layers,
      notes: `Imported with ${layers.length} Figma layers`
    });
  }
}
