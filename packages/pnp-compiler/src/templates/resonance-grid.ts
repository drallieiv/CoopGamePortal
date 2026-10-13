import type { GridMatrix } from '@escape-system/contracts';

export function renderResonanceGridSvg(grid: GridMatrix, title = 'SIGIL RESONANCE MATRIX'): string {
  const cellWidth = 140;
  const cellHeight = 55;
  const headerHeight = 90;
  const rowHeaderWidth = 160;

  const width = rowHeaderWidth + grid.columns.length * cellWidth + 60;
  const height = headerHeight + grid.rows.length * cellHeight + 100;

  let columnsHeaderSvg = '';
  grid.columns.forEach((colKey, colIdx) => {
    const x = rowHeaderWidth + 30 + colIdx * cellWidth;
    columnsHeaderSvg += `
      <rect x="${x}" y="${headerHeight}" width="${cellWidth}" height="40" fill="#343a40" stroke="#495057" />
      <text x="${x + cellWidth / 2}" y="${headerHeight + 25}" font-family="monospace" font-size="14" font-weight="bold" fill="#f8f9fa" text-anchor="middle">
        ${escapeXml(colKey)}
      </text>`;
  });

  let rowsSvg = '';
  grid.rows.forEach((row, rowIdx) => {
    const y = headerHeight + 40 + rowIdx * cellHeight;

    // Row header
    rowsSvg += `
      <rect x="30" y="${y}" width="${rowHeaderWidth}" height="${cellHeight}" fill="#495057" stroke="#6c757d" />
      <text x="45" y="${y + cellHeight / 2 + 6}" font-family="sans-serif" font-size="20" fill="#ffb703">
        ${escapeXml(row.lockSigil)}
      </text>
      <text x="80" y="${y + cellHeight / 2 + 5}" font-family="sans-serif" font-size="13" font-weight="bold" fill="#f8f9fa">
        ${escapeXml(row.puzzleId.slice(0, 10))}
      </text>`;

    // Cells
    grid.columns.forEach((colKey, colIdx) => {
      const x = rowHeaderWidth + 30 + colIdx * cellWidth;
      const cell = row.cells[colKey];
      const isVoid = !cell || cell.isDecoy || !cell.seal;
      const cellBg = isVoid ? '#ffffff' : '#fdfaf6';
      const textColor = isVoid ? '#adb5bd' : '#9b2226';

      rowsSvg += `
        <rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="${cellBg}" stroke="#dee2e6" />
        <text x="${x + cellWidth / 2}" y="${y + 24}" font-family="monospace" font-size="13" font-weight="bold" fill="${textColor}" text-anchor="middle">
          ${escapeXml(cell?.seal ?? '—')}
        </text>
        <text x="${x + cellWidth / 2}" y="${y + 42}" font-family="sans-serif" font-size="11" fill="#495057" text-anchor="middle">
          ${escapeXml(cell?.targetEnvelope ?? 'VOID')}
        </text>`;
    });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>
    .title { font-family: serif; font-size: 26px; font-weight: bold; fill: #111; }
    .subtitle { font-family: sans-serif; font-size: 13px; fill: #555; }
  </style>

  <rect width="${width}" height="${height}" fill="#ffffff" />

  <text x="30" y="45" class="title">${escapeXml(title)}</text>
  <text x="30" y="70" class="subtitle">
    Find your puzzle's Lock Sigil row and match with your deduced key column. Check exterior envelope seal before opening!
  </text>

  <g id="grid-columns">${columnsHeaderSvg}</g>
  <g id="grid-rows">${rowsSvg}</g>
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
