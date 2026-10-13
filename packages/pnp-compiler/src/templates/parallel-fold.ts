export interface ParallelFoldSheetData {
  itemRefId: string;
  title: string;
  lockSigil: string;
  verificationSeal: string;
  interiorTitle: string;
  interiorBody: string;
  roleTags?: string[];
  singleSidedNote?: string;
}

export function renderDoubleParallelFoldSvg(data: ParallelFoldSheetData): string {
  // A4 Landscape dimensions (297mm x 210mm @ scale 4 = 1188 x 840)
  const width = 1188;
  const height = 840;
  const panelWidth = width / 4; // 297 units per panel

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>
    .guide { stroke: #888; stroke-dasharray: 6 6; stroke-width: 1.5; }
    .label { font-family: sans-serif; font-size: 13px; fill: #444; }
    .title { font-family: serif; font-size: 24px; font-weight: bold; fill: #111; }
    .sigil { font-size: 56px; text-anchor: middle; }
    .seal-box { fill: #f8f9fa; stroke: #2b2d42; stroke-width: 2.5; rx: 6; }
    .seal-text { font-family: monospace; font-size: 22px; font-weight: bold; fill: #d90429; text-anchor: middle; }
    .panel-box { fill: #fff; stroke: #ddd; rx: 4; }
    .interior-box { fill: #fffdf7; stroke: #e0e0e0; rx: 4; }
    .body-text { font-family: serif; font-size: 16px; fill: #222; }
  </style>

  <rect width="${width}" height="${height}" fill="#ffffff" />

  <!-- 3 Vertical fold lines -->
  <line x1="${panelWidth}" y1="0" x2="${panelWidth}" y2="${height}" class="guide" />
  <line x1="${panelWidth * 2}" y1="0" x2="${panelWidth * 2}" y2="${height}" class="guide" />
  <line x1="${panelWidth * 3}" y1="0" x2="${panelWidth * 3}" y2="${height}" class="guide" />

  <text x="20" y="25" class="label">DOUBLE PARALLEL FOLD • ${escapeXml(data.itemRefId)} • FOLD IN HALF, THEN IN HALF AGAIN IN SAME DIRECTION</text>

  <!-- Panel 1 (Leftmost): Exterior Front Flap with Verification Seal -->
  <g id="panel-1-front" transform="translate(15, 45)">
    <rect width="${panelWidth - 30}" height="${height - 70}" class="panel-box" />
    <text x="${(panelWidth - 30) / 2}" y="50" class="title" text-anchor="middle">${escapeXml(data.itemRefId)}</text>
    <text x="${(panelWidth - 30) / 2}" y="85" class="label" text-anchor="middle">${escapeXml(data.title)}</text>
    
    <text x="${(panelWidth - 30) / 2}" y="190" class="sigil">${escapeXml(data.lockSigil)}</text>

    <!-- Verification Seal -->
    <rect x="${(panelWidth - 30) / 2 - 90}" y="250" width="180" height="50" class="seal-box" />
    <text x="${(panelWidth - 30) / 2}" y="284" class="seal-text">${escapeXml(data.verificationSeal)}</text>

    <text x="${(panelWidth - 30) / 2}" y="340" class="label" text-anchor="middle">RESONANCE SEAL</text>
    <text x="${(panelWidth - 30) / 2}" y="380" class="label" text-anchor="middle">Verify match before opening</text>
  </g>

  <!-- Panels 2 & 3: Concealed Interior Spread -->
  <g id="panel-2-interior" transform="translate(${panelWidth + 15}, 45)">
    <rect width="${panelWidth - 30}" height="${height - 70}" class="interior-box" />
    <text x="20" y="50" class="title">${escapeXml(data.interiorTitle)}</text>
    ${data.roleTags ? `<text x="20" y="80" class="label">ROLE: ${escapeXml(data.roleTags.join(', '))}</text>` : ''}
    <foreignObject x="20" y="100" width="${panelWidth - 70}" height="${height - 200}">
      <div xmlns="http://www.w3.org/1999/xhtml" class="body-text">
        <p>${escapeXml(data.interiorBody.slice(0, Math.ceil(data.interiorBody.length / 2)))}</p>
      </div>
    </foreignObject>
  </g>

  <g id="panel-3-interior" transform="translate(${panelWidth * 2 + 15}, 45)">
    <rect width="${panelWidth - 30}" height="${height - 70}" class="interior-box" />
    <foreignObject x="20" y="50" width="${panelWidth - 70}" height="${height - 150}">
      <div xmlns="http://www.w3.org/1999/xhtml" class="body-text">
        <p>${escapeXml(data.interiorBody.slice(Math.ceil(data.interiorBody.length / 2)))}</p>
      </div>
    </foreignObject>
  </g>

  <!-- Panel 4 (Rightmost): Exterior Back / Single-Sided Manual Mark Guide -->
  <g id="panel-4-back" transform="translate(${panelWidth * 3 + 15}, 45)">
    <rect width="${panelWidth - 30}" height="${height - 70}" class="panel-box" fill="#fafafa" />
    <text x="20" y="50" class="label">EXTERIOR BACK</text>
    <text x="20" y="100" class="label">Manual Pen Mark / Reference:</text>
    <line x1="20" y1="130" x2="${panelWidth - 50}" y2="130" stroke="#aaa" />
    <line x1="20" y1="170" x2="${panelWidth - 50}" y2="170" stroke="#aaa" />
    <text x="20" y="230" class="label">Sigil: ${escapeXml(data.lockSigil)}</text>
    <text x="20" y="270" class="label">${escapeXml(data.singleSidedNote ?? 'Single-sided print note')}</text>
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
