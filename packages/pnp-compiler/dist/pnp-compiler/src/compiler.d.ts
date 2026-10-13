import { ScenarioManifest } from '@escape-system/contracts';
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
export declare class PnpCompiler {
    static compile(manifest: ScenarioManifest, options: PnpCompileOptions): PnpOutput;
}
//# sourceMappingURL=compiler.d.ts.map