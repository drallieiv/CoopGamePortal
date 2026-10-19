import { Injectable, signal, computed } from '@angular/core';
import type {
  ScenarioManifest,
  ScenarioNode,
  NodeType,
  VisibilityScope,
  RevealType,
  PuzzleInputConfig
} from '@escape-system/contracts';
import { SYMBOL_PRESETS } from '@escape-system/contracts';

export interface StudioNode {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
  narrativeText?: string;
  lockSigil?: string;
  solutionKey?: string[];
  hints?: [string, string, string];
  inputConfig?: PuzzleInputConfig;
  targetNodeId?: string;
  revealType?: RevealType;
  targetRefId?: string;
  visibility: VisibilityScope;
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
  readonly scenarioTitle = signal('The Pharaohs Crypt');
  readonly scenarioId = signal('pharaoh-crypt-studio');
  readonly seed = signal('EGYPT-STUDIO-01');
  readonly difficulty = signal<1 | 2 | 3 | 4 | 5>(3);

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

  selectNode(id: string | null): void {
    this._selectedNodeId.set(id);
  }

  addNode(data: {
    type: NodeType;
    title: string;
    x: number;
    y: number;
    visibility?: VisibilityScope;
  }): StudioNode {
    const node: StudioNode = {
      id: `node-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      type: data.type,
      title: data.title,
      x: data.x,
      y: data.y,
      visibility: data.visibility ?? { type: 'common' },
      hints: ['First clue hint', 'Second deduction hint', 'Full solution']
    };

    this._nodes.update(list => [...list, node]);
    this._selectedNodeId.set(node.id);
    return node;
  }

  moveNode(id: string, x: number, y: number): void {
    this._nodes.update(list =>
      list.map(n => (n.id === id ? { ...n, x: Math.round(x), y: Math.round(y) } : n))
    );
  }

  connectNodes(
    sourceId: string,
    targetId: string,
    revealType: RevealType = 'open_envelope',
    targetRefId?: string
  ): void {
    this._nodes.update(list =>
      list.map(n => {
        if (n.id === sourceId) {
          return {
            ...n,
            targetNodeId: targetId,
            revealType,
            targetRefId: targetRefId ?? (revealType === 'open_envelope' ? `Envelope #${targetId.slice(0, 4)}` : undefined)
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
      // Remove node and clear transitions pointing to it
      return list
        .filter(n => n.id !== id)
        .map(n => (n.targetNodeId === id ? { ...n, targetNodeId: undefined, revealType: undefined } : n));
    });
    if (this._selectedNodeId() === id) {
      this._selectedNodeId.set(null);
    }
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
          visuals: [],
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
      roles: [
        { id: 'cartographer', name: 'Cartographer', exclusiveDossiers: ['map'] },
        { id: 'engineer', name: 'Engineer', exclusiveDossiers: ['schematic'] }
      ],
      roleAggregation: {
        '2_players': [{ roles: ['cartographer'] }, { roles: ['engineer'] }],
        '1_player_solo': [{ roles: ['cartographer', 'engineer'] }]
      },
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

  protected seedDefaultNodes(): void {
    const entrance = this.addNode({
      type: 'room',
      title: 'Tomb Entrance',
      x: 100,
      y: 150,
      visibility: { type: 'common' }
    });

    const clue = this.addNode({
      type: 'puzzle',
      title: 'Stele Riddle (Clue)',
      x: 380,
      y: 100,
      visibility: { type: 'role', roleIds: ['cartographer'] }
    });
    this.updateNode(clue.id, {
      lockSigil: '☽',
      solutionKey: ['RA'],
      narrativeText: 'Decipher the celestial glyphs to find the partial key.',
      inputConfig: {
        orderMode: 'unordered',
        allowRepetition: false,
        length: 2,
        preset: 'egyptian',
        availableSymbols: SYMBOL_PRESETS.egyptian
      }
    });

    const lock = this.addNode({
      type: 'puzzle',
      title: 'Anubis Gear Lock',
      x: 380,
      y: 280,
      visibility: { type: 'role', roleIds: ['engineer'] }
    });
    this.updateNode(lock.id, {
      lockSigil: '🜲',
      solutionKey: ['▲', '●', '◆'],
      narrativeText: 'Mechanical lock. Align the three copper gears.',
      inputConfig: {
        orderMode: 'ordered',
        allowRepetition: false,
        length: 3,
        preset: 'alchemy',
        availableSymbols: SYMBOL_PRESETS.alchemy
      }
    });

    const vault = this.addNode({
      type: 'room',
      title: 'Golden Sarcophagus Vault',
      x: 700,
      y: 200,
      visibility: { type: 'common' }
    });
    this.updateNode(vault.id, {
      narrativeText: 'The treasure room glitters with gold artifacts.'
    });

    // Entrance leads to both puzzles
    this.connectNodes(entrance.id, clue.id, 'provide_clue');
    // Solving clue puzzle rewards partial information for the lock puzzle
    this.connectNodes(clue.id, lock.id, 'provide_clue');
    // Solving lock puzzle awards unlocking the physical sealed Envelope #2 (vault)
    this.connectNodes(lock.id, vault.id, 'open_envelope', 'Envelope #2 (Sarcophagus)');
  }
}
