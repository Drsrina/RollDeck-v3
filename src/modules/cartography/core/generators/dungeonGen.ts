/**
 * Procedural Dungeon & Catacomb Generator
 * Rooms, corridors, doors, stairs, traps, chests, torches and secret chambers.
 */

import { MapDocument, Point, StampItem, TextLabel } from '../../types/map';
import { Mulberry32 } from '../prng';
import { BIOME_INDEX } from './worldGen';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function generateDungeonMap(
  seed: number = 101,
  width: number = 1200,
  height: number = 800
): Partial<MapDocument> {
  const rng = new Mulberry32(seed);
  const res = 4;
  const cols = Math.floor(width / res);
  const rows = Math.floor(height / res);
  const terrainData = new Uint8Array(cols * rows);

  // Entire dungeon begins as solid stone wall
  terrainData.fill(BIOME_INDEX.dungeon_wall);

  // Room generation
  const numRooms = rng.nextInt(7, 12);
  const rooms: Rect[] = [];

  for (let attempt = 0; attempt < 80 && rooms.length < numRooms; attempt++) {
    const rw = rng.nextInt(14, 30);
    const rh = rng.nextInt(12, 24);
    const rx = rng.nextInt(4, cols - rw - 5);
    const ry = rng.nextInt(4, rows - rh - 5);
    const newRoom: Rect = { x: rx, y: ry, w: rw, h: rh };

    // Check overlap with 3-cell buffer
    let overlaps = false;
    for (const r of rooms) {
      if (
        rx < r.x + r.w + 3 &&
        rx + rw + 3 > r.x &&
        ry < r.y + r.h + 3 &&
        ry + rh + 3 > r.y
      ) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      rooms.push(newRoom);
      // Carve floor
      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          terrainData[y * cols + x] = BIOME_INDEX.dungeon_floor;
        }
      }
    }
  }

  // Connect rooms with L-shaped corridors
  const doors: Point[] = [];
  for (let i = 0; i < rooms.length - 1; i++) {
    const r1 = rooms[i];
    const r2 = rooms[i + 1];

    const c1x = Math.floor(r1.x + r1.w / 2);
    const c1y = Math.floor(r1.y + r1.h / 2);
    const c2x = Math.floor(r2.x + r2.w / 2);
    const c2y = Math.floor(r2.y + r2.h / 2);

    // Horizontal corridor (width 2)
    const minX = Math.min(c1x, c2x);
    const maxX = Math.max(c1x, c2x);
    for (let x = minX; x <= maxX; x++) {
      for (let wy = -1; wy <= 1; wy++) {
        const cy = c1y + wy;
        if (cy >= 0 && cy < rows) {
          terrainData[cy * cols + x] = BIOME_INDEX.dungeon_floor;
        }
      }
    }

    // Vertical corridor
    const minY = Math.min(c1y, c2y);
    const maxY = Math.max(c1y, c2y);
    for (let y = minY; y <= maxY; y++) {
      for (let wx = -1; wx <= 1; wx++) {
        const cx = c2x + wx;
        if (cx >= 0 && cx < cols) {
          terrainData[y * cols + cx] = BIOME_INDEX.dungeon_floor;
        }
      }
    }

    // Door candidate where corridor intersects room 1 perimeter
    doors.push({ x: c1x * res, y: (r1.y + r1.h) * res });
  }

  // Stamps for doors, stairs, traps, chests, torches
  const stamps: StampItem[] = [];

  // Entry stairs in first room
  if (rooms.length > 0) {
    const r0 = rooms[0];
    stamps.push({
      id: 'dungeon-stairs-up',
      type: 'dungeon_stairs',
      x: (r0.x + Math.floor(r0.w / 2)) * res,
      y: (r0.y + Math.floor(r0.h / 2)) * res,
      scale: 1,
      rotation: 0,
      opacity: 1,
    });
  }

  // Boss room / descent stairs in last room
  if (rooms.length > 1) {
    const rLast = rooms[rooms.length - 1];
    stamps.push({
      id: 'dungeon-stairs-down',
      type: 'dungeon_stairs',
      x: (rLast.x + Math.floor(rLast.w / 2)) * res,
      y: (rLast.y + Math.floor(rLast.h / 2)) * res,
      scale: 1,
      rotation: 180,
      opacity: 1,
    });
  }

  // Chests in random rooms
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    if (rng.next() > 0.45) {
      stamps.push({
        id: `chest-${i}`,
        type: 'dungeon_chest',
        x: (r.x + 4) * res,
        y: (r.y + 4) * res,
        scale: 0.9,
        rotation: 0,
        opacity: 1,
      });
    }

    // Traps
    if (rng.next() > 0.6) {
      stamps.push({
        id: `trap-${i}`,
        type: 'dungeon_trap',
        x: (r.x + Math.floor(r.w / 2)) * res,
        y: (r.y + Math.floor(r.h / 2)) * res,
        scale: 0.8,
        rotation: 0,
        opacity: 1,
      });
    }

    // Torches on walls
    stamps.push({
      id: `torch-${i}-1`,
      type: 'torch',
      x: r.x * res,
      y: (r.y + 4) * res,
      scale: 0.8,
      rotation: 0,
      opacity: 1,
    });
  }

  // Dungeon Doors
  doors.slice(0, 5).forEach((d, idx) => {
    stamps.push({
      id: `door-${idx}`,
      type: 'dungeon_door',
      x: d.x,
      y: d.y,
      scale: 0.85,
      rotation: 0,
      opacity: 1,
    });
  });

  // Room Markers with DM Secret descriptions
  const markers = rooms.map((r, idx) => {
    const isBoss = idx === rooms.length - 1;
    const isEntrance = idx === 0;
    const isTrapRoom = stamps.some((s) => s.type === 'dungeon_trap' && Math.abs(s.x - (r.x + r.w / 2) * res) < 50);

    let title = `Sala ${idx + 1}`;
    let desc = 'Câmara silenciosa com piso de pedras antigas e umidade nas paredes.';
    let isSecret = false;
    let cat: 'combat' | 'quest' | 'treasure' | 'npc' | 'poi' = 'poi';

    if (isEntrance) {
      title = '1. Escadaria de Entrada';
      desc = 'Degraus de pedra úmida descendo da superfície. O ar cheira a cinzas e mofo antigo.';
    } else if (isBoss) {
      title = `${idx + 1}. Santuário da Besta / Chefe`;
      desc = 'SEGREDOS DO MESTRE: O guardião espectral se ergue quando os jogadores cruzam o círculo rúnico central. CR 7.';
      isSecret = true;
      cat = 'combat';
    } else if (isTrapRoom) {
      title = `${idx + 1}. Corredor Engatilhado`;
      desc = 'SEGREDOS DO MESTRE: Placa de pressão no centro (Percepção DC 14, Desarme DC 15). Dispara dardos venenosos (3d6 veneno).';
      isSecret = true;
      cat = 'quest';
    } else {
      cat = 'treasure';
    }

    return {
      id: `dungeon-marker-${idx}`,
      number: idx + 1,
      x: (r.x + r.w / 2) * res,
      y: (r.y + r.h / 2) * res - 12,
      title,
      description: desc,
      isSecret,
      category: cat,
    };
  });

  const labels: TextLabel[] = [
    {
      id: 'dungeon-title',
      text: 'MASMORRA DAS CRIPTAS ESQUECIDAS',
      x: width * 0.5,
      y: 55,
      rotation: 0,
      fontSize: 22,
      fontFamily: 'Cinzel',
      letterSpacing: 3,
      isBanner: true,
      bannerStyle: 'stone',
    },
  ];

  return {
    title: 'Masmorra das Criptas Esquecidas',
    mode: 'dungeon',
    width,
    height,
    seed,
    terrainData,
    gridResolution: res,
    stamps,
    paths: [],
    labels,
    markers,
    grid: {
      show: true,
      type: 'square',
      size: 40,
      color: 'rgba(200, 180, 150, 0.25)',
      opacity: 0.7,
      scaleUnit: '1,5 m',
      scalePerCell: 1.5,
    },
    fogData: new Uint8Array(cols * rows),
    fogResolution: res,
    updatedAt: Date.now(),
  };
}
