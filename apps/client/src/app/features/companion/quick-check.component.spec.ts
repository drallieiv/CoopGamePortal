import '@angular/compiler';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createEnvironmentInjector, runInInjectionContext, type EnvironmentInjector } from '@angular/core';
import { QuickCheckComponent } from './quick-check.component.js';

describe('QuickCheckComponent (Angular 22 Zoneless / Signals)', () => {
  let injector: EnvironmentInjector;
  let component: QuickCheckComponent;

  beforeEach(() => {
    injector = createEnvironmentInjector([], null as unknown as EnvironmentInjector);
    component = runInInjectionContext(injector, () => new QuickCheckComponent());
  });

  it('should initialize with default puzzle, empty key, and zero unlocked hints', () => {
    assert.equal(component.selectedPuzzleId(), 'puzzle_scarab');
    assert.equal(component.enteredKey(), '');
    assert.equal(component.verificationResult(), null);
    assert.equal(component.unlockedHintTier(), 0);
    assert.equal(component.visibleHints().length, 0);
  });

  it('should return failure when wrong solution key is checked', () => {
    component.enteredKey.set('WRONG-KEY');
    component.verifySolution();

    const res = component.verificationResult();
    assert.ok(res, 'Verification result must not be null');
    assert.equal(res!.valid, false);
    assert.equal(res!.seal, undefined);
  });

  it('should return success with verification seal when correct solution key is checked', () => {
    component.enteredKey.set('▲●◆');
    component.verifySolution();

    const res = component.verificationResult();
    assert.ok(res, 'Verification result must not be null');
    assert.equal(res!.valid, true);
    assert.equal(res!.seal, '♈︎ 84');
    assert.equal(res!.targetEnvelope, 'Envelope #2');
  });

  it('should progressively unlock hints up to maximum available', () => {
    assert.equal(component.maxHints(), 3);

    component.requestNextHint();
    assert.equal(component.unlockedHintTier(), 1);
    assert.equal(component.visibleHints().length, 1);
    assert.equal(component.visibleHints()[0], 'Inspect the wall hieroglyphs closely.');

    component.requestNextHint();
    assert.equal(component.unlockedHintTier(), 2);
    assert.equal(component.visibleHints().length, 2);

    component.requestNextHint();
    assert.equal(component.unlockedHintTier(), 3);
    assert.equal(component.visibleHints().length, 3);

    // Cannot exceed maxHints
    component.requestNextHint();
    assert.equal(component.unlockedHintTier(), 3);
  });

  it('should reset input, result, and hints when switching puzzles', () => {
    component.enteredKey.set('▲●◆');
    component.verifySolution();
    component.requestNextHint();

    component.onPuzzleSelected('puzzle_weights');

    assert.equal(component.selectedPuzzleId(), 'puzzle_weights');
    assert.equal(component.enteredKey(), '');
    assert.equal(component.verificationResult(), null);
    assert.equal(component.unlockedHintTier(), 0);
  });
});
