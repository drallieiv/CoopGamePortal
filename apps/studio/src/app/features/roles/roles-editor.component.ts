import {
  Component,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraphService } from '../../services/graph.service.js';

@Component({
  selector: 'app-roles-editor',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="roles-editor-root">
      <div class="editor-header">
        <div>
          <h2>👥 Player Roles & Distribution Matrix</h2>
          <p class="subtitle">
            Define asymmetric character roles with confidential dossiers and specify how they are grouped for different player counts.
          </p>
        </div>
        <button class="btn-primary" (click)="addNewRole()">+ Add Role</button>
      </div>

      <div class="roles-layout">
        <!-- Left: Roles List & Private Dossiers -->
        <section class="roles-section">
          <h3>Defined Roles ({{ graphService.roles().length }})</h3>
          
          <div class="roles-list">
            @for (role of graphService.roles(); track role.id) {
              <div class="role-card">
                <div class="role-card-header">
                  <input
                    type="text"
                    class="role-name-input"
                    [ngModel]="role.name"
                    (ngModelChange)="graphService.updateRole(role.id, { name: $event })"
                  />
                  <button class="btn-delete" (click)="graphService.deleteRole(role.id)" [disabled]="graphService.roles().length <= 1">✕</button>
                </div>

                <div class="role-body">
                  <label>Role ID (Slug): <span class="slug">{{ role.id }}</span></label>
                  
                  <div class="dossiers-group">
                    <label>Exclusive Private Dossiers (comma-separated):</label>
                    <input
                      type="text"
                      placeholder="e.g. star_map, ancient_ciphers"
                      [ngModel]="role.exclusiveDossiers.join(', ')"
                      (ngModelChange)="onDossiersChanged(role.id, $event)"
                    />
                  </div>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Right: Player Count Aggregation Matrix -->
        <section class="matrix-section">
          <h3>Player Count Distribution Rules</h3>
          <p class="hint">How roles are partitioned when fewer players are at the table:</p>

          <div class="matrix-cards">
            <!-- 3 Players -->
            <div class="matrix-card">
              <h4>👥 3 Players Table</h4>
              <div class="slots-container">
                @for (slot of [0, 1, 2]; track slot) {
                  <div class="slot-box">
                    <span class="slot-label">Player Slot {{ slot + 1 }}:</span>
                    <select
                      [ngModel]="getSlotRole('3_players', slot)"
                      (ngModelChange)="setSlotRole('3_players', slot, $event)"
                    >
                      <option value="">-- Select Role --</option>
                      @for (r of graphService.roles(); track r.id) {
                        <option [value]="r.id">{{ r.name }}</option>
                      }
                    </select>
                  </div>
                }
              </div>
            </div>

            <!-- 2 Players -->
            <div class="matrix-card">
              <h4>👥 2 Players Table</h4>
              <div class="slots-container">
                @for (slot of [0, 1]; track slot) {
                  <div class="slot-box">
                    <span class="slot-label">Player Slot {{ slot + 1 }}:</span>
                    <select
                      [ngModel]="getSlotRole('2_players', slot)"
                      (ngModelChange)="setSlotRole('2_players', slot, $event)"
                    >
                      <option value="">-- Select Role --</option>
                      @for (r of graphService.roles(); track r.id) {
                        <option [value]="r.id">{{ r.name }}</option>
                      }
                    </select>
                  </div>
                }
              </div>
            </div>

            <!-- 1 Player Solo -->
            <div class="matrix-card">
              <h4>👤 1 Player Solo</h4>
              <p class="solo-note">All active roles are automatically combined into the solo player dossier.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .roles-editor-root { padding: 24px; font-family: system-ui, -apple-system, sans-serif; overflow-y: auto; height: 100%; }
    .editor-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e9ecef; padding-bottom: 16px; margin-bottom: 24px; }
    .editor-header h2 { margin: 0 0 6px 0; color: #1d3557; }
    .subtitle { margin: 0; font-size: 13px; color: #6c757d; }
    .btn-primary { background: #e76f51; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; }

    .roles-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .roles-section h3, .matrix-section h3 { margin: 0 0 16px 0; font-size: 16px; color: #1d3557; }
    .hint { font-size: 13px; color: #6c757d; margin-top: -8px; margin-bottom: 16px; }

    .roles-list { display: flex; flex-direction: column; gap: 16px; }
    .role-card { background: #ffffff; border: 1.5px solid #dee2e6; border-radius: 8px; padding: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.03); }
    .role-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .role-name-input { font-size: 15px; font-weight: bold; color: #1d3557; padding: 6px 10px; border: 1px solid #ced4da; border-radius: 4px; flex: 1; margin-right: 12px; }
    .btn-delete { background: #fee2e2; color: #dc2626; border: none; border-radius: 4px; padding: 6px 10px; cursor: pointer; font-weight: bold; }
    .btn-delete:disabled { opacity: 0.3; cursor: not-allowed; }
    .role-body { display: flex; flex-direction: column; gap: 10px; font-size: 12px; color: #495057; }
    .slug { font-family: monospace; background: #e9ecef; padding: 2px 6px; border-radius: 4px; }
    .dossiers-group input { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #ced4da; border-radius: 4px; font-size: 13px; margin-top: 4px; }

    .matrix-cards { display: flex; flex-direction: column; gap: 16px; }
    .matrix-card { background: #ffffff; border: 1.5px solid #dee2e6; border-radius: 8px; padding: 16px; }
    .matrix-card h4 { margin: 0 0 12px 0; font-size: 14px; color: #0284c7; }
    .slots-container { display: flex; flex-direction: column; gap: 8px; }
    .slot-box { display: flex; align-items: center; gap: 12px; font-size: 13px; }
    .slot-label { font-weight: 600; width: 120px; color: #334155; }
    .slot-box select { flex: 1; padding: 6px 10px; border: 1px solid #ced4da; border-radius: 4px; font-size: 13px; }
    .solo-note { font-size: 13px; color: #059669; font-style: italic; margin: 0; }
  `]
})
export class RolesEditorComponent {
  protected readonly graphService = inject(GraphService);

  addNewRole(): void {
    const count = this.graphService.roles().length + 1;
    this.graphService.addRole(`Investigator Role ${count}`);
  }

  onDossiersChanged(roleId: string, raw: string): void {
    const list = raw.split(',').map(s => s.trim()).filter(Boolean);
    this.graphService.updateRole(roleId, { exclusiveDossiers: list });
  }

  getSlotRole(playerKey: string, slotIdx: number): string {
    const matrix = this.graphService.roleAggregation();
    const slots = matrix[playerKey] ?? [];
    const item = slots[slotIdx];
    if (!item) return '';
    if (Array.isArray(item)) return item[0] ?? '';
    return item.roles?.[0] ?? '';
  }

  setSlotRole(playerKey: string, slotIdx: number, roleId: string): void {
    if (!roleId) return;
    this.graphService.setRoleSlot(playerKey, slotIdx, [roleId]);
  }
}
