/**
 * Background Removal, Pixel Trimming and Non-Destructive Filtering Engine
 */

import { ImageObjectAdjustments } from '../types/map';
import { loadImage } from './assetStore';

export interface RemoveBackgroundOptions {
  targetR: number;
  targetG: number;
  targetB: number;
  tolerance: number; // 0 to 100
  contiguous: boolean;
  startX?: number;
  startY?: number;
  feather?: number;
}

/**
 * Magic Wand & Color Keying background removal on an image dataUrl.
 * Returns a new PNG dataUrl with transparent alpha.
 */
export async function removeColorBackground(
  dataUrl: string,
  options: RemoveBackgroundOptions
): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const { targetR, targetG, targetB, tolerance, contiguous, startX = 0, startY = 0 } = options;

  const tolSq = (tolerance * 2.55) * (tolerance * 2.55) * 3;

  if (!contiguous) {
    // Global color keying
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const dr = r - targetR;
      const dg = g - targetG;
      const db = b - targetB;
      const distSq = dr * dr + dg * dg + db * db;
      if (distSq <= tolSq) {
        data[i + 3] = 0; // Transparent
      }
    }
  } else {
    // Contiguous Flood Fill Magic Wand
    const width = canvas.width;
    const height = canvas.height;
    const visited = new Uint8Array(width * height);
    const queue: number[] = [startX + startY * width];
    visited[startX + startY * width] = 1;

    while (queue.length > 0) {
      const idx = queue.pop()!;
      const x = idx % width;
      const y = Math.floor(idx / width);
      const p = idx * 4;

      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const dr = r - targetR;
      const dg = g - targetG;
      const db = b - targetB;
      const distSq = dr * dr + dg * dg + db * db;

      if (distSq <= tolSq) {
        data[p + 3] = 0; // Make transparent

        // Check 4 neighbors
        const neighbors = [
          x > 0 ? idx - 1 : -1,
          x < width - 1 ? idx + 1 : -1,
          y > 0 ? idx - width : -1,
          y < height - 1 ? idx + width : -1,
        ];

        for (const n of neighbors) {
          if (n !== -1 && !visited[n]) {
            visited[n] = 1;
            queue.push(n);
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Trim empty transparent margins from an image and adjust its anchor.
 */
export async function trimTransparentEdges(dataUrl: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  let hasVisiblePixels = false;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 10) {
        hasVisiblePixels = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasVisiblePixels) {
    return { dataUrl, width: img.width, height: img.height };
  }

  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;
  const trimmedCtx = trimmedCanvas.getContext('2d')!;

  trimmedCtx.drawImage(
    canvas,
    minX,
    minY,
    trimmedWidth,
    trimmedHeight,
    0,
    0,
    trimmedWidth,
    trimmedHeight
  );

  return {
    dataUrl: trimmedCanvas.toDataURL('image/png'),
    width: trimmedWidth,
    height: trimmedHeight,
  };
}

/**
 * Render image with non-destructive CSS/Canvas filters and theme blending.
 */
export function renderAdjustedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  adj: ImageObjectAdjustments,
  themeId?: string
) {
  ctx.save();

  // Construct CSS filter chain
  const filterParts: string[] = [];
  if (adj.brightness !== 100) filterParts.push(`brightness(${adj.brightness}%)`);
  if (adj.contrast !== 100) filterParts.push(`contrast(${adj.contrast}%)`);
  if (adj.hue !== 0) filterParts.push(`hue-rotate(${adj.hue}deg)`);
  if (adj.sepia > 0) filterParts.push(`sepia(${adj.sepia}%)`);
  if (adj.grayscale > 0) filterParts.push(`grayscale(${adj.grayscale}%)`);

  if (adj.tintTheme) {
    if (themeId === 'parchment') {
      filterParts.push('sepia(65%) contrast(110%)');
    } else if (themeId === 'arcane') {
      filterParts.push('hue-rotate(180deg) brightness(120%)');
    } else if (themeId === 'watercolor') {
      filterParts.push('saturate(130%)');
    }
  }

  if (filterParts.length > 0) {
    ctx.filter = filterParts.join(' ');
  }

  // Drop Shadow
  if (adj.shadow) {
    ctx.shadowColor = 'rgba(20, 15, 10, 0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;
  }

  ctx.drawImage(img, x, y, w, h);

  // Subtle ink outline if enabled
  if (adj.outline) {
    ctx.strokeStyle = themeId === 'arcane' ? 'rgba(56, 189, 248, 0.7)' : 'rgba(50, 30, 20, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, w, h);
  }

  ctx.restore();
}
