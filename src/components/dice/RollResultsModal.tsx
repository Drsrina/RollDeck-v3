import confetti from 'canvas-confetti';
import { Award, ChevronRight, Copy, RotateCcw, Share2, Sparkles, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { RollResult } from '../../types';

interface RollResultsModalProps {
  result: RollResult | null;
  isOpen: boolean;
  onClose: () => void;
  onRollAgain: () => void;
}

export const RollResultsModal: React.FC<RollResultsModalProps> = ({
  result,
  isOpen,
  onClose,
  onRollAgain,
}) => {
  const { isRolling, clearTray, settings } = useAppStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && result?.isCriticalSuccess && !settings.reduceMotion) {
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#22d3ee', '#a3e635', '#e879f9', '#facc15'],
        });
      } catch {
        // ignore
      }
    }
  }, [isOpen, result?.isCriticalSuccess, settings.reduceMotion]);

  if (!isOpen || !result) return null;

  const handleCopyFormula = () => {
    const text = `${result.title}: ${result.total} (${result.formula})`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearAndClose = () => {
    clearTray();
    onClose();
  };

  // Determine neon glow color theme based on roll outcome
  let resultTheme = {
    textColor: 'text-cyan-300',
    glowClass: 'text-glow-cyan',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    accentBorder: 'border-cyan-500/30',
  };

  if (result.isCriticalSuccess) {
    resultTheme = {
      textColor: 'text-lime-300',
      glowClass: 'text-glow-lime',
      badgeBg: 'bg-lime-500/25 text-lime-300 border-lime-400/60 shadow-[0_0_15px_rgba(163,230,53,0.4)]',
      accentBorder: 'border-lime-500/50',
    };
  } else if (result.isCriticalFailure) {
    resultTheme = {
      textColor: 'text-rose-400',
      glowClass: 'text-glow-red',
      badgeBg: 'bg-rose-500/25 text-rose-300 border-rose-400/60 shadow-[0_0_15px_rgba(244,63,94,0.4)]',
      accentBorder: 'border-rose-500/50',
    };
  }

  // Count total dice rolled
  const totalDiceRolled = result.groups.reduce((acc, g) => acc + g.dice.length, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roll-result-title"
    >
      {/* Screen-reader announcement */}
      <div className="sr-only" aria-live="polite">
        Resultado da rolagem: {result.total}. Fórmula: {result.formula}.{' '}
        {result.isCriticalSuccess && 'Sucesso Crítico!'}
        {result.isCriticalFailure && 'Falha Crítica!'}
      </div>

      <div
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl glass-panel-elevated p-5 max-h-[88vh] flex flex-col border shadow-2xl overflow-hidden pb-[calc(1.2rem+var(--safe-bottom))] ${resultTheme.accentBorder}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <h2 id="roll-result-title" className="text-base font-bold text-white truncate max-w-[240px]">
              {result.title}
            </h2>
            {result.isCriticalSuccess && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${resultTheme.badgeBg} uppercase tracking-wider animate-bounce`}>
                ⭐ Crítico!
              </span>
            )}
            {result.isCriticalFailure && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${resultTheme.badgeBg} uppercase tracking-wider`}>
                💀 Falha Crítica
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar resultado"
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Result Content */}
        <div className="overflow-y-auto space-y-4 py-3 pr-1">
          {/* Giant Total Banner */}
          <div className="text-center py-4 px-2 rounded-2xl bg-black/50 border border-white/10 relative overflow-hidden">
            <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-widest">
              Total Geral
            </span>
            <div className={`text-6xl sm:text-7xl font-black tabular-nums tracking-tight my-1 ${resultTheme.textColor} ${resultTheme.glowClass}`}>
              {result.total}
            </div>

            {/* Formula snippet */}
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-300 mt-2 px-3">
              <span className="truncate">{result.formula}</span>
              <button
                onClick={handleCopyFormula}
                aria-label="Copiar resultado da rolagem"
                className="shrink-0 p-1 text-slate-400 hover:text-cyan-300 transition"
                title="Copiar fórmula e total"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {copied && <span className="text-[10px] text-cyan-300 font-sans">Copiado!</span>}
            </div>
          </div>

          {/* Breakdown by Groups */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block px-1">
              Detalhamento dos Dados ({totalDiceRolled} {totalDiceRolled === 1 ? 'dado' : 'dados'})
            </span>

            {result.groups.map((group, groupIdx) => (
              <div
                key={group.groupId || groupIdx}
                className="rounded-xl glass-panel p-3 border border-white/10 space-y-2"
              >
                {/* Group Title & Subtotal */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    {group.label ? `${group.label} • ` : ''}
                    <span className="text-cyan-300 font-mono">{group.formula}</span>
                  </span>
                  <span className="font-mono font-bold text-sm text-white">
                    Subtotal: <span className="text-cyan-300">{group.groupSubtotal}</span>
                  </span>
                </div>

                {/* Individual Dice Matrix */}
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 pt-1">
                  {group.dice.map((die) => {
                    const isDropped = die.isDropped;
                    let borderCol = die.color;
                    let textCol = 'text-white';
                    let bgCol = `${die.color}15`;

                    if (die.isCriticalSuccess) {
                      borderCol = '#a3e635';
                      textCol = 'text-lime-300 font-black';
                      bgCol = 'rgba(163, 230, 53, 0.25)';
                    } else if (die.isCriticalFailure) {
                      borderCol = '#f43f5e';
                      textCol = 'text-rose-400 font-black';
                      bgCol = 'rgba(244, 63, 94, 0.25)';
                    }

                    return (
                      <div
                        key={die.id}
                        className={`relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                          isDropped
                            ? 'opacity-35 line-through border-dashed border-slate-600 bg-black/20'
                            : 'shadow-sm'
                        }`}
                        style={{
                          borderColor: isDropped ? '#475569' : borderCol,
                          backgroundColor: isDropped ? 'transparent' : bgCol,
                        }}
                        title={
                          isDropped
                            ? 'Dado descartado (vantagem/desvantagem ou regra de corte)'
                            : `${die.dieName}: ${die.displayValue}`
                        }
                      >
                        <span className={`text-base sm:text-lg font-mono font-bold ${textCol}`}>
                          {die.displayValue}
                        </span>
                        <span className="text-[9px] text-slate-400 font-sans truncate w-full">
                          {die.dieName}
                        </span>

                        {die.isCriticalSuccess && !isDropped && (
                          <span className="absolute -top-1.5 -right-1 text-[8px] font-black px-1 rounded-full bg-lime-400 text-black">
                            CRIT
                          </span>
                        )}
                        {die.isCriticalFailure && !isDropped && (
                          <span className="absolute -top-1.5 -right-1 text-[8px] font-black px-1 rounded-full bg-rose-500 text-white">
                            FAIL
                          </span>
                        )}
                        {die.wasRerolled && (
                          <span className="text-[8px] text-amber-300 block">rerolado</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2.5 shrink-0">
          <button
            onClick={onRollAgain}
            disabled={isRolling}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(34,211,238,0.4)] active:scale-95 transition disabled:opacity-50 min-h-[48px]"
          >
            <RotateCcw className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
            <span>Rolar de Novo</span>
          </button>

          <button
            onClick={handleClearAndClose}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl glass-panel text-slate-300 hover:text-white font-medium text-sm active:scale-95 transition min-h-[48px] hover:bg-white/10 border-white/15"
          >
            <span>Limpar e Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
