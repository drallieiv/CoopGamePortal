import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphService } from './services/graph.service.js';
import { NodeCanvasComponent } from './features/graph/node-canvas.component.js';
import { NodeInspectorComponent } from './features/graph/node-inspector.component.js';
import { AssetManagerComponent } from './features/assets/asset-manager.component.js';
import { PnpPreviewComponent } from './features/preview/pnp-preview.component.js';
import { ProceduralPreviewComponent } from './features/generators/procedural-preview.component.js';
import type { NodeType } from '@escape-system/contracts';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    NodeCanvasComponent,
    NodeInspectorComponent,
    AssetManagerComponent,
    PnpPreviewComponent,
    ProceduralPreviewComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="studio-shell">
      <!-- Studio Header -->
      <header class="studio-header">
        <div class="brand">
          <span class="logo">🛠️</span>
          <h1>Escape Studio</h1>
          <span class="project-title">{{ graphService.scenarioTitle() }}</span>
        </div>

        <nav class="nav-tabs">
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'graph'"
            (click)="activeTab.set('graph')"
          >
            🕸️ Visual Scenario Graph
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'assets'"
            (click)="activeTab.set('assets')"
          >
            🎨 Figma Asset Manager
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'generators'"
            (click)="activeTab.set('generators')"
          >
            ⚡ Procedural Preview
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'pnp'"
            (click)="activeTab.set('pnp')"
          >
            📄 Print & Play Preview
          </button>
        </nav>
      </header>

      <!-- Main Workspace -->
      <main class="studio-workspace">
        @switch (activeTab()) {
          @case ('graph') {
            <div class="graph-layout">
              <div class="canvas-wrapper">
                <div class="canvas-controls">
                  <span class="controls-label">Add Node:</span>
                  <button class="btn-add room" (click)="addNode('room')">+ Room</button>
                  <button class="btn-add puzzle" (click)="addNode('puzzle')">+ Puzzle</button>
                  <button class="btn-add item" (click)="addNode('item')">+ Item</button>
                  <button class="btn-add machine" (click)="addNode('machine')">+ Machine</button>
                  <button class="btn-add dossier" (click)="addNode('dossier')">+ Dossier</button>
                </div>
                <app-node-canvas />
              </div>
              <app-node-inspector />
            </div>
          }
          @case ('assets') {
            <app-asset-manager />
          }
          @case ('generators') {
            <app-procedural-preview />
          }
          @case ('pnp') {
            <app-pnp-preview />
          }
        }
      </main>
    </div>
  `,
  styles: [`
    .studio-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
      overflow: hidden;
    }
    .studio-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 24px;
      background: #1d3557;
      color: #fff;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand h1 { margin: 0; font-size: 18px; font-weight: bold; }
    .logo { font-size: 20px; }
    .project-title {
      font-size: 13px;
      background: rgba(255, 255, 255, 0.15);
      padding: 2px 8px;
      border-radius: 4px;
      color: #f1faee;
    }
    .nav-tabs { display: flex; gap: 8px; }
    .tab-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: #e76f51;
      border-color: #e76f51;
      font-weight: bold;
    }
    .studio-workspace { flex: 1; overflow: hidden; display: flex; }
    .graph-layout { display: flex; width: 100%; height: 100%; }
    .canvas-wrapper { flex: 1; display: flex; flex-direction: column; position: relative; }
    .canvas-controls {
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      padding: 8px 12px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      border: 1px solid #ced4da;
    }
    .controls-label { font-size: 12px; font-weight: bold; color: #495057; }
    .btn-add {
      border: none;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      color: #fff;
      cursor: pointer;
    }
    .btn-add.room { background: #1d3557; }
    .btn-add.puzzle { background: #7209b7; }
    .btn-add.item { background: #2a9d8f; }
    .btn-add.machine { background: #f4a261; }
    .btn-add.dossier { background: #3a86ff; }
  `]
})
export class AppComponent {
  protected readonly graphService = inject(GraphService);

  readonly activeTab = signal<'graph' | 'assets' | 'pnp' | 'generators'>('graph');

  addNode(type: NodeType): void {
    const defaultTitles: Record<NodeType, string> = {
      room: 'New Chamber',
      puzzle: 'New Lock Puzzle',
      item: 'Ancient Artifact',
      machine: 'Terminal Widget',
      dossier: 'Confidential Dossier',
      narrative: 'Story Scene'
    };

    this.graphService.addNode({
      type,
      title: defaultTitles[type],
      x: 200 + Math.floor(Math.random() * 200),
      y: 150 + Math.floor(Math.random() * 200)
    });
  }
}
