import {
  Copy,
  Dices,
  Info,
  Keyboard,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { DiceCard } from '../components/dice/DiceCard';
import { DiceFavoritesBar } from '../components/dice/DiceFavoritesBar';
import { DiceTray } from '../components/dice/DiceTray';
import { playDiceRollSound } from '../lib/audio';
import { useAppStore } from '../store/useAppStore';

export const RollScreen: React.FC = () => {
  const {
    allDice,
    tray,
    addDieToTray,
    removeDieFromTray,
    rollTray,
    isRolling,
    setActiveTab,
    currentResult,
    packages,
    rollPackage,
    rollAgain,
    setShowResultModal,
    settings,
  } = useAppStore();

  const [copiedFormula, setCopiedFormula] = useState(false);

  const trayCounts = new Map<string, number>(tray.map((t) => [t.dieId, t.count]));
  const totalDiceInTray = tray.reduce((acc, t) => acc + t.count, 0);

  const handleRoll = () => {
    if (totalDiceInTray === 0 || isRolling) return;
    if (settings.soundEnabled) playDiceRollSound(totalDiceInTray);
    rollTray();
  };

  const favoritePackages = packages.filter((p) => p.isFavorite);

  const copyResultText = () => {
    if (!currentResult) return;
    const text = `${currentResult.title}: ${currentResult.total} (${currentResult.formula})`;
    navigator.clipboard?.writeText(text);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-full pb-32 lg:pb-8 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Quick Dice Grid + Active Tray + Desktop Roll Controls */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          {/* Dice Selection Grid */}
          <section aria-labelledby="dice-grid-title" className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 id="dice-grid-title" className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Dices className="w-4 h-4 text-cyan-400" />
                Dados Rápidos da Mesa
              </h2>
              <button
                onClick={() => setActiveTab('settings')}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1 rounded-lg hover:bg-cyan-500/10 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Dado</span>
              </button>
            </div>

            {/* Responsive columns: 4 on mobile, 4-8 on desktop */}
            <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2.5">
              {allDice.map((die) => (
                <DiceCard
                  key={die.id}
                  die={die}
                  count={trayCounts.get(die.id) || 0}
                  onAdd={addDieToTray}
                  onRemove={removeDieFromTray}
                />
              ))}
            </div>
          </section>

          {/* Selected Tray with Chips & Modifiers */}
          <section aria-label="Bandeja de rolagem">
            <DiceTray />
          </section>

          {/* Desktop Primary Roll Execution Card (visible on lg+) */}
          <div className="hidden lg:flex flex-col gap-3 rounded-2xl glass-panel p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                Ação de Rolagem
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                Atalho: <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white">Espaço</kbd>
              </span>
            </div>

            <button
              onClick={handleRoll}
              disabled={totalDiceInTray === 0 || isRolling}
              aria-label={`Rolar ${totalDiceInTray} dados na bandeja`}
              className={`w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 font-extrabold text-base tracking-wide transition-all duration-200 min-h-[54px] shadow-xl ${
                totalDiceInTray > 0 && !isRolling
                  ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white shadow-[0_0_28px_rgba(34,211,238,0.5)] active:scale-98 hover:brightness-110 cursor-pointer'
                  : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed opacity-60'
              }`}
            >
              <Play className={`w-5 h-5 fill-current ${isRolling ? 'animate-bounce' : ''}`} />
              <span>
                {isRolling
                  ? 'ROLANDO DADOS...'
                  : totalDiceInTray > 0
                  ? `ROLAR ${totalDiceInTray} ${totalDiceInTray === 1 ? 'DADO' : 'DADOS'}`
                  : 'SELECIONE DADOS ACIMA'}
              </span>
            </button>

            {/* Quick Favorites Bar inline on desktop */}
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                  Favoritos Rápidos (1-Toque)
                </span>
                <button
                  onClick={() => setActiveTab('packages')}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  Ver Todos
                </button>
              </div>
              <DiceFavoritesBar />
            </div>
          </div>
        </div>

        {/* Right Column (visible on lg+): Interactive Result Card + Desktop Panels */}
        <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 flex-col space-y-4">
          {/* Latest Roll Result Panel */}
          <section className="rounded-2xl glass-panel p-5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  Último Resultado
                </h3>
              </div>
              {currentResult && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyResultText}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition"
                    title="Copiar resultado"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedFormula ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                  <button
                    onClick={() => setShowResultModal(true)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Expandir
                  </button>
                </div>
              )}
            </div>

            {currentResult ? (
              <div className="space-y-4">
                {/* Result Title & Formula */}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-base text-white">{currentResult.title}</h4>
                    {currentResult.isCriticalSuccess && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-lime-500/20 text-lime-300 border border-lime-500/40 animate-pulse">
                        CRÍTICO!
                      </span>
                    )}
                    {currentResult.isCriticalFailure && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                        FALHA!
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-cyan-300 mt-1">{currentResult.formula}</p>
                </div>

                {/* Big Total Display */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 block">
                      Total Obtido
                    </span>
                    <span
                      className={`text-5xl font-black tracking-tight ${
                        currentResult.isCriticalSuccess
                          ? 'text-lime-300 text-glow-lime'
                          : currentResult.isCriticalFailure
                          ? 'text-rose-400 text-glow-red'
                          : 'text-cyan-300 text-glow-cyan'
                      }`}
                    >
                      {currentResult.total}
                    </span>
                  </div>

                  <button
                    onClick={rollAgain}
                    disabled={isRolling}
                    className="flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 active:scale-95 transition"
                    title="Rolar novamente a mesma combinação"
                  >
                    <RotateCcw className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Rolar de Novo</span>
                  </button>
                </div>

                {/* Individual Dice Results Breakdown */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Dados Individuais:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {currentResult.groups.flatMap((g) =>
                      g.dice.map((die) => (
                        <div
                          key={die.id}
                          className={`px-2 py-1 rounded-lg text-xs font-mono border flex items-center gap-1.5 ${
                            die.isDropped
                              ? 'opacity-30 line-through bg-black/40 border-white/5 text-slate-500'
                              : die.isCriticalSuccess
                              ? 'bg-lime-500/25 border-lime-400/50 text-lime-300 shadow-[0_0_8px_rgba(163,230,53,0.3)] font-bold'
                              : die.isCriticalFailure
                              ? 'bg-rose-500/25 border-rose-400/50 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.3)] font-bold'
                              : 'bg-white/5 border-white/10 text-slate-200'
                          }`}
                        >
                          <span className="text-[10px] text-slate-400">{g.dieId}:</span>
                          <span>{die.value}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-2">
                <Dices className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
                <p className="text-sm font-semibold text-slate-300">Nenhum dado rolado ainda</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Adicione dados na mesa ou clique na barra de espaço para fazer sua primeira rolagem!
                </p>
              </div>
            )}
          </section>

          {/* Desktop Favorite Packages Quick Grid */}
          <section className="rounded-2xl glass-panel p-4 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Pacotes Favoritos
              </span>
              <button
                onClick={() => setActiveTab('packages')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300"
              >
                Gerenciar
              </button>
            </div>

            {favoritePackages.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">
                Nenhum pacote favoritado. Marque pacotes com estrela na aba Pacotes para acesso rápido aqui.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {favoritePackages.slice(0, 6).map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => rollPackage(pkg)}
                    disabled={isRolling}
                    className="p-2.5 rounded-xl text-left border border-white/10 hover:border-cyan-400/50 bg-black/30 hover:bg-white/5 transition group flex items-start gap-2.5 min-w-0"
                    style={{ borderLeftColor: pkg.color, borderLeftWidth: '3px' }}
                  >
                    <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                      {pkg.icon || '🎲'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{pkg.name}</p>
                      <p className="text-[10px] font-mono text-cyan-300 truncate">
                        {pkg.groups.map((g) => `${g.count}${g.dieId}`).join('+')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Desktop Tips & Hotkeys */}
          <div className="rounded-xl glass-panel p-3 border border-white/5 text-slate-400 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px] leading-tight">
              <p className="font-semibold text-slate-300">Controles de Mouse no Desktop:</p>
              <p>• Clique nos dados para adicionar à bandeja.</p>
              <p>• Toque longo ou Shift+Clique para remover.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Zone (hidden on lg+) */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 p-3 bg-gradient-to-t from-[#07060d] via-[#07060d]/95 to-transparent pb-[calc(0.75rem+var(--safe-bottom))]">
        <div className="max-w-lg mx-auto space-y-2.5">
          {/* Quick Favorites Row */}
          <DiceFavoritesBar />

          {/* Large Thumb-Friendly ROLL Button */}
          <button
            onClick={handleRoll}
            disabled={totalDiceInTray === 0 || isRolling}
            aria-label={`Rolar ${totalDiceInTray} dados na bandeja`}
            className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-extrabold text-base tracking-wide transition-all duration-200 min-h-[58px] touch-manipulation shadow-xl ${
              totalDiceInTray > 0 && !isRolling
                ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white shadow-[0_0_28px_rgba(34,211,238,0.5)] active:scale-98 hover:brightness-110'
                : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed opacity-60'
            }`}
          >
            <Play className={`w-5 h-5 fill-current ${isRolling ? 'animate-bounce' : ''}`} />
            <span>
              {isRolling
                ? 'ROLANDO...'
                : totalDiceInTray > 0
                ? `ROLAR ${totalDiceInTray} ${totalDiceInTray === 1 ? 'DADO' : 'DADOS'}`
                : 'ESCOLHA OS DADOS'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
