/**
 * Core Cartographic Rendering Pipeline
 * Offscreen layered rendering for Terrain, Coastline Ripples, Splines, Grid, Stamps, Text, Fog and Decorations.
 */

import { AiProposedAction, ImageObject, MapDocument, Point, SplinePath, StampItem, TextLabel } from '../types/map';
import { ThemeConfig, VISUAL_THEMES } from './styles';
import { drawStamp } from './stamps';
import { INDEX_TO_BIOME } from '../core/generators/worldGen';
import { renderAdjustedImage } from '../assets/backgroundRemoval';

export interface RenderOptions {
  isPlayerMode?: boolean;
  selectedItemId?: string | null;
  selectedTool?: string;
  showGridOverride?: boolean;
  activePathDraft?: Point[] | null;
  brushCursor?: { x: number; y: number; radius: number; color?: string } | null;
  aiProposals?: AiProposedAction[] | null;
}

export class CartographyRenderer {
  private terrainCanvas: HTMLCanvasElement | null = null;
  private terrainCtx: CanvasRenderingContext2D | null = null;
  private terrainDirty = true;
  private cachedDocId: string = '';
  private cachedUpdatedAt: number = 0;
  private cachedStyle: string = '';
  private imageElementCache = new Map<string, HTMLImageElement>();

  /**
   * Main render method onto target Canvas context
   */
  render(
    targetCtx: CanvasRenderingContext2D,
    doc: MapDocument,
    opts: RenderOptions = {}
  ) {
    const theme = VISUAL_THEMES[doc.style] || VISUAL_THEMES.parchment;
    const { width, height } = doc;

    // 1. Draw Paper Background & Texture
    this.drawBackground(targetCtx, width, height, theme);

    // 2. Render Terrain Layer (Cached Offscreen)
    this.drawTerrain(targetCtx, doc, theme);

    // 3. Draw Water Coastline Ripples
    this.drawCoastlineRipples(targetCtx, doc, theme);

    // 4. Draw Paths (Rivers & Roads & Walls)
    if (this.isLayerVisible(doc, 'paths')) {
      this.drawPaths(targetCtx, doc.paths, theme, opts.selectedItemId);
    }

    // Active Path draft preview
    if (opts.activePathDraft && opts.activePathDraft.length > 1) {
      this.drawPathDraft(targetCtx, opts.activePathDraft, theme);
    }

    // 5. Draw Grid
    const showGrid = opts.showGridOverride !== undefined ? opts.showGridOverride : doc.grid?.show;
    if (showGrid && doc.grid) {
      this.drawGrid(targetCtx, width, height, doc.grid, theme);
    }

    // 6. Draw Stamps
    if (this.isLayerVisible(doc, 'stamps')) {
      this.drawStamps(targetCtx, doc.stamps, theme, opts.selectedItemId);
    }

    // 6b. Draw Imported Image Objects & Tokens
    if (this.isLayerVisible(doc, 'images') && doc.imageObjects?.length) {
      this.drawImageObjects(targetCtx, doc, theme, opts.isPlayerMode ?? false, opts.selectedItemId);
    }

    // 6c. Draw AI Ghost Proposals Preview (Transparent overlay)
    if (opts.aiProposals && opts.aiProposals.length > 0) {
      this.drawAiGhostProposals(targetCtx, opts.aiProposals, theme);
    }

    // 7. Draw Text Labels
    if (this.isLayerVisible(doc, 'text')) {
      this.drawLabels(targetCtx, doc.labels, theme, opts.selectedItemId);
    }

    // 8. Draw Numbered Markers (POI / DM notes)
    if (this.isLayerVisible(doc, 'markers')) {
      this.drawMarkers(targetCtx, doc, theme, opts.isPlayerMode ?? false, opts.selectedItemId);
    }

    // 9. Draw Fog of War
    if (this.isLayerVisible(doc, 'fog') && doc.fogData) {
      this.drawFog(targetCtx, doc, theme, opts.isPlayerMode ?? false);
    }

    // 10. Draw Cartographic Ornaments (Border, Compass, Scale)
    if (this.isLayerVisible(doc, 'decorations')) {
      this.drawDecorations(targetCtx, doc, theme);
    }

    // 11. Draw Interactive Brush Cursor
    if (opts.brushCursor) {
      this.drawBrushCursor(targetCtx, opts.brushCursor);
    }
  }

  private isLayerVisible(doc: MapDocument, layerType: string): boolean {
    const layer = doc.layers.find((l) => l.type === layerType);
    return layer ? layer.visible : true;
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: ThemeConfig
  ) {
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, width, height);

    if (theme.paperTexture === 'parchment') {
      // Vignette / burned edge gradient
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.45,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.72
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.7, 'rgba(100, 70, 40, 0.08)');
      grad.addColorStop(1, 'rgba(50, 25, 10, 0.35)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (theme.paperTexture === 'arcane_nebula') {
      // Celestial glow
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        50,
        width * 0.5,
        height * 0.5,
        width * 0.6
      );
      grad.addColorStop(0, 'rgba(88, 28, 135, 0.18)');
      grad.addColorStop(0.5, 'rgba(14, 116, 144, 0.12)');
      grad.addColorStop(1, 'rgba(2, 6, 23, 0.4)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private drawTerrain(
    ctx: CanvasRenderingContext2D,
    doc: MapDocument,
    theme: ThemeConfig
  ) {
    const { width, height, terrainData, gridResolution } = doc;
    const res = gridResolution || 4;
    const cols = Math.floor(width / res);
    const rows = Math.floor(height / res);

    if (
      !this.terrainCanvas ||
      this.terrainCanvas.width !== cols ||
      this.terrainCanvas.height !== rows ||
      this.cachedDocId !== doc.id ||
      this.cachedUpdatedAt !== doc.updatedAt ||
      this.cachedStyle !== doc.style
    ) {
      // Regenerate offscreen terrain canvas
      if (!this.terrainCanvas) {
        this.terrainCanvas = document.createElement('canvas');
      }
      this.terrainCanvas.width = cols;
      this.terrainCanvas.height = rows;
      this.terrainCtx = this.terrainCanvas.getContext('2d');

      if (this.terrainCtx) {
        const imgData = this.terrainCtx.createImageData(cols, rows);
        const data = imgData.data;

        // Parse hex colors for quick pixel assignment
        const colorCache: Record<number, [number, number, number]> = {};
        for (let i = 0; i < INDEX_TO_BIOME.length; i++) {
          const biome = INDEX_TO_BIOME[i];
          const hex = theme.biomeColors[biome] || '#dedede';
          colorCache[i] = hexToRgb(hex);
        }

        for (let i = 0; i < terrainData.length; i++) {
          const bIdx = terrainData[i];
          const rgb = colorCache[bIdx] || [200, 200, 200];
          const p = i * 4;
          data[p] = rgb[0];
          data[p + 1] = rgb[1];
          data[p + 2] = rgb[2];
          data[p + 3] = 255;
        }

        this.terrainCtx.putImageData(imgData, 0, 0);
      }

      this.cachedDocId = doc.id;
      this.cachedUpdatedAt = doc.updatedAt;
      this.cachedStyle = doc.style;
    }

    if (this.terrainCanvas) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.terrainCanvas, 0, 0, width, height);
      ctx.restore();
    }
  }

  private drawCoastlineRipples(
    ctx: CanvasRenderingContext2D,
    doc: MapDocument,
    theme: ThemeConfig
  ) {
    if (theme.coastRippleCount <= 0 || doc.mode === 'dungeon') return;
    const { width, height, terrainData, gridResolution } = doc;
    const res = gridResolution || 4;
    const cols = Math.floor(width / res);
    const rows = Math.floor(height / res);

    ctx.save();
    ctx.strokeStyle = theme.coastColor;
    ctx.lineWidth = 1.0;
    ctx.globalAlpha = 0.45;

    // Fast coastline contour ticks
    for (let y = 2; y < rows - 2; y += 3) {
      for (let x = 2; x < cols - 2; x += 3) {
        const idx = y * cols + x;
        const b = INDEX_TO_BIOME[terrainData[idx]];
        if (b === 'shallow_ocean') {
          // Check if adjacent to land
          const hasLand =
            isLand(INDEX_TO_BIOME[terrainData[idx - 1]]) ||
            isLand(INDEX_TO_BIOME[terrainData[idx + 1]]) ||
            isLand(INDEX_TO_BIOME[idx - cols]) ||
            isLand(INDEX_TO_BIOME[idx + cols]);

          if (hasLand) {
            const px = x * res;
            const py = y * res;
            ctx.beginPath();
            ctx.arc(px, py, res * 1.6, 0, Math.PI * 0.8);
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  }

  private drawPaths(
    ctx: CanvasRenderingContext2D,
    paths: SplinePath[],
    theme: ThemeConfig,
    selectedId?: string | null
  ) {
    paths.forEach((path) => {
      if (path.points.length < 2) return;
      ctx.save();
      const isSelected = path.id === selectedId;

      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (path.type === 'river') {
        ctx.strokeStyle = theme.riverColor;
        ctx.fillStyle = theme.riverColor;
      } else if (path.type === 'road') {
        ctx.strokeStyle = path.color || theme.roadColor;
        if (path.dashed) ctx.setLineDash([8, 6]);
      } else if (path.type === 'wall') {
        ctx.strokeStyle = path.color || theme.borderColor;
        ctx.lineWidth = path.width;
      }

      ctx.beginPath();
      renderSmoothSpline(ctx, path.points);
      ctx.stroke();

      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = path.width + 3;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  private drawPathDraft(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    theme: ThemeConfig
  ) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    renderSmoothSpline(ctx, points);
    ctx.stroke();

    // Node circles
    points.forEach((p) => {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    grid: MapDocument['grid'],
    theme: ThemeConfig
  ) {
    ctx.save();
    ctx.strokeStyle = grid.color || theme.gridColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = grid.opacity ?? 0.3;

    const size = grid.size || 40;

    if (grid.type === 'hex') {
      // Hexagonal Grid
      const h = size * Math.sin(Math.PI / 3);
      const r = size * 0.5;
      const s = size;

      for (let y = 0; y < height + size; y += h) {
        const row = Math.floor(y / h);
        const xOffset = (row % 2) * (1.5 * s);
        for (let x = -size; x < width + size * 2; x += 3 * s) {
          drawHexagon(ctx, x + xOffset, y, s);
        }
      }
    } else {
      // Standard Square Grid
      ctx.beginPath();
      for (let x = 0; x <= width; x += size) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += size) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawStamps(
    ctx: CanvasRenderingContext2D,
    stamps: StampItem[],
    theme: ThemeConfig,
    selectedId?: string | null
  ) {
    // Sort by Y position for proper isometric/depth layering
    const sorted = [...stamps].sort((a, b) => a.y - b.y);

    sorted.forEach((item) => {
      drawStamp(ctx, item.type, item.x, item.y, theme, {
        scale: item.scale,
        rotation: item.rotation,
        opacity: item.opacity,
        tint: item.tint,
        flipX: item.flipX,
      });

      if (item.id === selectedId) {
        // Selection bounding box indicator
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(item.x - 24 * item.scale, item.y - 24 * item.scale, 48 * item.scale, 48 * item.scale);
        ctx.restore();
      }
    });
  }

  private drawImageObjects(
    ctx: CanvasRenderingContext2D,
    doc: MapDocument,
    theme: ThemeConfig,
    isPlayerMode: boolean,
    selectedId?: string | null
  ) {
    if (!doc.imageObjects) return;
    const sorted = [...doc.imageObjects].sort((a, b) => a.y - b.y);

    sorted.forEach((imgObj) => {
      if (isPlayerMode && imgObj.isSecret) return;

      const asset = doc.assets?.find((a) => a.id === imgObj.assetId);
      if (!asset) return;

      let cachedImg = this.imageElementCache.get(asset.id);
      if (!cachedImg) {
        cachedImg = new Image();
        cachedImg.src = asset.dataUrl;
        this.imageElementCache.set(asset.id, cachedImg);
      }

      if (!cachedImg.complete) return;

      ctx.save();
      ctx.translate(imgObj.x, imgObj.y);
      if (imgObj.rotation) ctx.rotate((imgObj.rotation * Math.PI) / 180);
      ctx.scale(imgObj.scaleX ?? 1, imgObj.scaleY ?? 1);
      ctx.globalAlpha = imgObj.isReference ? 0.45 : (imgObj.opacity ?? 1);
      ctx.globalCompositeOperation = imgObj.blendMode || 'source-over';

      const w = imgObj.width;
      const h = imgObj.height;
      const anchor = asset.anchor || { x: 0.5, y: 0.5 };
      const drawX = -w * anchor.x;
      const drawY = -h * anchor.y;

      if (imgObj.isToken) {
        ctx.beginPath();
        if (imgObj.tokenShape === 'square') {
          ctx.rect(drawX, drawY, w, h);
        } else {
          ctx.arc(0, 0, Math.min(w, h) / 2, 0, Math.PI * 2);
        }
        ctx.clip();
      }

      renderAdjustedImage(
        ctx,
        cachedImg,
        drawX,
        drawY,
        w,
        h,
        imgObj.adjustments,
        theme.id
      );

      if (imgObj.isToken) {
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      if (imgObj.id === selectedId) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(drawX, drawY, w, h);

        ctx.fillStyle = '#38bdf8';
        [
          [drawX, drawY],
          [drawX + w, drawY],
          [drawX, drawY + h],
          [drawX + w, drawY + h],
        ].forEach(([hx, hy]) => {
          ctx.fillRect(hx - 3, hy - 3, 6, 6);
        });
      }

      ctx.restore();
    });
  }

  private drawAiGhostProposals(
    ctx: CanvasRenderingContext2D,
    proposals: AiProposedAction[],
    theme: ThemeConfig
  ) {
    proposals.forEach((prop) => {
      if (prop.status !== 'pending' || !prop.previewElements) return;
      ctx.save();
      ctx.globalAlpha = 0.55;

      if (prop.previewElements.stamps) {
        prop.previewElements.stamps.forEach((s) => {
          drawStamp(ctx, s.type, s.x, s.y, theme, {
            scale: s.scale,
            rotation: s.rotation,
            opacity: 0.6,
            tint: '#06b6d4',
          });
          ctx.strokeStyle = '#06b6d4';
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(s.x - 24 * s.scale, s.y - 24 * s.scale, 48 * s.scale, 48 * s.scale);
        });
      }

      if (prop.previewElements.paths) {
        prop.previewElements.paths.forEach((p) => {
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = p.width + 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          renderSmoothSpline(ctx, p.points);
          ctx.stroke();
        });
      }

      if (prop.previewElements.labels) {
        prop.previewElements.labels.forEach((l) => {
          ctx.font = `${l.fontSize}px ${l.fontFamily || theme.fontPrimary}`;
          ctx.fillStyle = '#06b6d4';
          ctx.textAlign = 'center';
          ctx.fillText(`[IA] ${l.text}`, l.x, l.y);
        });
      }

      ctx.restore();
    });
  }

  private drawLabels(
    ctx: CanvasRenderingContext2D,
    labels: TextLabel[],
    theme: ThemeConfig,
    selectedId?: string | null
  ) {
    labels.forEach((lbl) => {
      ctx.save();
      ctx.translate(lbl.x, lbl.y);
      if (lbl.rotation) ctx.rotate((lbl.rotation * Math.PI) / 180);

      const fontFam = lbl.fontFamily || theme.fontPrimary;
      ctx.font = `${lbl.fontSize}px ${fontFam}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const text = lbl.text;
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;

      if (lbl.isBanner) {
        // Decorative banner ribbon under title
        ctx.fillStyle = theme.background;
        ctx.strokeStyle = theme.borderColor;
        ctx.lineWidth = 2;

        const padX = 28;
        const padY = 12;
        const bw = textWidth + padX * 2;
        const bh = lbl.fontSize + padY * 2;

        ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
        ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);

        // Ribbon dovetail cuts on sides
        ctx.beginPath();
        ctx.moveTo(-bw / 2, -bh / 2);
        ctx.lineTo(-bw / 2 - 14, 0);
        ctx.lineTo(-bw / 2, bh / 2);
        ctx.moveTo(bw / 2, -bh / 2);
        ctx.lineTo(bw / 2 + 14, 0);
        ctx.lineTo(bw / 2, bh / 2);
        ctx.stroke();
      }

      // Text color & halo for readability
      ctx.fillStyle = lbl.color || theme.textColor;
      if (theme.id === 'arcane') {
        ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
        ctx.shadowBlur = 8;
      } else {
        // Clean subtle halo around text
        ctx.lineWidth = 3;
        ctx.strokeStyle = theme.background;
        ctx.strokeText(text, 0, 0);
      }

      ctx.fillText(text, 0, 0);

      if (lbl.id === selectedId) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(-textWidth / 2 - 4, -lbl.fontSize / 2 - 4, textWidth + 8, lbl.fontSize + 8);
      }

      ctx.restore();
    });
  }

  private drawMarkers(
    ctx: CanvasRenderingContext2D,
    doc: MapDocument,
    theme: ThemeConfig,
    isPlayerMode: boolean,
    selectedId?: string | null
  ) {
    doc.markers.forEach((m) => {
      // In player mode, secret markers are completely hidden!
      if (isPlayerMode && m.isSecret) return;

      ctx.save();
      const isSelected = m.id === selectedId;

      // Outer pin badge
      const radius = 13;
      ctx.beginPath();
      ctx.arc(m.x, m.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = m.isSecret ? '#991b1b' : theme.inkColor;
      ctx.fill();

      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = isSelected ? '#38bdf8' : '#f59e0b';
      ctx.stroke();

      // Number text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(m.number), m.x, m.y + 0.5);

      // Secret icon badge
      if (m.isSecret && !isPlayerMode) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(m.x + 9, m.y - 9, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  private drawFog(
    ctx: CanvasRenderingContext2D,
    doc: MapDocument,
    theme: ThemeConfig,
    isPlayerMode: boolean
  ) {
    const { width, height, fogData, fogResolution } = doc;
    const res = fogResolution || 4;
    const cols = Math.floor(width / res);
    const rows = Math.floor(height / res);

    ctx.save();
    ctx.fillStyle = theme.fogColor;
    ctx.globalAlpha = isPlayerMode ? 1.0 : 0.45;

    // Render fogged cells
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (fogData[y * cols + x] === 1) {
          ctx.fillRect(x * res, y * res, res, res);
        }
      }
    }

    ctx.restore();
  }

  private drawDecorations(
    ctx: CanvasRenderingContext2D,
    doc: MapDocument,
    theme: ThemeConfig
  ) {
    const { width, height } = doc;

    // Ornate Border Frame
    if (doc.showBorder) {
      ctx.save();
      ctx.strokeStyle = theme.borderColor;
      ctx.lineWidth = 5;
      ctx.strokeRect(12, 12, width - 24, height - 24);

      // Inner thin border
      ctx.lineWidth = 1.2;
      ctx.strokeRect(18, 18, width - 36, height - 36);

      // Corner flourishes
      const corners = [
        [18, 18],
        [width - 18, 18],
        [18, height - 18],
        [width - 18, height - 18],
      ];
      corners.forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();
    }

    // Compass Rose (Rosa dos Ventos)
    if (doc.showCompass) {
      const pos = doc.compassPos || { x: width - 85, y: 85 };
      this.drawCompassRose(ctx, pos.x, pos.y, theme);
    }

    // Graphical Scale Bar
    if (doc.showScaleBar) {
      const pos = doc.scaleBarPos || { x: 90, y: height - 45 };
      this.drawScaleBar(ctx, pos.x, pos.y, doc, theme);
    }
  }

  private drawCompassRose(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    theme: ThemeConfig
  ) {
    ctx.save();
    ctx.translate(x, y);

    const rOuter = 36;
    const rInner = 12;

    // Outer circle
    ctx.strokeStyle = theme.compassColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
    ctx.stroke();

    // 8-point nautical star
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const isCard = i % 2 === 0;
      const rTip = isCard ? rOuter + 4 : rOuter * 0.7;

      const tipX = Math.cos(angle) * rTip;
      const tipY = Math.sin(angle) * rTip;

      const leftAngle = angle - Math.PI / 8;
      const rightAngle = angle + Math.PI / 8;

      const lx = Math.cos(leftAngle) * rInner;
      const ly = Math.sin(leftAngle) * rInner;

      // Dark half
      ctx.fillStyle = theme.inkColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(lx, ly);
      ctx.closePath();
      ctx.fill();

      // Light half
      ctx.fillStyle = theme.background;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(Math.cos(rightAngle) * rInner, Math.sin(rightAngle) * rInner);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // North 'N' letter
    ctx.fillStyle = theme.textColor;
    ctx.font = 'bold 15px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('N', 0, -rOuter - 4);

    ctx.restore();
  }

  private drawScaleBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    doc: MapDocument,
    theme: ThemeConfig
  ) {
    ctx.save();
    ctx.translate(x, y);

    const length = 120;
    const height = 6;
    const segments = 4;
    const segLen = length / segments;

    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, length, height);

    for (let i = 0; i < segments; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = theme.inkColor;
        ctx.fillRect(i * segLen, 0, segLen, height);
      }
    }

    // Labels
    ctx.fillStyle = theme.textColor;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const unit = doc.mode === 'world' ? 'Milhas' : doc.mode === 'battlemap' ? 'Metros' : 'Léguas';
    const totalVal = doc.mode === 'battlemap' ? '15' : '100';

    ctx.fillText('0', 0, height + 4);
    ctx.fillText(`${totalVal} ${unit}`, length, height + 4);

    ctx.restore();
  }

  private drawBrushCursor(
    ctx: CanvasRenderingContext2D,
    cursor: { x: number; y: number; radius: number; color?: string }
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, cursor.radius, 0, Math.PI * 2);
    ctx.strokeStyle = cursor.color || 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  }
}

// Helper functions
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function isLand(b: string): boolean {
  return b !== 'deep_ocean' && b !== 'shallow_ocean';
}

function renderSmoothSpline(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length < 2) return;
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const hx = x + Math.cos(angle) * r;
    const hy = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.stroke();
}
