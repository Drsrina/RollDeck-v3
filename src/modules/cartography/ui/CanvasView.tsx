/**
 * Interactive Canvas Viewport for Cartógrafo
 * High-performance 2D Canvas with Pan, Zoom, Stylus Pressure, Brush Painting,
 * Spline Drafting, Stamp Dragging, Minimap and Shortcuts.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useMapStore } from '../store/mapStore';
import { CartographyRenderer } from '../render/cartographyRender';
import { Point, StampItem, TextLabel } from '../types/map';
import { ZoomIn, ZoomOut, Maximize2, Compass, Layers } from 'lucide-react';
import { fileToAsset } from '../assets/assetStore';

export const CanvasView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CartographyRenderer>(new CartographyRenderer());

  const {
    doc,
    activeTool,
    toolSettings,
    zoom,
    pan,
    isPlayerMode,
    selectedItemId,
    activePathDraft,
    setZoom,
    setPan,
    resetView,
    setTool,
    paintTerrain,
    addStampItem,
    updateStampItem,
    setSelected,
    addPathDraftPoint,
    finishPathDraft,
    addTextLabel,
    updateTextLabel,
    addMarker,
    paintFog,
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    updateToolSettings,
    pushHistory,
    updateImageObject,
    addImageObject,
    addAsset,
    scatterImages,
    aiProposals,
  } = useMapStore();

  const [isPointerDown, setIsPointerDown] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [initialPan, setInitialPan] = useState<Point>({ x: 0, y: 0 });
  const [draggingItem, setDraggingItem] = useState<{ id: string; type: 'stamp' | 'label' | 'marker' | 'image'; startX: number; startY: number } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [mouseWorldPos, setMouseWorldPos] = useState<Point>({ x: 0, y: 0 });
  const [showMinimap, setShowMinimap] = useState(true);

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      if (!containerRef.current) return { x: screenX, y: screenY };
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = screenX - rect.left;
      const relativeY = screenY - rect.top;
      return {
        x: (relativeX - pan.x) / zoom,
        y: (relativeY - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Convert world coordinates to screen
  const worldToScreen = useCallback(
    (worldX: number, worldY: number): Point => {
      return {
        x: worldX * zoom + pan.x,
        y: worldY * zoom + pan.y,
      };
    },
    [pan, zoom]
  );

  // Render loop
  useEffect(() => {
    let animId: number;

    const renderFrame = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(pan.x, pan.y);
          ctx.scale(zoom, zoom);

          // Brush cursor indicator in world coords
          let brushCursor = null;
          if (
            activeTool === 'brush' ||
            activeTool === 'eraser' ||
            activeTool === 'fog_add' ||
            activeTool === 'fog_remove' ||
            activeTool === 'scatter_image'
          ) {
            brushCursor = {
              x: mouseWorldPos.x,
              y: mouseWorldPos.y,
              radius: activeTool === 'scatter_image'
                ? toolSettings.scatterRadius
                : activeTool.includes('fog')
                ? toolSettings.fogBrushSize
                : toolSettings.brushSize,
              color: activeTool === 'eraser' ? 'rgba(239, 68, 68, 0.7)' : activeTool === 'scatter_image' ? 'rgba(245, 158, 11, 0.8)' : undefined,
            };
          }

          rendererRef.current.render(ctx, doc, {
            isPlayerMode,
            selectedItemId,
            activePathDraft,
            brushCursor,
            aiProposals,
          });

          ctx.restore();
        }
      }

      // Render Minimap
      const mmCanvas = minimapRef.current;
      if (mmCanvas && showMinimap) {
        const mmCtx = mmCanvas.getContext('2d');
        if (mmCtx) {
          mmCtx.clearRect(0, 0, mmCanvas.width, mmCanvas.height);
          mmCtx.save();
          const mmScaleX = mmCanvas.width / doc.width;
          const mmScaleY = mmCanvas.height / doc.height;
          mmCtx.scale(mmScaleX, mmScaleY);

          rendererRef.current.render(mmCtx, doc, {
            isPlayerMode,
            showGridOverride: false,
          });

          // Minimap Viewport Frustum indicator
          if (containerRef.current) {
            const vWidth = containerRef.current.clientWidth / zoom;
            const vHeight = containerRef.current.clientHeight / zoom;
            const vx = -pan.x / zoom;
            const vy = -pan.y / zoom;

            mmCtx.strokeStyle = '#38bdf8';
            mmCtx.lineWidth = 4 / mmScaleX;
            mmCtx.strokeRect(vx, vy, vWidth, vHeight);
            mmCtx.fillStyle = 'rgba(56, 189, 248, 0.15)';
            mmCtx.fillRect(vx, vy, vWidth, vHeight);
          }

          mmCtx.restore();
        }
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [doc, pan, zoom, isPlayerMode, selectedItemId, activeTool, activePathDraft, mouseWorldPos, toolSettings, showMinimap]);

  // Adjust canvas size to container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(true);
      } else if (e.key === 'b' || e.key === 'B') {
        setTool('brush');
      } else if (e.key === 'e' || e.key === 'E') {
        setTool('eraser');
      } else if (e.key === 's' || e.key === 'S') {
        setTool('stamp');
      } else if (e.key === 'r' || e.key === 'R') {
        setTool('spline_river');
      } else if (e.key === 'p' || e.key === 'P') {
        setTool('spline_road');
      } else if (e.key === 't' || e.key === 'T') {
        setTool('text');
      } else if (e.key === 'm' || e.key === 'M') {
        setTool('marker');
      } else if (e.key === 'v' || e.key === 'V') {
        setTool('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setTool('pan');
      } else if (e.key === '[') {
        updateToolSettings({ brushSize: Math.max(6, toolSettings.brushSize - 4) });
      } else if (e.key === ']') {
        updateToolSettings({ brushSize: Math.min(120, toolSettings.brushSize + 4) });
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      } else if (e.key === 'Enter') {
        if (activePathDraft) finishPathDraft();
      } else if (e.key === 'Escape') {
        setSelected(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [toolSettings, activePathDraft, undo, redo, deleteSelected, duplicateSelected, finishPathDraft, setSelected, setTool, updateToolSettings]);

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const world = screenToWorld(e.clientX, e.clientY);
    setIsPointerDown(true);

    // Pan with space bar or middle mouse or pan tool
    if (spacePressed || e.button === 1 || activeTool === 'pan') {
      setDragStart({ x: e.clientX, y: e.clientY });
      setInitialPan({ ...pan });
      return;
    }

    if (e.button !== 0) return; // Only primary button for drawing/selection

    // Select Tool: hit test stamps, labels, markers
    if (activeTool === 'select') {
      // 1. Check markers
      for (let i = doc.markers.length - 1; i >= 0; i--) {
        const m = doc.markers[i];
        if (isPlayerMode && m.isSecret) continue;
        const dx = m.x - world.x;
        const dy = m.y - world.y;
        if (dx * dx + dy * dy <= 20 * 20) {
          setSelected(m.id, 'marker');
          setDraggingItem({ id: m.id, type: 'marker', startX: world.x - m.x, startY: world.y - m.y });
          return;
        }
      }

      // 1b. Check image objects
      if (doc.imageObjects) {
        for (let i = doc.imageObjects.length - 1; i >= 0; i--) {
          const img = doc.imageObjects[i];
          if (isPlayerMode && img.isSecret) continue;
          const hw = img.width * (img.scaleX ?? 1) * 0.5;
          const hh = img.height * (img.scaleY ?? 1) * 0.5;
          if (Math.abs(world.x - img.x) <= hw && Math.abs(world.y - img.y) <= hh) {
            setSelected(img.id, 'image');
            setDraggingItem({ id: img.id, type: 'image', startX: world.x - img.x, startY: world.y - img.y });
            return;
          }
        }
      }

      // 2. Check labels
      for (let i = doc.labels.length - 1; i >= 0; i--) {
        const lbl = doc.labels[i];
        const dx = Math.abs(lbl.x - world.x);
        const dy = Math.abs(lbl.y - world.y);
        if (dx < 60 && dy < lbl.fontSize + 10) {
          setSelected(lbl.id, 'label');
          setDraggingItem({ id: lbl.id, type: 'label', startX: world.x - lbl.x, startY: world.y - lbl.y });
          return;
        }
      }

      // 3. Check stamps
      for (let i = doc.stamps.length - 1; i >= 0; i--) {
        const s = doc.stamps[i];
        const r = 26 * s.scale;
        const dx = s.x - world.x;
        const dy = s.y - world.y;
        if (dx * dx + dy * dy <= r * r) {
          setSelected(s.id, 'stamp');
          setDraggingItem({ id: s.id, type: 'stamp', startX: world.x - s.x, startY: world.y - s.y });
          return;
        }
      }

      // 4. Check paths
      for (let i = doc.paths.length - 1; i >= 0; i--) {
        const p = doc.paths[i];
        for (const pt of p.points) {
          const dx = pt.x - world.x;
          const dy = pt.y - world.y;
          if (dx * dx + dy * dy <= 16 * 16) {
            setSelected(p.id, 'path');
            return;
          }
        }
      }

      setSelected(null);
      return;
    }

    // Brush & Eraser
    if (activeTool === 'brush') {
      pushHistory();
      paintTerrain(world.x, world.y, toolSettings.selectedBiome, toolSettings.brushSize);
    } else if (activeTool === 'eraser') {
      pushHistory();
      const fallbackBiome = doc.mode === 'dungeon' ? 'dungeon_wall' : 'shallow_ocean';
      paintTerrain(world.x, world.y, fallbackBiome, toolSettings.brushSize);
    } else if (activeTool === 'stamp') {
      const newStamp: StampItem = {
        id: `stamp-${Date.now()}`,
        type: toolSettings.selectedStamp,
        x: world.x,
        y: world.y,
        scale: toolSettings.stampScale,
        rotation: toolSettings.stampRotation,
        opacity: 1,
      };
      addStampItem(newStamp);
    } else if (activeTool === 'spline_river' || activeTool === 'spline_road') {
      addPathDraftPoint(world);
    } else if (activeTool === 'text') {
      const newLabel: TextLabel = {
        id: `label-${Date.now()}`,
        text: 'Novo Rótulo',
        x: world.x,
        y: world.y,
        rotation: 0,
        fontSize: toolSettings.fontSize,
        fontFamily: toolSettings.fontFamily,
        color: toolSettings.textColor,
      };
      addTextLabel(newLabel);
      setTool('select');
    } else if (activeTool === 'marker') {
      const nextNum = doc.markers.length + 1;
      addMarker({
        id: `marker-${Date.now()}`,
        number: nextNum,
        x: world.x,
        y: world.y,
        title: `Ponto de Interesse ${nextNum}`,
        description: toolSettings.markerSecret
          ? 'SEGREDOS DO MESTRE: Encontro engatilhado ou tesouro escondido aqui.'
          : 'Local descoberto pelo grupo de aventureiros.',
        isSecret: toolSettings.markerSecret,
        category: toolSettings.markerCategory,
      });
      setTool('select');
    } else if (activeTool === 'fog_add') {
      pushHistory();
      paintFog(world.x, world.y, toolSettings.fogBrushSize, false);
    } else if (activeTool === 'fog_remove') {
      pushHistory();
      paintFog(world.x, world.y, toolSettings.fogBrushSize, true);
    } else if (activeTool === 'scatter_image') {
      scatterImages(world);
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);
    setMouseWorldPos(world);

    if (!isPointerDown) return;

    // Pan handling
    if ((spacePressed || activeTool === 'pan' || dragStart) && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPan({
        x: initialPan.x + dx,
        y: initialPan.y + dy,
      });
      return;
    }

    // Dragging selected items
    if (draggingItem && activeTool === 'select') {
      const newX = world.x - draggingItem.startX;
      const newY = world.y - draggingItem.startY;
      if (draggingItem.type === 'stamp') {
        updateStampItem(draggingItem.id, { x: newX, y: newY });
      } else if (draggingItem.type === 'label') {
        updateTextLabel(draggingItem.id, { x: newX, y: newY });
      } else if (draggingItem.type === 'marker') {
        useMapStore.getState().updateMarker(draggingItem.id, { x: newX, y: newY });
      } else if (draggingItem.type === 'image') {
        updateImageObject(draggingItem.id, { x: newX, y: newY });
      }
      return;
    }

    // Continuous brush painting
    if (activeTool === 'brush') {
      paintTerrain(world.x, world.y, toolSettings.selectedBiome, toolSettings.brushSize);
    } else if (activeTool === 'eraser') {
      const fallbackBiome = doc.mode === 'dungeon' ? 'dungeon_wall' : 'shallow_ocean';
      paintTerrain(world.x, world.y, fallbackBiome, toolSettings.brushSize);
    } else if (activeTool === 'fog_add') {
      paintFog(world.x, world.y, toolSettings.fogBrushSize, false);
    } else if (activeTool === 'fog_remove') {
      paintFog(world.x, world.y, toolSettings.fogBrushSize, true);
    } else if (activeTool === 'scatter_image' && Math.random() > 0.65) {
      scatterImages(world);
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsPointerDown(false);
    setDragStart(null);
    setDraggingItem(null);
  };

  // Wheel Zoom centered at cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(0.2, Math.min(5.0, zoom * zoomFactor));

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Keep point under mouse fixed
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const getCursorClass = () => {
    if (spacePressed || activeTool === 'pan') return isPointerDown ? 'cursor-grabbing' : 'cursor-grab';
    if (activeTool === 'select') return 'cursor-default';
    if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'fog_add' || activeTool === 'fog_remove') return 'cursor-crosshair';
    if (activeTool === 'stamp') return 'cursor-copy';
    if (activeTool === 'text') return 'cursor-text';
    return 'cursor-crosshair';
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-[#0d0f14] select-none ${getCursorClass()}`}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={async (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          const world = screenToWorld(e.clientX, e.clientY);
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
              try {
                const asset = await fileToAsset(file, 'stamp');
                addAsset(asset);
                const baseW = Math.min(asset.width, 130);
                const baseH = (asset.height / asset.width) * baseW;
                addImageObject({
                  id: `img-${Date.now()}-${i}`,
                  assetId: asset.id,
                  name: asset.name,
                  layerId: 'l-images',
                  x: world.x + i * 20,
                  y: world.y + i * 20,
                  width: Math.round(baseW),
                  height: Math.round(baseH),
                  scaleX: 1,
                  scaleY: 1,
                  rotation: 0,
                  opacity: 1,
                  blendMode: 'source-over',
                  adjustments: {
                    brightness: 100,
                    contrast: 100,
                    hue: 0,
                    sepia: 0,
                    grayscale: 0,
                    tintTheme: true,
                    shadow: true,
                    outline: false,
                  },
                });
              } catch (err) {
                console.error(err);
              }
            }
          }
        }
      }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Floating Viewport Controls (Zoom in/out, fit, coordinates) */}
      <div className="absolute bottom-5 left-5 flex items-center gap-1.5 bg-[#171a22]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#2a303e] shadow-2xl text-xs text-neutral-300">
        <button
          onClick={() => setZoom((z) => Math.max(0.2, z * 0.85))}
          title="Diminuir Zoom"
          className="p-1.5 hover:bg-[#252b38] hover:text-white rounded-lg transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="w-12 text-center font-mono font-medium text-amber-300">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(5.0, z * 1.15))}
          title="Aumentar Zoom"
          className="p-1.5 hover:bg-[#252b38] hover:text-white rounded-lg transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-neutral-700 mx-1" />
        <button
          onClick={resetView}
          title="Ajustar ao Centro (100%)"
          className="p-1.5 hover:bg-[#252b38] hover:text-white rounded-lg transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-neutral-700 mx-1" />
        <span className="text-[11px] font-mono text-neutral-400 pl-1">
          X: {Math.round(mouseWorldPos.x)} Y: {Math.round(mouseWorldPos.y)}
        </span>
      </div>

      {/* Active Spline Path Drafting Banner */}
      {activePathDraft && activePathDraft.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#1e2330]/95 backdrop-blur-md px-4 py-2 rounded-xl border border-sky-500/50 shadow-2xl text-xs text-neutral-200 animate-fadeIn">
          <span className="font-medium text-sky-300">
            Desenhando {activeTool === 'spline_river' ? 'Rio' : 'Estrada'} ({activePathDraft.length} pontos)
          </span>
          <button
            onClick={finishPathDraft}
            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            Concluir (Enter)
          </button>
          <button
            onClick={() => useMapStore.getState().cancelPathDraft()}
            className="px-2.5 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded-lg transition-colors"
          >
            Cancelar (Esc)
          </button>
        </div>
      )}

      {/* Minimap Preview in Bottom-Right Corner */}
      <div className="absolute bottom-5 right-5 flex flex-col items-end">
        {showMinimap && (
          <div className="relative w-44 h-28 bg-[#171a22] border border-[#2a303e] rounded-lg shadow-2xl overflow-hidden mb-2">
            <canvas ref={minimapRef} width={176} height={112} className="w-full h-full block" />
            <div className="absolute top-1 left-2 text-[10px] uppercase font-bold tracking-wider text-neutral-400">
              Minimapa
            </div>
          </div>
        )}
        <button
          onClick={() => setShowMinimap(!showMinimap)}
          title={showMinimap ? 'Ocultar Minimapa' : 'Mostrar Minimapa'}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#171a22]/90 backdrop-blur-md text-neutral-400 hover:text-neutral-200 border border-[#2a303e] rounded-lg text-xs transition-colors"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{showMinimap ? 'Ocultar' : 'Minimapa'}</span>
        </button>
      </div>
    </div>
  );
};
