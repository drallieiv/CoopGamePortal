import { SeededPRNG } from '@escape-system/contracts';

export interface MazeOptions {
  seed: string;
  cols?: number;
  rows?: number;
  cellSize?: number;
  wallThickness?: number;
}

export interface MazeResult {
  seed: string;
  cols: number;
  rows: number;
  start: [number, number];
  exit: [number, number];
  svg: string;
}

interface Cell {
  visited: boolean;
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export function generateMaze(options: MazeOptions): MazeResult {
  const seed = options.seed;
  const cols = Math.max(3, options.cols ?? 15);
  const rows = Math.max(3, options.rows ?? 15);
  const cellSize = options.cellSize ?? 24;
  const wallThickness = options.wallThickness ?? 2;

  const rng = new SeededPRNG(seed);

  // Initialize grid with all walls present
  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      visited: false,
      top: true,
      right: true,
      bottom: true,
      left: true
    }))
  );

  const stack: [number, number][] = [];
  const start: [number, number] = [0, 0];
  const exit: [number, number] = [cols - 1, rows - 1];

  grid[0][0].visited = true;
  stack.push([0, 0]);

  const directions: Array<[number, number, 'top' | 'right' | 'bottom' | 'left', 'top' | 'right' | 'bottom' | 'left']> = [
    [0, -1, 'top', 'bottom'],    // North
    [1, 0, 'right', 'left'],     // East
    [0, 1, 'bottom', 'top'],     // South
    [-1, 0, 'left', 'right']     // West
  ];

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbors: Array<{ nx: number; ny: number; wall: 'top' | 'right' | 'bottom' | 'left'; oppWall: 'top' | 'right' | 'bottom' | 'left' }> = [];

    for (const [dx, dy, wall, oppWall] of directions) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !grid[ny][nx].visited) {
        neighbors.push({ nx, ny, wall, oppWall });
      }
    }

    if (neighbors.length > 0) {
      const chosen = rng.pick(neighbors);
      grid[cy][cx][chosen.wall] = false;
      grid[chosen.ny][chosen.nx][chosen.oppWall] = false;
      grid[chosen.ny][chosen.nx].visited = true;
      stack.push([chosen.nx, chosen.ny]);
    } else {
      stack.pop();
    }
  }

  // Open start and exit walls
  grid[0][0].left = false;
  grid[rows - 1][cols - 1].right = false;

  // Render vector SVG
  const padding = 20;
  const width = cols * cellSize + padding * 2;
  const height = rows * cellSize + padding * 2;

  let wallsSvg = '';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid[y][x];
      const px = padding + x * cellSize;
      const py = padding + y * cellSize;

      if (cell.top) {
        wallsSvg += `<line x1="${px}" y1="${py}" x2="${px + cellSize}" y2="${py}" />`;
      }
      if (cell.left) {
        wallsSvg += `<line x1="${px}" y1="${py}" x2="${px}" y2="${py + cellSize}" />`;
      }
      // Right edge
      if (x === cols - 1 && cell.right) {
        wallsSvg += `<line x1="${px + cellSize}" y1="${py}" x2="${px + cellSize}" y2="${py + cellSize}" />`;
      }
      // Bottom edge
      if (y === rows - 1 && cell.bottom) {
        wallsSvg += `<line x1="${px}" y1="${py + cellSize}" x2="${px + cellSize}" y2="${py + cellSize}" />`;
      }
    }
  }

  const startMarker = `<circle cx="${padding + cellSize / 2}" cy="${padding + cellSize / 2}" r="${cellSize / 4}" fill="#2a9d8f" />`;
  const exitMarker = `<circle cx="${padding + (cols - 1) * cellSize + cellSize / 2}" cy="${padding + (rows - 1) * cellSize + cellSize / 2}" r="${cellSize / 4}" fill="#e63946" />`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>
    .maze-wall { stroke: #1d3557; stroke-width: ${wallThickness}; stroke-linecap: round; }
    .seed-text { font-family: monospace; font-size: 11px; fill: #6c757d; }
  </style>
  <rect width="${width}" height="${height}" fill="#fdfdfd" rx="6" />
  <g class="maze-wall">${wallsSvg}</g>
  ${startMarker}
  ${exitMarker}
  <text x="${padding}" y="${height - 6}" class="seed-text">LABYRINTH SEED: ${escapeXml(seed)}</text>
</svg>`;

  return { seed, cols, rows, start, exit, svg };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
