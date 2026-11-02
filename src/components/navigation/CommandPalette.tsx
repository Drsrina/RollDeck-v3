import {
  Command,
  Compass,
  Dices,
  History,
  Map as MapIcon,
  PackageCheck,
  Search,
  Settings,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { triggerHaptic } from '../../lib/haptics';
import { playDiceRollSound } from '../../lib/audio';
import { executeRoll, STANDARD_DICE } from '../../lib/roll';
import { THEME_PRESETS } from '../../lib/theme';
import { type ActiveTab, useAppStore } from '../../store/useAppStore';
import { useMapStore } from '../../store/useMapStore';

interface CommandItem {
  id: string;
  category: 'Navegação' | 'Rolagem Rápida' | 'Notas & Lore' | 'Temas & Cores';
  title: string;
  subtitle?: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    setActiveTab,
    addDieToTray,
    rollTray,
    settings,
    updateSettings,
    allDice,
  } = useAppStore();

  const { notes, selectNode, openEditor } = useMapStore();

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Construct comprehensive list of commands
  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // 1. Navigation
      {
        id: 'nav-roll',
        category: 'Navegação',
        title: 'Ir para Mesa de Rolagem',
        subtitle: 'Atalho: 1',
        icon: Dices,
        action: () => setActiveTab('roll'),
        keywords: ['rolar', 'dados', 'mesa', 'tray'],
      },
      {
        id: 'nav-packages',
        category: 'Navegação',
        title: 'Ir para Pacotes Pré-configurados',
        subtitle: 'Atalho: 2',
        icon: PackageCheck,
        action: () => setActiveTab('packages'),
        keywords: ['pacotes', 'combos', 'ataques'],
      },
      {
        id: 'nav-map',
        category: 'Navegação',
        title: 'Ir para Mapa Tático de Notas',
        subtitle: 'Atalho: 3',
        icon: MapIcon,
        action: () => setActiveTab('map'),
        keywords: ['mapa', 'notas', 'wiki', 'grafo'],
      },
      {
        id: 'nav-battlemap',
        category: 'Navegação',
        title: 'Ir para Forja de Mapas (Inkarnate Studio)',
        subtitle: 'Atalho: 6',
        icon: Compass,
        action: () => setActiveTab('battlemap'),
        keywords: ['forja', 'mapmaker', 'desenhar', 'battlemap', 'dungeon', 'cidade'],
      },
      {
        id: 'nav-loot',
        category: 'Navegação',
        title: 'Ir para Geradores de Loot',
        subtitle: 'Atalho: 4',
        icon: Sparkles,
        action: () => setActiveTab('loot'),
        keywords: ['loot', 'tesouro', 'itens', 'gemini'],
      },
      {
        id: 'nav-history',
        category: 'Navegação',
        title: 'Ir para Histórico de Rolagens',
        subtitle: 'Atalho: 5',
        icon: History,
        action: () => setActiveTab('history'),
        keywords: ['logs', 'historico', 'rolagens'],
      },
      {
        id: 'nav-settings',
        category: 'Navegação',
        title: 'Ir para Ajustes e Administração',
        subtitle: 'Atalho: 7',
        icon: Settings,
        action: () => setActiveTab('settings'),
        keywords: ['configuracoes', 'usuarios', 'rbac', 'ajustes', 'backup'],
      },

      // 2. Quick Dice Rolls
      {
        id: 'roll-d20',
        category: 'Rolagem Rápida',
        title: 'Rolar 1d20 Imediato',
        subtitle: 'Teste de D20 clássico',
        icon: Zap,
        action: () => {
          addDieToTray('d20');
          if (settings.soundEnabled) playDiceRollSound(1);
          rollTray();
        },
        keywords: ['d20', 'dado', 'teste'],
      },
      {
        id: 'roll-advantage',
        category: 'Rolagem Rápida',
        title: 'Rolar 2d20 com Vantagem',
        subtitle: 'Mantém o maior resultado',
        icon: Zap,
        action: () => {
          addDieToTray('d20');
          addDieToTray('d20');
          if (settings.soundEnabled) playDiceRollSound(2);
          rollTray();
        },
        keywords: ['vantagem', 'advantage', '2d20'],
      },
      {
        id: 'roll-disadvantage',
        category: 'Rolagem Rápida',
        title: 'Rolar 2d20 com Desvantagem',
        subtitle: 'Mantém o menor resultado',
        icon: Zap,
        action: () => {
          addDieToTray('d20');
          addDieToTray('d20');
          if (settings.soundEnabled) playDiceRollSound(2);
          rollTray();
        },
        keywords: ['desvantagem', 'disadvantage'],
      },
    ];

    // Add standard dice to quick roll
    for (const d of STANDARD_DICE) {
      if (d.id !== 'd20') {
        list.push({
          id: `roll-${d.id}`,
          category: 'Rolagem Rápida',
          title: `Rolar 1${d.name}`,
          subtitle: `Dado padrão de ${d.sides} lados`,
          icon: Dices,
          action: () => {
            addDieToTray(d.id);
            if (settings.soundEnabled) playDiceRollSound(1);
            rollTray();
          },
          keywords: [d.name, `d${d.sides}`],
        });
      }
    }

    // 3. Notes & Lore quick search
    for (const n of notes.slice(0, 30)) {
      list.push({
        id: `note-${n.id}`,
        category: 'Notas & Lore',
        title: n.title,
        subtitle: n.body ? n.body.slice(0, 50) + '...' : 'Nota do mapa',
        icon: MapIcon,
        action: () => {
          setActiveTab('map');
          selectNode(n.id);
          openEditor(n.id);
        },
        keywords: [n.title.toLowerCase(), ...(n.tags || [])],
      });
    }

    // 4. Themes
    for (const theme of THEME_PRESETS) {
      list.push({
        id: `theme-${theme.id}`,
        category: 'Temas & Cores',
        title: `Ativar Tema: ${theme.name}`,
        subtitle: theme.description,
        icon: Sparkles,
        action: () => {
          updateSettings({ themeId: theme.id });
        },
        keywords: [theme.name.toLowerCase(), 'tema', 'cor'],
      });
    }

    return list;
  }, [setActiveTab, addDieToTray, rollTray, settings.soundEnabled, notes, selectNode, openEditor, updateSettings]);

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 10);

    return commands.filter((c) => {
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchSubtitle = c.subtitle?.toLowerCase().includes(q);
      const matchKeyword = c.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchSubtitle || matchKeyword;
    });
  }, [commands, query]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        triggerHaptic('tap', true);
        selected.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/40">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite um comando, nota, rolagem (ex: d20, taverna, cyberpunk)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent border-none text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Nenhum comando ou nota encontrada para &quot;{query}&quot;.
            </div>
          ) : (
            filteredCommands.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    triggerHaptic('tap', true);
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-200'
                      : 'hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-100 truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-[10px] text-slate-400 truncate">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <span className="text-[9px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ para navegar</span>
            <span>ENTER para selecionar</span>
            <span>ESC para fechar</span>
          </div>
          <div className="font-mono text-cyan-400 flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>RollDeck Quick Command</span>
          </div>
        </div>
      </div>
    </div>
  );
};
