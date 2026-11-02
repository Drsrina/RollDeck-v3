import {
  Clock,
  Pin,
  Play,
  RotateCcw,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import { executeRoll } from '../lib/roll';
import { useAppStore } from '../store/useAppStore';
import type { RollResult } from '../types';

export const HistoryScreen: React.FC = () => {
  const {
    history,
    allDice,
    togglePinHistory,
    deleteHistoryItem,
    clearAllHistory,
    isRolling,
    settings,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pinned' | 'crits'>('all');

  const filteredHistory = history.filter((item) => {
    // Search query filter
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.formula.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'pinned') return item.isPinned;
    if (filterType === 'crits') return item.isCriticalSuccess || item.isCriticalFailure;
    return true;
  });

  const handleRerollItem = async (item: RollResult) => {
    if (isRolling) return;
    const store = useAppStore.getState();
    store.setShowResultModal(false);

    // Reconstruct groups
    const diceLookup = new Map(allDice.map((d) => [d.id, d]));
    const groups = item.groups.map((g) => ({
      id: crypto.randomUUID(),
      count: g.count,
      dieId: g.dieId,
      modifier: g.modifier,
      label: g.label,
    }));

    const newResult = executeRoll({
      title: item.title,
      groups,
      globalModifier: item.globalModifier,
      diceLookup,
      packageId: item.packageId,
    });

    // Use store actions for rolling state
    useAppStore.setState({ isRolling: true });
    const delay = settings.reduceMotion ? 100 : 750;
    await new Promise((resolve) => setTimeout(resolve, delay));

    useAppStore.setState((s) => ({
      isRolling: false,
      currentResult: newResult,
      showResultModal: true,
      history: [newResult, ...s.history.slice(0, s.settings.historyLimit - 1)],
    }));
  };

  const formatTimestamp = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex flex-col min-h-full pb-24 lg:pb-8 w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-black text-white tracking-wide">HISTÓRICO DE ROLAGENS</h1>
          <p className="text-xs text-slate-400">
            {history.length} {history.length === 1 ? 'rolagem salva' : 'rolagens salvas'} (limite: {settings.historyLimit})
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Tem certeza que deseja apagar todo o histórico de rolagens?')) {
                clearAllHistory();
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Tudo</span>
          </button>
        )}
      </div>

      {/* Search Bar & Quick Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título ou fórmula..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/50 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {(
            [
              { id: 'all', label: 'Todas' },
              { id: 'pinned', label: 'Fixadas 📌' },
              { id: 'crits', label: 'Críticos ⭐' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setFilterType(filter.id)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition ${
                filterType === filter.id
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40'
                  : 'glass-panel text-slate-400 hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Items List */}
      {filteredHistory.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center space-y-2">
          <Clock className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm text-slate-300 font-medium">Nenhuma rolagem no histórico.</p>
          <p className="text-xs text-slate-500">
            Role dados na mesa ou em pacotes para ver o registro completo aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredHistory.map((item) => {
            let totalGlow = 'text-cyan-300';
            if (item.isCriticalSuccess) totalGlow = 'text-lime-300 text-glow-lime';
            if (item.isCriticalFailure) totalGlow = 'text-rose-400 text-glow-red';

            return (
              <div
                key={item.id}
                className={`rounded-2xl glass-panel p-3.5 border transition-all duration-150 hover:border-white/20 ${
                  item.isPinned ? 'border-amber-400/40 bg-amber-500/5' : 'border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white truncate">{item.title}</h3>
                      {item.isCriticalSuccess && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-lime-500/20 text-lime-300 border border-lime-500/40">
                          CRÍTICO
                        </span>
                      )}
                      {item.isCriticalFailure && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          FALHA
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-mono text-slate-300 mt-0.5 break-all">
                      {item.formula}
                    </p>

                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {formatDate(item.timestamp)} às {formatTimestamp(item.timestamp)}
                    </span>
                  </div>

                  {/* Right: Big Total & Action */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <span className={`text-2xl font-black font-mono tabular-nums ${totalGlow}`}>
                        {item.total}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRerollItem(item)}
                      disabled={isRolling}
                      aria-label="Rolar novamente a mesma fórmula"
                      className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center active:scale-90 transition hover:bg-cyan-500/30"
                      title="Rolar de novo"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Sub-actions */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/5 text-[11px] text-slate-400">
                  <button
                    onClick={() => togglePinHistory(item.id)}
                    className={`flex items-center gap-1 transition ${
                      item.isPinned ? 'text-amber-400 font-bold' : 'hover:text-white'
                    }`}
                  >
                    <Pin className={`w-3 h-3 ${item.isPinned ? 'fill-current' : ''}`} />
                    <span>{item.isPinned ? 'Fixada' : 'Fixar'}</span>
                  </button>

                  <button
                    onClick={() => deleteHistoryItem(item.id)}
                    className="flex items-center gap-1 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
