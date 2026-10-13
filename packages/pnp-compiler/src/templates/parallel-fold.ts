export interface ParallelFoldSheetData {
  sheetId: string;
  title: string;
  lockSigil?: string;
  verificationSeal?: string;  // Only present if this element is a sealed reward
  interiorTitle: string;
  interiorBody: string;
  roleTags?: string[];
  singleSidedNote?: string;
}

export function renderDoubleParallelFoldSvg(data: ParallelFoldSheetData): string {
  // A4 Landscape: 297mm x 210mm with 3mm bleed margin (303mm x 216mm total)
  // Scale: 4 units per mm -> totalWidth: 1212, totalHeight: 864
  const bleed = 12; // 3mm * 4
  const sheetWidth = 1188; // 297mm * 4
  const sheetHeight = 840; // 210mm * 4
  const totalWidth = sheetWidth + bleed * 2;
  const totalHeight = sheetHeight + bleed * 2;
  const panelWidth = sheetWidth / 4; // 297 units per panel

  const hasSeal = !!data.verificationSeal;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="303mm" height="216mm">
  <style>
    .trim-mark { stroke: #000000; stroke-width: 1; }
    .fold-guide { stroke: #6c757d; stroke-dasharray: 6 6; stroke-width: 1.5; }
    .label { font-family: sans-serif; font-size: 13px; fill: #495057; }
    .title { font-family: serif; font-size: 24px; font-weight: bold; fill: #212529; }
    .sigil { font-size: 52px; text-anchor: middle; }
    .seal-box { fill: #f8f9fa; stroke: #2b2d42; stroke-width: 2.5; rx: 6; }
    .seal-text { font-family: monospace; font-size: 22px; font-weight: bold; fill: #d90429; text-anchor: middle; }
    .panel-box { fill: #ffffff; stroke: #dee2e6; rx: 4; }
    .interior-box { fill: #fffdfa; stroke: #e9ecef; rx: 4; }
    .body-text { font-family: serif; font-size: 16px; fill: #212529; }
  </style>

  <rect width="${totalWidth}" height="${totalHeight}" fill="#ffffff" />

  <!-- Corner Crop / Trim Marks -->
  <!-- Top-Left -->
  <line x1="${bleed}" y1="0" x2="${bleed}" y2="${bleed - 2}" class="trim-mark" />
  <line x1="0" y1="${bleed}" x2="${bleed - 2}" y2="${bleed}" class="trim-mark" />
  <!-- Top-Right -->
  <line x1="${totalWidth - bleed}" y1="0" x2="${totalWidth - bleed}" y2="${bleed - 2}" class="trim-mark" />
  <line x1="${totalWidth}" y1="${bleed}" x2="${totalWidth - bleed + 2}" y2="${bleed}" class="trim-mark" />
  <!-- Bottom-Left -->
  <line x1="${bleed}" y1="${totalHeight}" x2="${bleed}" y2="${totalHeight - bleed + 2}" class="trim-mark" />
  <line x1="0" y1="${totalHeight - bleed}" x2="${bleed - 2}" y2="${totalHeight - bleed}" class="trim-mark" />
  <!-- Bottom-Right -->
  <line x1="${totalWidth - bleed}" y1="${totalHeight}" x2="${totalWidth - bleed}" y2="${totalHeight - bleed + 2}" class="trim-mark" />
  <line x1="${totalWidth}" y1="${totalHeight - bleed}" x2="${totalWidth - bleed + 2}" y2="${totalHeight - bleed}" class="trim-mark" />

  <!-- 3 Vertical fold lines inside finished boundary -->
  <line x1="${bleed + panelWidth}" y1="${bleed}" x2="${bleed + panelWidth}" y2="${totalHeight - bleed}" class="fold-guide" />
  <line x1="${bleed + panelWidth * 2}" y1="${bleed}" x2="${bleed + panelWidth * 2}" y2="${totalHeight - bleed}" class="fold-guide" />
  <line x1="${bleed + panelWidth * 3}" y1="${bleed}" x2="${bleed + panelWidth * 3}" y2="${totalHeight - bleed}" class="fold-guide" />

  <text x="${bleed + 10}" y="${bleed + 20}" class="label">DOUBLE PARALLEL FOLD • ${escapeXml(data.sheetId)} • FOLD IN HALF, THEN IN HALF AGAIN IN SAME DIRECTION</text>

  <!-- Panel 1 (Leftmost): Exterior Front Flap -->
  <g id="panel-1-front" transform="translate(${bleed + 15}, ${bleed + 35})">
    <rect width="${panelWidth - 30}" height="${sheetHeight - 55}" class="panel-box" />
    <text x="${(panelWidth - 30) / 2}" y="45" class="title" text-anchor="middle">${escapeXml(data.sheetId)}</text>
    <text x="${(panelWidth - 30) / 2}" y="80" class="label" text-anchor="middle">${escapeXml(data.title)}</text>
    
    ${data.lockSigil ? `<text x="${(panelWidth - 30) / 2}" y="180" class="sigil">${escapeXml(data.lockSigil)}</text>` : ''}

    ${hasSeal ? `
    <rect x="${(panelWidth - 30) / 2 - 85}" y="235" width="170" height="48" class="seal-box" />
    <text x="${(panelWidth - 30) / 2}" y="267" class="seal-text">${escapeXml(data.verificationSeal!)}</text>
    <text x="${(panelWidth - 30) / 2}" y="320" class="label" text-anchor="middle">RESONANCE SEAL</text>
    <text x="${(panelWidth - 30) / 2}" y="350" class="label" text-anchor="middle">Verify match before opening</text>
    ` : `
    <text x="${(panelWidth - 30) / 2}" y="260" class="label" text-anchor="middle">UNSEALED ITEM</text>
    `}
  </g>

  <!-- Panels 2 & 3: Concealed Interior Spread -->
  <g id="panel-2-interior" transform="translate(${bleed + panelWidth + 15}, ${bleed + 35})">
    <rect width="${panelWidth - 30}" height="${sheetHeight - 55}" class="interior-box" />
    <text x="20" y="45" class="title">${escapeXml(data.interiorTitle)}</text>
    ${data.roleTags ? `<text x="20" y="75" class="label">ROLE: ${escapeXml(data.roleTags.join(', '))}</text>` : ''}
    <foreignObject x="20" y="95" width="${panelWidth - 70}" height="${sheetHeight - 170}">
      <div xmlns="http://www.w3.org/1999/xhtml" class="body-text">
        <p>${escapeXml(data.interiorBody.slice(0, Math.ceil(data.interiorBody.length / 2)))}</p>
      </div>
    </foreignObject>
  </g>

  <g id="panel-3-interior" transform="translate(${bleed + panelWidth * 2 + 15}, ${bleed + 35})">
    <rect width="${panelWidth - 30}" height="${sheetHeight - 55}" class="interior-box" />
    <foreignObject x="20" y="45" width="${panelWidth - 70}" height="${sheetHeight - 120}">
      <div xmlns="http://www.w3.org/1999/xhtml" class="body-text">
        <p>${escapeXml(data.interiorBody.slice(Math.ceil(data.interiorBody.length / 2)))}</p>
      </div>
    </foreignObject>
  </g>

  <!-- Panel 4 (Rightmost): Exterior Back -->
  <g id="panel-4-back" transform="translate(${bleed + panelWidth * 3 + 15}, ${bleed + 35})">
    <rect width="${panelWidth - 30}" height="${sheetHeight - 55}" class="panel-box" fill="#fafafa" />
    <text x="20" y="45" class="label">EXTERIOR BACK</text>
    <text x="20" y="90" class="label">Manual Pen Mark / Reference:</text>
    <line x1="20" y1="120" x2="${panelWidth - 50}" y2="120" stroke="#ced4da" />
    <line x1="20" y1="160" x2="${panelWidth - 50}" y2="160" stroke="#ced4da" />
    ${data.lockSigil ? `<text x="20" y="220" class="label">Sigil: ${escapeXml(data.lockSigil)}</text>` : ''}
    <text x="20" y="260" class="label">${escapeXml(data.singleSidedNote ?? 'Single-sided print note')}</text>
  </g>
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
