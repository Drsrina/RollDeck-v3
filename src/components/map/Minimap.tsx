import { Eye, EyeOff, MapPin } from 'lucide-react';
import React, { useMemo } from 'react';
import { useMapStore } from '../../store/useMapStore';

export const Minimap: React.FC = () => {
  const { notes, viewState, setViewState } = useMapStore();
  const [collapsed, setCollapsed] = React.useState(false);

  // Compute bounding box of all notes with margin
  const bounds = useMemo(() => {
    if (notes.length === 0) {
      return { minX: -500, maxX: 500, minY: -500, maxY: 500, w: 1000, h: 1000 };
    }
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    notes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const pad = 400;
    minX -= pad;
    maxX += pad;
    minY -= pad;
    maxY += pad;
    return {
      minX,
      maxX,
      minY,
      maxY,
      w: Math.max(800, maxX - minX),
      h: Math.max(600, maxY - minY),
    };
  }, [notes]);

  if (!viewState.showMinimap) return null;

  const mapW = 120;
  const mapH = 90;

  const toMapX = (x: number) => ((x - bounds.minX) / bounds.w) * mapW;
  const toMapY = (y: number) => ((y - bounds.minY) / bounds.h) * mapH;

  // Viewport box in canvas coordinates
  const vpW = window.innerWidth / viewState.zoom;
  const vpH = window.innerHeight / viewState.zoom;
  const vpX1 = -viewState.panX / viewState.zoom;
  const vpY1 = -viewState.panY / viewState.zoom;

  const vpBoxX = Math.max(0, Math.min(mapW, toMapX(vpX1)));
  const vpBoxY = Math.max(0, Math.min(mapH, toMapY(vpY1)));
  const vpBoxW = Math.max(6, Math.min(mapW, (vpW / bounds.w) * mapW));
  const vpBoxH = Math.max(6, Math.min(mapH, (vpH / bounds.h) * mapH));

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const worldX = bounds.minX + (clickX / mapW) * bounds.w;
    const worldY = bounds.minY + (clickY / mapH) * bounds.h;

    setViewState({
      panX: -worldX * viewState.zoom + window.innerWidth / 2,
      panY: -worldY * viewState.zoom + window.innerHeight / 2,
    });
  };

  return (
    <div className="absolute top-16 right-3 z-30 pointer-events-auto flex flex-col items-end">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-1 rounded-t-lg bg-black/60 border border-white/10 text-slate-400 hover:text-white text-[10px] flex items-center gap-1 px-1.5"
      >
        <MapPin className="w-3 h-3 text-cyan-400" />
        <span>Minimapa</span>
      </button>

      {!collapsed && (
        <div
          onClick={handleMinimapClick}
          className="relative rounded-b-xl rounded-tl-xl overflow-hidden glass-panel-elevated border border-white/15 cursor-crosshair shadow-lg"
          style={{ width: mapW, height: mapH, backgroundColor: '#07060dcc' }}
        >
          {/* Nodes representation */}
          {notes.map((n) => (
            <div
              key={n.id}
              className="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{
                left: toMapX(n.x),
                top: toMapY(n.y),
                backgroundColor: n.color || '#22d3ee',
                boxShadow: `0 0 4px ${n.color || '#22d3ee'}`,
              }}
            />
          ))}

          {/* Viewport Box */}
          <div
            className="absolute border border-cyan-400 bg-cyan-400/15 pointer-events-none rounded-xs"
            style={{
              left: vpBoxX,
              top: vpBoxY,
              width: vpBoxW,
              height: vpBoxH,
            }}
          />
        </div>
      )}
    </div>
  );
};
