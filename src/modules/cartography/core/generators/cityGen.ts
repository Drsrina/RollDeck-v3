/**
 * Procedural Fantasy City & Town Generator
 * Generates organic street networks, district blocks, city walls, river and POIs.
 */

import { MapDocument, Point, Settlement, SplinePath, StampItem, TextLabel } from '../../types/map';
import { Mulberry32 } from '../prng';
import { BIOME_INDEX } from './worldGen';
import { generateSettlementName } from '../nameGenerator';

export function generateCityMap(seed: number = 42, width: number = 1200, height: number = 800): Partial<MapDocument> {
  const rng = new Mulberry32(seed);
  const res = 4;
  const cols = Math.floor(width / res);
  const rows = Math.floor(height / res);
  const terrainData = new Uint8Array(cols * rows);

  // Default ground: grassland
  terrainData.fill(BIOME_INDEX.grassland);

  // River meandering across city
  const riverPoints: Point[] = [];
  const startY = height * rng.nextFloat(0.3, 0.4);
  const endY = height * rng.nextFloat(0.6, 0.7);
  riverPoints.push({ x: 0, y: startY });
  riverPoints.push({ x: width * 0.35, y: startY + 60 });
  riverPoints.push({ x: width * 0.65, y: endY - 40 });
  riverPoints.push({ x: width, y: endY });

  // Paint river on terrain
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * res;
      const py = y * res;
      // Distance to river spline segment
      let minRiverDist = 9999;
      for (let i = 0; i < riverPoints.length - 1; i++) {
        const p1 = riverPoints[i];
        const p2 = riverPoints[i + 1];
        const d = distToSegment({ x: px, y: py }, p1, p2);
        if (d < minRiverDist) minRiverDist = d;
      }
      if (minRiverDist < 35) {
        terrainData[y * cols + x] = BIOME_INDEX.shallow_ocean;
      } else if (minRiverDist < 42) {
        terrainData[y * cols + x] = BIOME_INDEX.beach;
      }
    }
  }

  // City center & wall perimeter (oval / rounded polygon)
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const radiusX = width * 0.34;
  const radiusY = height * 0.32;
  const wallPoints: Point[] = [];
  const numWallVertices = 16;

  for (let i = 0; i <= numWallVertices; i++) {
    const angle = (i * 2 * Math.PI) / numWallVertices;
    const jitter = rng.nextFloat(0.9, 1.1);
    const wx = centerX + Math.cos(angle) * radiusX * jitter;
    const wy = centerY + Math.sin(angle) * radiusY * jitter;
    wallPoints.push({ x: wx, y: wy });
  }

  // Paved city ground inside wall
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * res;
      const py = y * res;
      const dx = (px - centerX) / radiusX;
      const dy = (py - centerY) / radiusY;
      if (dx * dx + dy * dy < 0.95) {
        const idx = y * cols + x;
        if (terrainData[idx] !== BIOME_INDEX.shallow_ocean && terrainData[idx] !== BIOME_INDEX.beach) {
          terrainData[idx] = rng.next() > 0.3 ? BIOME_INDEX.stone_road : BIOME_INDEX.wood_floor;
        }
      }
    }
  }

  // Main Avenue Thoroughfares
  const streetPaths: SplinePath[] = [];
  // North-South main street
  streetPaths.push({
    id: `street-main-ns`,
    type: 'road',
    points: [
      { x: centerX, y: centerY - radiusY * 0.95 },
      { x: centerX - 20, y: centerY },
      { x: centerX + 10, y: centerY + radiusY * 0.95 },
    ],
    width: 6,
  });

  // East-West main street
  streetPaths.push({
    id: `street-main-ew`,
    type: 'road',
    points: [
      { x: centerX - radiusX * 0.95, y: centerY + 20 },
      { x: centerX, y: centerY },
      { x: centerX + radiusX * 0.95, y: centerY - 15 },
    ],
    width: 6,
  });

  // Secondary alleys
  for (let a = 0; a < 6; a++) {
    const ox = centerX + rng.nextFloat(-radiusX * 0.65, radiusX * 0.65);
    const oy = centerY + rng.nextFloat(-radiusY * 0.65, radiusY * 0.65);
    streetPaths.push({
      id: `alley-${a}`,
      type: 'road',
      points: [
        { x: ox - 40, y: oy + rng.nextFloat(-20, 20) },
        { x: ox, y: oy },
        { x: ox + 45, y: oy + rng.nextFloat(-25, 25) },
      ],
      width: 3.5,
      dashed: false,
    });
  }

  // City Wall path
  const paths: SplinePath[] = [
    {
      id: 'city-river',
      type: 'river',
      points: riverPoints,
      width: 22,
    },
    {
      id: 'city-wall',
      type: 'wall',
      points: wallPoints,
      width: 7,
      color: '#3a2618',
    },
    ...streetPaths,
  ];

  // Stamps for towers at wall vertices
  const stamps: StampItem[] = [];
  for (let i = 0; i < numWallVertices; i += 2) {
    const wp = wallPoints[i];
    stamps.push({
      id: `wall-tower-${i}`,
      type: 'tower',
      x: wp.x,
      y: wp.y,
      scale: 0.8,
      rotation: 0,
      opacity: 1,
    });
  }

  // Major Landmark Stamps inside city
  stamps.push(
    {
      id: 'stamp-citadel',
      type: 'castle',
      x: centerX - radiusX * 0.45,
      y: centerY - radiusY * 0.35,
      scale: 1.4,
      rotation: 0,
      opacity: 1,
    },
    {
      id: 'stamp-cathedral',
      type: 'city_icon',
      x: centerX + radiusX * 0.3,
      y: centerY - radiusY * 0.3,
      scale: 1.2,
      rotation: 0,
      opacity: 1,
    },
    {
      id: 'stamp-portcullis-north',
      type: 'fortress',
      x: centerX,
      y: centerY - radiusY * 0.95,
      scale: 0.9,
      rotation: 0,
      opacity: 1,
    },
    {
      id: 'stamp-dock-ship',
      type: 'ship',
      x: width * 0.38,
      y: startY + 65,
      scale: 0.7,
      rotation: -10,
      opacity: 1,
    }
  );

  // Points of Interest & Markers
  const cityName = generateSettlementName('human', 'city', rng);
  const pois = [
    { title: 'Fortaleza da Guarda Alta', desc: 'Sede do lorde regente e quartel dos guardas de elite.', x: centerX - radiusX * 0.45, y: centerY - radiusY * 0.35, secret: false, cat: 'poi' as const },
    { title: 'Grande Templo da Aurora', desc: 'Santuário de pedra branca com catacumbas sagradas secretas sob o altar.', x: centerX + radiusX * 0.3, y: centerY - radiusY * 0.3, secret: true, cat: 'quest' as const },
    { title: 'Praça do Mercado e Doca', desc: 'Bazar agitado com mercadores de especiarias e marinheiros.', x: width * 0.42, y: startY + 80, secret: false, cat: 'poi' as const },
    { title: 'Taverna do Javali Saltitante', desc: 'Ponto de encontro de contrabandistas e aventureiros em busca de contratos.', x: centerX + 40, y: centerY + 60, secret: false, cat: 'poi' as const },
    { title: 'Torre de Astromancia', desc: 'Refúgio de um mago que esconde um portal instável no observatório.', x: centerX + radiusX * 0.55, y: centerY + 40, secret: true, cat: 'quest' as const },
  ];

  const markers = pois.map((p, idx) => ({
    id: `poi-${idx}`,
    number: idx + 1,
    x: p.x,
    y: p.y - 18,
    title: p.title,
    description: p.desc,
    isSecret: p.secret,
    category: p.cat,
  }));

  const labels: TextLabel[] = [
    {
      id: 'city-title',
      text: `CIDADE LIVRE DE ${cityName.toUpperCase()}`,
      x: width * 0.5,
      y: 60,
      rotation: 0,
      fontSize: 24,
      fontFamily: 'Cinzel',
      letterSpacing: 3,
      isBanner: true,
      bannerStyle: 'ribbon',
    },
  ];

  const settlements: Settlement[] = [
    {
      id: 'city-root',
      name: cityName,
      type: 'city',
      culture: 'human',
      x: centerX,
      y: centerY,
      population: 18500,
    },
  ];

  return {
    title: `Cidade de ${cityName}`,
    mode: 'city',
    width,
    height,
    seed,
    terrainData,
    gridResolution: res,
    paths,
    stamps,
    labels,
    markers,
    settlements,
    fogData: new Uint8Array(cols * rows),
    fogResolution: res,
    updatedAt: Date.now(),
  };
}

function distToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
  if (l2 === 0) return Math.sqrt((p.x - v.x) * (p.x - v.x) + (p.y - v.y) * (p.y - v.y));
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = v.x + t * (w.x - v.x);
  const projY = v.y + t * (w.y - v.y);
  const dx = p.x - projX;
  const dy = p.y - projY;
  return Math.sqrt(dx * dx + dy * dy);
}
