import { Injectable, signal, computed } from '@angular/core';
import type {
  ScenarioManifest,
  ScenarioNode,
  NodeType,
  VisibilityScope,
  RevealType,
  PuzzleInputConfig,
  RoleDefinition,
  RoleAggregationMatrix
} from '@escape-system/contracts';
import { SYMBOL_PRESETS } from '@escape-system/contracts';

export interface StudioNode {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
  zoneId?: string;
  assetId?: string;
  assetSvg?: string;
  narrativeText?: string;
  lockSigil?: string;
  solutionKey?: string[];
  hints?: [string, string, string];
  inputConfig?: PuzzleInputConfig;
  targetNodeId?: string;
  revealType?: RevealType;
  targetRefId?: string;
  visibility: VisibilityScope;
  combineSourceAId?: string;
  combineSourceBId?: string;
  combineCommonCount?: 2 | 3;
}

export interface StudioTransitionWire {
  sourceId: string;
  targetId: string;
  revealType: RevealType;
  targetRefId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GraphService {
  readonly scenarioTitle = signal('New Scenario');
  readonly scenarioId = signal('new-scenario');
  readonly seed = signal('SEED-01');
  readonly difficulty = signal<1 | 2 | 3 | 4 | 5>(3);

  readonly roles = signal<RoleDefinition[]>([
    { id: 'cartographer', name: 'Cartographer', exclusiveDossiers: ['star_map'] },
    { id: 'engineer', name: 'Engineer', exclusiveDossiers: ['gear_diagrams'] }
  ]);

  readonly roleAggregation = signal<RoleAggregationMatrix>({
    '4_players': [{ roles: ['cartographer'] }, { roles: ['engineer'] }],
    '3_players': [{ roles: ['cartographer'] }, { roles: ['engineer'] }],
    '2_players': [{ roles: ['cartographer'] }, { roles: ['engineer'] }],
    '1_player_solo': [{ roles: ['cartographer', 'engineer'] }]
  });

  protected readonly _nodes = signal<StudioNode[]>([]);
  protected readonly _selectedNodeId = signal<string | null>(null);

  readonly nodes = computed(() => this._nodes());
  readonly selectedNodeId = computed(() => this._selectedNodeId());

  readonly selectedNode = computed(() => {
    const id = this._selectedNodeId();
    if (!id) return null;
    return this._nodes().find(n => n.id === id) ?? null;
  });

  readonly transitions = computed<StudioTransitionWire[]>(() => {
    const list: StudioTransitionWire[] = [];
    for (const node of this._nodes()) {
      if (node.targetNodeId && node.revealType) {
        list.push({
          sourceId: node.id,
          targetId: node.targetNodeId,
          revealType: node.revealType,
          targetRefId: node.targetRefId
        });
      }
    }
    return list;
  });

  constructor() {
    this.seedDefaultNodes();
  }

  addNode(data: {
    type: NodeType;
    title: string;
    x: number;
    y: number;
    visibility?: VisibilityScope;
  }): StudioNode {
    const node: StudioNode = {
      id: 'node_' + Math.floor(Math.random() * 90000 + 10000),
      type: data.type,
      title: data.title,
      x: data.x,
      y: data.y,
      zoneId: 'common_table',
      visibility: data.visibility ?? { type: 'common' }
    };

    if (data.type === 'puzzle') {
      node.lockSigil = '🜲';
      node.solutionKey = ['▲', '●', '◆'];
      node.hints = ['First clue', 'Second insight', 'Complete answer'];
      node.inputConfig = {
        orderMode: 'ordered',
        allowRepetition: false,
        length: 3,
        preset: 'alchemy',
        availableSymbols: SYMBOL_PRESETS.alchemy
      };
    }

    this._nodes.update(list => [...list, node]);
    this._selectedNodeId.set(node.id);
    return node;
  }

  moveNode(id: string, x: number, y: number): void {
    this._nodes.update(list =>
      list.map(n => (n.id === id ? { ...n, x, y } : n))
    );
  }

  selectNode(id: string | null): void {
    this._selectedNodeId.set(id);
  }

  connectNodes(
    sourceId: string,
    targetId: string,
    revealType: RevealType,
    targetRefId?: string
  ): void {
    this._nodes.update(list =>
      list.map(n => {
        if (n.id === sourceId) {
          return {
            ...n,
            targetNodeId: targetId,
            revealType,
            targetRefId: targetRefId ?? (revealType === 'open_envelope' ? `Envelope #${targetId}` : undefined)
          };
        }
        return n;
      })
    );
  }

  updateNode(id: string, updates: Partial<StudioNode>): void {
    this._nodes.update(list =>
      list.map(n => (n.id === id ? { ...n, ...updates } : n))
    );
  }

  deleteNode(id: string): void {
    this._nodes.update(list => {
      return list
        .filter(n => n.id !== id)
        .map(n => (n.targetNodeId === id ? { ...n, targetNodeId: undefined, revealType: undefined } : n));
    });
    if (this._selectedNodeId() === id) {
      this._selectedNodeId.set(null);
    }
  }

  // --- ROLE MANAGEMENT ---
  addRole(name: string): RoleDefinition {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'role_' + Date.now();
    const role: RoleDefinition = { id, name, exclusiveDossiers: [] };
    this.roles.update(list => [...list, role]);
    return role;
  }

  updateRole(id: string, partial: Partial<RoleDefinition>): void {
    this.roles.update(list => list.map(r => r.id === id ? { ...r, ...partial } : r));
  }

  deleteRole(id: string): void {
    this.roles.update(list => list.filter(r => r.id !== id));
  }

  setRoleSlot(playerCountKey: string, slotIndex: number, roleIds: string[]): void {
    this.roleAggregation.update(matrix => {
      const slots = [...(matrix[playerCountKey] ?? [])];
      slots[slotIndex] = { roles: roleIds };
      return { ...matrix, [playerCountKey]: slots };
    });
  }

  compileManifest(): ScenarioManifest {
    const manifestNodes: Record<string, ScenarioNode> = {};

    for (const node of this._nodes()) {
      manifestNodes[node.id] = {
        id: node.id,
        type: node.type,
        title: node.title,
        visibility: node.visibility,
        content: {
          visuals: node.assetSvg ? [{ id: node.assetId ?? 'asset_1', type: 'vector', uri: node.assetSvg }] : [],
          narrativeText: node.narrativeText ?? `Description for ${node.title}`,
          physicalFallback: {
            format: node.revealType === 'open_envelope' ? 'envelope' : 'card',
            label: node.targetRefId ?? node.title
          }
        },
        puzzle: node.type === 'puzzle' ? {
          lockSigil: node.lockSigil ?? '✦',
          solutionKey: node.solutionKey ?? ['A', 'B'],
          hints: node.hints ?? ['Nudge', 'Insight', 'Solution'],
          inputConfig: node.inputConfig
        } : undefined,
        behavior: node.type === 'combine' ? {
          component: 'SymbolIntersection',
          params: {
            itemAId: node.combineSourceAId,
            itemBId: node.combineSourceBId,
            commonCount: node.combineCommonCount ?? 3
          }
        } : undefined,
        transitions: node.targetNodeId && node.revealType ? [{
          targetNodeId: node.targetNodeId,
          condition: 'on_solve',
          revealType: node.revealType,
          targetRefId: node.targetRefId ?? `Ref #${node.targetNodeId}`
        }] : []
      };
    }

    const firstNodeId = this._nodes()[0]?.id ?? 'start';

    return {
      id: this.scenarioId(),
      version: '1.0.0',
      title: this.scenarioTitle(),
      author: { id: 'author-studio', name: 'Studio Designer' },
      difficulty: this.difficulty(),
      playerCount: { min: 1, max: 4, recommended: 3 },
      roles: this.roles(),
      roleAggregation: this.roleAggregation(),
      nodes: manifestNodes,
      initialState: {
        unlockedNodeIds: [firstNodeId],
        solvedPuzzleIds: [],
        activeDossiers: [],
        inventory: []
      },
      seedConfig: { defaultSeed: this.seed() }
    };
  }

  loadManifest(manifest: ScenarioManifest): void {
    if (!manifest || !manifest.nodes) return;
    this.scenarioTitle.set(manifest.title);
    this.scenarioId.set(manifest.id);
    this.difficulty.set((manifest.difficulty ?? 3) as 1 | 2 | 3 | 4 | 5);
    if (manifest.seedConfig?.defaultSeed) {
      this.seed.set(manifest.seedConfig.defaultSeed);
    }
    if (manifest.roles) {
      this.roles.set(manifest.roles);
    }
    if (manifest.roleAggregation) {
      this.roleAggregation.set(manifest.roleAggregation);
    }

    const loadedNodes: StudioNode[] = [];
    let col = 0;

    for (const node of Object.values(manifest.nodes)) {
      const primaryTransition = node.transitions[0];
      loadedNodes.push({
        id: node.id,
        type: node.type,
        title: node.title,
        x: 80 + (col % 4) * 300,
        y: 80 + Math.floor(col / 4) * 220,
        narrativeText: node.content.narrativeText,
        lockSigil: node.puzzle?.lockSigil,
        solutionKey: node.puzzle?.solutionKey,
        hints: node.puzzle?.hints,
        inputConfig: node.puzzle?.inputConfig,
        targetNodeId: primaryTransition?.targetNodeId,
        revealType: primaryTransition?.revealType,
        targetRefId: primaryTransition?.targetRefId,
        visibility: node.visibility,
        combineSourceAId: node.behavior?.params?.itemAId as string | undefined,
        combineSourceBId: node.behavior?.params?.itemBId as string | undefined,
        combineCommonCount: (node.behavior?.params?.commonCount as 2 | 3) ?? 3
      });
      col++;
    }

    this._nodes.set(loadedNodes);
    this._selectedNodeId.set(loadedNodes[0]?.id ?? null);
  }

  protected seedDefaultNodes(): void {
    const entrance = this.addNode({
      type: 'room',
      title: 'Starting Chamber',
      x: 100,
      y: 150,
      visibility: { type: 'common' }
    });
    this.updateNode(entrance.id, {
      narrativeText: 'The adventure begins here. Describe the starting atmosphere, inspectable elements, and initial clues.'
    });
    this._selectedNodeId.set(entrance.id);
  }
}
