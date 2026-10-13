export interface FrenchFoldSheetData {
  itemRefId: string;
  title: string;
  lockSigil: string;
  verificationSeal: string;
  interiorTitle: string;
  interiorBody: string;
  roleTags?: string[];
  singleSidedNote?: string;
}

export function renderFrenchFoldSvg(data: FrenchFoldSheetData): string {
  // Standard A4 dimensions in viewBox units (210mm x 297mm @ scale 4 = 840 x 1188)
  const width = 840;
  const height = 1188;
  const midX = width / 2;
  const midY = height / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>
    .guide { stroke: #888; stroke-dasharray: 6 6; stroke-width: 1.5; }
    .cut-guide { stroke: #e63946; stroke-dasharray: 4 4; stroke-width: 1.5; }
    .label { font-family: sans-serif; font-size: 14px; fill: #444; }
    .title { font-family: serif; font-size: 28px; font-weight: bold; fill: #111; }
    .sigil { font-size: 64px; text-anchor: middle; }
    .seal-box { fill: #f8f9fa; stroke: #2b2d42; stroke-width: 3; rx: 8; }
    .seal-text { font-family: monospace; font-size: 26px; font-weight: bold; fill: #d90429; text-anchor: middle; }
    .interior-box { fill: #fffdf7; stroke: #ccc; stroke-width: 1; rx: 6; }
    .body-text { font-family: serif; font-size: 18px; fill: #222; }
  </style>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#ffffff" />

  <!-- Fold guidelines -->
  <!-- Horizontal fold (fold top to bottom) -->
  <line x1="0" y1="${midY}" x2="${width}" y2="${midY}" class="guide" />
  <!-- Vertical fold (fold left to right) -->
  <line x1="${midX}" y1="0" x2="${midX}" y2="${height}" class="guide" />

  <!-- Margin annotations -->
  <text x="20" y="30" class="label">FRENCH FOLD SHEET • ${escapeXml(data.itemRefId)} • FOLD IN HALF HORIZONTALLY, THEN VERTICALLY</text>

  <!-- Quadrant 1 (Top-Left): Exterior Back / Manual Pen Marking Area -->
  <g id="quadrant-back" transform="translate(40, 60)">
    <rect width="${midX - 80}" height="${midY - 100}" fill="#fdfdfd" stroke="#eee" />
    <text x="30" y="50" class="label">EXTERIOR BACK (CONCEALED WHEN CLOSED)</text>
    <text x="30" y="100" class="label">Manual Pen Check / Host Notes:</text>
    <line x1="30" y1="130" x2="${midX - 120}" y2="130" stroke="#aaa" />
    <line x1="30" y1="170" x2="${midX - 120}" y2="170" stroke="#aaa" />
    <text x="30" y="240" class="label">Sigil: ${escapeXml(data.lockSigil)}</text>
    <text x="30" y="280" class="label">${escapeXml(data.singleSidedNote ?? 'Single-sided print: write reference on back.')}</text>
  </g>

  <!-- Quadrant 2 (Top-Right): Exterior Front Flap with Verification Seal -->
  <g id="quadrant-front" transform="translate(${midX + 40}, 60)">
    <rect width="${midX - 80}" height="${midY - 100}" fill="#f8f9fa" stroke="#333" stroke-width="2" rx="6" />
    <text x="${(midX - 80) / 2}" y="60" class="title" text-anchor="middle">${escapeXml(data.itemRefId)}</text>
    <text x="${(midX - 80) / 2}" y="100" class="label" text-anchor="middle">${escapeXml(data.title)}</text>
    
    <text x="${(midX - 80) / 2}" y="200" class="sigil">${escapeXml(data.lockSigil)}</text>

    <!-- Verification Seal on Exterior Flap -->
    <rect x="${(midX - 80) / 2 - 120}" y="260" width="240" height="60" class="seal-box" />
    <text x="${(midX - 80) / 2}" y="300" class="seal-text">${escapeXml(data.verificationSeal)}</text>

    <text x="${(midX - 80) / 2}" y="360" class="label" text-anchor="middle">DO NOT OPEN UNTIL RESONANCE SEAL MATCHES</text>
  </g>

  <!-- Bottom Half (Quadrants 3 & 4): Concealed Interior Spread -->
  <g id="interior-spread" transform="translate(40, ${midY + 40})">
    <rect width="${width - 80}" height="${midY - 80}" class="interior-box" />
    <text x="40" y="60" class="title">${escapeXml(data.interiorTitle)}</text>
    ${data.roleTags ? `<text x="40" y="90" class="label">RESTRICTED DOSSIER: ${escapeXml(data.roleTags.join(', '))}</text>` : ''}
    
    <foreignObject x="40" y="110" width="${width - 160}" height="${midY - 200}">
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
