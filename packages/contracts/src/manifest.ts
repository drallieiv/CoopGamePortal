import type { RoleDefinition, RoleAggregationMatrix } from './roles.js';

export type NodeType =
  | 'room'
  | 'puzzle'
  | 'item'
  | 'machine'
  | 'combine'
  | 'dossier'
  | 'narrative';

export type VisibilityScope =
  | { type: 'common' }
  | { type: 'role'; roleIds: string[] }
  | { type: 'whisper'; playerIds: string[] }
  | { type: 'gm_only' };

export type AssetStage = 'sketch' | 'draft' | 'final';
export type AssetType = 'vector' | 'raster' | 'audio';

export interface AssetReference {
  id: string;
  type: AssetType;
  uri: string;
  stage?: AssetStage;
  label?: string;
}

export type PhysicalCardFormat =
  | 'french_fold'
  | 'parallel_fold'
  | 'card'
  | 'envelope'
  | 'booklet';

export interface SymbolItem {
  id: string;
  glyph: string;
  name?: string;
  svg?: string;
}

export type SymbolSetPreset =
  | 'alchemy'
  | 'egyptian'
  | 'runes'
  | 'arrows'
  | 'compass'
  | 'alphanumeric'
  | 'custom';

export interface PuzzleInputConfig {
  orderMode: 'ordered' | 'unordered';
  allowRepetition: boolean;
  length: number;
  preset: SymbolSetPreset;
  availableSymbols: SymbolItem[];
}

export const SYMBOL_PRESETS: Record<Exclude<SymbolSetPreset, 'custom'>, SymbolItem[]> = {
  arrows: [
    { id: 'up', glyph: '▲', name: 'Up' },
    { id: 'down', glyph: '▼', name: 'Down' },
    { id: 'left', glyph: '◀', name: 'Left' },
    { id: 'right', glyph: '▶', name: 'Right' }
  ],
  compass: [
    { id: 'n', glyph: 'N', name: 'North' },
    { id: 'ne', glyph: 'NE', name: 'North-East' },
    { id: 'e', glyph: 'E', name: 'East' },
    { id: 'se', glyph: 'SE', name: 'South-East' },
    { id: 's', glyph: 'S', name: 'South' },
    { id: 'sw', glyph: 'SW', name: 'South-West' },
    { id: 'w', glyph: 'W', name: 'West' },
    { id: 'nw', glyph: 'NW', name: 'North-West' }
  ],
  alchemy: [
    { id: 'tri_up', glyph: '▲', name: 'Fire / Delta' },
    { id: 'circle', glyph: '●', name: 'Sol / Earth' },
    { id: 'diamond', glyph: '◆', name: 'Aether' },
    { id: 'square', glyph: '■', name: 'Salt' },
    { id: 'star', glyph: '★', name: 'Quintessence' },
    { id: 'hexagon', glyph: '⬡', name: 'Philosophers Stone' },
    { id: 'tri_down', glyph: '▼', name: 'Water' },
    { id: 'cross', glyph: '✛', name: 'Sulfur' }
  ],
  egyptian: [
    { id: 'eye', glyph: '𓁹', name: 'Eye of Horus' },
    { id: 'scarab', glyph: '𓆣', name: 'Scarab Beetle' },
    { id: 'ankh', glyph: '𓋹', name: 'Ankh of Life' },
    { id: 'bird', glyph: '𓅓', name: 'Falcon Horus' },
    { id: 'reed', glyph: '𓇋', name: 'Flowering Reed' },
    { id: 'water', glyph: '𓈖', name: 'Water Wave' },
    { id: 'sun', glyph: '𓇳', name: 'Sun Disk Ra' },
    { id: 'lion', glyph: '𓃭', name: 'Sphinx Lion' }
  ],
  runes: [
    { id: 'fehu', glyph: 'ᚠ', name: 'Fehu' },
    { id: 'uruz', glyph: 'ᚢ', name: 'Uruz' },
    { id: 'thurisaz', glyph: 'ᚦ', name: 'Thurisaz' },
    { id: 'ansuz', glyph: 'ᚨ', name: 'Ansuz' },
    { id: 'raidho', glyph: 'ᚱ', name: 'Raidho' },
    { id: 'kenaz', glyph: 'ᚲ', name: 'Kenaz' },
    { id: 'gebo', glyph: 'ᚷ', name: 'Gebo' },
    { id: 'wunjo', glyph: 'ᚹ', name: 'Wunjo' }
  ],
  alphanumeric: [
    { id: 'd0', glyph: '0' }, { id: 'd1', glyph: '1' }, { id: 'd2', glyph: '2' },
    { id: 'd3', glyph: '3' }, { id: 'd4', glyph: '4' }, { id: 'd5', glyph: '5' },
    { id: 'd6', glyph: '6' }, { id: 'd7', glyph: '7' }, { id: 'd8', glyph: '8' },
    { id: 'd9', glyph: '9' }
  ]
};

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
  inputConfig?: PuzzleInputConfig;
}

export type TransitionCondition =
  | 'on_solve'
  | 'on_gm_trigger'
  | 'on_item_combine';

export type RevealType =
  | 'open_envelope'
  | 'draw_card'
  | 'display_terminal'
  | 'provide_clue';

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

export type BaseBehaviorComponent =
  | 'SymbolIntersection'
  | 'DirectionalSequence'
  | 'ItemCombine'
  | 'TravelUnlock'
  | 'Custom';

export interface NodeBehaviorSpec {
  component?: BaseBehaviorComponent;
  params?: Record<string, unknown>;
  customScript?: string;
  triggers?: Array<{
    event: string;
    action?: string;
    script?: string;
  }>;
}

export interface ScenarioNode {
  id: string;
  type: NodeType;
  title: string;
  visibility: VisibilityScope;
  content: NodeContent;
  puzzle?: PuzzleDefinition;
  behavior?: NodeBehaviorSpec;
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
