import {
  ArrowUpDown,
  Filter,
  Link2,
  List,
  Search,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { detectOrphanNoteIds } from '../../lib/wikiLinks';
import { useMapStore } from '../../store/useMapStore';
import type { NoteNode } from '../../types';

export const NotesListSheet: React.FC = () => {
  const {
    notes,
    links,
    layers,
    isListPanelOpen,
    setListPanelOpen,
    searchQuery,
    setSearchQuery,
    matchedNodeIds,
    selectNode,
    setViewState,
  } = useMapStore();

  const [selectedLayerFilter, setSelectedLayerFilter] = useState<string>('all');
  const [onlyOrphans, setOnlyOrphans] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'alpha' | 'connections'>('recent');

  const orphanIds = useMemo(() => detectOrphanNoteIds(notes, links), [notes, links]);

  // Count links per note
  const linksCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of links) {
      map.set(l.fromId, (map.get(l.fromId) || 0) + 1);
      map.set(l.toId, (map.get(l.toId) || 0) + 1);
    }
    return map;
  }, [links]);

  const layersMap = useMemo(() => new Map(layers.map((l) => [l.id, l])), [layers]);

  // Filtered & Sorted Notes
  const displayNotes = useMemo(() => {
    let list = notes.filter((n) => {
      // Search match
      if (searchQuery.trim() && !matchedNodeIds.includes(n.id)) {
        return false;
      }
      // Layer filter
      if (selectedLayerFilter !== 'all' && n.layerId !== selectedLayerFilter) {
        return false;
      }
      // Orphans filter
      if (onlyOrphans && !orphanIds.has(n.id)) {
        return false;
      }
      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'recent') return b.updatedAt - a.updatedAt;
      if (sortBy === 'alpha') return a.title.localeCompare(b.title);
      if (sortBy === 'connections') {
        const countA = linksCountMap.get(a.id) || 0;
        const countB = linksCountMap.get(b.id) || 0;
        return countB - countA;
      }
      return 0;
    });

    return list;
  }, [notes, searchQuery, matchedNodeIds, selectedLayerFilter, onlyOrphans, sortBy, orphanIds, linksCountMap]);

  if (!isListPanelOpen) return null;

  const handleSelectAndFly = (note: NoteNode) => {
    selectNode(note.id);
    // Smooth camera pan and zoom to target node
    setViewState({
      zoom: 1.2,
      panX: -note.x * 1.2 + window.innerWidth / 2,
      panY: -note.y * 1.2 + window.innerHeight / 2,
    });
    setListPanelOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl glass-panel-elevated p-4 sm:p-5 max-h-[88vh] flex flex-col border border-white/20 shadow-2xl pb-[calc(1.2rem+var(--safe-bottom))]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <List className="w-4 h-4 text-cyan-400" />
            <span>Lista de Notas ({displayNotes.length})</span>
          </h2>
          <button
            onClick={() => setListPanelOpen(false)}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="py-2.5 space-y-2 border-b border-white/10 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar em títulos, corpo e tags (fuzzy)..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-black/50 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {/* Layer filter select */}
            <select
              value={selectedLayerFilter}
              onChange={(e) => setSelectedLayerFilter(e.target.value)}
              className="px-2 py-1 rounded-lg bg-black/50 border border-white/15 text-slate-300 text-[11px]"
            >
              <option value="all">Todas as Camadas</option>
              {layers.map((l) => (
                <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                  {l.name}
                </option>
              ))}
            </select>

            {/* Sort by */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1 rounded-lg bg-black/50 border border-white/15 text-slate-300 text-[11px]"
            >
              <option value="recent">Mais Recentes</option>
              <option value="alpha">A-Z</option>
              <option value="connections">Mais Conectadas</option>
            </select>

            {/* Orphans Toggle */}
            <button
              onClick={() => setOnlyOrphans(!onlyOrphans)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                onlyOrphans
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Órfãs ({orphanIds.size})
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="overflow-y-auto space-y-2 py-3 pr-1 text-xs flex-1">
          {displayNotes.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              Nenhuma nota encontrada com os filtros atuais.
            </div>
          ) : (
            displayNotes.map((note) => {
              const layer = layersMap.get(note.layerId);
              const connectionCount = linksCountMap.get(note.id) || 0;
              const isOrphan = orphanIds.has(note.id);

              return (
                <button
                  key={note.id}
                  onClick={() => handleSelectAndFly(note)}
                  className="w-full text-left p-3 rounded-xl glass-panel border border-white/10 hover:border-cyan-400/50 hover:bg-white/10 active:scale-98 transition flex items-start justify-between gap-2.5 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: note.color || layer?.color || '#22d3ee' }}
                      />
                      <h4 className="font-bold text-sm text-white truncate group-hover:text-cyan-300 transition-colors">
                        {note.title}
                      </h4>
                      {isOrphan && (
                        <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Órfã
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {note.body.slice(0, 120) || <span className="italic text-slate-600">Sem texto</span>}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-slate-400">
                      {layer && (
                        <span className="text-slate-300 font-medium">
                          {layer.name}
                        </span>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1 text-cyan-300 font-mono">
                        <Link2 className="w-3 h-3" />
                        {connectionCount} {connectionCount === 1 ? 'link' : 'links'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
