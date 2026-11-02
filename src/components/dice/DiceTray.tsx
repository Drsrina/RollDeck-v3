import { Minus, Plus, Trash2, Zap } from 'lucide-react';
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { AdvantageType } from '../../types';

export const DiceTray: React.FC = () => {
  const {
    tray,
    allDice,
    globalModifier,
    setGlobalModifier,
    trayAdvantage,
    setTrayAdvantage,
    removeDieFromTray,
    clearTray,
  } = useAppStore();

  const diceMap = new Map(allDice.map((d) => [d.id, d]));
  const hasD20 = tray.some((t) => t.dieId === 'd20' || diceMap.get(t.dieId)?.sides === 20);

  if (tray.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-4 text-center border-dashed border-white/20">
        <p className="text-xs text-slate-400">
          Toque nos dados acima para adicionar à bandeja.
        </p>
        <p className="text-[10px] text-slate-500 mt-1">
          Toque longo para remover • Suporta 50+ dados ao mesmo tempo
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel-elevated rounded-2xl p-3.5 space-y-3 border border-white/15">
      {/* Chips Row */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          Bandeja Ativa
        </span>
        <button
          onClick={clearTray}
          aria-label="Limpar toda a bandeja de dados"
          className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition"
        >
          <Trash2 className="w-3 h-3" />
          <span>Limpar</span>
        </button>
      </div>

      {/* Selected Dice Chips */}
      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
        {tray.map((item) => {
          const die = diceMap.get(item.dieId) || {
            name: item.dieId,
            color: '#22d3ee',
          };
          return (
            <button
              key={item.dieId}
              onClick={() => removeDieFromTray(item.dieId)}
              aria-label={`Remover 1 ${die.name}. Atual: ${item.count}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition active:scale-95 border"
              style={{
                backgroundColor: `${die.color}18`,
                borderColor: `${die.color}60`,
                color: '#fff',
              }}
              title="Toque para remover 1"
            >
              <span
                className="w-2 h-2 rounded-full shadow-[0_0_6px]"
                style={{ backgroundColor: die.color, boxShadow: `0 0 8px ${die.color}` }}
              />
              <span className="font-mono text-cyan-200">{item.count}×</span>
              <span>{die.name}</span>
              <span className="text-slate-400 hover:text-rose-400 text-xs ml-0.5">×</span>
            </button>
          );
        })}
      </div>

      {/* Controls: Advantage & Global Modifier */}
      <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Advantage / Disadvantage toggles (especially for d20) */}
        {hasD20 && (
          <div className="flex items-center rounded-xl bg-black/40 p-1 border border-white/10 self-start sm:self-auto">
            {(
              [
                { id: 'none', label: 'Normal' },
                { id: 'advantage', label: 'Vantagem' },
                { id: 'disadvantage', label: 'Desvant.' },
              ] as { id: AdvantageType; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTrayAdvantage(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  trayAdvantage === opt.id
                    ? opt.id === 'advantage'
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : opt.id === 'disadvantage'
                      ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                      : 'bg-white/20 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Global Modifier Adjuster */}
        <div className="flex items-center justify-between sm:justify-end gap-2 ml-auto">
          <span className="text-xs text-slate-400 font-medium">Modificador:</span>
          <div className="flex items-center rounded-xl bg-black/40 border border-white/15 p-0.5">
            <button
              onClick={() => setGlobalModifier((prev) => prev - 1)}
              aria-label="Diminuir modificador"
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 active:scale-90 transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-9 text-center font-mono font-bold text-sm text-cyan-300">
              {globalModifier >= 0 ? `+${globalModifier}` : globalModifier}
            </span>
            <button
              onClick={() => setGlobalModifier((prev) => prev + 1)}
              aria-label="Aumentar modificador"
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 active:scale-90 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {globalModifier !== 0 && (
            <button
              onClick={() => setGlobalModifier(0)}
              className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-white/5"
            >
              Zerar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
