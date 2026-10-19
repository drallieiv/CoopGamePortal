import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { AssetService, type AssetStage, type AssetItem } from '../../services/asset.service.js';

export interface DisplayAssetItem extends AssetItem {
  safeSvg?: SafeHtml;
}

@Component({
  selector: 'app-asset-manager',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="asset-manager-root">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="stage-filters">
          <button
            class="filter-btn"
            [class.active]="selectedFilter() === 'all'"
            (click)="selectedFilter.set('all')"
          >
            All Assets ({{ assetService.assetStats().total }})
          </button>
          <button
            class="filter-btn"
            [class.active]="selectedFilter() === 'sketch'"
            (click)="selectedFilter.set('sketch')"
          >
            ✏️ Sketches ({{ assetService.assetStats().sketch }})
          </button>
          <button
            class="filter-btn"
            [class.active]="selectedFilter() === 'draft'"
            (click)="selectedFilter.set('draft')"
          >
            📐 Drafts ({{ assetService.assetStats().draft }})
          </button>
          <button
            class="filter-btn"
            [class.active]="selectedFilter() === 'final'"
            (click)="selectedFilter.set('final')"
          >
            🖼️ Final Art ({{ assetService.assetStats().final }})
          </button>
        </div>

        <button class="btn-import" (click)="toggleImportModal()">
          📥 Import Vector SVG
        </button>
      </div>

      <!-- Vector SVG Import Box -->
      @if (showImportBox()) {
        <div class="import-card">
          <h4>Import Vector SVG Asset</h4>
          <input
            type="text"
            placeholder="Asset Name (e.g. Antechamber Basalt Gate)"
            [ngModel]="importName()"
            (ngModelChange)="importName.set($event)"
          />
          <textarea
            placeholder="Paste raw vector SVG markup here..."
            rows="4"
            [ngModel]="importSvg()"
            (ngModelChange)="importSvg.set($event)"
          ></textarea>
          <div class="import-actions">
            <button class="btn-cancel" (click)="toggleImportModal()">Cancel</button>
            <button class="btn-confirm" (click)="confirmImport()">Process Layers & Save</button>
          </div>
        </div>
      }

      <!-- Asset Grid -->
      <div class="asset-grid">
        @for (asset of filteredAssets(); track asset.id) {
          <div class="asset-card" [attr.data-stage]="asset.stage">
            <div class="card-header">
              <span class="stage-tag" [class]="asset.stage">{{ asset.stage | uppercase }}</span>
              <button class="btn-delete" (click)="assetService.deleteAsset(asset.id)">✕</button>
            </div>

            <div class="preview-area">
              @if (asset.safeSvg) {
                <div class="svg-thumb" [innerHTML]="asset.safeSvg"></div>
              } @else {
                <div class="placeholder-thumb">
                  <span>{{ asset.type === 'vector' ? '📐 Vector' : '🖼️ Raster' }}</span>
                </div>
              }
            </div>

            <div class="card-body">
              <h4 class="asset-title">{{ asset.name }}</h4>
              @if (asset.vectorLayers && asset.vectorLayers.length > 0) {
                <div class="layers-info">
                  <span>Vector Layers:</span>
                  <span class="badge">{{ asset.vectorLayers.length }} layers</span>
                </div>
              }

              <!-- Stage Pipeline Dropdown -->
              <div class="stage-selector">
                <label>Asset Stage:</label>
                <select
                  [ngModel]="asset.stage"
                  (ngModelChange)="assetService.updateStage(asset.id, $event)"
                >
                  <option value="sketch">✏️ Sketch (Placeholder)</option>
                  <option value="draft">📐 Draft (In Review)</option>
                  <option value="final">🖼️ Final (Production)</option>
                </select>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .asset-manager-root {
      padding: 24px;
      font-family: system-ui, -apple-system, sans-serif;
      overflow-y: auto;
      height: 100%;
    }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      background: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
      border: 1px solid #dee2e6;
    }
    .stage-filters { display: flex; gap: 8px; }
    .filter-btn {
      background: #f8f9fa;
      border: 1px solid #ced4da;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
      font-weight: 500;
    }
    .filter-btn.active {
      background: #1d3557;
      color: #ffffff;
      border-color: #1d3557;
    }
    .btn-import {
      background: #2a9d8f;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
    }
    .import-card {
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .import-card h4 { margin: 0; color: #1d3557; }
    .import-card input, .import-card textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 12px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .import-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .btn-cancel { background: #f8f9fa; border: 1px solid #ced4da; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
    .btn-confirm { background: #2a9d8f; color: #fff; border: none; padding: 6px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; }

    .asset-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 20px;
    }
    .asset-card {
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #fafafa;
      border-bottom: 1px solid #eee;
    }
    .stage-tag {
      font-size: 10px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .stage-tag.sketch { background: #fee2e2; color: #b91c1c; }
    .stage-tag.draft { background: #fef3c7; color: #b45309; }
    .stage-tag.final { background: #dcfce7; color: #15803d; }
    .btn-delete { background: none; border: none; color: #999; cursor: pointer; font-size: 14px; }
    .btn-delete:hover { color: #dc3545; }

    .preview-area {
      height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fdfdfd;
      border-bottom: 1px solid #eee;
      padding: 10px;
    }
    .svg-thumb svg { max-width: 100%; max-height: 130px; }
    .placeholder-thumb { color: #aaa; font-size: 13px; font-weight: bold; }

    .card-body { padding: 14px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
    .asset-title { margin: 0; font-size: 14px; color: #212529; }
    .layers-info { display: flex; justify-content: space-between; font-size: 12px; color: #6c757d; }
    .badge { background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .stage-selector { margin-top: auto; display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
    .stage-selector select { padding: 6px; border: 1px solid #ced4da; border-radius: 4px; font-size: 12px; }
  `]
})
export class AssetManagerComponent {
  protected readonly assetService = inject(AssetService);
  protected readonly sanitizer = inject(DomSanitizer);

  readonly selectedFilter = signal<'all' | AssetStage>('all');
  readonly showImportBox = signal(false);
  readonly importName = signal('');
  readonly importSvg = signal('');

  readonly filteredAssets = computed<DisplayAssetItem[]>(() => {
    const filter = this.selectedFilter();
    const list = this.assetService.assets();
    const filtered = filter === 'all' ? list : list.filter((a) => a.stage === filter);

    return filtered.map((asset) => ({
      ...asset,
      safeSvg: asset.svgContent ? this.sanitizer.bypassSecurityTrustHtml(asset.svgContent) : undefined
    }));
  });

  toggleImportModal(): void {
    this.showImportBox.update((v) => !v);
  }

  confirmImport(): void {
    if (!this.importName().trim() || !this.importSvg().trim()) {
      return;
    }
    this.assetService.importVectorSvg(this.importSvg(), this.importName());
    this.importName.set('');
    this.importSvg.set('');
    this.showImportBox.set(false);
  }
}
