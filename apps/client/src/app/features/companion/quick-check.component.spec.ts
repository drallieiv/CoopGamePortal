import '@angular/compiler';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createEnvironmentInjector, runInInjectionContext, type EnvironmentInjector } from '@angular/core';
import { QuickCheckComponent } from './quick-check.component.js';

describe('QuickCheckComponent (Symbol Keypad & Input Rules)', () => {
  let injector: EnvironmentInjector;
  let component: QuickCheckComponent;

  beforeEach(() => {
    injector = createEnvironmentInjector([], null as unknown as EnvironmentInjector);
    component = runInInjectionContext(injector, () => new QuickCheckComponent());
  });

  it('should initialize with default puzzle, empty slots, and zero unlocked hints', () => {
    assert.equal(component.selectedPuzzleId(), 'puzzle_scarab');
    assert.deepEqual(component.selectedSymbols(), []);
    assert.equal(component.verificationResult(), null);
    assert.equal(component.unlockedHintTier(), 0);
    assert.equal(component.visibleHints().length, 0);
  });

  it('should select symbols into slots and prevent duplicates when allowRepetition is false', () => {
    component.selectSymbol('▲');
    assert.deepEqual(component.selectedSymbols(), ['▲']);

    // Attempting to select duplicate when allowRepetition is false must be ignored
    component.selectSymbol('▲');
    assert.deepEqual(component.selectedSymbols(), ['▲']);

    component.selectSymbol('●');
    component.selectSymbol('◆');
    assert.deepEqual(component.selectedSymbols(), ['▲', '●', '◆']);

    // Attempting to add beyond slot length (3) must be ignored
    component.selectSymbol('■');
    assert.deepEqual(component.selectedSymbols(), ['▲', '●', '◆']);
  });

  it('should support popSymbol and clearSymbols', () => {
    component.selectSymbol('▲');
    component.selectSymbol('●');
    assert.equal(component.selectedSymbols().length, 2);

    component.popSymbol();
    assert.deepEqual(component.selectedSymbols(), ['▲']);

    component.clearSymbols();
    assert.deepEqual(component.selectedSymbols(), []);
  });

  it('should verify ordered sequence correctly', () => {
    // Correct sequence for Scarab: ▲, ●, ◆
    component.selectSymbol('▲');
    component.selectSymbol('●');
    component.selectSymbol('◆');
    component.verifySolution();

    const res = component.verificationResult();
    assert.ok(res);
    assert.equal(res!.valid, true);
    assert.equal(res!.seal, '♈︎ 84');
    assert.equal(res!.targetEnvelope, 'Envelope #2');
  });

  it('should reject out-of-order input when puzzle orderMode is ordered', () => {
    // Out of order: ●, ▲, ◆
    component.selectSymbol('●');
    component.selectSymbol('▲');
    component.selectSymbol('◆');
    component.verifySolution();

    const res = component.verificationResult();
    assert.ok(res);
    assert.equal(res!.valid, false);
  });

  it('should accept any order when puzzle orderMode is unordered', () => {
    // Switch to Egyptian hieroglyphs puzzle (orderMode: unordered, solution: 𓁹𓆣)
    component.onPuzzleSelected('puzzle_hieroglyphs');

    // Enter in reverse order: 𓆣 then 𓁹
    component.selectSymbol('𓆣');
    component.selectSymbol('𓁹');
    component.verifySolution();

    const res = component.verificationResult();
    assert.ok(res);
    assert.equal(res!.valid, true);
    assert.equal(res!.seal, '♎︎ 19');
    assert.equal(res!.targetEnvelope, 'Envelope #3');
  });

  it('should support compass directions with repetition allowed', () => {
    // Switch to compass puzzle: N, E, SE, S
    component.onPuzzleSelected('puzzle_compass');

    component.selectSymbol('N');
    component.selectSymbol('E');
    component.selectSymbol('SE');
    component.selectSymbol('S');
    component.verifySolution();

    const res = component.verificationResult();
    assert.ok(res);
    assert.equal(res!.valid, true);
    assert.equal(res!.seal, '♐︎ 71');
  });

  it('should progressively unlock hints up to maximum available', () => {
    assert.equal(component.maxHints(), 3);

    component.requestNextHint();
    assert.equal(component.unlockedHintTier(), 1);
    assert.equal(component.visibleHints().length, 1);

    component.requestNextHint();
    assert.equal(component.unlockedHintTier(), 2);

    component.requestNextHint();
    assert.equal(component.unlockedHintTier(), 3);
  });
});
