/**
 * Procedural World & Region Generator
 * Generates elevation, moisture, biomes, rivers, settlements, roads and natural stamps.
 */

import { BiomeType, MapDocument, Point, Settlement, SplinePath, StampItem, TextLabel } from '../../types/map';
import { Mulberry32, SimplexNoise } from '../prng';
import { generateGeographicFeatureName, generateKingdomName, generateSettlementName } from '../nameGenerator';

export interface WorldGenOptions {
  seed: number;
  width: number;
  height: number;
  gridResolution?: number; // default 4 (e.g. 1024 / 4 = 256x256 grid)
  landRatio?: number; // 0.2 to 0.8 (default 0.5)
  roughness?: number; // 1 to 5 (octaves)
  moistureLevel?: number; // 0.5 default
  numSettlements?: number; // 6 to 18
  numContinents?: number; // 1 to 4
}

// Biome index enum for Uint8Array storage
export const BIOME_INDEX: Record<BiomeType, number> = {
  deep_ocean: 0,
  shallow_ocean: 1,
  beach: 2,
  grassland: 3,
  forest: 4,
  dense_forest: 5,
  desert: 6,
  swamp: 7,
  tundra: 8,
  snow: 9,
  mountain: 10,
  peak: 11,
  volcano: 12,
  dungeon_floor: 13,
  dungeon_wall: 14,
  stone_road: 15,
  wood_floor: 16,
};

export const INDEX_TO_BIOME: BiomeType[] = [
  'deep_ocean',
  'shallow_ocean',
  'beach',
  'grassland',
  'forest',
  'dense_forest',
  'desert',
  'swamp',
  'tundra',
  'snow',
  'mountain',
  'peak',
  'volcano',
  'dungeon_floor',
  'dungeon_wall',
  'stone_road',
  'wood_floor',
];

export function generateWorldMap(options: WorldGenOptions): Partial<MapDocument> {
  const seed = options.seed || Math.floor(Math.random() * 1000000);
  const rng = new Mulberry32(seed);
  const simplexElev = new SimplexNoise(seed);
  const simplexMoist = new SimplexNoise(seed + 4096);

  const width = options.width || 1200;
  const height = options.height || 800;
  const res = options.gridResolution || 4;
  const cols = Math.floor(width / res);
  const rows = Math.floor(height / res);

  const landRatio = options.landRatio ?? 0.5;
  const octaves = options.roughness ? Math.min(6, Math.max(2, Math.floor(options.roughness))) : 4;
  const numContinents = options.numContinents ?? 2;
  const targetSettlements = options.numSettlements ?? 8;

  const elevationGrid = new Float32Array(cols * rows);
  const moistureGrid = new Float32Array(cols * rows);
  const terrainData = new Uint8Array(cols * rows);

  // Generate continent centers
  const centers: Point[] = [];
  for (let c = 0; c < numContinents; c++) {
    centers.push({
      x: cols * rng.nextFloat(0.25, 0.75),
      y: rows * rng.nextFloat(0.25, 0.75),
    });
  }

  // 1. Calculate Elevation with Continental Island Falloff
  const maxDim = Math.max(cols, rows) * 0.5;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      // Multi-frequency noise
      const nx = x / cols - 0.5;
      const ny = y / rows - 0.5;

      const rawElev = simplexElev.fbm2D(nx * 3.2, ny * 3.2, octaves, 0.52, 2.05);

      // Distance to closest continent center
      let minDist = 999999;
      for (const center of centers) {
        const dx = x - center.x;
        const dy = y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) minDist = dist;
      }

      // Island radial falloff
      const falloff = Math.max(0, 1 - Math.pow(minDist / (maxDim * 0.95), 1.8));
      const elev = (rawElev * 0.65 + 0.35) * (falloff * 0.8 + 0.2) + (landRatio - 0.5) * 0.45;

      elevationGrid[idx] = Math.max(0, Math.min(1, elev));

      // Moisture
      const rawMoist = simplexMoist.fbm2D(nx * 2.8 + 12.3, ny * 2.8 + 7.9, 3, 0.5, 2.0);
      const moist = Math.max(0, Math.min(1, rawMoist * 0.5 + 0.5 + (options.moistureLevel ?? 0.5) * 0.2 - 0.1));
      moistureGrid[idx] = moist;

      // Classify Biome
      terrainData[idx] = BIOME_INDEX[getBiomeFromElevMoist(elevationGrid[idx], moist, y / rows)];
    }
  }

  // 2. Simulate Rivers downhill to sea
  const riverPaths: SplinePath[] = [];
  const numRivers = rng.nextInt(3, 6);

  // Find high elevation sources
  const mountainCells: { x: number; y: number; elev: number }[] = [];
  for (let y = 5; y < rows - 5; y++) {
    for (let x = 5; x < cols - 5; x++) {
      const e = elevationGrid[y * cols + x];
      if (e > 0.68) {
        mountainCells.push({ x, y, elev: e });
      }
    }
  }

  for (let r = 0; r < numRivers && mountainCells.length > 0; r++) {
    const startCell = mountainCells[rng.nextInt(0, mountainCells.length - 1)];
    let curX = startCell.x;
    let curY = startCell.y;
    const points: Point[] = [{ x: curX * res, y: curY * res }];
    let steps = 0;

    while (steps < 180) {
      steps++;
      let lowestX = curX;
      let lowestY = curY;
      let lowestE = elevationGrid[curY * cols + curX];

      // Check 8 neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = curX + dx;
          const ny = curY + dy;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          const e = elevationGrid[ny * cols + nx];
          if (e < lowestE) {
            lowestE = e;
            lowestX = nx;
            lowestY = ny;
          }
        }
      }

      // If trapped or reached sea
      if (lowestX === curX && lowestY === curY) {
        // slight jitter towards boundary
        curX += rng.choice([-1, 0, 1]);
        curY += rng.choice([-1, 0, 1]);
      } else {
        curX = lowestX;
        curY = lowestY;
      }

      points.push({ x: curX * res, y: curY * res });
      // Sea level check (< 0.35)
      if (elevationGrid[curY * cols + curX] < 0.35) {
        // flow slightly into shallow sea
        points.push({ x: (curX + rng.nextInt(-1, 1)) * res, y: (curY + rng.nextInt(-1, 1)) * res });
        break;
      }
    }

    if (points.length >= 6) {
      // Subsample smooth points
      const sampled: Point[] = [];
      const step = Math.max(1, Math.floor(points.length / 10));
      for (let i = 0; i < points.length; i += step) {
        sampled.push(points[i]);
      }
      if (sampled[sampled.length - 1] !== points[points.length - 1]) {
        sampled.push(points[points.length - 1]);
      }

      riverPaths.push({
        id: `river-${r}-${Date.now()}`,
        type: 'river',
        points: sampled,
        width: 3.5,
      });
    }
  }

  // 3. Settlement Generation with Geographic Scoring
  const settlements: Settlement[] = [];
  const candidateCells: { x: number; y: number; score: number; isCoast: boolean }[] = [];

  for (let y = 10; y < rows - 10; y += 2) {
    for (let x = 10; x < cols - 10; x += 2) {
      const e = elevationGrid[y * cols + x];
      if (e >= 0.36 && e <= 0.65) {
        // Habitable land
        let isCoast = false;
        // check if neighbor is water
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (elevationGrid[ny * cols + nx] < 0.35) {
              isCoast = true;
              break;
            }
          }
          if (isCoast) break;
        }

        const score = (isCoast ? 2.5 : 1.0) + (0.6 - Math.abs(e - 0.45));
        candidateCells.push({ x, y, score, isCoast });
      }
    }
  }

  // Pick diverse settlements
  candidateCells.sort((a, b) => b.score - a.score);
  const cultures = ['human', 'elven', 'dwarven', 'arcane'] as const;

  for (let i = 0; i < targetSettlements && candidateCells.length > 0; i++) {
    // pick with spacing
    let pickedIdx = -1;
    for (let c = 0; c < candidateCells.length; c++) {
      const cand = candidateCells[c];
      const cx = cand.x * res;
      const cy = cand.y * res;

      let tooClose = false;
      for (const s of settlements) {
        const dx = s.x - cx;
        const dy = s.y - cy;
        if (Math.sqrt(dx * dx + dy * dy) < 140) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        pickedIdx = c;
        break;
      }
    }

    if (pickedIdx === -1) break;
    const cand = candidateCells.splice(pickedIdx, 1)[0];
    const culture = cultures[i % cultures.length];

    let type: Settlement['type'] = 'town';
    if (i === 0) type = 'capital';
    else if (cand.isCoast) type = 'port';
    else if (i === 1) type = 'city';
    else if (rng.next() > 0.6) type = 'ruin';
    else type = 'village';

    const name = generateSettlementName(culture, type, rng);
    settlements.push({
      id: `settlement-${i}-${Date.now()}`,
      name,
      type,
      culture,
      x: cand.x * res,
      y: cand.y * res,
      population: type === 'capital' ? 24000 : type === 'city' ? 12000 : 2500,
    });
  }

  // 4. Connect settlements with Roads (Minimum Spanning Tree / nearest neighbor)
  const roadPaths: SplinePath[] = [];
  if (settlements.length > 1) {
    const connected = new Set<number>([0]);
    while (connected.size < settlements.length) {
      let minDist = 999999;
      let fromIdx = 0;
      let toIdx = 1;

      for (const u of connected) {
        for (let v = 0; v < settlements.length; v++) {
          if (!connected.has(v)) {
            const dx = settlements[u].x - settlements[v].x;
            const dy = settlements[u].y - settlements[v].y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < minDist) {
              minDist = d;
              fromIdx = u;
              toIdx = v;
            }
          }
        }
      }

      connected.add(toIdx);
      const p1 = settlements[fromIdx];
      const p2 = settlements[toIdx];

      // Curving road midpoint
      const midX = (p1.x + p2.x) / 2 + rng.nextFloat(-25, 25);
      const midY = (p1.y + p2.y) / 2 + rng.nextFloat(-25, 25);

      roadPaths.push({
        id: `road-${roadPaths.length}-${Date.now()}`,
        type: 'road',
        points: [
          { x: p1.x, y: p1.y },
          { x: midX, y: midY },
          { x: p2.x, y: p2.y },
        ],
        width: 2.2,
        dashed: true,
      });
    }
  }

  // 5. Procedural Mountain and Tree Stamps
  const stamps: StampItem[] = [];
  for (let y = 6; y < rows - 6; y += 4) {
    for (let x = 6; x < cols - 6; x += 4) {
      const idx = y * cols + x;
      const b = INDEX_TO_BIOME[terrainData[idx]];
      const px = x * res + rng.nextFloat(-6, 6);
      const py = y * res + rng.nextFloat(-6, 6);

      if (b === 'mountain' || b === 'peak') {
        stamps.push({
          id: `stamp-mount-${x}-${y}`,
          type: rng.next() > 0.4 ? 'mountain_range' : 'mountain_single',
          x: px,
          y: py,
          scale: rng.nextFloat(0.85, 1.25),
          rotation: rng.nextFloat(-3, 3),
          opacity: 1,
        });
      } else if (b === 'forest' || b === 'dense_forest') {
        if (rng.next() > 0.5) {
          stamps.push({
            id: `stamp-tree-${x}-${y}`,
            type: rng.next() > 0.4 ? 'forest_cluster' : 'tree_deciduous',
            x: px,
            y: py,
            scale: rng.nextFloat(0.65, 0.95),
            rotation: rng.nextFloat(-5, 5),
            opacity: 1,
          });
        }
      }
    }
  }

  // Add stamps for settlements
  for (const s of settlements) {
    let stampType: StampItem['type'] = 'town' as any;
    if (s.type === 'capital') stampType = 'castle';
    else if (s.type === 'city') stampType = 'city_icon';
    else if (s.type === 'ruin') stampType = 'ruins';
    else stampType = 'village';

    stamps.push({
      id: `stamp-${s.id}`,
      type: stampType,
      x: s.x,
      y: s.y,
      scale: s.type === 'capital' ? 1.2 : 0.9,
      rotation: 0,
      opacity: 1,
    });
  }

  // 6. Text Labels for Kingdom and Settlements
  const kingdomTitle = generateKingdomName('human', rng);
  const labels: TextLabel[] = [
    {
      id: `label-kingdom-${Date.now()}`,
      text: kingdomTitle.toUpperCase(),
      x: width * 0.5,
      y: 65,
      rotation: 0,
      fontSize: 26,
      fontFamily: 'Cinzel',
      letterSpacing: 4,
      isBanner: true,
      bannerStyle: 'ribbon',
    },
  ];

  // Mountain range title
  const mountainName = generateGeographicFeatureName('mountain', 'dwarven', rng);
  if (mountainCells.length > 0) {
    const mCenter = mountainCells[Math.floor(mountainCells.length / 2)];
    labels.push({
      id: `label-mountain-${Date.now()}`,
      text: mountainName,
      x: mCenter.x * res,
      y: mCenter.y * res - 25,
      rotation: -8,
      fontSize: 16,
      fontFamily: 'IM Fell English SC',
      letterSpacing: 2,
    });
  }

  // Settlement labels
  for (const s of settlements) {
    labels.push({
      id: `label-${s.id}`,
      text: s.name,
      x: s.x,
      y: s.y + 22,
      rotation: 0,
      fontSize: s.type === 'capital' ? 15 : 12,
      fontFamily: 'Cinzel',
      letterSpacing: 1,
    });
  }

  // 7. Initial Master Notes with Secret Markers
  const markers = settlements.map((s, idx) => ({
    id: `marker-${s.id}`,
    number: idx + 1,
    x: s.x + 14,
    y: s.y - 14,
    title: s.name,
    description: `${s.type.toUpperCase()} dos ${s.culture}. População estimada: ${s.population}. ${
      s.type === 'ruin'
        ? 'SEGREDOS DO MESTRE: Uma cripta selada com runas proibidas repousa sob a torre quebrada.'
        : 'Guarnição militar leal à coroa com taverna movimentada.'
    }`,
    isSecret: s.type === 'ruin' || idx % 3 === 0,
    category: s.type === 'ruin' ? ('treasure' as const) : ('poi' as const),
  }));

  return {
    title: kingdomTitle,
    mode: 'world',
    width,
    height,
    seed,
    terrainData,
    gridResolution: res,
    stamps,
    paths: [...riverPaths, ...roadPaths],
    labels,
    markers,
    settlements,
    fogData: new Uint8Array(cols * rows),
    fogResolution: res,
    updatedAt: Date.now(),
  };
}

function getBiomeFromElevMoist(elev: number, moist: number, latitude: number): BiomeType {
  // Deep ocean & shallow ocean
  if (elev < 0.24) return 'deep_ocean';
  if (elev < 0.35) return 'shallow_ocean';
  if (elev < 0.38) return 'beach';

  // High elevation
  if (elev > 0.85) return 'volcano';
  if (elev > 0.75) return 'peak';
  if (elev > 0.65) return 'mountain';

  // Cold polar latitudes
  if (latitude < 0.12 || latitude > 0.88) {
    return elev > 0.5 ? 'snow' : 'tundra';
  }

  // Whittaker-style classification
  if (moist < 0.28) {
    return 'desert';
  }
  if (moist < 0.48) {
    return 'grassland';
  }
  if (moist < 0.72) {
    return 'forest';
  }
  if (elev < 0.45 && moist > 0.75) {
    return 'swamp';
  }
  return 'dense_forest';
}
