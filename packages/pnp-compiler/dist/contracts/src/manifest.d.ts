import type { RoleDefinition, RoleAggregationMatrix } from './roles.js';
export type NodeType = 'room' | 'puzzle' | 'item' | 'machine' | 'dossier' | 'narrative';
export type VisibilityScope = {
    type: 'common';
} | {
    type: 'role';
    roleIds: string[];
} | {
    type: 'whisper';
    playerIds: string[];
} | {
    type: 'gm_only';
};
export type AssetStage = 'sketch' | 'draft' | 'final';
export type AssetType = 'vector' | 'raster' | 'audio';
export interface AssetReference {
    id: string;
    type: AssetType;
    uri: string;
    stage?: AssetStage;
    label?: string;
}
export type PhysicalCardFormat = 'french_fold' | 'parallel_fold' | 'card' | 'envelope' | 'booklet';
export interface PhysicalCardSpec {
    format?: PhysicalCardFormat;
    sealId?: string;
    lockSigil?: string;
    label?: string;
    instructions?: string;
    panelCount?: number;
}
export interface PuzzleDefinition {
    lockSigil: string;
    solutionKey: string[];
    hints: [string, string, string];
}
export type TransitionCondition = 'on_solve' | 'on_gm_trigger' | 'on_item_combine';
export type RevealType = 'open_envelope' | 'draw_card' | 'display_terminal';
export interface NodeTransition {
    targetNodeId: string;
    condition: TransitionCondition;
    revealType: RevealType;
    targetRefId: string;
}
export interface NodeContent {
    visuals: AssetReference[];
    narrativeText?: string;
    physicalFallback: PhysicalCardSpec;
}
export interface ScenarioNode {
    id: string;
    type: NodeType;
    title: string;
    visibility: VisibilityScope;
    content: NodeContent;
    puzzle?: PuzzleDefinition;
    transitions: NodeTransition[];
}
export interface ScenarioAuthor {
    id: string;
    name: string;
    email?: string;
}
export interface PlayerCountConfig {
    min: number;
    max: number;
    recommended: number;
}
export type PRNGAlgorithm = 'mulberry32' | 'splitmix32';
export interface SeedConfiguration {
    defaultSeed?: string;
    allowCustomSeed?: boolean;
    algorithm?: PRNGAlgorithm;
}
export interface GameState {
    unlockedNodeIds: string[];
    solvedPuzzleIds: string[];
    activeDossiers: string[];
    inventory: string[];
    customVariables?: Record<string, unknown>;
}
export interface ScenarioManifest {
    id: string;
    version: string;
    title: string;
    author: ScenarioAuthor;
    difficulty: 1 | 2 | 3 | 4 | 5;
    playerCount: PlayerCountConfig;
    roles: RoleDefinition[];
    roleAggregation: RoleAggregationMatrix;
    nodes: Record<string, ScenarioNode>;
    initialState: GameState;
    seedConfig: SeedConfiguration;
}
//# sourceMappingURL=manifest.d.ts.map