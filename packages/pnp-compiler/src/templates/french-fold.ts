export interface FrenchFoldSheetData {
  sheetId: string;
  title: string;
  lockSigil?: string;
  verificationSeal?: string;  // Only present if this element is a sealed reward
  interiorTitle: string;
  interiorBody: string;
  roleTags?: string[];
  singleSidedNote?: string;
}

export function renderFrenchFoldSvg(data: FrenchFoldSheetData): string {
  // A4 Portrait: 210mm x 297mm with 3mm bleed margin (216mm x 303mm total)
  // Scale: 4 units per mm -> width: 864, height: 1212
  const bleed = 12; // 3mm * 4
  const sheetWidth = 840; // 210mm * 4
  const sheetHeight = 1188; // 297mm * 4
  const totalWidth = sheetWidth + bleed * 2;
  const totalHeight = sheetHeight + bleed * 2;

  const midX = totalWidth / 2;
  const midY = totalHeight / 2;

  const hasSeal = !!data.verificationSeal;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="216mm" height="303mm">
  <style>
    .trim-mark { stroke: #000000; stroke-width: 1; }
    .fold-guide { stroke: #6c757d; stroke-dasharray: 6 6; stroke-width: 1.5; }
    .label { font-family: sans-serif; font-size: 13px; fill: #495057; }
    .title { font-family: serif; font-size: 26px; font-weight: bold; fill: #212529; }
    .sigil { font-size: 58px; text-anchor: middle; }
    .seal-box { fill: #f8f9fa; stroke: #2b2d42; stroke-width: 2.5; rx: 6; }
    .seal-text { font-family: monospace; font-size: 24px; font-weight: bold; fill: #d90429; text-anchor: middle; }
    .interior-box { fill: #fffdfa; stroke: #dee2e6; stroke-width: 1; rx: 6; }
    .body-text { font-family: serif; font-size: 17px; fill: #212529; }
  </style>

  <!-- Background with Bleed -->
  <rect width="${totalWidth}" height="${totalHeight}" fill="#ffffff" />

  <!-- Corner Crop / Trim Marks (Marks the 210mm x 297mm finished sheet boundary) -->
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

  <!-- Fold guidelines inside finished sheet boundary -->
  <!-- Horizontal fold (fold top to bottom) -->
  <line x1="${bleed}" y1="${midY}" x2="${totalWidth - bleed}" y2="${midY}" class="fold-guide" />
  <!-- Vertical fold (fold left to right) -->
  <line x1="${midX}" y1="${bleed}" x2="${midX}" y2="${totalHeight - bleed}" class="fold-guide" />

  <!-- Top Margin Annotation -->
  <text x="${bleed + 10}" y="${bleed + 20}" class="label">FRENCH FOLD • ${escapeXml(data.sheetId)} • FOLD IN HALF HORIZONTALLY, THEN VERTICALLY</text>

  <!-- Quadrant 1 (Top-Left): Exterior Back / Manual Marking Area -->
  <g id="quadrant-back" transform="translate(${bleed + 25}, ${bleed + 40})">
    <rect width="${(sheetWidth / 2) - 50}" height="${(sheetHeight / 2) - 70}" fill="#fcfcfc" stroke="#e9ecef" rx="4" />
    <text x="25" y="40" class="label">EXTERIOR BACK (CONCEALED WHEN CLOSED)</text>
    <text x="25" y="80" class="label">Manual Pen Reference / Notes:</text>
    <line x1="25" y1="110" x2="${(sheetWidth / 2) - 80}" y2="110" stroke="#ced4da" />
    <line x1="25" y1="145" x2="${(sheetWidth / 2) - 80}" y2="145" stroke="#ced4da" />
    ${data.lockSigil ? `<text x="25" y="210" class="label">Sigil Reference: ${escapeXml(data.lockSigil)}</text>` : ''}
    <text x="25" y="250" class="label">${escapeXml(data.singleSidedNote ?? 'Single-sided print: Write ID on back before folding.')}</text>
  </g>

  <!-- Quadrant 2 (Top-Right): Exterior Front Flap -->
  <g id="quadrant-front" transform="translate(${midX + 25}, ${bleed + 40})">
    <rect width="${(sheetWidth / 2) - 50}" height="${(sheetHeight / 2) - 70}" fill="#f8f9fa" stroke="#343a40" stroke-width="2" rx="6" />
    <text x="${((sheetWidth / 2) - 50) / 2}" y="55" class="title" text-anchor="middle">${escapeXml(data.sheetId)}</text>
    <text x="${((sheetWidth / 2) - 50) / 2}" y="90" class="label" text-anchor="middle">${escapeXml(data.title)}</text>
    
    ${data.lockSigil ? `<text x="${((sheetWidth / 2) - 50) / 2}" y="185" class="sigil">${escapeXml(data.lockSigil)}</text>` : ''}

    ${hasSeal ? `
    <!-- Verification Seal on Exterior Flap (Only if this element is a sealed reward) -->
    <rect x="${((sheetWidth / 2) - 50) / 2 - 110}" y="240" width="220" height="55" class="seal-box" />
    <text x="${((sheetWidth / 2) - 50) / 2}" y="277" class="seal-text">${escapeXml(data.verificationSeal!)}</text>
    <text x="${((sheetWidth / 2) - 50) / 2}" y="325" class="label" text-anchor="middle">DO NOT OPEN UNTIL RESONANCE SEAL MATCHES</text>
    ` : `
    <text x="${((sheetWidth / 2) - 50) / 2}" y="270" class="label" text-anchor="middle">UNSEALED GAME ELEMENT</text>
    `}
  </g>

  <!-- Bottom Half (Quadrants 3 & 4): Concealed Interior Spread -->
  <g id="interior-spread" transform="translate(${bleed + 25}, ${midY + 25})">
    <rect width="${sheetWidth - 50}" height="${(sheetHeight / 2) - 50}" class="interior-box" />
    <text x="35" y="55" class="title">${escapeXml(data.interiorTitle)}</text>
    ${data.roleTags && data.roleTags.length > 0 ? `<text x="35" y="85" class="label">EXCLUSIVE TO ROLE: ${escapeXml(data.roleTags.join(', '))}</text>` : ''}
    
    <foreignObject x="35" y="105" width="${sheetWidth - 120}" height="${(sheetHeight / 2) - 160}">
      <div xmlns="http://www.w3.org/1999/xhtml" class="body-text">
        <p>${escapeXml(data.interiorBody)}</p>
      </div>
    </foreignObject>
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
