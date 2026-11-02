import { Dices, Edit2, Lock, RotateCcw, Trash2, Unlock } from 'lucide-react';
import React, { useState } from 'react';
import type { LootColumn, LootItem } from '../../types';

interface LootItemCardProps {
  item: LootItem;
  columns: LootColumn[];
  isSelected: boolean;
  onToggleSelect: () => void;
  onToggleLock: () => void;
  onReroll: () => void;
  onDelete: () => void;
  onUpdateCell: (key: string, value: any) => void;
}

export const RARITY_COLORS: Record<string, { color: string; glow: string; badgeBg: string }> = {
  comum: {
    color: '#94a3b8',
    glow: 'rgba(148, 163, 184, 0.3)',
    badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  },
  incomum: {
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.4)',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  raro: {
    color: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.4)',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  épico: {
    color: '#c026d3',
    glow: 'rgba(192, 38, 211, 0.4)',
    badgeBg: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
  },
  epico: {
    color: '#c026d3',
    glow: 'rgba(192, 38, 211, 0.4)',
    badgeBg: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
  },
  lendário: {
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.5)',
    badgeBg: 'bg-amber-500/25 text-amber-300 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  },
  lendario: {
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.5)',
    badgeBg: 'bg-amber-500/25 text-amber-300 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  },
};

export const LootItemCard: React.FC<LootItemCardProps> = ({
  item,
  columns,
  isSelected,
  onToggleSelect,
  onToggleLock,
  onReroll,
  onDelete,
  onUpdateCell,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState<string>('');

  const rarityRaw = String(item.cells.rarity || 'Comum').toLowerCase();
  const theme = RARITY_COLORS[rarityRaw] || RARITY_COLORS.comum;

  const name = String(item.cells.name || 'Item Sem Nome');
  const description = String(item.cells.description || '');

  const startEditCell = (key: string, currentVal: any) => {
    setEditingKey(key);
    setEditingVal(String(currentVal ?? ''));
    setIsEditing(true);
  };

  const saveEditCell = () => {
    if (editingKey) {
      onUpdateCell(editingKey, editingVal);
      setEditingKey(null);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`relative rounded-2xl glass-panel p-3.5 border transition-all duration-200 group ${
        isSelected ? 'bg-white/10 ring-1 ring-cyan-400' : 'hover:bg-white/8'
      }`}
      style={{
        borderLeftColor: theme.color,
        borderLeftWidth: '4px',
        boxShadow: `0 4px 20px -8px ${theme.glow}`,
      }}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="rounded text-cyan-500 bg-black/40 border-white/20 w-4 h-4 cursor-pointer"
            aria-label={`Selecionar ${name}`}
          />
          <div className="min-w-0">
            <h3
              onClick={() => startEditCell('name', item.cells.name)}
              className="font-bold text-sm text-white truncate cursor-pointer hover:text-cyan-300 transition-colors"
              title="Toque para editar o nome"
            >
              {name}
            </h3>
            {item.cells.rarity && (
              <span
                className={`inline-block text-[10px] font-black px-1.5 py-0.2 rounded-full border uppercase tracking-wider mt-0.5 ${theme.badgeBg}`}
              >
                {String(item.cells.rarity)}
              </span>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggleLock}
            className={`p-1.5 rounded-lg transition active:scale-90 ${
              item.isLocked ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:text-white'
            }`}
            title={item.isLocked ? 'Item travado (preservado)' : 'Travar item na re-rolagem'}
          >
            {item.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          {!item.isLocked && (
            <button
              onClick={onReroll}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 transition active:scale-90"
              title="Rerrolar este item"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition active:scale-90"
            title="Excluir item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p
          onClick={() => startEditCell('description', item.cells.description)}
          className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed cursor-pointer hover:text-white transition"
          title="Toque para editar a descrição"
        >
          {description}
        </p>
      )}

      {/* Other metadata columns as compact pills */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-white/5 text-[11px]">
        {columns
          .filter((c) => c.enabled && c.key !== 'name' && c.key !== 'description' && c.key !== 'rarity')
          .map((col) => {
            const val = item.cells[col.key];
            if (val === undefined || val === null || val === '') return null;

            let formatted = String(val);
            if (col.type === 'currency') {
              formatted = `${Number(val).toLocaleString('pt-BR')} ${col.currencyConfig?.unit || 'PO'}`;
            } else if (col.unit) {
              formatted = `${val} ${col.unit}`;
            }

            return (
              <span
                key={col.id}
                onClick={() => startEditCell(col.key, val)}
                className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-slate-300 hover:border-cyan-400 cursor-pointer transition flex items-center gap-1"
                title={`Toque para editar ${col.label}`}
              >
                <strong className="text-slate-400 text-[10px] uppercase">{col.label}:</strong>
                <span className="text-cyan-200 font-mono">{formatted}</span>
              </span>
            );
          })}
      </div>

      {/* Inline editor modal/popup if cell is being edited */}
      {isEditing && editingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl glass-panel-elevated p-4 border border-cyan-400/50 shadow-2xl space-y-3">
            <h4 className="text-xs font-bold text-cyan-300 uppercase">
              Editar {columns.find((c) => c.key === editingKey)?.label || editingKey}
            </h4>
            <textarea
              value={editingVal}
              onChange={(e) => setEditingVal(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/20 text-white text-xs focus:outline-none focus:border-cyan-400 resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg glass-panel text-slate-400 text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={saveEditCell}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white font-bold text-xs shadow-md"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
