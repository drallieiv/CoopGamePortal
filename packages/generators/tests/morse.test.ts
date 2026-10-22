import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateMorseCode } from '../src/morse.js';

describe('Morse Code Generator', () => {
  it('should translate text to morse code signals and render svg tape', () => {
    const out = generateMorseCode({
      seed: 'SIGNAL-42',
      message: 'SOS'
    });

    assert.equal(out.plaintext, 'SOS');
    assert.equal(out.morseText, '... --- ...');
    assert.ok(out.tapeSvg.includes('... --- ...'));
    assert.ok(out.referenceCardSvg.includes('INTERNATIONAL MORSE CODE REFERENCE'));
  });
});
