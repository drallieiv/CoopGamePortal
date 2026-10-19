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
import { GraphService } from '../../services/graph.service.js';
import { PnpCompiler, type PnpOutput, type PnpPage } from '@escape-system/pnp-compiler';

export interface DisplayPage extends PnpPage {
  safeSvg: SafeHtml;
}

@Component({
  selector: 'app-pnp-preview',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pnp-preview-root">
      <!-- Toolbar -->
      <div class="preview-toolbar">
        <div class="options-row">
          <div class="opt-group">
            <label>Player Count:</label>
            <select [ngModel]="playerCount()" (ngModelChange)="playerCount.set(+$event)">
              <option [value]="1">1 Player (Solo All Roles)</option>
              <option [value]="2">2 Players (Cartographer vs Engineer)</option>
              <option [value]="3">3 Players</option>
              <option [value]="4">4 Players</option>
            </select>
          </div>

          <div class="opt-group">
            <label>Fold Format:</label>
            <select [ngModel]="foldFormat()" (ngModelChange)="foldFormat.set($event)">
              <option value="french-fold">French Fold (Bi-Fold Quarter Sheet)</option>
              <option value="double-parallel-fold">Double Parallel Fold (Accordion)</option>
            </select>
          </div>

          <div class="opt-group checkbox">
            <label>
              <input
                type="checkbox"
                [ngModel]="includeGrid()"
                (ngModelChange)="includeGrid.set($event)"
              />
              Include Sigil Resonance Matrix
            </label>
          </div>
        </div>

        <div class="export-actions">
          <button class="btn-download" (click)="downloadManifestJson()">
            💾 Export Scenario Manifest JSON
          </button>
        </div>
      </div>

      <!-- Compilation Summary -->
      @if (pnpOutput(); as out) {
        <div class="summary-banner">
          <span>Total Sheets: <strong>{{ out.summary.totalSheets }}</strong></span>
          <span>Common Sheets: <strong>{{ out.summary.commonSheetsCount }}</strong></span>
          <span>Player Dossier Sheets: <strong>{{ out.summary.dossierSheetsCount }}</strong></span>
          <span>Sealed Reward Envelopes: <strong>{{ out.summary.sealedEnvelopesCount }}</strong></span>
        </div>

        <!-- Sheets Grid Preview -->
        <div class="sheets-gallery">
          @for (page of displayPages(); track page.pageId) {
            <div class="sheet-container">
              <div class="sheet-meta">
                <span class="sheet-category" [class]="page.category">{{ page.category | uppercase }}</span>
                <span class="sheet-title">{{ page.title }}</span>
                @if (page.isSealedReward) {
                  <span class="seal-pill">SEAL: {{ page.verificationSeal }}</span>
                }
              </div>

              <div class="sheet-svg-frame" [innerHTML]="page.safeSvg"></div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .pnp-preview-root {
      padding: 24px;
      font-family: system-ui, -apple-system, sans-serif;
      overflow-y: auto;
      height: 100%;
    }
    .preview-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 16px 20px;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .options-row { display: flex; gap: 24px; align-items: center; }
    .opt-group { display: flex; flex-direction: column; gap: 4px; }
    .opt-group.checkbox { flex-direction: row; align-items: center; margin-top: 14px; }
    label { font-size: 12px; font-weight: 600; color: #495057; }
    select { padding: 6px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 13px; }
    .btn-download {
      background: #1d3557;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
    }
    .summary-banner {
      display: flex;
      gap: 24px;
      background: #e0f2fe;
      color: #0369a1;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 13px;
      margin-bottom: 24px;
    }
    .sheets-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
      gap: 24px;
    }
    .sheet-container {
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .sheet-meta {
      padding: 10px 16px;
      background: #fafafa;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }
    .sheet-category { font-weight: bold; padding: 2px 6px; border-radius: 4px; }
    .sheet-category.common { background: #e0f2fe; color: #0369a1; }
    .sheet-category.dossier { background: #fef3c7; color: #92400e; }
    .sheet-category.verification { background: #fee2e2; color: #991b1b; }
    .seal-pill { background: #dcfce7; color: #166534; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
    .sheet-svg-frame {
      padding: 16px;
      background: #fdfdfd;
      display: flex;
      justify-content: center;
      align-items: center;
      max-height: 480px;
      overflow: auto;
    }
    .sheet-svg-frame svg { width: 100%; max-width: 440px; height: auto; }
  `]
})
export class PnpPreviewComponent {
  protected readonly graphService = inject(GraphService);
  protected readonly sanitizer = inject(DomSanitizer);

  readonly playerCount = signal(2);
  readonly foldFormat = signal<'french-fold' | 'double-parallel-fold'>('french-fold');
  readonly includeGrid = signal(true);

  readonly pnpOutput = computed<PnpOutput>(() => {
    const manifest = this.graphService.compileManifest();
    return PnpCompiler.compile(manifest, {
      playerCount: this.playerCount(),
      foldFormat: this.foldFormat(),
      includeVerificationGrid: this.includeGrid()
    });
  });

  readonly displayPages = computed<DisplayPage[]>(() => {
    const out = this.pnpOutput();
    return out.allPages.map(page => ({
      ...page,
      safeSvg: this.sanitizer.bypassSecurityTrustHtml(page.svg)
    }));
  });

  downloadManifestJson(): void {
    const manifest = this.graphService.compileManifest();
    const jsonStr = JSON.stringify(manifest, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${manifest.id}-manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
