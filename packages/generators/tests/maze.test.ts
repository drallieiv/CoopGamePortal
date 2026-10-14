import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateMaze } from '../src/maze.js';

describe('Procedural Maze Generator', () => {
  it('should generate deterministic labyrinth given same seed', () => {
    const mazeA = generateMaze({ seed: 'MAZE-TEST-1', cols: 10, rows: 10 });
    const mazeB = generateMaze({ seed: 'MAZE-TEST-1', cols: 10, rows: 10 });

    assert.equal(mazeA.svg, mazeB.svg);
    assert.deepEqual(mazeA.start, [0, 0]);
    assert.deepEqual(mazeA.exit, [9, 9]);
    assert.ok(mazeA.svg.includes('<svg'));
    assert.ok(mazeA.svg.includes('LABYRINTH SEED: MAZE-TEST-1'));
  });

  it('should generate different labyrinths with different seeds', () => {
    const mazeA = generateMaze({ seed: 'SEED-ALPHA', cols: 8, rows: 8 });
    const mazeB = generateMaze({ seed: 'SEED-BETA', cols: 8, rows: 8 });

    assert.notEqual(mazeA.svg, mazeB.svg);
  });
});
