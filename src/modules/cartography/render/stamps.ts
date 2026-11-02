/**
 * Procedural Ink Drawing Engine for Cartographic Stamps
 * Renders hand-drawn ink vector style icons directly on Canvas 2D.
 */

import { StampType } from '../types/map';
import { ThemeConfig } from './styles';

export interface StampRenderOptions {
  scale?: number;
  rotation?: number;
  opacity?: number;
  tint?: string;
  flipX?: boolean;
}

export function drawStamp(
  ctx: CanvasRenderingContext2D,
  type: StampType,
  x: number,
  y: number,
  theme: ThemeConfig,
  opts: StampRenderOptions = {}
) {
  const scale = opts.scale ?? 1;
  const rotation = opts.rotation ?? 0;
  const opacity = opts.opacity ?? 1;
  const ink = opts.tint || theme.inkColor;
  const inkSoft = theme.inkSecondary;
  const bgWash = theme.background;

  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate((rotation * Math.PI) / 180);
  if (opts.flipX) ctx.scale(-scale, scale);
  else ctx.scale(scale, scale);
  ctx.globalAlpha = opacity;

  ctx.strokeStyle = ink;
  ctx.fillStyle = bgWash;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.6;

  switch (type) {
    case 'mountain_single':
      drawSingleMountain(ctx, ink, inkSoft, bgWash);
      break;
    case 'mountain_range':
      drawMountainRange(ctx, ink, inkSoft, bgWash);
      break;
    case 'hill':
      drawHill(ctx, ink, inkSoft);
      break;
    case 'tree_deciduous':
      drawDeciduousTree(ctx, ink, inkSoft, bgWash);
      break;
    case 'tree_pine':
      drawPineTree(ctx, ink, inkSoft, bgWash);
      break;
    case 'forest_cluster':
      drawForestCluster(ctx, ink, inkSoft, bgWash);
      break;
    case 'castle':
      drawCastle(ctx, ink, inkSoft, bgWash);
      break;
    case 'fortress':
      drawFortress(ctx, ink, inkSoft, bgWash);
      break;
    case 'city_icon':
      drawCityIcon(ctx, ink, inkSoft, bgWash);
      break;
    case 'village':
      drawVillage(ctx, ink, inkSoft, bgWash);
      break;
    case 'tower':
      drawTower(ctx, ink, inkSoft, bgWash);
      break;
    case 'ruins':
      drawRuins(ctx, ink, inkSoft, bgWash);
      break;
    case 'cave_entrance':
      drawCave(ctx, ink, inkSoft, bgWash);
      break;
    case 'portal':
      drawPortal(ctx, ink, inkSoft);
      break;
    case 'ship':
      drawShip(ctx, ink, inkSoft, bgWash);
      break;
    case 'sea_serpent':
      drawSeaSerpent(ctx, ink, inkSoft);
      break;
    case 'dragon':
      drawDragon(ctx, ink, inkSoft);
      break;
    case 'dungeon_door':
      drawDungeonDoor(ctx, ink, inkSoft, bgWash);
      break;
    case 'dungeon_stairs':
      drawDungeonStairs(ctx, ink, inkSoft, bgWash);
      break;
    case 'dungeon_trap':
      drawDungeonTrap(ctx, ink);
      break;
    case 'dungeon_chest':
      drawDungeonChest(ctx, ink, inkSoft, bgWash);
      break;
    case 'torch':
      drawTorch(ctx, ink);
      break;
  }

  ctx.restore();
}

function drawSingleMountain(
  ctx: CanvasRenderingContext2D,
  ink: string,
  inkSoft: string,
  bg: string
) {
  // Peak silhouette
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(-24, 18);
  ctx.lineTo(24, 18);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();

  // Central ridge
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.quadraticCurveTo(2, -10, -4, 4);
  ctx.quadraticCurveTo(-2, 10, 0, 18);
  ctx.stroke();

  // Left & right contour
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(-12, -8);
  ctx.lineTo(-24, 18);
  ctx.moveTo(0, -28);
  ctx.lineTo(14, -6);
  ctx.lineTo(24, 18);
  ctx.stroke();

  // Shading hatch marks on right face
  ctx.strokeStyle = inkSoft;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const yStart = -16 + i * 4.5;
    const xStart = (yStart + 28) * 0.15;
    const len = 4 + i * 1.8;
    ctx.moveTo(xStart, yStart);
    ctx.lineTo(xStart + len, yStart + 2.5);
  }
  ctx.stroke();
}

function drawMountainRange(
  ctx: CanvasRenderingContext2D,
  ink: string,
  inkSoft: string,
  bg: string
) {
  // Main peak + 2 side peaks
  ctx.save();
  ctx.translate(-16, 4);
  ctx.scale(0.7, 0.7);
  drawSingleMountain(ctx, ink, inkSoft, bg);
  ctx.restore();

  ctx.save();
  ctx.translate(18, 6);
  ctx.scale(0.75, 0.75);
  drawSingleMountain(ctx, ink, inkSoft, bg);
  ctx.restore();

  ctx.save();
  drawSingleMountain(ctx, ink, inkSoft, bg);
  ctx.restore();
}

function drawHill(ctx: CanvasRenderingContext2D, ink: string, inkSoft: string) {
  ctx.beginPath();
  ctx.arc(0, 14, 22, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(10, 16, 16, Math.PI * 1.2, Math.PI * 1.8);
  ctx.stroke();

  // Gentle grass/ridge ticks
  ctx.strokeStyle = inkSoft;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(-6, -2);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -4);
  ctx.moveTo(6, 4);
  ctx.lineTo(7, 0);
  ctx.stroke();
}

function drawDeciduousTree(
  ctx: CanvasRenderingContext2D,
  ink: string,
  inkSoft: string,
  bg: string
) {
  // Trunk
  ctx.beginPath();
  ctx.moveTo(-2, 18);
  ctx.lineTo(-2, 6);
  ctx.lineTo(2, 6);
  ctx.lineTo(2, 18);
  ctx.stroke();

  // Canopy puffs
  ctx.beginPath();
  ctx.arc(-8, -4, 9, 0, Math.PI * 2);
  ctx.arc(8, -4, 9, 0, Math.PI * 2);
  ctx.arc(0, -14, 11, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.stroke();

  // Foliage texture arcs
  ctx.strokeStyle = inkSoft;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(-2, -6, 4, Math.PI * 0.4, Math.PI * 1.1);
  ctx.moveTo(6, -10);
  ctx.arc(4, -8, 3, Math.PI * 0.2, Math.PI * 0.9);
  ctx.stroke();
}

function drawPineTree(
  ctx: CanvasRenderingContext2D,
  ink: string,
  inkSoft: string,
  bg: string
) {
  // Trunk
  ctx.beginPath();
  ctx.moveTo(-2, 18);
  ctx.lineTo(2, 18);
  ctx.lineTo(1, 10);
  ctx.lineTo(-1, 10);
  ctx.closePath();
  ctx.stroke();

  // 3 conical tiers
  ctx.fillStyle = bg;
  for (let tier = 0; tier < 3; tier++) {
    const yTop = -24 + tier * 10;
    const yBot = -8 + tier * 10;
    const width = 8 + tier * 6;
    ctx.beginPath();
    ctx.moveTo(0, yTop);
    ctx.lineTo(-width, yBot);
    ctx.lineTo(width, yBot);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // needles hatch
    ctx.strokeStyle = inkSoft;
    ctx.beginPath();
    ctx.moveTo(0, yTop + 3);
    ctx.lineTo(-width * 0.4, yBot - 2);
    ctx.moveTo(0, yTop + 3);
    ctx.lineTo(width * 0.4, yBot - 2);
    ctx.stroke();
    ctx.strokeStyle = ink;
  }
}

function drawForestCluster(
  ctx: CanvasRenderingContext2D,
  ink: string,
  inkSoft: string,
  bg: string
) {
  ctx.save();
  ctx.translate(-14, 2);
  ctx.scale(0.8, 0.8);
  drawDeciduousTree(ctx, ink, inkSoft, bg);
  ctx.restore();

  ctx.save();
  ctx.translate(14, 4);
  ctx.scale(0.85, 0.85);
  drawPineTree(ctx, ink, inkSoft, bg);
  ctx.restore();

  ctx.save();
  ctx.translate(0, -4);
  drawDeciduousTree(ctx, ink, inkSoft, bg);
  ctx.restore();
}

function drawCastle(
  ctx: CanvasRenderingContext2D,
  ink: string,
  inkSoft: string,
  bg: string
) {
  // Curtain wall background
  ctx.fillStyle = bg;
  ctx.fillRect(-22, -6, 44, 24);
  ctx.strokeRect(-22, -6, 44, 24);

  // Left & right towers
  [-22, 12].forEach((tx) => {
    ctx.fillRect(tx, -20, 10, 38);
    ctx.strokeRect(tx, -20, 10, 38);
    // Crenellations
    ctx.fillRect(tx - 2, -24, 4, 4);
    ctx.strokeRect(tx - 2, -24, 4, 4);
    ctx.fillRect(tx + 8, -24, 4, 4);
    ctx.strokeRect(tx + 8, -24, 4, 4);
  });

  // Central keep
  ctx.fillRect(-8, -28, 16, 46);
  ctx.strokeRect(-8, -28, 16, 46);

  // Keep roof spire / flag
  ctx.beginPath();
  ctx.moveTo(-9, -28);
  ctx.lineTo(0, -40);
  ctx.lineTo(9, -28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Flag
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(0, -48);
  ctx.lineTo(8, -45);
  ctx.lineTo(0, -42);
  ctx.stroke();

  // Main portcullis gate
  ctx.beginPath();
  ctx.arc(0, 10, 5, Math.PI, 0);
  ctx.lineTo(5, 18);
  ctx.lineTo(-5, 18);
  ctx.closePath();
  ctx.fillStyle = inkSoft;
  ctx.fill();
  ctx.stroke();
}

function drawFortress(
  ctx: CanvasRenderingContext2D,
  ink: string,
  _inkSoft: string,
  bg: string
) {
  // Bastion hexagon
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-18, -12);
  ctx.lineTo(18, -12);
  ctx.lineTo(24, 10);
  ctx.lineTo(0, 20);
  ctx.lineTo(-24, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner keep
  ctx.beginPath();
  ctx.arc(0, 2, 8, 0, Math.PI * 2);
  ctx.stroke();

  // Gunports / arrow slits
  [-12, 12].forEach((px) => {
    ctx.beginPath();
    ctx.moveTo(px, -2);
    ctx.lineTo(px, 4);
    ctx.stroke();
  });
}

function drawCityIcon(
  ctx: CanvasRenderingContext2D,
  ink: string,
  inkSoft: string,
  bg: string
) {
  // Cluster of 3 houses and 1 cathedral spire
  ctx.fillStyle = bg;

  // House 1
  ctx.fillRect(-18, 2, 12, 14);
  ctx.strokeRect(-18, 2, 12, 14);
  ctx.beginPath();
  ctx.moveTo(-20, 2);
  ctx.lineTo(-12, -6);
  ctx.lineTo(-4, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // House 2
  ctx.fillRect(6, 4, 14, 12);
  ctx.strokeRect(6, 4, 14, 12);
  ctx.beginPath();
  ctx.moveTo(4, 4);
  ctx.lineTo(13, -4);
  ctx.lineTo(22, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Center church tower & spire
  ctx.fillRect(-6, -10, 12, 26);
  ctx.strokeRect(-6, -10, 12, 26);
  ctx.beginPath();
  ctx.moveTo(-8, -10);
  ctx.lineTo(0, -32);
  ctx.lineTo(8, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cross on top
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.lineTo(0, -38);
  ctx.moveTo(-3, -35);
  ctx.lineTo(3, -35);
  ctx.stroke();
}

function drawVillage(
  ctx: CanvasRenderingContext2D,
  ink: string,
  _inkSoft: string,
  bg: string
) {
  ctx.fillStyle = bg;
  // 2 small thatched cottages
  [-10, 8].forEach((hx, i) => {
    const hy = i * 4;
    ctx.fillRect(hx - 6, hy, 12, 10);
    ctx.strokeRect(hx - 6, hy, 12, 10);
    ctx.beginPath();
    ctx.moveTo(hx - 8, hy);
    ctx.lineTo(hx, hy - 8);
    ctx.lineTo(hx + 8, hy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // Winding path
  ctx.beginPath();
  ctx.moveTo(-2, 14);
  ctx.quadraticCurveTo(4, 10, 0, 4);
  ctx.stroke();
}

function drawTower(
  ctx: CanvasRenderingContext2D,
  ink: string,
  inkSoft: string,
  bg: string
) {
  ctx.fillStyle = bg;
  // Tapered tower
  ctx.beginPath();
  ctx.moveTo(-7, -22);
  ctx.lineTo(7, -22);
  ctx.lineTo(9, 18);
  ctx.lineTo(-9, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Conical roof
  ctx.beginPath();
  ctx.moveTo(-10, -22);
  ctx.lineTo(0, -36);
  ctx.lineTo(10, -22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Slit windows
  ctx.strokeStyle = inkSoft;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(0, -8);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 6);
  ctx.stroke();
}

function drawRuins(
  ctx: CanvasRenderingContext2D,
  ink: string,
  _inkSoft: string,
  bg: string
) {
  ctx.fillStyle = bg;
  // Broken column 1
  ctx.fillRect(-16, -4, 6, 20);
  ctx.strokeRect(-16, -4, 6, 20);

  // Broken column 2 with shattered top
  ctx.fillRect(-4, -14, 6, 30);
  ctx.strokeRect(-4, -14, 6, 30);

  // Archway half fallen
  ctx.beginPath();
  ctx.moveTo(-4, -14);
  ctx.quadraticCurveTo(6, -20, 14, -8);
  ctx.stroke();

  // Tumbled stones on ground
  ctx.fillRect(8, 8, 8, 6);
  ctx.strokeRect(8, 8, 8, 6);
  ctx.fillRect(16, 11, 6, 4);
  ctx.strokeRect(16, 11, 6, 4);
}

function drawCave(
  ctx: CanvasRenderingContext2D,
  ink: string,
  _inkSoft: string,
  bg: string
) {
  // Craggy rock outline
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-22, 16);
  ctx.lineTo(-18, -4);
  ctx.lineTo(-6, -18);
  ctx.lineTo(10, -16);
  ctx.lineTo(20, -2);
  ctx.lineTo(22, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dark hollow
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(0, 8, 10, Math.PI, 0);
  ctx.lineTo(10, 16);
  ctx.lineTo(-10, 16);
  ctx.closePath();
  ctx.fill();

  // Stalactites
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(-4, 4);
  ctx.lineTo(-2, -2);
  ctx.moveTo(2, -2);
  ctx.lineTo(4, 5);
  ctx.lineTo(6, -2);
  ctx.fill();
}

function drawPortal(ctx: CanvasRenderingContext2D, ink: string, inkSoft: string) {
  // Outer mystical circle
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = inkSoft;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.stroke();

  // Swirling vortex spirals
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 4; a += 0.3) {
    const r = (a / (Math.PI * 4)) * 12;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (a === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Runes on perimeter
  ctx.strokeStyle = ink;
  for (let i = 0; i < 6; i++) {
    const ang = (i * Math.PI) / 3;
    const rx = Math.cos(ang) * 15.5;
    const ry = Math.sin(ang) * 15.5;
    ctx.beginPath();
    ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawShip(
  ctx: CanvasRenderingContext2D,
  ink: string,
  inkSoft: string,
  bg: string
) {
  // Hull
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-22, 2);
  ctx.quadraticCurveTo(-14, 14, 16, 12);
  ctx.lineTo(24, 2);
  ctx.lineTo(18, 0);
  ctx.lineTo(-18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Water waves below
  ctx.strokeStyle = inkSoft;
  ctx.beginPath();
  ctx.moveTo(-26, 8);
  ctx.quadraticCurveTo(-18, 14, -10, 8);
  ctx.quadraticCurveTo(-2, 14, 6, 8);
  ctx.quadraticCurveTo(14, 14, 22, 8);
  ctx.stroke();

  // Masts & sails
  ctx.strokeStyle = ink;
  // Main mast
  ctx.beginPath();
  ctx.moveTo(2, 2);
  ctx.lineTo(2, -26);
  ctx.stroke();

  // Main sail (billowing arc)
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-7, -24);
  ctx.quadraticCurveTo(1, -21, 9, -24);
  ctx.lineTo(11, -8);
  ctx.quadraticCurveTo(1, -5, -9, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fore mast & sail
  ctx.beginPath();
  ctx.moveTo(-12, 2);
  ctx.lineTo(-12, -18);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-18, -17);
  ctx.quadraticCurveTo(-12, -15, -6, -17);
  ctx.lineTo(-5, -6);
  ctx.quadraticCurveTo(-12, -4, -19, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Pennant
  ctx.beginPath();
  ctx.moveTo(2, -26);
  ctx.lineTo(10, -24);
  ctx.lineTo(2, -22);
  ctx.stroke();
}

function drawSeaSerpent(ctx: CanvasRenderingContext2D, ink: string, _inkSoft: string) {
  // Undulating body coils
  ctx.beginPath();
  // Coil 1
  ctx.arc(-14, 6, 8, Math.PI, 0);
  // Coil 2
  ctx.arc(4, 6, 10, Math.PI, 0);
  ctx.stroke();

  // Head emerging from water
  ctx.beginPath();
  ctx.moveTo(14, 6);
  ctx.quadraticCurveTo(18, -4, 20, -18);
  ctx.lineTo(26, -16);
  ctx.quadraticCurveTo(24, -12, 28, -8); // snout / jaws
  ctx.lineTo(22, -6);
  ctx.stroke();

  // Dorsal fin / spines
  ctx.beginPath();
  ctx.moveTo(3, -4);
  ctx.lineTo(4, -8);
  ctx.lineTo(7, -3);
  ctx.stroke();

  // Water ripples
  ctx.beginPath();
  ctx.moveTo(-24, 7);
  ctx.lineTo(-6, 7);
  ctx.moveTo(-6, 7);
  ctx.lineTo(12, 7);
  ctx.stroke();
}

function drawDragon(ctx: CanvasRenderingContext2D, ink: string, _inkSoft: string) {
  // Serpentine curved body
  ctx.beginPath();
  ctx.moveTo(-20, 10);
  ctx.quadraticCurveTo(-10, -12, 4, -4);
  ctx.quadraticCurveTo(12, 2, 18, -12);
  ctx.stroke();

  // Head with horns
  ctx.beginPath();
  ctx.moveTo(18, -12);
  ctx.lineTo(26, -18);
  ctx.lineTo(22, -10);
  ctx.moveTo(22, -16);
  ctx.lineTo(26, -24); // horn
  ctx.stroke();

  // Bat wing
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.lineTo(6, -30);
  ctx.lineTo(-2, -24);
  ctx.lineTo(6, -30);
  ctx.lineTo(-12, -20);
  ctx.lineTo(-4, -8);
  ctx.stroke();

  // Arrow tail
  ctx.beginPath();
  ctx.moveTo(-20, 10);
  ctx.lineTo(-26, 6);
  ctx.lineTo(-24, 14);
  ctx.closePath();
  ctx.stroke();
}

function drawDungeonDoor(
  ctx: CanvasRenderingContext2D,
  ink: string,
  inkSoft: string,
  bg: string
) {
  ctx.fillStyle = bg;
  ctx.fillRect(-12, -18, 24, 36);
  ctx.strokeRect(-12, -18, 24, 36);

  // Wood planks
  ctx.strokeStyle = inkSoft;
  [-4, 4].forEach((px) => {
    ctx.beginPath();
    ctx.moveTo(px, -18);
    ctx.lineTo(px, 18);
    ctx.stroke();
  });

  // Iron reinforcements
  ctx.strokeStyle = ink;
  [-10, 10].forEach((py) => {
    ctx.beginPath();
    ctx.moveTo(-12, py);
    ctx.lineTo(12, py);
    ctx.stroke();
  });

  // Door handle
  ctx.beginPath();
  ctx.arc(6, 0, 2.5, 0, Math.PI * 2);
  ctx.stroke();
}

function drawDungeonStairs(
  ctx: CanvasRenderingContext2D,
  ink: string,
  inkSoft: string,
  bg: string
) {
  ctx.fillStyle = bg;
  ctx.fillRect(-16, -16, 32, 32);
  ctx.strokeRect(-16, -16, 32, 32);

  // Step lines
  for (let i = 0; i < 5; i++) {
    const yStep = -12 + i * 6;
    ctx.beginPath();
    ctx.moveTo(-14, yStep);
    ctx.lineTo(14, yStep);
    ctx.stroke();
    // Step shading
    ctx.fillStyle = inkSoft;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(-14, yStep, 28, 2);
    ctx.globalAlpha = 1.0;
  }
}

function drawDungeonTrap(ctx: CanvasRenderingContext2D, ink: string) {
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(18, 16);
  ctx.lineTo(-18, 16);
  ctx.closePath();
  ctx.stroke();

  // Exclamation mark
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 9, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = ink;
  ctx.fill();
}

function drawDungeonChest(
  ctx: CanvasRenderingContext2D,
  ink: string,
  inkSoft: string,
  bg: string
) {
  ctx.fillStyle = bg;
  // Lid
  ctx.beginPath();
  ctx.arc(0, -2, 14, Math.PI, 0);
  ctx.lineTo(14, 0);
  ctx.lineTo(-14, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Chest body
  ctx.fillRect(-14, 0, 28, 16);
  ctx.strokeRect(-14, 0, 28, 16);

  // Keyhole lock
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(0, 4, 2, 0, Math.PI * 2);
  ctx.rect(-1, 5, 2, 3);
  ctx.fill();
}

function drawTorch(ctx: CanvasRenderingContext2D, ink: string) {
  // Sconce bracket
  ctx.beginPath();
  ctx.moveTo(-6, 12);
  ctx.lineTo(0, 6);
  ctx.lineTo(0, -6);
  ctx.stroke();

  // Flame
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.quadraticCurveTo(-6, -12, 0, -22);
  ctx.quadraticCurveTo(6, -12, 0, -6);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.stroke();
}
