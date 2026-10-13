import {
  ScenarioManifest,
  SigilResonanceMatrix,
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
  };
}

export class PnpCompiler {
  static compile(manifest: ScenarioManifest, options: PnpCompileOptions): PnpOutput {
    const seed = options.seed ?? manifest.seedConfig?.defaultSeed ?? 'DEFAULT-SEED';
    const foldFormat = options.foldFormat ?? 'french-fold';
    const includeGrid = options.includeVerificationGrid ?? true;
    const isSingleSided = options.singleSidedManualMark ?? false;

    // Resolve roles distribution
    const assignedSlots = resolveRolesForPlayerCount(manifest.roleAggregation, options.playerCount);

    // Setup verification matrix
    const matrix = new SigilResonanceMatrix(seed);
    const puzzleNodes = Object.values(manifest.nodes).filter(n => n.type === 'puzzle' && n.puzzle);
    
    puzzleNodes.forEach(node => {
      if (node.puzzle) {
        matrix.registerPuzzle(
          node.id,
          node.puzzle.lockSigil,
          node.puzzle.solutionKey.join(''),
          `SEAL-${node.id.slice(0, 4).toUpperCase()}`,
          node.transitions[0]?.targetRefId ?? `Envelope #${node.id}`
        );
      }
    });

    const commonPages: PnpPage[] = [];
    const playerDossiers: PlayerDossier[] = [];
    const allPages: PnpPage[] = [];

    // 1. Build Verification Grid Page if requested
    if (includeGrid && puzzleNodes.length > 0) {
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
      const lockSigil = node.puzzle?.lockSigil ?? '✦';
      const verificationSeal = node.puzzle
        ? `SEAL-${node.id.slice(0, 4).toUpperCase()}`
        : 'OPEN';

      const roleIds = node.visibility?.type === 'role' ? node.visibility.roleIds : undefined;

      const sheetData: FrenchFoldSheetData & ParallelFoldSheetData = {
        itemRefId: node.transitions[0]?.targetRefId ?? `Ref #${nodeId}`,
        title: node.title,
        lockSigil,
        verificationSeal,
        interiorTitle: node.title,
        interiorBody: node.content.narrativeText ?? 'Concealed room inspection data.',
        roleTags: roleIds,
        singleSidedNote: isSingleSided
          ? 'Single-sided print: Write glyph on back before folding.'
          : undefined
      };

      const svg = renderFold(sheetData);
      const isRoleSpecific = !!roleIds && roleIds.length > 0;

      const page: PnpPage = {
        pageId: `sheet-${nodeId}`,
        title: node.title,
        category: isRoleSpecific ? 'dossier' : 'common',
        assignedRoles: roleIds,
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
        dossierSheetsCount
      }
    };
  }
}
