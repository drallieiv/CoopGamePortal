import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetService, type AssetStage } from '../../services/asset.service.js';

@Component({
  selector: 'app-asset-manager',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="asset-manager-root">
      <!-- Header & Stats Bar -->
      <div class="manager-header">
        <div>
          <h2>Asset Lifecycle Manager</h2>
          <p class="subtitle">Bridge game design graybox sketches with artist production SVG deliverables.</p>
        </div>

        <div class="stats-pills">
          <div class="stat-pill">
            <span class="count">{{ assetService.stats().total }}</span>
            <span class="label">Total</span>
          </div>
          <div class="stat-pill sketch">
            <span class="count">{{ assetService.stats().sketch }}</span>
            <span class="label">Sketches</span>
          </div>
          <div class="stat-pill draft">
            <span class="count">{{ assetService.stats().draft }}</span>
            <span class="label">Drafts</span>
          </div>
          <div class="stat-pill final">
            <span class="count">{{ assetService.stats().final }}</span>
            <span class="label">Final Art</span>
          </div>
          <div
            class="production-badge"
            [class.ready]="assetService.stats().isProductionReady"
            [class.in-progress]="!assetService.stats().isProductionReady"
          >
            {{ assetService.stats().isProductionReady ? '✨ Production Ready' : '🎨 Art in Progress' }}
          </div>
        </div>
      </div>

      <!-- Action & Filter Bar -->
      <div class="toolbar">
        <div class="filter-tabs">
          <button
            class="filter-btn"
            [class.active]="assetService.stageFilter() === 'all'"
            (click)="assetService.setFilter('all')"
          >
            All ({{ assetService.stats().total }})
          </button>
          <button
            class="filter-btn"
            [class.active]="assetService.stageFilter() === 'sketch'"
            (click)="assetService.setFilter('sketch')"
          >
            ✏️ Sketches ({{ assetService.stats().sketch }})
          </button>
          <button
            class="filter-btn"
            [class.active]="assetService.stageFilter() === 'draft'"
            (click)="assetService.setFilter('draft')"
          >
            📐 Drafts ({{ assetService.stats().draft }})
          </button>
          <button
            class="filter-btn"
            [class.active]="assetService.stageFilter() === 'final'"
            (click)="assetService.setFilter('final')"
          >
            🖼️ Final Art ({{ assetService.stats().final }})
          </button>
        </div>

        <button class="btn-import" (click)="toggleImportModal()">
          📥 Import Figma SVG
        </button>
      </div>

      <!-- Figma SVG Import Box -->
      @if (showImportBox()) {
        <div class="import-card">
          <h4>Import Vector / Figma SVG Asset</h4>
          <input
            type="text"
            placeholder="Asset Name (e.g. Antechamber Basalt Gate)"
            [ngModel]="importName()"
            (ngModelChange)="importName.set($event)"
          />
          <textarea
            placeholder="Paste raw SVG markup from Figma here..."
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
        @for (asset of assetService.filteredAssets(); track asset.id) {
          <div class="asset-card" [attr.data-stage]="asset.stage">
            <div class="card-header">
              <span class="stage-tag" [class]="asset.stage">{{ asset.stage | uppercase }}</span>
              <button class="btn-delete" (click)="assetService.deleteAsset(asset.id)">✕</button>
            </div>

            <div class="preview-area">
              @if (asset.svgContent) {
                <div class="svg-thumb" [innerHTML]="asset.svgContent"></div>
              } @else {
                <div class="placeholder-thumb">
                  <span>{{ asset.type === 'vector' ? '📐 Vector' : '🖼️ Raster' }}</span>
                </div>
              }
            </div>

            <div class="card-body">
              <h4 class="asset-title">{{ asset.name }}</h4>
              @if (asset.figmaLayers && asset.figmaLayers.length > 0) {
                <div class="layers-info">
                  <span>Figma Layers:</span>
                  <span class="badge">{{ asset.figmaLayers.length }} layers</span>
                </div>
              }
            </div>

            <div class="card-footer">
              <label>Stage:</label>
              <select
                [ngModel]="asset.stage"
                (ngModelChange)="onStageChanged(asset.id, $event)"
              >
                <option value="sketch">Sketch (Placeholder)</option>
                <option value="draft">Draft (Testing)</option>
                <option value="final">Final (Production)</option>
              </select>
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <p>No assets in this category. Import an SVG or add placeholder sketches to begin.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .asset-manager-root {
      padding: 24px;
      font-family: system-ui, -apple-system, sans-serif;
      color: #212529;
    }
    .manager-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      border-bottom: 1px solid #dee2e6;
      padding-bottom: 16px;
    }
    .manager-header h2 { margin: 0 0 4px 0; font-size: 22px; }
    .subtitle { margin: 0; font-size: 13px; color: #6c757d; }
    .stats-pills { display: flex; gap: 12px; align-items: center; }
    .stat-pill {
      background: #f8f9fa;
      border: 1px solid #ced4da;
      border-radius: 8px;
      padding: 6px 14px;
      text-align: center;
    }
    .stat-pill .count { display: block; font-size: 18px; font-weight: bold; }
    .stat-pill .label { font-size: 11px; text-transform: uppercase; color: #6c757d; }
    .stat-pill.sketch { border-color: #f4a261; color: #e76f51; }
    .stat-pill.draft { border-color: #457b9d; color: #1d3557; }
    .stat-pill.final { border-color: #2a9d8f; color: #2a9d8f; }
    .production-badge {
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: bold;
    }
    .production-badge.ready { background: #d4edda; color: #155724; }
    .production-badge.in-progress { background: #fff3cd; color: #856404; }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .filter-tabs { display: flex; gap: 8px; }
    .filter-btn {
      padding: 8px 16px;
      border-radius: 6px;
      background: #e9ecef;
      border: none;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .filter-btn.active { background: #1d3557; color: #fff; }
    .btn-import {
      padding: 8px 16px;
      background: #2a9d8f;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
    }
    .import-card {
      background: #f8f9fa;
      border: 2px dashed #457b9d;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .import-card h4 { margin: 0; font-size: 16px; }
    .import-card input, .import-card textarea {
      padding: 10px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 13px;
    }
    .import-actions { display: flex; justify-content: flex-end; gap: 12px; }
    .btn-cancel { padding: 6px 14px; background: transparent; border: 1px solid #ced4da; border-radius: 4px; cursor: pointer; }
    .btn-confirm { padding: 6px 14px; background: #1d3557; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
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
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      padding: 10px 14px;
      background: #fafafa;
      border-bottom: 1px solid #eee;
    }
    .stage-tag { font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
    .stage-tag.sketch { background: #ffe8d6; color: #d00000; }
    .stage-tag.draft { background: #e0f2fe; color: #0369a1; }
    .stage-tag.final { background: #dcfce7; color: #15803d; }
    .btn-delete { background: none; border: none; cursor: pointer; color: #adb5bd; }
    .preview-area {
      height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fdfdfd;
      border-bottom: 1px solid #f0f0f0;
      overflow: hidden;
      padding: 8px;
    }
    .svg-thumb { width: 100%; height: 100%; display: flex; justify-content: center; }
    .svg-thumb svg { max-width: 100%; max-height: 100%; }
    .placeholder-thumb { color: #adb5bd; font-size: 14px; }
    .card-body { padding: 12px 14px; flex: 1; }
    .asset-title { margin: 0 0 6px 0; font-size: 15px; }
    .layers-info { font-size: 12px; color: #6c757d; display: flex; justify-content: space-between; }
    .badge { background: #e9ecef; padding: 2px 6px; border-radius: 4px; }
    .card-footer {
      padding: 10px 14px;
      background: #fcfcfc;
      border-top: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }
    .card-footer select { padding: 4px 8px; border-radius: 4px; border: 1px solid #ced4da; }
    .empty-state { grid-column: 1 / -1; padding: 40px; text-align: center; color: #6c757d; }
  `]
})
export class AssetManagerComponent {
  protected readonly assetService = inject(AssetService);

  readonly showImportBox = signal(false);
  readonly importName = signal('');
  readonly importSvg = signal('');

  toggleImportModal(): void {
    this.showImportBox.update(v => !v);
  }

  confirmImport(): void {
    if (this.importSvg() && this.importName()) {
      this.assetService.importFigmaSvg(this.importSvg(), this.importName());
      this.importName.set('');
      this.importSvg.set('');
      this.showImportBox.set(false);
    }
  }

  onStageChanged(id: string, stage: AssetStage): void {
    this.assetService.updateStage(id, stage);
  }
}
