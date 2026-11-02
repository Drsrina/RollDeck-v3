import React, { useRef } from 'react';
import type { DieDefinition } from '../../types';

interface DiceCardProps {
  die: DieDefinition;
  count: number;
  onAdd: (dieId: string) => void;
  onRemove: (dieId: string) => void;
}

export const DiceCard: React.FC<DiceCardProps> = ({ die, count, onAdd, onRemove }) => {
  const timerRef = useRef<number | null>(null);
  const isLongPressRef = useRef(false);

  const startPress = () => {
    isLongPressRef.current = false;
    timerRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      onRemove(die.id);
    }, 450); // 450ms for long press
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    cancelPress();
    // Only trigger add if it wasn't a long-press
    if (!isLongPressRef.current) {
      onAdd(die.id);
    }
  };

  // Helper geometric polyhedral dice SVG shapes
  const renderDieIcon = () => {
    const color = die.color || '#22d3ee';

    if (die.symbol) {
      return (
        <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
          {die.symbol}
        </span>
      );
    }

    switch (die.name) {
      case 'd4':
        return (
          <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
            <polygon points="20,6 6,34 34,34" stroke={color} strokeWidth="2.5" fill={`${color}22`} />
            <line x1="20" y1="6" x2="20" y2="34" stroke={color} strokeWidth="1.5" strokeOpacity="0.6" />
          </svg>
        );
      case 'd6':
        return (
          <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
            <rect x="7" y="7" width="26" height="26" rx="4" stroke={color} strokeWidth="2.5" fill={`${color}22`} />
            <circle cx="20" cy="20" r="2.5" fill={color} />
            <circle cx="13" cy="13" r="2" fill={color} />
            <circle cx="27" cy="27" r="2" fill={color} />
          </svg>
        );
      case 'd8':
        return (
          <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
            <polygon points="20,4 34,20 20,36 6,20" stroke={color} strokeWidth="2.5" fill={`${color}22`} />
            <line x1="6" y1="20" x2="34" y2="20" stroke={color} strokeWidth="1.5" strokeOpacity="0.6" />
          </svg>
        );
      case 'd10':
        return (
          <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
            <polygon points="20,4 34,16 20,36 6,16" stroke={color} strokeWidth="2.5" fill={`${color}22`} />
            <line x1="20" y1="4" x2="20" y2="36" stroke={color} strokeWidth="1.5" strokeOpacity="0.5" />
          </svg>
        );
      case 'd12':
        return (
          <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
            <polygon points="20,4 35,14 30,34 10,34 5,14" stroke={color} strokeWidth="2.5" fill={`${color}22`} />
            <polygon points="20,12 28,18 25,28 15,28 12,18" stroke={color} strokeWidth="1.5" strokeOpacity="0.6" />
          </svg>
        );
      case 'd20':
        return (
          <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
            <polygon points="20,5 34,14 34,30 20,37 6,30 6,14" stroke={color} strokeWidth="2.5" fill={`${color}22`} />
            <polygon points="20,13 29,27 11,27" stroke={color} strokeWidth="1.5" strokeOpacity="0.7" />
          </svg>
        );
      case 'd100':
        return (
          <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
            <circle cx="20" cy="20" r="15" stroke={color} strokeWidth="2.5" fill={`${color}22`} />
            <text x="20" y="24" fontSize="10" fontWeight="bold" fill={color} textAnchor="middle">00</text>
          </svg>
        );
      default:
        return (
          <div
            className="w-7 h-7 rounded-lg border-2 flex items-center justify-center font-bold text-xs"
            style={{ borderColor: color, color, backgroundColor: `${color}22` }}
          >
            {die.sides}
          </div>
        );
    }
  };

  const isSelected = count > 0;

  return (
    <button
      onPointerDown={startPress}
      onPointerUp={handlePointerUp}
      onPointerLeave={cancelPress}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove(die.id);
      }}
      aria-label={`${die.name}, ${count} selecionados. Toque para adicionar, segure para remover.`}
      className={`relative flex flex-col items-center justify-between p-3 rounded-2xl glass-panel transition-all duration-150 min-h-[82px] active:scale-95 touch-manipulation group ${
        isSelected
          ? 'border-opacity-80 bg-white/10 shadow-[0_0_16px_-2px_rgba(255,255,255,0.25)]'
          : 'hover:bg-white/8 hover:border-white/20'
      }`}
      style={{
        borderColor: isSelected ? die.color : 'rgba(255,255,255,0.12)',
        boxShadow: isSelected ? `0 0 16px -2px ${die.color}66` : undefined,
      }}
    >
      {/* Count Badge */}
      {count > 0 && (
        <span
          className="absolute -top-2 -right-2 min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-black text-black shadow-lg animate-scale"
          style={{ backgroundColor: die.color }}
        >
          {count}
        </span>
      )}

      {/* Die Icon */}
      <div className="flex items-center justify-center h-8 transition-transform group-active:scale-110">
        {renderDieIcon()}
      </div>

      {/* Name and Face Count */}
      <div className="text-center w-full">
        <span className="block text-xs font-bold text-slate-200 tracking-tight truncate">
          {die.name}
        </span>
        <span className="block text-[9px] text-slate-400 font-mono">
          {die.isCustomFaces ? `${die.customFaces?.length} faces` : `1-${die.sides}`}
        </span>
      </div>
    </button>
  );
};
