/**
 * Vector SVG Exporter for Cartógrafo
 * Generates standalone SVG vector files of map line work, text and stamps.
 */

import { MapDocument } from '../types/map';
import { VISUAL_THEMES } from './styles';

export function exportMapToSvg(doc: MapDocument, isPlayerMode: boolean = false): string {
  const theme = VISUAL_THEMES[doc.style] || VISUAL_THEMES.parchment;
  const { width, height } = doc;

  const svgParts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `  <defs>`,
    `    <style>`,
    `      .label-text { font-family: 'Cinzel', serif; fill: ${theme.textColor}; text-anchor: middle; dominant-baseline: middle; }`,
    `      .banner-box { fill: ${theme.background}; stroke: ${theme.borderColor}; stroke-width: 2; }`,
    `      .spline-river { fill: none; stroke: ${theme.riverColor}; stroke-linecap: round; stroke-linejoin: round; }`,
    `      .spline-road { fill: none; stroke: ${theme.roadColor}; stroke-linecap: round; stroke-dasharray: 6,4; }`,
    `      .spline-wall { fill: none; stroke: ${theme.borderColor}; stroke-linecap: round; }`,
    `    </style>`,
    `  </defs>`,
    `  <!-- Background wash -->`,
    `  <rect width="100%" height="100%" fill="${theme.background}" />`,
  ];

  // Paths
  svgParts.push(`  <g id="paths">`);
  doc.paths.forEach((path) => {
    if (path.points.length < 2) return;
    let d = `M ${path.points[0].x} ${path.points[0].y}`;
    for (let i = 1; i < path.points.length; i++) {
      d += ` L ${path.points[i].x} ${path.points[i].y}`;
    }
    const cls = path.type === 'river' ? 'spline-river' : path.type === 'road' ? 'spline-road' : 'spline-wall';
    svgParts.push(`    <path d="${d}" class="${cls}" stroke-width="${path.width}" />`);
  });
  svgParts.push(`  </g>`);

  // Text labels
  svgParts.push(`  <g id="labels">`);
  doc.labels.forEach((lbl) => {
    svgParts.push(
      `    <text x="${lbl.x}" y="${lbl.y}" font-size="${lbl.fontSize}" class="label-text" transform="rotate(${lbl.rotation} ${lbl.x} ${lbl.y})">${escapeXml(lbl.text)}</text>`
    );
  });
  svgParts.push(`  </g>`);

  // Markers
  svgParts.push(`  <g id="markers">`);
  doc.markers.forEach((m) => {
    if (isPlayerMode && m.isSecret) return;
    svgParts.push(
      `    <circle cx="${m.x}" cy="${m.y}" r="12" fill="${m.isSecret ? '#991b1b' : theme.inkColor}" stroke="#f59e0b" stroke-width="2" />`,
      `    <text x="${m.x}" y="${m.y + 4}" font-size="11" fill="#ffffff" font-family="sans-serif" font-weight="bold" text-anchor="middle">${m.number}</text>`
    );
  });
  svgParts.push(`  </g>`);

  // Compass Rose
  if (doc.showCompass) {
    const cp = doc.compassPos || { x: width - 85, y: 85 };
    svgParts.push(
      `  <g id="compass" transform="translate(${cp.x}, ${cp.y})">`,
      `    <circle r="36" fill="none" stroke="${theme.compassColor}" stroke-width="1.5" />`,
      `    <polygon points="0,-40 -12,0 0,-12 12,0" fill="${theme.inkColor}" />`,
      `    <polygon points="0,40 -12,0 0,12 12,0" fill="${theme.inkSecondary}" />`,
      `    <text y="-44" font-size="14" font-family="Cinzel, serif" font-weight="bold" text-anchor="middle" fill="${theme.textColor}">N</text>`,
      `  </g>`
    );
  }

  // Border Frame
  if (doc.showBorder) {
    svgParts.push(
      `  <rect x="12" y="12" width="${width - 24}" height="${height - 24}" fill="none" stroke="${theme.borderColor}" stroke-width="5" />`,
      `  <rect x="18" y="18" width="${width - 36}" height="${height - 36}" fill="none" stroke="${theme.borderColor}" stroke-width="1.2" />`
    );
  }

  svgParts.push(`</svg>`);
  return svgParts.join('\n');
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
