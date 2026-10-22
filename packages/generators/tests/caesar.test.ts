import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateCaesarCipher } from '../src/caesar.js';

describe('Caesar Cipher Generator', () => {
  it('should encrypt message with specified shift', () => {
    const out = generateCaesarCipher({
      seed: 'TEST-CAESAR',
      message: 'HELLO WORLD',
      shift: 3
    });

    assert.equal(out.shift, 3);
    assert.equal(out.plaintext, 'HELLO WORLD');
    assert.equal(out.ciphertext, 'KHOOR ZRUOG');
    assert.ok(out.visualSvg.includes('KHOOR ZRUOG'));
    assert.ok(out.wheelSvg);
  });

  it('should be deterministic when shift is omitted (derived from seed)', () => {
    const out1 = generateCaesarCipher({ seed: 'ATLANTIS', message: 'ORICHALCUM' });
    const out2 = generateCaesarCipher({ seed: 'ATLANTIS', message: 'ORICHALCUM' });

    assert.equal(out1.shift, out2.shift);
    assert.equal(out1.ciphertext, out2.ciphertext);
  });
});
