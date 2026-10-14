import type { ScenarioManifest } from '@escape-system/contracts';

export interface ScenarioPackageMetadata {
  id: string;
  title: string;
  authorName: string;
  authorId: string;
  difficulty: number;
  playerCount: { min: number; max: number; recommended: number };
  tags: string[];
  pricing: {
    isFree: boolean;
    priceCents?: number;
    currency?: string;
  };
  hasDemo: boolean;
  publishedAt: number;
  version: string;
}

export interface ScenarioPackage {
  metadata: ScenarioPackageMetadata;
  manifest: ScenarioManifest;
}

export class ScenarioCatalog {
  protected packages = new Map<string, ScenarioPackage>();

  constructor() {
    this.seedDefaultScenarios();
  }

  list(filters?: { tag?: string; minDifficulty?: number; isFree?: boolean }): ScenarioPackageMetadata[] {
    let results = Array.from(this.packages.values()).map(p => p.metadata);

    if (filters) {
      if (filters.tag) {
        results = results.filter(m => m.tags.includes(filters.tag!));
      }
      if (filters.minDifficulty !== undefined) {
        results = results.filter(m => m.difficulty >= filters.minDifficulty!);
      }
      if (filters.isFree !== undefined) {
        results = results.filter(m => m.pricing.isFree === filters.isFree);
      }
    }

    return results;
  }

  get(id: string): ScenarioPackage | null {
    return this.packages.get(id) ?? null;
  }

  publish(manifest: ScenarioManifest, metadataOverride?: Partial<ScenarioPackageMetadata>): ScenarioPackage {
    if (!manifest.id || !manifest.title || !manifest.nodes) {
      throw new Error('Invalid manifest: missing required fields (id, title, nodes)');
    }

    const metadata: ScenarioPackageMetadata = {
      id: manifest.id,
      title: manifest.title,
      authorName: manifest.author?.name ?? 'Anonymous Creator',
      authorId: manifest.author?.id ?? 'author-anon',
      difficulty: manifest.difficulty ?? 3,
      playerCount: manifest.playerCount ?? { min: 1, max: 4, recommended: 3 },
      tags: metadataOverride?.tags ?? ['escape-room', 'mystery'],
      pricing: metadataOverride?.pricing ?? { isFree: true },
      hasDemo: metadataOverride?.hasDemo ?? false,
      publishedAt: Date.now(),
      version: manifest.version ?? '1.0.0',
      ...metadataOverride
    };

    const pkg: ScenarioPackage = { metadata, manifest };
    this.packages.set(manifest.id, pkg);
    return pkg;
  }

  protected seedDefaultScenarios(): void {
    const sampleManifest: ScenarioManifest = {
      id: 'pharaoh-crypt-01',
      version: '1.0.0',
      title: "The Pharaoh's Crypt",
      author: { id: 'creator-drjones', name: 'Dr. Jones' },
      difficulty: 3,
      playerCount: { min: 1, max: 4, recommended: 3 },
      roles: [
        { id: 'cartographer', name: 'Cartographer', exclusiveDossiers: ['star_map'] },
        { id: 'translator', name: 'Translator', exclusiveDossiers: ['hieroglyph_tablet'] },
        { id: 'engineer', name: 'Engineer', exclusiveDossiers: ['gear_diagrams'] }
      ],
      roleAggregation: {
        '3_players': [{ roles: ['cartographer'] }, { roles: ['translator'] }, { roles: ['engineer'] }],
        '2_players': [{ roles: ['cartographer', 'translator'] }, { roles: ['engineer'] }],
        '1_player_solo': [{ roles: ['cartographer', 'translator', 'engineer'] }]
      },
      nodes: {
        antechamber: {
          id: 'antechamber',
          type: 'room',
          title: 'Tomb Antechamber',
          visibility: { type: 'common' },
          content: { visuals: [], narrativeText: 'Dark basalt halls.', physicalFallback: { label: 'Sheet #1' } },
          transitions: []
        }
      },
      initialState: {
        unlockedNodeIds: ['antechamber'],
        solvedPuzzleIds: [],
        activeDossiers: [],
        inventory: []
      },
      seedConfig: { defaultSeed: 'EGYPT-404' }
    };

    this.publish(sampleManifest, {
      tags: ['egypt', 'crypt', 'asymmetric'],
      pricing: { isFree: true },
      hasDemo: false
    });
  }
}
