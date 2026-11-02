import { ArrowDown, ArrowUp, Lock, RotateCcw, Trash2, Unlock } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { LootColumn, LootGroup, LootItem } from '../../types';
import { RARITY_COLORS } from './LootItemCard';

interface LootTableViewProps {
  group: LootGroup;
  selectedItemIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRerollItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onUpdateCell: (itemId: string, key: string, value: any) => void;
}

export const LootTableView: React.FC<LootTableViewProps> = ({
  group,
  selectedItemIds,
  onToggleSelect,
  onToggleLock,
  onRerollItem,
  onDeleteItem,
  onUpdateCell,
}) => {
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editingCell, setEditingCell] = useState<{ itemId: string; key: string; value: string } | null>(null);

  const activeColumns = useMemo(() => {
    return group.columnsSnapshot.filter((c) => c.enabled);
  }, [group.columnsSnapshot]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedItems = useMemo(() => {
    return [...group.items].sort((a, b) => {
      const valA = a.cells[sortKey] ?? '';
      const valB = b.cells[sortKey] ?? '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [group.items, sortKey, sortDir]);

  const handleCommitCell = () => {
    if (editingCell) {
      onUpdateCell(editingCell.itemId, editingCell.key, editingCell.value);
      setEditingCell(null);
    }
  };

  return (
    <div className="w-full rounded-2xl glass-panel border border-white/10 overflow-hidden shadow-xl flex flex-col">
      <div className="overflow-x-auto max-h-[65vh] no-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          {/* Table Header */}
          <thead className="bg-[#0f0c22] text-slate-300 uppercase text-[10px] tracking-wider sticky top-0 z-20 border-b border-white/10">
            <tr>
              <th className="p-3 w-10 text-center">
                <span className="sr-only">Seleção</span>
              </th>

              {/* Sticky first column: Nome */}
              <th
                onClick={() => handleSort('name')}
                className="p-3 sticky left-0 z-20 bg-[#0f0c22] cursor-pointer hover:text-cyan-300 transition-colors min-w-[140px]"
              >
                <div className="flex items-center gap-1">
                  <span>Nome</span>
                  {sortKey === 'name' && (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                  )}
                </div>
              </th>

              {/* Remaining Columns */}
              {activeColumns
                .filter((c) => c.key !== 'name')
                .map((col) => (
                  <th
                    key={col.id}
                    onClick={() => handleSort(col.key)}
                    className="p-3 whitespace-nowrap cursor-pointer hover:text-cyan-300 transition-colors min-w-[120px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.label}</span>
                      {sortKey === col.key && (
                        sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                      )}
                    </div>
                  </th>
                ))}

              <th className="p-3 text-right min-w-[80px]">Ações</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-white/5 text-slate-200">
            {sortedItems.map((item) => {
              const isSelected = selectedItemIds.includes(item.id);
              const rarityRaw = String(item.cells.rarity || 'comum').toLowerCase();
              const theme = RARITY_COLORS[rarityRaw] || RARITY_COLORS.comum;

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-white/5 transition-colors ${
                    isSelected ? 'bg-cyan-500/10' : ''
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(item.id)}
                      className="rounded text-cyan-500 bg-black/40 border-white/20 w-3.5 h-3.5 cursor-pointer"
                    />
                  </td>

                  {/* Sticky Nome Column */}
                  <td
                    className="p-3 font-bold sticky left-0 z-10 bg-[#07060d]/95 backdrop-blur-md border-r border-white/10"
                    style={{ borderLeftColor: theme.color, borderLeftWidth: '3px' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[130px]">{String(item.cells.name || 'Sem Nome')}</span>
                      {item.isLocked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                    </div>
                  </td>

                  {/* Dynamic Cells */}
                  {activeColumns
                    .filter((c) => c.key !== 'name')
                    .map((col) => {
                      const val = item.cells[col.key];
                      const isCellEditing =
                        editingCell?.itemId === item.id && editingCell?.key === col.key;

                      if (isCellEditing) {
                        return (
                          <td key={col.id} className="p-1 min-w-[120px]">
                            <input
                              type="text"
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell({ ...editingCell, value: e.target.value })
                              }
                              onBlur={handleCommitCell}
                              onKeyDown={(e) => e.key === 'Enter' && handleCommitCell()}
                              autoFocus
                              className="w-full px-2 py-1 rounded bg-black/80 border border-cyan-400 text-white text-xs focus:outline-none"
                            />
                          </td>
                        );
                      }

                      let displayVal = String(val ?? '-');
                      if (col.type === 'currency' && val !== undefined) {
                        displayVal = `${Number(val).toLocaleString('pt-BR')} ${col.currencyConfig?.unit || 'PO'}`;
                      } else if (col.unit && val !== undefined) {
                        displayVal = `${val} ${col.unit}`;
                      }

                      return (
                        <td
                          key={col.id}
                          onClick={() =>
                            setEditingCell({
                              itemId: item.id,
                              key: col.key,
                              value: String(val ?? ''),
                            })
                          }
                          className="p-3 truncate max-w-[180px] cursor-pointer hover:bg-white/10 transition-colors"
                          title="Toque para editar"
                        >
                          {col.key === 'rarity' ? (
                            <span
                              className={`inline-block text-[9px] font-black px-1.5 py-0.2 rounded border uppercase tracking-wider ${theme.badgeBg}`}
                            >
                              {String(val || 'Comum')}
                            </span>
                          ) : (
                            displayVal
                          )}
                        </td>
                      );
                    })}

                  {/* Row Actions */}
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onToggleLock(item.id)}
                        className={`p-1 rounded hover:bg-white/10 ${
                          item.isLocked ? 'text-amber-400' : 'text-slate-400'
                        }`}
                        title={item.isLocked ? 'Destravar' : 'Travar'}
                      >
                        {item.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      {!item.isLocked && (
                        <button
                          onClick={() => onRerollItem(item.id)}
                          className="p-1 rounded text-slate-400 hover:text-cyan-300"
                          title="Rerrolar"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer Totals */}
      <div className="bg-[#0a0817] p-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <span className="font-semibold text-slate-400">
          Total de itens: <strong className="text-white">{group.items.length}</strong>
        </span>
        <div className="flex items-center gap-3">
          {group.totals.totalWeightText && (
            <span>
              Peso Total: <strong className="text-white">{group.totals.totalWeightText}</strong>
            </span>
          )}
          <span>
            Valor Total: <strong className="text-cyan-300 font-mono">{group.totals.totalValueText}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
