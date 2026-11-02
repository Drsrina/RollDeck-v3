/**
 * Scatter Brush Engine for Image Assets
 * Generates clustered natural distribution of stamps/props with scale & rotation jitter and biome checking.
 */

import { Asset, BiomeType, ImageObject, MapDocument, Point } from '../types/map';
import { INDEX_TO_BIOME } from '../core/generators/worldGen';

export interface ScatterOptions {
  center: Point;
  radius: number;
  count: number;
  asset: Asset;
  randomScale: number; // e.g. 0.25 (for +/- 25% scale jitter)
  randomRotation: boolean;
  respectBiome: boolean;
  doc: MapDocument;
}

export function generateScatterInstances(options: ScatterOptions): ImageObject[] {
  const { center, radius, count, asset, randomScale, randomRotation, respectBiome, doc } = options;
  const instances: ImageObject[] = [];

  const res = doc.gridResolution || 4;
  const cols = Math.floor(doc.width / res);
  const rows = Math.floor(doc.height / res);

  for (let i = 0; i < count; i++) {
    // Random point in circle with uniform radial distribution
    const r = Math.sqrt(Math.random()) * radius;
    const theta = Math.random() * 2 * Math.PI;
    const px = Math.round(center.x + r * Math.cos(theta));
    const py = Math.round(center.y + r * Math.sin(theta));

    if (px < 0 || px >= doc.width || py < 0 || py >= doc.height) continue;

    // Biome check if requested (e.g. don't scatter trees into ocean)
    if (respectBiome && doc.terrainData) {
      const cellX = Math.floor(px / res);
      const cellY = Math.floor(py / res);
      if (cellX >= 0 && cellX < cols && cellY >= 0 && cellY < rows) {
        const biome = INDEX_TO_BIOME[doc.terrainData[cellY * cols + cellX]];
        if (biome === 'deep_ocean' || biome === 'shallow_ocean') {
          continue;
        }
      }
    }

    const scaleJitter = 1 + (Math.random() * 2 - 1) * randomScale;
    const rot = randomRotation ? Math.round(Math.random() * 30 - 15) : 0;

    // Normalizing base dimension to ~40-60px
    const baseW = Math.min(asset.width, 60);
    const baseH = (asset.height / asset.width) * baseW;

    instances.push({
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      assetId: asset.id,
      name: `${asset.name} (Scatter)`,
      layerId: 'l-images',
      x: px,
      y: py,
      width: Math.round(baseW * scaleJitter),
      height: Math.round(baseH * scaleJitter),
      scaleX: 1,
      scaleY: 1,
      rotation: rot,
      opacity: 1,
      blendMode: 'source-over',
      adjustments: {
        brightness: 100,
        contrast: 100,
        hue: 0,
        sepia: 0,
        grayscale: 0,
        tintTheme: true,
        shadow: false,
        outline: false,
      },
    });
  }

  return instances;
}
