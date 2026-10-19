import { Injectable, signal, computed } from '@angular/core';

export type AssetStage = 'sketch' | 'draft' | 'final';
export type AssetType = 'vector' | 'raster' | 'audio';

export interface AssetItem {
  id: string;
  name: string;
  type: AssetType;
  stage: AssetStage;
  svgContent?: string;
  vectorLayers?: string[];
  externalUrl?: string;
  notes?: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AssetService {
  protected readonly _assets = signal<AssetItem[]>([]);

  readonly assets = computed(() => this._assets());

  readonly assetStats = computed(() => {
    const list = this._assets();
    return {
      total: list.length,
      sketch: list.filter((a) => a.stage === 'sketch').length,
      draft: list.filter((a) => a.stage === 'draft').length,
      final: list.filter((a) => a.stage === 'final').length
    };
  });

  addAsset(data: {
    name: string;
    type: AssetType;
    stage?: AssetStage;
    svgContent?: string;
    vectorLayers?: string[];
    externalUrl?: string;
    notes?: string;
  }): AssetItem {
    const asset: AssetItem = {
      id: 'asset_' + Math.floor(Math.random() * 90000 + 10000),
      name: data.name,
      type: data.type,
      stage: data.stage ?? 'sketch',
      svgContent: data.svgContent,
      vectorLayers: data.vectorLayers ?? [],
      externalUrl: data.externalUrl,
      notes: data.notes,
      updatedAt: new Date().toISOString()
    };

    this._assets.update((list) => [asset, ...list]);
    return asset;
  }

  updateStage(id: string, stage: AssetStage): void {
    this._assets.update((list) =>
      list.map((a) =>
        a.id === id ? { ...a, stage, updatedAt: new Date().toISOString() } : a
      )
    );
  }

  deleteAsset(id: string): void {
    this._assets.update((list) => list.filter((a) => a.id !== id));
  }

  importVectorSvg(svgText: string, name: string): AssetItem {
    const layerRegex = /id="([^"]+)"/g;
    const layers: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = layerRegex.exec(svgText)) !== null) {
      if (match[1] && !match[1].startsWith('svg')) {
        layers.push(match[1]);
      }
    }

    const stage: AssetStage = layers.some(
      (l) => l.includes('sketch') || l.includes('wireframe') || l.includes('rough')
    )
      ? 'sketch'
      : 'draft';

    return this.addAsset({
      name,
      type: 'vector',
      stage,
      svgContent: svgText,
      vectorLayers: layers,
      notes: `Imported with ${layers.length} vector layers`
    });
  }
}
