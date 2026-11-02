import {
  Compass,
  Layers,
  List,
  Maximize2,
  Minimize2,
  Minus,
  Network,
  Pin,
  Plus,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { detectOrphanNoteIds } from '../../lib/wikiLinks';
import { useMapStore } from '../../store/useMapStore';
import type { NoteLink, NoteNode } from '../../types';
import { Minimap } from './Minimap';
import { RadialMenu } from './RadialMenu';

export const MapCanvas: React.FC = () => {
  const {
    notes,
    links,
    layers,
    frames,
    viewState,
    setViewState,
    selectedNodeId,
    selectedNodeIds,
    selectNode,
    openEditor,
    updateNotePosition,
    commitNotePositions,
    createNoteAt,
    setRadialMenu,
    setLayersPanelOpen,
    setListPanelOpen,
    runForceLayout,
    addLink,
    undo,
    redo,
    undoStack,
    redoStack,
    searchQuery,
    matchedNodeIds,
  } = useMapStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const transformLayerRef = useRef<HTMLDivElement>(null);

  // Link creation dragging state
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  // Pan / Zoom / Drag refs (avoids React re-rendering during 60fps pan/zoom)
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const startViewStateRef = useRef({ panX: 0, panY: 0 });

  // Node drag ref
  const draggingNodeIdRef = useRef<string | null>(null);
  const startNodePosRef = useRef({ x: 0, y: 0 });
  const dragStartPointerRef = useRef({ x: 0, y: 0 });

  // Touch pinch zoom refs
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1);

  // Long press detection for empty canvas vs node
  const longPressTimerRef = useRef<number | null>(null);

  // Layers map & visibility filter
  const visibleLayersSet = useMemo(() => {
    return new Set(layers.filter((l) => l.visible).map((l) => l.id));
  }, [layers]);

  const visibleNotes = useMemo(() => {
    return notes.filter((n) => visibleLayersSet.has(n.layerId));
  }, [notes, visibleLayersSet]);

  const visibleNoteIds = useMemo(() => new Set(visibleNotes.map((n) => n.id)), [visibleNotes]);

  const visibleLinks = useMemo(() => {
    return links.filter((l) => visibleNoteIds.has(l.fromId) && visibleNoteIds.has(l.toId));
  }, [links, visibleNoteIds]);

  const orphanIds = useMemo(() => detectOrphanNoteIds(visibleNotes, visibleLinks), [visibleNotes, visibleLinks]);

  // Focus mode calculation: find neighbors within focusHops
  const focusedNodeIds = useMemo(() => {
    if (!viewState.focusNodeId) return null;
    const focusSet = new Set<string>([viewState.focusNodeId]);
    let currentHops = new Set<string>([viewState.focusNodeId]);

    for (let h = 0; h < viewState.focusHops; h++) {
      const nextHops = new Set<string>();
      for (const id of currentHops) {
        for (const l of visibleLinks) {
          if (l.fromId === id && !focusSet.has(l.toId)) {
            focusSet.add(l.toId);
            nextHops.add(l.toId);
          } else if (l.toId === id && !focusSet.has(l.fromId)) {
            focusSet.add(l.fromId);
            nextHops.add(l.fromId);
          }
        }
      }
      currentHops = nextHops;
    }
    return focusSet;
  }, [viewState.focusNodeId, viewState.focusHops, visibleLinks]);

  // Update transform on transform layer
  useEffect(() => {
    if (transformLayerRef.current) {
      transformLayerRef.current.style.transform = `translate3d(${viewState.panX}px, ${viewState.panY}px, 0) scale(${viewState.zoom})`;
    }
  }, [viewState.panX, viewState.panY, viewState.zoom]);

  // Screen to Canvas World Coordinates conversion
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: (screenX - viewState.panX) / viewState.zoom,
        y: (screenY - viewState.panY) / viewState.zoom,
      };
    },
    [viewState.panX, viewState.panY, viewState.zoom]
  );

  // ------------------- Pointer & Touch Events -------------------

  const handlePointerDown = (e: React.PointerEvent) => {
    // If target is inside a node or button, let that handle it
    const targetElement = e.target as HTMLElement;
    const nodeEl = targetElement.closest('[data-node-id]');

    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id');
      if (nodeId) {
        // If we are in link creation mode, clicking another node finishes the link!
        if (connectingFromId && connectingFromId !== nodeId) {
          addLink(connectingFromId, nodeId);
          setConnectingFromId(null);
          return;
        }

        // Start dragging this node
        const note = notes.find((n) => n.id === nodeId);
        if (note && !note.pinned) {
          draggingNodeIdRef.current = nodeId;
          startNodePosRef.current = { x: note.x, y: note.y };
          dragStartPointerRef.current = { x: e.clientX, y: e.clientY };
        }

        // Long press for radial menu
        longPressTimerRef.current = window.setTimeout(() => {
          setRadialMenu(nodeId, { x: e.clientX, y: e.clientY });
          draggingNodeIdRef.current = null;
        }, 500);

        return;
      }
    }

    // Canvas background click/drag -> pan
    isPanningRef.current = true;
    startPanRef.current = { x: e.clientX, y: e.clientY };
    startViewStateRef.current = { panX: viewState.panX, panY: viewState.panY };

    // Long press on empty canvas area -> create note there
    longPressTimerRef.current = window.setTimeout(() => {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      createNoteAt(worldPos.x, worldPos.y);
      isPanningRef.current = false;
    }, 550);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Cancel long press on movement
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Dragging a node
    if (draggingNodeIdRef.current) {
      const dx = (e.clientX - dragStartPointerRef.current.x) / viewState.zoom;
      const dy = (e.clientY - dragStartPointerRef.current.y) / viewState.zoom;
      const nextX = startNodePosRef.current.x + dx;
      const nextY = startNodePosRef.current.y + dy;
      updateNotePosition(draggingNodeIdRef.current, nextX, nextY);
      return;
    }

    // Panning canvas
    if (isPanningRef.current) {
      const dx = e.clientX - startPanRef.current.x;
      const dy = e.clientY - startPanRef.current.y;
      const nextPanX = startViewStateRef.current.panX + dx;
      const nextPanY = startViewStateRef.current.panY + dy;

      if (transformLayerRef.current) {
        transformLayerRef.current.style.transform = `translate3d(${nextPanX}px, ${nextPanY}px, 0) scale(${viewState.zoom})`;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (draggingNodeIdRef.current) {
      draggingNodeIdRef.current = null;
      commitNotePositions();
      return;
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      const dx = e.clientX - startPanRef.current.x;
      const dy = e.clientY - startPanRef.current.y;
      setViewState({
        panX: startViewStateRef.current.panX + dx,
        panY: startViewStateRef.current.panY + dy,
      });
    }
  };

  // Touch pinch to zoom handler
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = viewState.zoom;
      isPanningRef.current = false;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scale = dist / initialPinchDistRef.current;
      const newZoom = Math.min(4, Math.max(0.15, initialPinchZoomRef.current * scale));

      setViewState({ zoom: newZoom });
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistRef.current = null;
  };

  // Mouse Wheel Zoom centered on cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.min(4, Math.max(0.15, viewState.zoom * zoomFactor));

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const newPanX = mouseX - (mouseX - viewState.panX) * (newZoom / viewState.zoom);
    const newPanY = mouseY - (mouseY - viewState.panY) * (newZoom / viewState.zoom);

    setViewState({ zoom: newZoom, panX: newPanX, panY: newPanY });
  };

  // Fit All notes on screen
  const handleFitAll = () => {
    if (visibleNotes.length === 0) {
      setViewState({ zoom: 1, panX: window.innerWidth / 2, panY: window.innerHeight / 2 });
      return;
    }

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    visibleNotes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const w = Math.max(200, maxX - minX + 200);
    const h = Math.max(200, maxY - minY + 200);

    const scaleX = (window.innerWidth - 80) / w;
    const scaleY = (window.innerHeight - 140) / h;
    const newZoom = Math.min(2.5, Math.max(0.2, Math.min(scaleX, scaleY)));

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    setViewState({
      zoom: newZoom,
      panX: -midX * newZoom + window.innerWidth / 2,
      panY: -midY * newZoom + window.innerHeight / 2,
    });
  };

  // Double tap node detection
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const handleNodeClick = (e: React.MouseEvent, note: NoteNode) => {
    e.stopPropagation();
    const now = Date.now();
    if (lastTapRef.current && lastTapRef.current.id === note.id && now - lastTapRef.current.time < 320) {
      // Double tap -> Open editor
      openEditor(note.id);
      lastTapRef.current = null;
      return;
    }
    lastTapRef.current = { id: note.id, time: now };
    selectNode(note.id);
  };

  const handleStartLink = (fromId: string) => {
    setConnectingFromId(fromId);
  };

  // Map notes lookup
  const noteLookup = useMemo(() => new Map(visibleNotes.map((n) => [n.id, n])), [visibleNotes]);

  // Current LOD:
  // Low: zoom < 0.55
  // Medium: 0.55 <= zoom <= 1.2
  // High: zoom > 1.2
  const lod = viewState.zoom < 0.55 ? 'low' : viewState.zoom <= 1.2 ? 'medium' : 'high';

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className="relative w-full h-full min-h-[calc(100vh-4rem)] overflow-hidden bg-[#07060d] select-none touch-none cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: `${32 * viewState.zoom}px ${32 * viewState.zoom}px`,
        backgroundPosition: `${viewState.panX}px ${viewState.panY}px`,
      }}
    >
      {/* Transformable Canvas Layer (Single DOM container for 60fps performance) */}
      <div
        ref={transformLayerRef}
        className="absolute top-0 left-0 w-full h-full origin-top-left pointer-events-none"
      >
        {/* SVG Edges Layer */}
        <svg
          className="absolute overflow-visible w-full h-full pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="edgeGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e879f9" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Render links */}
          {visibleLinks.map((link) => {
            const source = noteLookup.get(link.fromId);
            const target = noteLookup.get(link.toId);
            if (!source || !target) return null;

            const isSelected = selectedNodeId === link.fromId || selectedNodeId === link.toId;

            // Curved Bézier path
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const cx1 = source.x + dx * 0.4;
            const cy1 = source.y + dy * 0.1;
            const cx2 = source.x + dx * 0.6;
            const cy2 = source.y + dy * 0.9;
            const pathData = `M ${source.x} ${source.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${target.x} ${target.y}`;

            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;

            return (
              <g key={link.id}>
                {/* Glow underlay */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? '#22d3ee' : 'rgba(255, 255, 255, 0.18)'}
                  strokeWidth={isSelected ? 4 : 2}
                  strokeOpacity={isSelected ? 0.9 : 0.4}
                  strokeLinecap="round"
                />

                {/* Edge Label if present */}
                {link.label && lod !== 'low' && (
                  <text
                    x={midX}
                    y={midY - 6}
                    fill="#94a3b8"
                    fontSize="11"
                    textAnchor="middle"
                    className="font-sans font-medium"
                    style={{ pointerEvents: 'none' }}
                  >
                    {link.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes Layer */}
        {visibleNotes.map((note) => {
          const isSelected = selectedNodeId === note.id || selectedNodeIds.includes(note.id);
          const isOrphan = orphanIds.has(note.id);
          const isSearchMatch = searchQuery.trim() ? matchedNodeIds.includes(note.id) : true;
          const isFocused = focusedNodeIds ? focusedNodeIds.has(note.id) : true;

          // Opacity based on focus and search
          let nodeOpacity = 1;
          if (!isFocused || !isSearchMatch) {
            nodeOpacity = 0.22;
          }

          const nodeColor = note.color || '#22d3ee';

          return (
            <div
              key={note.id}
              data-node-id={note.id}
              onClick={(e) => handleNodeClick(e, note)}
              onContextMenu={(e) => {
                e.preventDefault();
                setRadialMenu(note.id, { x: e.clientX, y: e.clientY });
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-opacity"
              style={{
                left: `${note.x}px`,
                top: `${note.y}px`,
                opacity: nodeOpacity,
                zIndex: isSelected ? 20 : 10,
              }}
            >
              {/* LOW ZOOM: Minimal orb with glow */}
              {lod === 'low' && (
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                    isSelected ? 'scale-150 ring-2 ring-white' : 'hover:scale-125'
                  }`}
                  style={{
                    backgroundColor: nodeColor,
                    boxShadow: `0 0 16px ${nodeColor}`,
                  }}
                />
              )}

              {/* MEDIUM ZOOM: Orb + Title badge */}
              {lod === 'medium' && (
                <div
                  className={`flex items-center gap-2 p-1.5 pr-3 rounded-full glass-panel border transition-all ${
                    isSelected
                      ? 'border-cyan-400 bg-white/15 scale-105 shadow-[0_0_20px_rgba(34,211,238,0.5)]'
                      : 'hover:border-white/40'
                  }`}
                  style={{ borderColor: isSelected ? '#22d3ee' : `${nodeColor}66` }}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-[0_0_8px]"
                    style={{ backgroundColor: nodeColor, boxShadow: `0 0 10px ${nodeColor}` }}
                  />
                  <span className="text-xs font-bold text-white whitespace-nowrap tracking-tight">
                    {note.title}
                  </span>
                  {note.pinned && <Pin className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
                </div>
              )}

              {/* HIGH ZOOM: Detailed Glass Card with preview and tags */}
              {lod === 'high' && (
                <div
                  className={`w-56 p-3 rounded-2xl glass-panel-elevated border transition-all ${
                    isSelected
                      ? 'border-cyan-400 scale-105 shadow-[0_0_25px_rgba(34,211,238,0.45)]'
                      : 'hover:border-white/30'
                  }`}
                  style={{
                    borderColor: isSelected ? '#22d3ee' : `${nodeColor}70`,
                    borderTopColor: nodeColor,
                    borderTopWidth: '3px',
                  }}
                >
                  <div className="flex items-start justify-between gap-1 pb-1">
                    <h3 className="font-bold text-xs text-white truncate">{note.title}</h3>
                    {note.pinned && (
                      <Pin className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                    )}
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-2 mt-1 leading-snug">
                    {note.body.slice(0, 90) || <span className="italic text-slate-500">Sem texto...</span>}
                  </p>

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {note.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-cyan-200"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Linking Mode Active Banner */}
      {connectingFromId && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-full bg-purple-600/90 text-white text-xs font-bold border border-purple-400 shadow-xl flex items-center gap-2 animate-bounce">
          <span>Toque no nó de destino para conectar</span>
          <button
            onClick={() => setConnectingFromId(null)}
            className="text-white hover:text-rose-200 p-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Minimap */}
      <Minimap />

      {/* Floating Canvas Action Bar (Bottom Thumb Zone) */}
      <div className="absolute bottom-20 left-4 right-4 z-30 pointer-events-none flex items-center justify-between">
        {/* Left: Navigation Tools */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-2xl glass-panel-elevated border border-white/15 shadow-xl">
          <button
            onClick={() => setViewState((prev) => ({ ...prev, zoom: Math.min(4, prev.zoom * 1.25) }))}
            aria-label="Aumentar Zoom"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-90 transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => setViewState((prev) => ({ ...prev, zoom: Math.max(0.15, prev.zoom / 1.25) }))}
            aria-label="Diminuir Zoom"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-90 transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={handleFitAll}
            aria-label="Ajustar tudo na tela"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-90 transition"
            title="Ajustar tudo na tela"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => runForceLayout()}
            aria-label="Reorganizar grafo (Obsidian style)"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10 active:scale-90 transition"
            title="Reorganizar Grafo com Força"
          >
            <Network className="w-4 h-4" />
          </button>

          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            aria-label="Desfazer"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 active:scale-90 transition"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            aria-label="Refazer"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 active:scale-90 transition"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Panels & FAB "+" */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Layers Button */}
          <button
            onClick={() => setLayersPanelOpen(true)}
            aria-label="Abrir Camadas"
            className="w-11 h-11 rounded-2xl glass-panel-elevated text-purple-300 border border-purple-400/40 flex items-center justify-center shadow-lg active:scale-95 transition hover:bg-white/10"
            title="Camadas"
          >
            <Layers className="w-5 h-5" />
          </button>

          {/* List / Search Button */}
          <button
            onClick={() => setListPanelOpen(true)}
            aria-label="Abrir Lista e Busca"
            className="w-11 h-11 rounded-2xl glass-panel-elevated text-cyan-300 border border-cyan-400/40 flex items-center justify-center shadow-lg active:scale-95 transition hover:bg-white/10"
            title="Lista e Busca"
          >
            <List className="w-5 h-5" />
          </button>

          {/* Large Floating Action Button "+" */}
          <button
            onClick={() => {
              const centerWorld = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
              createNoteAt(centerWorld.x, centerWorld.y);
            }}
            aria-label="Criar nova nota no centro"
            className="w-13 h-13 rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.5)] active:scale-95 transition hover:brightness-110"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Radial Menu */}
      <RadialMenu onStartLink={handleStartLink} />
    </div>
  );
};
