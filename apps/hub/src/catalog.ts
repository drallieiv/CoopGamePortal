import fs from 'node:fs';
import path from 'node:path';
import type { ScenarioManifest } from '@escape-system/contracts';

export interface ScenarioPackageMetadata {
  id: string;
  title: string;
  authorName: string;
  difficulty: number;
  playerCount: { min: number; max: number; recommended: number };
  tags: string[];
  pricing: {
    isFree: boolean;
    priceCents?: number;
    currency?: string;
  };
  hasDemo: boolean;
  publishedAt: string;
  version: string;
}

export interface PublishScenarioRequest {
  manifest: ScenarioManifest;
  tags?: string[];
  pricing?: {
    isFree: boolean;
    priceCents?: number;
    currency?: string;
  };
  hasDemo?: boolean;
}

export class ScenarioCatalog {
  protected readonly scenarios = new Map<string, ScenarioManifest>();
  protected readonly metadata = new Map<string, ScenarioPackageMetadata>();

  constructor() {
    this.seedDefaultScenarios();
  }

  list(options: { tag?: string; isFree?: boolean } = {}): ScenarioPackageMetadata[] {
    let list = Array.from(this.metadata.values());
    if (options.tag) {
      const normalized = options.tag.toLowerCase();
      list = list.filter((pkg) => pkg.tags.some((t) => t.toLowerCase() === normalized));
    }
    if (options.isFree !== undefined) {
      list = list.filter((pkg) => pkg.pricing.isFree === options.isFree);
    }
    return list;
  }

  get(id: string): { metadata: ScenarioPackageMetadata; manifest: ScenarioManifest } | undefined {
    const meta = this.metadata.get(id);
    const manifest = this.scenarios.get(id);
    if (!meta || !manifest) return undefined;
    return { metadata: meta, manifest };
  }

  listScenarios(tag?: string): ScenarioPackageMetadata[] {
    const list = Array.from(this.metadata.values());
    if (!tag) {
      return list;
    }
    const normalized = tag.toLowerCase();
    return list.filter((pkg) => pkg.tags.some((t) => t.toLowerCase() === normalized));
  }

  getScenario(id: string): ScenarioManifest | undefined {
    return this.scenarios.get(id);
  }

  getMetadata(id: string): ScenarioPackageMetadata | undefined {
    return this.metadata.get(id);
  }

  publish(
    manifest: ScenarioManifest,
    options: {
      tags?: string[];
      pricing?: { isFree: boolean; priceCents?: number; currency?: string };
      hasDemo?: boolean;
    } = {}
  ): ScenarioPackageMetadata {
    if (!manifest.id || !manifest.title) {
      throw new Error('Manifest must have a valid id and title');
    }

    const pkgMeta: ScenarioPackageMetadata = {
      id: manifest.id,
      title: manifest.title,
      authorName: manifest.author?.name ?? 'Anonymous Creator',
      difficulty: manifest.difficulty ?? 3,
      playerCount: manifest.playerCount ?? { min: 1, max: 4, recommended: 2 },
      tags: options.tags ?? ['community'],
      pricing: options.pricing ?? { isFree: true },
      hasDemo: options.hasDemo ?? false,
      publishedAt: new Date().toISOString(),
      version: manifest.version ?? '1.0.0'
    };

    this.scenarios.set(manifest.id, manifest);
    this.metadata.set(manifest.id, pkgMeta);

    return pkgMeta;
  }

  protected seedDefaultScenarios(): void {
    // Dynamically load any scenario JSON files present in samples/ directory
    const potentialPaths = [
      path.resolve(process.cwd(), 'samples'),
      path.resolve(process.cwd(), '../../samples'),
      path.resolve('/home/a145777/perso/gameProject/samples')
    ];

    let loadedAny = false;

    for (const dir of potentialPaths) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
            const manifest = JSON.parse(raw) as ScenarioManifest;
            this.publish(manifest, {
              tags: [file.replace('.json', ''), 'official'],
              pricing: { isFree: true },
              hasDemo: true
            });
            loadedAny = true;
          } catch {
            // continue
          }
        }
        if (loadedAny) break;
      }
    }
  }
}
