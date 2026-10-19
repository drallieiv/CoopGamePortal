import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SigilResonanceMatrix,
  type GridMatrix,
} from '../src/verification.js';

describe('SigilResonanceMatrix', () => {
  it('registerPuzzleShouldStorePuzzleWhenValidInput', () => {
    const matrix = new SigilResonanceMatrix('session-seed');
    matrix.registerPuzzle('pz-01', '🜲', 'KEY-42', 'SEAL-ALPHA', 'ENV-01');

    const result = matrix.verify('pz-01', 'KEY-42');
    assert.deepEqual(result, {
      valid: true,
      seal: 'SEAL-ALPHA',
      targetEnvelope: 'ENV-01',
    });
  });

  it('registerPuzzleShouldThrowWhenRequiredFieldsEmpty', () => {
    const matrix = new SigilResonanceMatrix('session-seed');
    assert.throws(
      () => matrix.registerPuzzle('', '🜲', 'KEY-42', 'SEAL-ALPHA', 'ENV-01'),
      /All puzzle registration parameters must be non-empty strings/
    );
    assert.throws(
      () => matrix.registerPuzzle('pz-01', '', 'KEY-42', 'SEAL-ALPHA', 'ENV-01'),
      /All puzzle registration parameters must be non-empty strings/
    );
  });

  it('verifyShouldReturnValidTrueWithSealAndEnvelopeWhenKeyMatches', () => {
    const matrix = new SigilResonanceMatrix('seed-check');
    matrix.registerPuzzle('pz-compass', '🧭', 'N34W12', 'SEAL-OMEGA', 'ENV-12');

    const res = matrix.verify('pz-compass', 'N34W12');
    assert.equal(res.valid, true);
    assert.equal(res.seal, 'SEAL-OMEGA');
    assert.equal(res.targetEnvelope, 'ENV-12');
  });

  it('verifyShouldReturnValidFalseWhenKeyIsIncorrect', () => {
    const matrix = new SigilResonanceMatrix('seed-check');
    matrix.registerPuzzle('pz-compass', '🧭', 'N34W12', 'SEAL-OMEGA', 'ENV-12');

    const res = matrix.verify('pz-compass', 'WRONG-KEY');
    assert.deepEqual(res, { valid: false });
  });

  it('verifyShouldSupportUnorderedSymbolsWhenOrderModeIsUnordered', () => {
    const matrix = new SigilResonanceMatrix('seed-unordered');
    matrix.registerPuzzle('pz-runes', '🜲', '▲●◆', 'SEAL-RUNES', 'Envelope #2', 'unordered');

    // Out of order match
    assert.equal(matrix.verify('pz-runes', ['●', '▲', '◆']).valid, true);
    assert.equal(matrix.verify('pz-runes', '◆●▲').valid, true);
    assert.equal(matrix.verify('pz-runes', '▲,●,◆').valid, true);

    // Mismatched symbol fails
    assert.equal(matrix.verify('pz-runes', ['▲', '●', '■']).valid, false);
  });

  it('verifyShouldEnforceOrderWhenOrderModeIsOrdered', () => {
    const matrix = new SigilResonanceMatrix('seed-ordered');
    matrix.registerPuzzle('pz-code', '🗝', '▲●◆', 'SEAL-ORDER', 'Envelope #3', 'ordered');

    assert.equal(matrix.verify('pz-code', ['●', '▲', '◆']).valid, false);
    assert.equal(matrix.verify('pz-code', ['▲', '●', '◆']).valid, true);
  });

  it('verifyShouldReturnValidFalseWhenPuzzleNotRegistered', () => {
    const matrix = new SigilResonanceMatrix('seed-check');
    const res = matrix.verify('non-existent-puzzle', 'N34W12');
    assert.deepEqual(res, { valid: false });
  });

  it('verifyShouldHandleCaseInsensitiveAndTrimmedKeysWhenInputHasWhitespace', () => {
    const matrix = new SigilResonanceMatrix('seed-check');
    matrix.registerPuzzle('pz-box', '📦', 'SOLVE', 'SEAL-B', 'ENV-02');

    const resLower = matrix.verify('pz-box', ' solve ');
    assert.equal(resLower.valid, true);
    assert.equal(resLower.seal, 'SEAL-B');
    assert.equal(resLower.targetEnvelope, 'ENV-02');
  });

  it('generateLookupGridShouldIncludeAllRealPuzzlesWhenPuzzlesRegistered', () => {
    const matrix = new SigilResonanceMatrix('seed-grid');
    matrix.registerPuzzle('pz-1', '🜲', 'K1', 'SEAL-1', 'ENV-1');
    matrix.registerPuzzle('pz-2', '☽', 'K2', 'SEAL-2', 'ENV-2');

    const grid: GridMatrix = matrix.generateLookupGrid();

    const realRowIds = grid.rows.filter((r) => !r.isDecoy).map((r) => r.puzzleId);
    assert.ok(realRowIds.includes('pz-1'));
    assert.ok(realRowIds.includes('pz-2'));
  });

  it('generateLookupGridShouldInsertDecoyColumnsWhenGeneratingGrid', () => {
    const matrix = new SigilResonanceMatrix('seed-decoys');
    matrix.registerPuzzle('pz-1', '🜲', 'ALPHA', 'SEAL-1', 'ENV-1');
    matrix.registerPuzzle('pz-2', '☽', 'BETA', 'SEAL-2', 'ENV-2');

    const grid = matrix.generateLookupGrid({ decoyColCount: 3 });

    // Must contain both real keys
    assert.ok(grid.columns.includes('ALPHA'));
    assert.ok(grid.columns.includes('BETA'));

    // Must have at least real keys (2) + decoy cols (3) = 5
    assert.ok(
      grid.columns.length >= 5,
      `Expected at least 5 columns, got ${grid.columns.length}`
    );
  });

  it('generateLookupGridShouldInsertDecoyRowsWhenGeneratingGrid', () => {
    const matrix = new SigilResonanceMatrix('seed-rows');
    matrix.registerPuzzle('pz-1', '🜲', 'ALPHA', 'SEAL-1', 'ENV-1');

    const grid = matrix.generateLookupGrid({ decoyRowCount: 2 });
    const decoyRows = grid.rows.filter((r) => r.isDecoy);

    assert.equal(decoyRows.length, 2);
    for (const dRow of decoyRows) {
      assert.ok(dRow.lockSigil.length > 0);
      assert.ok(dRow.puzzleId.length > 0);
    }
  });

  it('generateLookupGridShouldPlaceValidCellAtCorrectIntersectionWhenPuzzleRegistered', () => {
    const matrix = new SigilResonanceMatrix('seed-cell-check');
    matrix.registerPuzzle('pz-1', '🜲', 'SOL-1', 'SEAL-GOLD', 'ENV-08');

    const grid = matrix.generateLookupGrid();
    const row = grid.rows.find((r) => r.puzzleId === 'pz-1');
    assert.ok(row, 'Row for pz-1 must exist');

    const cell = row.cells['SOL-1'];
    assert.ok(cell, 'Cell at real solution must exist');
    assert.equal(cell.isDecoy, false);
    assert.equal(cell.seal, 'SEAL-GOLD');
    assert.equal(cell.targetEnvelope, 'ENV-08');
  });

  it('generateLookupGridShouldProvideNullOrDecoyAtWrongIntersectionsWhenInspected', () => {
    const matrix = new SigilResonanceMatrix('seed-decoy-cells');
    matrix.registerPuzzle('pz-1', '🜲', 'SOL-1', 'SEAL-GOLD', 'ENV-08');

    const grid = matrix.generateLookupGrid({ decoyColCount: 3 });
    const row = grid.rows.find((r) => r.puzzleId === 'pz-1');
    assert.ok(row);

    const wrongCols = grid.columns.filter((c) => c !== 'SOL-1');
    assert.ok(wrongCols.length > 0);

    for (const col of wrongCols) {
      const cell = row.cells[col];
      if (cell !== null && cell !== undefined) {
        assert.equal(cell.isDecoy, true);
        // Decoy seal must not accidentally match the correct seal
        assert.notEqual(cell.seal, 'SEAL-GOLD');
      }
    }
  });

  it('generateLookupGridShouldBeDeterministicWhenSameSeedProvided', () => {
    const matrix1 = new SigilResonanceMatrix('shared-seed');
    const matrix2 = new SigilResonanceMatrix('shared-seed');

    matrix1.registerPuzzle('pz-1', '🜲', 'K1', 'SEAL-1', 'ENV-1');
    matrix1.registerPuzzle('pz-2', '☽', 'K2', 'SEAL-2', 'ENV-2');

    matrix2.registerPuzzle('pz-1', '🜲', 'K1', 'SEAL-1', 'ENV-1');
    matrix2.registerPuzzle('pz-2', '☽', 'K2', 'SEAL-2', 'ENV-2');

    const grid1 = matrix1.generateLookupGrid();
    const grid2 = matrix2.generateLookupGrid();

    assert.deepEqual(grid1, grid2);
  });

  it('generateLookupGridShouldThrowWhenNoPuzzlesRegistered', () => {
    const matrix = new SigilResonanceMatrix('empty-seed');
    assert.throws(
      () => matrix.generateLookupGrid(),
      /No puzzles registered to generate grid/
    );
  });
});
