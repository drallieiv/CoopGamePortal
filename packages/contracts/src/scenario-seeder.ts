import { SeededPRNG } from './seed.js';
import {
  ScenarioManifest,
  SYMBOL_PRESETS
} from './manifest.js';
import { generateIntersectionPair, type IntersectionPuzzlePair } from './intersection.js';
import { SigilResonanceMatrix } from './verification.js';

export interface SeededItemState {
  itemId: string;
  itemCode: string;
  symbols: Array<{ id: string; glyph: string; name?: string }>;
}

export interface SeededCombinationState {
  combineNodeId: string;
  sourceItemAId: string;
  sourceItemBId: string;
  itemA: SeededItemState;
  itemB: SeededItemState;
  commonCount: 2 | 3;
  expectedIntersection: string[];
}

export interface SeededScenarioState {
  seed: string;
  items: Map<string, SeededItemState>;
  combinations: Map<string, SeededCombinationState>;
  puzzles: Map<string, {
    puzzleId: string;
    lockSigil: string;
    solutionKey: string[];
    orderMode: 'ordered' | 'unordered';
    sealId?: string;
    targetEnvelope?: string;
  }>;
  matrix: SigilResonanceMatrix;
  manifest: ScenarioManifest;
}

/**
 * Deterministically generates a fully consistent, mathematically valid state of
 * item codes, 5-symbol sets, combine intersections, and puzzle solutions from a seed.
 */
export function generateSeededScenarioState(
  manifest: ScenarioManifest,
  seed: string
): SeededScenarioState {
  const rng = new SeededPRNG(`${seed}-global-state`);
  const matrix = new SigilResonanceMatrix(seed);

  const items = new Map<string, SeededItemState>();
  const combinations = new Map<string, SeededCombinationState>();
  const puzzles = new Map<string, {
    puzzleId: string;
    lockSigil: string;
    solutionKey: string[];
    orderMode: 'ordered' | 'unordered';
    sealId?: string;
    targetEnvelope?: string;
  }>();

  // 1. Identify all item-combine pairs or interactable items
  const processedPairs = new Set<string>();

  for (const [nodeId, node] of Object.entries(manifest.nodes)) {
    // If node is an item combine puzzle or specifies behavior with component 'SymbolIntersection'
    if (
      (node.type === 'puzzle' || node.type === 'machine') &&
      node.behavior?.component === 'SymbolIntersection'
    ) {
      const itemAId = (node.behavior.params?.itemAId as string) ?? `${nodeId}_itemA`;
      const itemBId = (node.behavior.params?.itemBId as string) ?? `${nodeId}_itemB`;
      const commonCount = ((node.behavior.params?.commonCount as number) === 2 ? 2 : 3) as 2 | 3;

      const pairKey = `${itemAId}_${itemBId}`;
      if (!processedPairs.has(pairKey)) {
        processedPairs.add(pairKey);

        const pool = node.puzzle?.inputConfig?.preset && node.puzzle.inputConfig.preset !== 'custom'
          ? (SYMBOL_PRESETS[node.puzzle.inputConfig.preset] ?? SYMBOL_PRESETS.alchemy)
          : SYMBOL_PRESETS.alchemy;

        const pair: IntersectionPuzzlePair = generateIntersectionPair(
          seed,
          itemAId,
          itemBId,
          commonCount,
          pool
        );

        const stateA: SeededItemState = {
          itemId: itemAId,
          itemCode: pair.itemA.itemCode,
          symbols: pair.itemA.symbols
        };
        const stateB: SeededItemState = {
          itemId: itemBId,
          itemCode: pair.itemB.itemCode,
          symbols: pair.itemB.symbols
        };

        items.set(itemAId, stateA);
        items.set(itemBId, stateB);

        combinations.set(nodeId, {
          combineNodeId: nodeId,
          sourceItemAId: itemAId,
          sourceItemBId: itemBId,
          itemA: stateA,
          itemB: stateB,
          commonCount,
          expectedIntersection: pair.commonGlyphs
        });

        // If this node is a puzzle, update its solution key with the generated intersection!
        if (node.puzzle) {
          node.puzzle.solutionKey = pair.commonGlyphs;
        }
      }
    }
  }

  // 2. Register all puzzle nodes and verification seals
  for (const [nodeId, node] of Object.entries(manifest.nodes)) {
    if (node.type === 'puzzle' && node.puzzle) {
      let sealId: string | undefined;
      let targetEnvelope: string | undefined;

      for (const t of node.transitions) {
        if (t.revealType === 'open_envelope') {
          const targetNode = manifest.nodes[t.targetNodeId];
          sealId = targetNode?.content.physicalFallback?.sealId ?? `♈︎ ${rng.nextInt(10, 99)}`;
          targetEnvelope = t.targetRefId ?? targetNode?.content.physicalFallback?.label ?? `Envelope #${t.targetNodeId}`;

          matrix.registerPuzzle(
            nodeId,
            node.puzzle.lockSigil,
            node.puzzle.solutionKey.join(''),
            sealId,
            targetEnvelope,
            node.puzzle.inputConfig?.orderMode ?? 'ordered'
          );
          break;
        }
      }

      puzzles.set(nodeId, {
        puzzleId: nodeId,
        lockSigil: node.puzzle.lockSigil,
        solutionKey: node.puzzle.solutionKey,
        orderMode: node.puzzle.inputConfig?.orderMode ?? 'ordered',
        sealId,
        targetEnvelope
      });
    }
  }

  return {
    seed,
    items,
    combinations,
    puzzles,
    matrix,
    manifest
  };
}
