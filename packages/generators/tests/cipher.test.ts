import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateRuneCipher } from '../src/cipher.js';

describe('Procedural Rune Cipher Generator', () => {
  it('should generate deterministic substitution cipher and Rosetta sheet', () => {
    const cipherA = generateRuneCipher({ seed: 'EGYPT-77', message: 'OPEN THE VAULT' });
    const cipherB = generateRuneCipher({ seed: 'EGYPT-77', message: 'OPEN THE VAULT' });

    assert.equal(cipherA.encodedMessage, cipherB.encodedMessage);
    assert.deepEqual(cipherA.runeKeyMap, cipherB.runeKeyMap);
    assert.equal(cipherA.inscriptionSvg, cipherB.inscriptionSvg);
    assert.equal(cipherA.rosettaSheetSvg, cipherB.rosettaSheetSvg);
    assert.ok(cipherA.rosettaSheetSvg.includes('ROSETTA LEDGER'));
  });

  it('should encode letters correctly using the generated rune mapping', () => {
    const cipher = generateRuneCipher({ seed: 'SECRET-99', message: 'CAB' });
    const expected = cipher.runeKeyMap['C'] + cipher.runeKeyMap['A'] + cipher.runeKeyMap['B'];
    assert.equal(cipher.encodedMessage, expected);
  });
});
