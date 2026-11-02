/**
 * Tactical Battle Map Generator
 * Presets: Forest, Cavern, Tavern, Road Crossroads with Square / Hex grid.
 */

import { GridConfig, MapDocument, Point, SplinePath, StampItem, TextLabel } from '../../types/map';
import { Mulberry32, SimplexNoise } from '../prng';
import { BIOME_INDEX } from './worldGen';

export type BattlemapScenario = 'tavern' | 'cave' | 'forest' | 'road';

export function generateBattleMap(
  scenario: BattlemapScenario = 'forest',
  seed: number = 777,
  gridType: 'square' | 'hex' = 'square',
  width: number = 1200,
  height: number = 800
): Partial<MapDocument> {
  const rng = new Mulberry32(seed);
  const simplex = new SimplexNoise(seed);
  const res = 4;
  const cols = Math.floor(width / res);
  const rows = Math.floor(height / res);
  const terrainData = new Uint8Array(cols * rows);

  const stamps: StampItem[] = [];
  const paths: SplinePath[] = [];
  let mapTitle = 'Mapa de Batalha Tático';

  if (scenario === 'tavern') {
    mapTitle = 'Taverna do Pônei Empinado';
    // Base: wood floorboards inside, grassland outside
    terrainData.fill(BIOME_INDEX.grassland);

    // Tavern building rect
    const bx = Math.floor(cols * 0.15);
    const by = Math.floor(rows * 0.15);
    const bw = Math.floor(cols * 0.7);
    const bh = Math.floor(rows * 0.7);

    // Outside wall border
    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) {
        const isBorder = x === bx || x === bx + bw - 1 || y === by || y === by + bh - 1;
        // Leave door opening at bottom center
        const isDoor = y === by + bh - 1 && Math.abs(x - (bx + bw / 2)) < 5;
        if (isBorder && !isDoor) {
          terrainData[y * cols + x] = BIOME_INDEX.dungeon_wall;
        } else {
          terrainData[y * cols + x] = BIOME_INDEX.wood_floor;
        }
      }
    }

    // Door stamp
    stamps.push({
      id: 'tavern-door',
      type: 'dungeon_door',
      x: (bx + bw / 2) * res,
      y: (by + bh) * res,
      scale: 1,
      rotation: 0,
      opacity: 1,
    });

    // Bar counter (stone/wood road)
    const barX = bx + Math.floor(bw * 0.2);
    const barY = by + Math.floor(bh * 0.25);
    for (let x = barX; x < barX + 25; x++) {
      terrainData[barY * cols + x] = BIOME_INDEX.stone_road;
    }
    for (let y = barY; y < barY + 14; y++) {
      terrainData[y * cols + barX] = BIOME_INDEX.stone_road;
    }

    // Chests & torches
    stamps.push(
      {
        id: 'tavern-chest',
        type: 'dungeon_chest',
        x: (barX + 8) * res,
        y: (barY - 8) * res,
        scale: 0.9,
        rotation: 0,
        opacity: 1,
      },
      {
        id: 'tavern-torch-1',
        type: 'torch',
        x: bx * res + 8,
        y: (by + 10) * res,
        scale: 0.9,
        rotation: 0,
        opacity: 1,
      },
      {
        id: 'tavern-torch-2',
        type: 'torch',
        x: (bx + bw) * res - 8,
        y: (by + 10) * res,
        scale: 0.9,
        rotation: 0,
        opacity: 1,
      }
    );
  } else if (scenario === 'cave') {
    mapTitle = 'Covil da Besta Subterrânea';
    // Base: dark stone walls
    terrainData.fill(BIOME_INDEX.dungeon_wall);

    // Carve organic cavern using simplex noise
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = (x / cols - 0.5) * 3;
        const ny = (y / rows - 0.5) * 3;
        const n = simplex.fbm2D(nx, ny, 3, 0.5);
        const distFromCenter = Math.sqrt(nx * nx + ny * ny);
        if (n + 0.65 > distFromCenter * 0.9) {
          terrainData[y * cols + x] = BIOME_INDEX.dungeon_floor;
        }
      }
    }

    // Cavern water pool
    for (let y = Math.floor(rows * 0.6); y < Math.floor(rows * 0.85); y++) {
      for (let x = Math.floor(cols * 0.55); x < Math.floor(cols * 0.8); x++) {
        const dx = x - cols * 0.68;
        const dy = y - rows * 0.72;
        if (dx * dx * 1.2 + dy * dy * 1.8 < 280) {
          terrainData[y * cols + x] = BIOME_INDEX.shallow_ocean;
        }
      }
    }

    // Traps and props
    stamps.push(
      {
        id: 'cave-trap',
        type: 'dungeon_trap',
        x: width * 0.45,
        y: height * 0.45,
        scale: 1,
        rotation: 0,
        opacity: 1,
      },
      {
        id: 'cave-ruins',
        type: 'ruins',
        x: width * 0.35,
        y: height * 0.35,
        scale: 1,
        rotation: 0,
        opacity: 1,
      }
    );
  } else if (scenario === 'road') {
    mapTitle = 'Encruzilhada do Desfiladeiro';
    terrainData.fill(BIOME_INDEX.grassland);

    // Crossroads path
    paths.push(
      {
        id: 'main-road',
        type: 'road',
        points: [
          { x: 0, y: height * 0.4 },
          { x: width * 0.5, y: height * 0.5 },
          { x: width, y: height * 0.6 },
        ],
        width: 16,
      },
      {
        id: 'cross-road',
        type: 'road',
        points: [
          { x: width * 0.45, y: 0 },
          { x: width * 0.5, y: height * 0.5 },
          { x: width * 0.55, y: height },
        ],
        width: 14,
      }
    );

    // Forest stamps on corners
    for (let i = 0; i < 10; i++) {
      const rx = rng.nextFloat(60, width - 60);
      const ry = rng.nextFloat(60, height - 60);
      if (Math.abs(rx - width * 0.5) > 90 || Math.abs(ry - height * 0.5) > 90) {
        stamps.push({
          id: `road-tree-${i}`,
          type: rng.next() > 0.5 ? 'tree_deciduous' : 'forest_cluster',
          x: rx,
          y: ry,
          scale: rng.nextFloat(0.8, 1.2),
          rotation: rng.nextFloat(-5, 5),
          opacity: 1,
        });
      }
    }

    // Ruined watchtower on road shoulder
    stamps.push({
      id: 'road-ruin-tower',
      type: 'tower',
      x: width * 0.68,
      y: height * 0.35,
      scale: 1.1,
      rotation: 0,
      opacity: 1,
    });
  } else {
    // Forest Ambush
    mapTitle = 'Emboscada na Clareira da Floresta';
    terrainData.fill(BIOME_INDEX.grassland);

    // Stream crossing
    paths.push({
      id: 'forest-stream',
      type: 'river',
      points: [
        { x: width * 0.2, y: 0 },
        { x: width * 0.3, y: height * 0.45 },
        { x: width * 0.15, y: height },
      ],
      width: 10,
    });

    // Dense trees around edges, clearing in center
    for (let i = 0; i < 22; i++) {
      const angle = rng.nextFloat(0, Math.PI * 2);
      const dist = rng.nextFloat(180, 480);
      const px = width * 0.5 + Math.cos(angle) * dist;
      const py = height * 0.5 + Math.sin(angle) * dist;
      stamps.push({
        id: `forest-ambush-tree-${i}`,
        type: rng.next() > 0.4 ? 'tree_deciduous' : 'tree_pine',
        x: px,
        y: py,
        scale: rng.nextFloat(0.8, 1.3),
        rotation: rng.nextFloat(-8, 8),
        opacity: 1,
      });
    }

    // Portal in the center
    stamps.push({
      id: 'forest-center-portal',
      type: 'portal',
      x: width * 0.5,
      y: height * 0.5,
      scale: 1.2,
      rotation: 0,
      opacity: 1,
    });
  }

  const grid: GridConfig = {
    show: true,
    type: gridType,
    size: 48,
    color: 'rgba(50, 40, 30, 0.28)',
    opacity: 0.8,
    scaleUnit: '1,5 m',
    scalePerCell: 1.5,
  };

  const labels: TextLabel[] = [
    {
      id: 'battle-title',
      text: mapTitle.toUpperCase(),
      x: width * 0.5,
      y: 50,
      rotation: 0,
      fontSize: 20,
      fontFamily: 'Cinzel',
      letterSpacing: 2,
      isBanner: true,
      bannerStyle: 'simple',
    },
  ];

  return {
    title: mapTitle,
    mode: 'battlemap',
    width,
    height,
    seed,
    terrainData,
    gridResolution: res,
    stamps,
    paths,
    labels,
    markers: [],
    grid,
    fogData: new Uint8Array(cols * rows),
    fogResolution: res,
    updatedAt: Date.now(),
  };
}
