import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRolesForPlayerCount,
  type RoleAggregationMatrix,
} from '../src/roles.js';

describe('resolveRolesForPlayerCount', () => {
  const sampleMatrix: RoleAggregationMatrix = {
    '4_players': [
      { roles: ['R_NAV'] },
      { roles: ['R_DEC'] },
      { roles: ['R_ENG'] },
      { roles: ['R_HIS'] },
    ],
    '3_players': [
      { roles: ['R_NAV'] },
      { roles: ['R_DEC', 'R_HIS'] },
      { roles: ['R_ENG'] },
    ],
    '2_players': [
      { roles: ['R_NAV', 'R_HIS'] },
      { roles: ['R_DEC', 'R_ENG'] },
    ],
    '1_player_solo': [
      { roles: ['R_NAV', 'R_DEC', 'R_ENG', 'R_HIS'] },
    ],
  };

  it('resolves 4 players correctly from spec format', () => {
    const slots = resolveRolesForPlayerCount(sampleMatrix, 4);
    assert.equal(slots.length, 4);
    assert.deepEqual(slots[0].roles, ['R_NAV']);
    assert.deepEqual(slots[1].roles, ['R_DEC']);
    assert.deepEqual(slots[2].roles, ['R_ENG']);
    assert.deepEqual(slots[3].roles, ['R_HIS']);
  });

  it('resolves 3 players with bundled roles', () => {
    const slots = resolveRolesForPlayerCount(sampleMatrix, 3);
    assert.equal(slots.length, 3);
    assert.deepEqual(slots[0].roles, ['R_NAV']);
    assert.deepEqual(slots[1].roles, ['R_DEC', 'R_HIS']);
    assert.deepEqual(slots[2].roles, ['R_ENG']);
  });

  it('resolves 2 players with paired roles', () => {
    const slots = resolveRolesForPlayerCount(sampleMatrix, 2);
    assert.equal(slots.length, 2);
    assert.deepEqual(slots[0].roles, ['R_NAV', 'R_HIS']);
    assert.deepEqual(slots[1].roles, ['R_DEC', 'R_ENG']);
  });

  it('resolves 1 player solo combining all roles', () => {
    const slots = resolveRolesForPlayerCount(sampleMatrix, 1);
    assert.equal(slots.length, 1);
    assert.deepEqual(slots[0].roles, ['R_NAV', 'R_DEC', 'R_ENG', 'R_HIS']);
  });

  it('resolves numeric and string keys (e.g. 2, "2", "2p")', () => {
    const numericMatrix: RoleAggregationMatrix = {
      2: [{ roles: ['R_A'] }, { roles: ['R_B'] }],
      '3': [{ roles: ['R_A'] }, { roles: ['R_B'] }, { roles: ['R_C'] }],
      '4p': [{ roles: ['R_1'] }, { roles: ['R_2'] }, { roles: ['R_3'] }, { roles: ['R_4'] }],
    };

    const slots2 = resolveRolesForPlayerCount(numericMatrix, 2);
    assert.equal(slots2.length, 2);
    assert.deepEqual(slots2[0].roles, ['R_A']);

    const slots3 = resolveRolesForPlayerCount(numericMatrix, 3);
    assert.equal(slots3.length, 3);
    assert.deepEqual(slots3[2].roles, ['R_C']);

    const slots4 = resolveRolesForPlayerCount(numericMatrix, 4);
    assert.equal(slots4.length, 4);
    assert.deepEqual(slots4[0].roles, ['R_1']);
  });

  it('normalizes string array slots to RoleAssignmentSlot objects', () => {
    const rawMatrix: RoleAggregationMatrix = {
      2: [['R_NAV', 'R_HIS'], ['R_DEC', 'R_ENG']],
    };

    const slots = resolveRolesForPlayerCount(rawMatrix, 2);
    assert.equal(slots.length, 2);
    assert.deepEqual(slots[0], { roles: ['R_NAV', 'R_HIS'] });
    assert.deepEqual(slots[1], { roles: ['R_DEC', 'R_ENG'] });
  });

  it('throws for invalid player counts (<= 0 or non-integer)', () => {
    assert.throws(
      () => resolveRolesForPlayerCount(sampleMatrix, 0),
      /Invalid player count/
    );
    assert.throws(
      () => resolveRolesForPlayerCount(sampleMatrix, -1),
      /Invalid player count/
    );
    assert.throws(
      () => resolveRolesForPlayerCount(sampleMatrix, 2.5),
      /Invalid player count/
    );
  });

  it('throws when player count is not defined in matrix', () => {
    assert.throws(
      () => resolveRolesForPlayerCount(sampleMatrix, 5),
      /No role aggregation rules defined for 5 player\(s\)/
    );
  });

  it('throws when matrix is empty or invalid', () => {
    assert.throws(
      () => resolveRolesForPlayerCount({} as RoleAggregationMatrix, 2),
      /No role aggregation rules defined/
    );
  });
});
