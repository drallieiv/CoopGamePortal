/**
 * Role definition specifying exclusive dossiers and player responsibilities.
 */
export interface RoleDefinition {
    id: string;
    name: string;
    exclusiveDossiers: string[];
    description?: string;
}
/**
 * A player slot assignment bundling one or more roles.
 */
export interface RoleAssignmentSlot {
    roles: string[];
}
/**
 * Dynamic role aggregation matrix mapping player counts to role assignments.
 * Supports numeric keys (e.g. 2, 3), numeric strings ("2", "3"),
 * or descriptive keys (e.g. "4_players", "1_player_solo", "2p").
 * Values can be an array of `RoleAssignmentSlot` objects or raw string arrays `string[][]`.
 */
export type RoleAggregationMatrix = Record<number | string, Array<RoleAssignmentSlot | string[]>>;
/**
 * Resolves role slot assignments for a given player count based on the aggregation matrix.
 *
 * @param matrix The role aggregation matrix defined in the scenario manifest
 * @param count The number of participating players
 * @returns An array of RoleAssignmentSlot for each player
 * @throws Error if count is invalid (<= 0, non-integer) or no matching aggregation rule is found
 */
export declare function resolveRolesForPlayerCount(matrix: RoleAggregationMatrix, count: number): RoleAssignmentSlot[];
//# sourceMappingURL=roles.d.ts.map