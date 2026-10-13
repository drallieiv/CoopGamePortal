/**
 * Normalizes raw slots into RoleAssignmentSlot objects with cloned role arrays.
 */
function normalizeSlots(rawSlots) {
    if (!Array.isArray(rawSlots)) {
        throw new TypeError('Role aggregation slots must be an array.');
    }
    return rawSlots.map((slot) => {
        if (Array.isArray(slot)) {
            return { roles: [...slot] };
        }
        if (slot && typeof slot === 'object' && Array.isArray(slot.roles)) {
            return { roles: [...slot.roles] };
        }
        throw new TypeError('Each role assignment slot must be an array of role IDs or an object with a roles array.');
    });
}
/**
 * Resolves role slot assignments for a given player count based on the aggregation matrix.
 *
 * @param matrix The role aggregation matrix defined in the scenario manifest
 * @param count The number of participating players
 * @returns An array of RoleAssignmentSlot for each player
 * @throws Error if count is invalid (<= 0, non-integer) or no matching aggregation rule is found
 */
export function resolveRolesForPlayerCount(matrix, count) {
    if (!Number.isInteger(count) || count <= 0) {
        throw new RangeError(`Invalid player count: ${count}. Player count must be a positive integer.`);
    }
    if (!matrix || typeof matrix !== 'object' || Object.keys(matrix).length === 0) {
        throw new Error('No role aggregation rules defined in matrix.');
    }
    // 1. Direct match with number or string
    if (matrix[count] !== undefined) {
        return normalizeSlots(matrix[count]);
    }
    const countStr = String(count);
    if (matrix[countStr] !== undefined) {
        return normalizeSlots(matrix[countStr]);
    }
    // 2. Search for common pattern keys
    const candidateKeys = [
        `${count}_players`,
        `${count}_player`,
        `${count}p`,
        `${count}_players_solo`,
        `${count}_player_solo`,
        count === 1 ? '1_player_solo' : '',
        count === 1 ? 'solo' : '',
    ].filter(Boolean);
    for (const key of candidateKeys) {
        if (matrix[key] !== undefined) {
            return normalizeSlots(matrix[key]);
        }
    }
    // 3. Regex fallback match for prefixed keys (e.g. "4_players_standard")
    const keyMatch = Object.keys(matrix).find((k) => {
        const pattern = new RegExp(`^${count}(_players?|_p|p)?(_.*)?$`, 'i');
        return pattern.test(k);
    });
    if (keyMatch && matrix[keyMatch] !== undefined) {
        return normalizeSlots(matrix[keyMatch]);
    }
    throw new Error(`No role aggregation rules defined for ${count} player(s).`);
}
//# sourceMappingURL=roles.js.map