import {
  ScenarioManifest,
  SigilResonanceMatrix,
  SeededPRNG,
  resolveRolesForPlayerCount
} from '@escape-system/contracts';
import { renderFrenchFoldSvg, FrenchFoldSheetData } from './templates/french-fold.js';
import { renderDoubleParallelFoldSvg, ParallelFoldSheetData } from './templates/parallel-fold.js';
import { renderResonanceGridSvg } from './templates/resonance-grid.js';

export interface PnpCompileOptions {
  playerCount: number;
  seed?: string;
  foldFormat?: 'french-fold' | 'double-parallel-fold';
  includeVerificationGrid?: boolean;
  singleSidedManualMark?: boolean;
}

export interface PnpPage {
  pageId: string;
  title: string;
  category: 'common' | 'dossier' | 'verification';
  assignedRoles?: string[];
  isSealedReward?: boolean;
  verificationSeal?: string;
  svg: string;
}

export interface PlayerDossier {
  playerIndex: number;
  roles: string[];
  pages: PnpPage[];
}

export interface PnpOutput {
  scenarioTitle: string;
  seed: string;
  playerCount: number;
  foldFormat: 'french-fold' | 'double-parallel-fold';
  commonPages: PnpPage[];
  playerDossiers: PlayerDossier[];
  allPages: PnpPage[];
  summary: {
    totalSheets: number;
    playerCount: number;
    commonSheetsCount: number;
    dossierSheetsCount: number;
    sealedEnvelopesCount: number;
  };
}

export class PnpCompiler {
  static compile(manifest: ScenarioManifest, options: PnpCompileOptions): PnpOutput {
    const seed = options.seed ?? manifest.seedConfig?.defaultSeed ?? 'DEFAULT-SEED';
    const foldFormat = options.foldFormat ?? 'french-fold';
    const includeGrid = options.includeVerificationGrid ?? true;
    const isSingleSided = options.singleSidedManualMark ?? false;

    // Resolve role distribution
    const assignedSlots = resolveRolesForPlayerCount(manifest.roleAggregation, options.playerCount);

    // Setup PRNG and verification matrix
    const rng = new SeededPRNG(`${seed}-compiler`);
    const matrix = new SigilResonanceMatrix(seed);

    // Track sealed target elements (solving X rewards access to sealed element Y)
    // Map of targetNodeId -> { seal: string; envelopeRef: string; unlockedByPuzzleId: string }
    const sealedTargetMap = new Map<string, { seal: string; envelopeRef: string; unlockedByPuzzleId: string }>();

    for (const [nodeId, node] of Object.entries(manifest.nodes)) {
      if (node.type === 'puzzle' && node.puzzle) {
        for (const transition of node.transitions) {
          // Only transitions configured with 'open_envelope' reward access to a sealed physical element
          if (transition.revealType === 'open_envelope') {
            const targetNode = manifest.nodes[transition.targetNodeId];
            const explicitSeal = targetNode?.content.physicalFallback?.sealId;
            const generatedSeal = explicitSeal ?? `♈︎ ${rng.nextInt(10, 99)}`;
            const envelopeRef = transition.targetRefId ?? targetNode?.content.physicalFallback?.label ?? `Envelope #${transition.targetNodeId}`;

            sealedTargetMap.set(transition.targetNodeId, {
              seal: generatedSeal,
              envelopeRef,
              unlockedByPuzzleId: nodeId
            });

            // Register puzzle in offline verification matrix
            matrix.registerPuzzle(
              nodeId,
              node.puzzle.lockSigil,
              node.puzzle.solutionKey.join(''),
              generatedSeal,
              envelopeRef
            );
          }
        }
      }
    }

    const commonPages: PnpPage[] = [];
    const playerDossiers: PlayerDossier[] = [];
    const allPages: PnpPage[] = [];

    // 1. Build Verification Grid Page if requested and if any sealed rewards exist
    if (includeGrid && sealedTargetMap.size > 0) {
      const gridMatrix = matrix.generateLookupGrid();
      const gridSvg = renderResonanceGridSvg(gridMatrix, `${manifest.title} - Verification Matrix`);
      const gridPage: PnpPage = {
        pageId: 'verification-matrix-01',
        title: 'Sigil Resonance Matrix',
        category: 'verification',
        svg: gridSvg
      };
      commonPages.push(gridPage);
      allPages.push(gridPage);
    }

    // 2. Build Envelope & Card sheets from manifest nodes
    const renderFold = foldFormat === 'double-parallel-fold'
      ? (d: ParallelFoldSheetData) => renderDoubleParallelFoldSvg(d)
      : (d: FrenchFoldSheetData) => renderFrenchFoldSvg(d);

    for (const [nodeId, node] of Object.entries(manifest.nodes)) {
      // Check if this sheet itself is a sealed reward unlocked by another puzzle
      const sealedReward = sealedTargetMap.get(nodeId);
      const isSealedReward = !!sealedReward;
      const verificationSeal = sealedReward ? sealedReward.seal : undefined;

      const sheetLabel = node.content.physicalFallback?.label ?? (isSealedReward ? sealedReward!.envelopeRef : node.title);
      const lockSigil = node.puzzle?.lockSigil ?? node.content.physicalFallback?.lockSigil;

      const roleIds = node.visibility?.type === 'role' ? node.visibility.roleIds : undefined;

      const sheetData: FrenchFoldSheetData & ParallelFoldSheetData = {
        sheetId: sheetLabel,
        title: node.title,
        lockSigil,
        verificationSeal,
        interiorTitle: node.title,
        interiorBody: node.content.narrativeText ?? 'Concealed room inspection data.',
        roleTags: roleIds,
        singleSidedNote: isSingleSided
          ? 'Single-sided print: Write ID on back before folding.'
          : undefined
      };

      const svg = renderFold(sheetData);
      const isRoleSpecific = !!roleIds && roleIds.length > 0;

      const page: PnpPage = {
        pageId: `sheet-${nodeId}`,
        title: node.title,
        category: isRoleSpecific ? 'dossier' : 'common',
        assignedRoles: roleIds,
        isSealedReward,
        verificationSeal,
        svg
      };

      if (!isRoleSpecific) {
        commonPages.push(page);
      }
      allPages.push(page);
    }

    // 3. Collate player dossiers based on role aggregation
    assignedSlots.forEach((slot, index) => {
      const dossierPages = allPages.filter(p =>
        p.assignedRoles && p.assignedRoles.some(r => slot.roles.includes(r))
      );

      playerDossiers.push({
        playerIndex: index + 1,
        roles: slot.roles,
        pages: dossierPages
      });
    });

    const dossierSheetsCount = playerDossiers.reduce((acc, d) => acc + d.pages.length, 0);

    return {
      scenarioTitle: manifest.title,
      seed,
      playerCount: options.playerCount,
      foldFormat,
      commonPages,
      playerDossiers,
      allPages,
      summary: {
        totalSheets: allPages.length,
        playerCount: options.playerCount,
        commonSheetsCount: commonPages.length,
        dossierSheetsCount,
        sealedEnvelopesCount: sealedTargetMap.size
      }
    };
  }
}
