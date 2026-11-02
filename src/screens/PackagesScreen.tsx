import {
  ArrowDown,
  ArrowUp,
  Copy,
  Edit2,
  Minus,
  Play,
  Plus,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { AdvantageType, KeepRule, Package, PackageDieGroup } from '../types';

const NEON_COLORS = [
  '#22d3ee', // Cyan
  '#e879f9', // Magenta
  '#a3e635', // Lime
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#38bdf8', // Sky
];

const SUGGESTED_ICONS = ['⚔️', '🔥', '🛡️', '⚡', '🏹', '✨', '📜', '💉', '💀', '🎲', '🧙‍♂️', '🐉'];

export const PackagesScreen: React.FC = () => {
  const {
    packages,
    categories,
    allDice,
    rollPackage,
    savePackage,
    duplicatePackage,
    deletePackage,
    togglePackageFavorite,
    reorderPackages,
    isRolling,
  } = useAppStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredPackages =
    selectedCategory === 'all'
      ? packages
      : packages.filter((p) => p.categoryId === selectedCategory);

  const handleOpenCreateModal = () => {
    const newPkg: Package = {
      id: `pkg-${crypto.randomUUID()}`,
      name: '',
      color: '#22d3ee',
      icon: '⚔️',
      categoryId: categories[0]?.id || 'combat',
      globalModifier: 0,
      isFavorite: false,
      order: packages.length,
      groups: [
        {
          id: crypto.randomUUID(),
          dieId: 'd20',
          count: 1,
          modifier: 0,
          label: 'Ataque',
          advantage: 'none',
        },
      ],
    };
    setEditingPackage(newPkg);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pkg: Package) => {
    // Deep clone to allow discarding changes
    setEditingPackage(JSON.parse(JSON.stringify(pkg)));
    setIsModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!editingPackage || !editingPackage.name.trim()) return;
    await savePackage({
      ...editingPackage,
      name: editingPackage.name.trim(),
    });
    setIsModalOpen(false);
    setEditingPackage(null);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= packages.length) return;

    const list = [...packages];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);
    reorderPackages(list);
  };

  return (
    <div className="flex flex-col min-h-full pb-24 lg:pb-8 w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-black text-white tracking-wide">PACOTES DE DADOS</h1>
          <p className="text-xs text-slate-400">Combos e presets rápidos com 1 toque</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:brightness-110 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Pacote</span>
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-1.5 pb-1">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[36px] ${
            selectedCategory === 'all'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50'
              : 'glass-panel text-slate-400 hover:text-white'
          }`}
        >
          Todos ({packages.length})
        </button>
        {categories.map((cat) => {
          const count = packages.filter((p) => p.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[36px] ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50'
                  : 'glass-panel text-slate-400 hover:text-white'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Packages List */}
      {filteredPackages.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-slate-300">Nenhum pacote encontrado nesta categoria.</p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold"
          >
            Criar Primeiro Pacote
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredPackages.map((pkg, idx) => {
            const formulaStr = pkg.groups
              .map((g) => {
                let s = `${g.count}${g.dieId}`;
                if (g.modifier > 0) s += `+${g.modifier}`;
                if (g.modifier < 0) s += `${g.modifier}`;
                if (g.label) s += ` (${g.label})`;
                return s;
              })
              .join(' + ');

            return (
              <div
                key={pkg.id}
                className="rounded-2xl glass-panel p-3.5 border transition-all duration-200 hover:border-white/20"
                style={{
                  borderLeftColor: pkg.color,
                  borderLeftWidth: '4px',
                  boxShadow: `0 4px 20px -8px ${pkg.color}25`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Icon & Details */}
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-2xl p-1.5 rounded-xl bg-black/40 border border-white/10 shrink-0">
                      {pkg.icon || '🎲'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-white truncate">{pkg.name}</h3>
                      </div>
                      <p className="text-xs font-mono text-cyan-300 mt-0.5 break-all">
                        {formulaStr}
                        {pkg.globalModifier > 0 && ` +${pkg.globalModifier}`}
                        {pkg.globalModifier < 0 && ` ${pkg.globalModifier}`}
                      </p>
                    </div>
                  </div>

                  {/* Right: Favorite & 1-Tap Roll */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => togglePackageFavorite(pkg.id)}
                      aria-label={pkg.isFavorite ? 'Remover dos favoritos' : 'Favoritar pacote'}
                      className="p-2 rounded-lg text-slate-400 hover:text-amber-400 active:scale-90 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          pkg.isFavorite ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_#f59e0b]' : ''
                        }`}
                      />
                    </button>

                    <button
                      onClick={() => rollPackage(pkg)}
                      disabled={isRolling}
                      aria-label={`Rolar pacote ${pkg.name}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-xs shadow-[0_0_15px_rgba(34,211,238,0.4)] active:scale-95 transition min-h-[38px]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Rolar</span>
                    </button>
                  </div>
                </div>

                {/* Sub-actions toolbar */}
                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-white/10 text-slate-400 text-xs">
                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      aria-label="Mover para cima"
                      className="p-1 rounded hover:text-white disabled:opacity-20 transition"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === packages.length - 1}
                      aria-label="Mover para baixo"
                      className="p-1 rounded hover:text-white disabled:opacity-20 transition"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => duplicatePackage(pkg)}
                      className="flex items-center gap-1 hover:text-cyan-300 transition px-1.5 py-1"
                      title="Duplicar pacote"
                    >
                      <Copy className="w-3 h-3" />
                      <span className="text-[11px]">Duplicar</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(pkg)}
                      className="flex items-center gap-1 hover:text-purple-300 transition px-1.5 py-1"
                      title="Editar pacote"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span className="text-[11px]">Editar</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Deseja excluir o pacote "${pkg.name}"?`)) {
                          deletePackage(pkg.id);
                        }
                      }}
                      className="flex items-center gap-1 hover:text-rose-400 transition px-1.5 py-1"
                      title="Excluir pacote"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="text-[11px]">Excluir</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Package Edit/Create Modal */}
      {isModalOpen && editingPackage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg md:max-w-2xl rounded-2xl glass-panel-elevated p-4 sm:p-6 max-h-[90vh] flex flex-col border border-white/20 shadow-2xl overflow-hidden pb-[calc(1rem+var(--safe-bottom))]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{editingPackage.icon || '⚔️'}</span>
                <span>{editingPackage.name ? 'Editar Pacote' : 'Novo Pacote'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto space-y-4 py-3 pr-1 text-xs">
              {/* Name & Icon */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium block">Nome do Pacote:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingPackage.name}
                    placeholder="Ex: Bola de Fogo, Ataque Furtivo..."
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, name: e.target.value })
                    }
                    className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400"
                  />
                  <input
                    type="text"
                    maxLength={3}
                    value={editingPackage.icon}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, icon: e.target.value })
                    }
                    className="w-12 text-center text-lg px-1 py-2 rounded-xl bg-black/50 border border-white/15"
                    title="Emoji do pacote"
                  />
                </div>

                {/* Suggested emojis */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTED_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditingPackage({ ...editingPackage, icon: emoji })}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-sm"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category & Color */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium block">Categoria:</label>
                  <select
                    value={editingPackage.categoryId}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, categoryId: e.target.value })
                    }
                    className="w-full px-2.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium block">Cor Neon:</label>
                  <div className="flex items-center gap-1.5 h-9">
                    {NEON_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setEditingPackage({ ...editingPackage, color: col })}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          editingPackage.color === col ? 'scale-125 ring-2 ring-white shadow-lg' : ''
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Dice Groups Section */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Grupos de Dados:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newGroup: PackageDieGroup = {
                        id: crypto.randomUUID(),
                        dieId: 'd6',
                        count: 1,
                        modifier: 0,
                        advantage: 'none',
                      };
                      setEditingPackage({
                        ...editingPackage,
                        groups: [...editingPackage.groups, newGroup],
                      });
                    }}
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Dado</span>
                  </button>
                </div>

                {editingPackage.groups.map((group, gIdx) => (
                  <div
                    key={group.id || gIdx}
                    className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400">
                        Grupo #{gIdx + 1}
                      </span>
                      {editingPackage.groups.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPackage({
                              ...editingPackage,
                              groups: editingPackage.groups.filter((_, i) => i !== gIdx),
                            });
                          }}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quantity + Die + Modifier */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Quantidade</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={group.count}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                            const updated = [...editingPackage.groups];
                            updated[gIdx] = { ...group, count: val };
                            setEditingPackage({ ...editingPackage, groups: updated });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white font-mono text-center"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Tipo de Dado</label>
                        <select
                          value={group.dieId}
                          onChange={(e) => {
                            const updated = [...editingPackage.groups];
                            updated[gIdx] = { ...group, dieId: e.target.value };
                            setEditingPackage({ ...editingPackage, groups: updated });
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white text-xs"
                        >
                          {allDice.map((d) => (
                            <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Modificador</label>
                        <input
                          type="number"
                          value={group.modifier}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            const updated = [...editingPackage.groups];
                            updated[gIdx] = { ...group, modifier: val };
                            setEditingPackage({ ...editingPackage, groups: updated });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white font-mono text-center"
                        />
                      </div>
                    </div>

                    {/* Label */}
                    <div>
                      <input
                        type="text"
                        placeholder="Rótulo opcional (ex: Dano de Fogo, Ataque...)"
                        value={group.label || ''}
                        onChange={(e) => {
                          const updated = [...editingPackage.groups];
                          updated[gIdx] = { ...group, label: e.target.value };
                          setEditingPackage({ ...editingPackage, groups: updated });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white text-xs placeholder-slate-500"
                      />
                    </div>

                    {/* Advanced Rules: Advantage, Keep, Reroll 1s */}
                    <div className="pt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                      {/* Advantage */}
                      <select
                        value={group.advantage || 'none'}
                        onChange={(e) => {
                          const updated = [...editingPackage.groups];
                          updated[gIdx] = { ...group, advantage: e.target.value as AdvantageType };
                          setEditingPackage({ ...editingPackage, groups: updated });
                        }}
                        className="px-2 py-1 rounded bg-black/60 border border-white/15 text-slate-300"
                      >
                        <option value="none">Normal</option>
                        <option value="advantage">Vantagem</option>
                        <option value="disadvantage">Desvantagem</option>
                      </select>

                      {/* Keep Rule */}
                      <select
                        value={group.keepRule || 'all'}
                        onChange={(e) => {
                          const updated = [...editingPackage.groups];
                          updated[gIdx] = { ...group, keepRule: e.target.value as KeepRule };
                          setEditingPackage({ ...editingPackage, groups: updated });
                        }}
                        className="px-2 py-1 rounded bg-black/60 border border-white/15 text-slate-300"
                      >
                        <option value="all">Manter todos</option>
                        <option value="keep-highest">Manter maiores</option>
                        <option value="keep-lowest">Manter menores</option>
                      </select>

                      {/* Reroll 1s Toggle */}
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 ml-auto">
                        <input
                          type="checkbox"
                          checked={group.rerollOnes || false}
                          onChange={(e) => {
                            const updated = [...editingPackage.groups];
                            updated[gIdx] = { ...group, rerollOnes: e.target.checked };
                            setEditingPackage({ ...editingPackage, groups: updated });
                          }}
                          className="rounded text-cyan-500 focus:ring-0"
                        />
                        <span>Rerrolar 1s</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* Package Global Modifier */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-slate-300 font-medium">Modificador Global do Pacote:</span>
                <input
                  type="number"
                  value={editingPackage.globalModifier}
                  onChange={(e) =>
                    setEditingPackage({
                      ...editingPackage,
                      globalModifier: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-20 px-2 py-1 rounded-lg bg-black/60 border border-white/15 text-white font-mono text-center text-sm"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-white/10 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={!editingPackage.name.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm shadow-[0_0_15px_rgba(34,211,238,0.4)] active:scale-98 transition disabled:opacity-50 min-h-[48px]"
              >
                Salvar Pacote
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="py-3 px-4 rounded-xl glass-panel text-slate-300 hover:text-white font-medium text-sm min-h-[48px]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
