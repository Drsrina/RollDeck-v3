import {
  Dices,
  History,
  Keyboard,
  LogOut,
  Map as MapIcon,
  PackageCheck,
  Palette,
  Play,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { isPersistenceGranted } from '../../db/indexedDB';
import { triggerHaptic } from '../../lib/haptics';
import { playDiceRollSound } from '../../lib/audio';
import { getThemePreset } from '../../lib/theme';
import { type ActiveTab, useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface DesktopSidebarProps {
  className?: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ className = '' }) => {
  const {
    activeTab,
    setActiveTab,
    settings,
    updateSettings,
    tray,
    clearTray,
    rollTray,
    isRolling,
  } = useAppStore();

  const { logout, currentUser } = useAuthStore();
  const [persisted, setPersisted] = useState(false);
  const currentPreset = getThemePreset(settings.themeId);

  useEffect(() => {
    isPersistenceGranted().then(setPersisted);
  }, []);

  const totalDiceInTray = tray.reduce((acc, t) => acc + t.count, 0);

  const tabs: {
    id: ActiveTab;
    label: string;
    shortcut: string;
    icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
    badge?: number;
  }[] = [
    {
      id: 'roll',
      label: 'Mesa de Rolagem',
      shortcut: '1',
      icon: Dices,
      badge: totalDiceInTray > 0 ? totalDiceInTray : undefined,
    },
    { id: 'packages', label: 'Pacotes Pré-config', shortcut: '2', icon: PackageCheck },
    { id: 'map', label: 'Mapa de Notas', shortcut: '3', icon: MapIcon },
    { id: 'loot', label: 'Geradores de Loot', shortcut: '4', icon: Sparkles },
    { id: 'history', label: 'Histórico & Logs', shortcut: '5', icon: History },
    { id: 'settings', label: 'Ajustes & Dados', shortcut: '6', icon: Settings },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    triggerHaptic('tap', settings.hapticsEnabled);
    setActiveTab(tab);
  };

  const handleQuickRoll = () => {
    if (totalDiceInTray === 0 || isRolling) return;
    triggerHaptic('roll', settings.hapticsEnabled);
    if (settings.soundEnabled) playDiceRollSound(totalDiceInTray);
    rollTray();
  };

  return (
    <aside
      aria-label="Navegação Desktop"
      className={`flex flex-col h-screen w-64 lg:w-72 border-r backdrop-blur-2xl z-30 select-none transition-colors duration-500 ${className}`}
      style={{
        backgroundColor: `${currentPreset.colors.bgSecondary}f5`,
        borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.12))',
      }}
    >
      {/* Brand Header */}
      <div
        className="p-4 lg:p-5 border-b"
        style={{ borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.1))' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="relative flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${currentPreset.colors.primary}33, ${currentPreset.colors.secondary}22)`,
                borderColor: `${currentPreset.colors.primary}60`,
                boxShadow: `0 0 18px ${currentPreset.colors.primaryGlow}`,
              }}
            >
              <Dices
                className="w-5 h-5 animate-pulse"
                style={{ color: currentPreset.colors.primary }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-black tracking-wider text-lg bg-clip-text text-transparent transition-all duration-300"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${currentPreset.colors.primary}, ${currentPreset.colors.secondary}, ${currentPreset.colors.accent})`,
                  }}
                >
                  ROLLDECK
                </span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all duration-300"
                  style={{
                    backgroundColor: `${currentPreset.colors.primary}20`,
                    color: currentPreset.colors.primary,
                    borderColor: `${currentPreset.colors.primary}45`,
                  }}
                >
                  TTRPG
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>100% Offline</span>
                {persisted && (
                  <span
                    className="text-emerald-400 inline-flex items-center gap-1"
                    title="Dados protegidos no IndexedDB"
                  >
                    • <ShieldCheck className="w-3.5 h-3.5 inline" /> Salvo Seguro
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <PWAInstallButton />
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-slate-500">
          Navegação Principal
        </div>

        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              aria-selected={isActive}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group text-left border-l-4 ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border-transparent'
              }`}
              style={
                isActive
                  ? {
                      background: `linear-gradient(to right, ${currentPreset.colors.primary}28, ${currentPreset.colors.secondary}12, transparent)`,
                      borderLeftColor: currentPreset.colors.primary,
                      boxShadow: `inset 0 0 14px ${currentPreset.colors.primaryGlow}`,
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className="w-5 h-5 transition-transform group-hover:scale-110"
                  style={
                    isActive
                      ? {
                          color: currentPreset.colors.primary,
                          filter: `drop-shadow(0 0 8px ${currentPreset.colors.primaryGlow})`,
                        }
                      : undefined
                  }
                />
                <span className="text-sm truncate">{tab.label}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {tab.badge !== undefined && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold shadow-sm"
                    style={{
                      backgroundColor: currentPreset.colors.primary,
                      color: '#000000',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
                <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/5 border border-white/10 text-slate-400 group-hover:text-slate-200">
                  {tab.shortcut}
                </kbd>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Active Theme Mini Indicator Pill */}
      <div className="px-3 py-2 border-t border-white/5">
        <button
          onClick={() => setActiveTab('settings')}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border transition text-left group"
          style={{ borderColor: `${currentPreset.colors.primary}30` }}
          title="Clique para trocar de tema"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{currentPreset.icon}</span>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-mono block leading-none">
                Tema Ativo
              </span>
              <span
                className="text-xs font-bold truncate block mt-0.5"
                style={{ color: currentPreset.colors.primary }}
              >
                {currentPreset.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div
              className="w-2.5 h-2.5 rounded-full border border-white/30"
              style={{ backgroundColor: currentPreset.colors.primary }}
            />
            <div
              className="w-2.5 h-2.5 rounded-full border border-white/30"
              style={{ backgroundColor: currentPreset.colors.secondary }}
            />
          </div>
        </button>
      </div>

      {/* Quick Desktop Tray Widget (if dice in tray) */}
      <div className="p-3 border-t border-white/10 bg-black/35">
        {totalDiceInTray > 0 ? (
          <div
            className="rounded-xl glass-panel p-3 border space-y-2.5 transition-all duration-300"
            style={{
              borderColor: `${currentPreset.colors.primary}45`,
              boxShadow: `0 0 16px ${currentPreset.colors.primaryGlow}`,
            }}
          >
            <div className="flex items-center justify-between text-xs">
              <span
                className="font-bold flex items-center gap-1.5"
                style={{ color: currentPreset.colors.primary }}
              >
                <Dices className="w-4 h-4" />
                {totalDiceInTray} {totalDiceInTray === 1 ? 'dado pronto' : 'dados prontos'}
              </span>
              <button
                onClick={() => clearTray()}
                aria-label="Limpar bandeja"
                className="text-[11px] text-slate-400 hover:text-rose-400 transition"
              >
                Limpar
              </button>
            </div>

            {/* Chips Preview */}
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
              {tray.map((t) => (
                <span
                  key={t.dieId}
                  className="px-1.5 py-0.5 rounded border text-[10px] font-mono"
                  style={{
                    backgroundColor: `${currentPreset.colors.primary}20`,
                    borderColor: `${currentPreset.colors.primary}40`,
                    color: currentPreset.colors.primary,
                  }}
                >
                  {t.count}×{t.dieId}
                </span>
              ))}
            </div>

            {/* Quick Roll Button */}
            <button
              onClick={handleQuickRoll}
              disabled={isRolling}
              className="w-full py-2.5 px-3 rounded-lg text-white font-black text-xs tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-98 transition shadow-lg"
              style={{
                background: `linear-gradient(to right, ${currentPreset.colors.primary}, ${currentPreset.colors.secondary})`,
                boxShadow: `0 0 18px ${currentPreset.colors.primaryGlow}`,
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
              }}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRolling ? 'ROLANDO...' : 'ROLAR BANDEJA'}</span>
              <kbd className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-white/90">Espaço</kbd>
            </button>
          </div>
        ) : (
          <div className="rounded-xl glass-panel p-2.5 border border-white/5 text-slate-400 flex items-start gap-2">
            <Keyboard
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: currentPreset.colors.primary }}
            />
            <div className="text-[11px] leading-tight space-y-0.5">
              <p className="font-medium text-slate-300">Atalhos de Teclado:</p>
              <p className="text-[10px] text-slate-400">
                <span className="font-mono font-bold" style={{ color: currentPreset.colors.primary }}>
                  1-6
                </span>{' '}
                troca de aba •{' '}
                <span className="font-mono font-bold" style={{ color: currentPreset.colors.primary }}>
                  Espaço
                </span>{' '}
                rola dados •{' '}
                <span className="font-mono font-bold" style={{ color: currentPreset.colors.primary }}>
                  Esc
                </span>{' '}
                fecha janelas
              </p>
            </div>
          </div>
        )}

        {/* Desktop Quick Sound Toggle */}
        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">Efeitos Sonoros</span>
          <button
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition text-[11px]"
            title={settings.soundEnabled ? 'Desativar som' : 'Ativar som'}
          >
            {settings.soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5" style={{ color: currentPreset.colors.primary }} />
                <span>Ligado</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span>Mudo</span>
              </>
            )}
          </button>
        </div>

        {/* User Session & Logout */}
        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: `${currentPreset.colors.primary}20`,
                borderColor: `${currentPreset.colors.primary}40`,
              }}
            >
              <User className="w-3 h-3" style={{ color: currentPreset.colors.primary }} />
            </div>
            <span className="font-mono text-[11px] text-slate-300 truncate font-semibold">
              {currentUser || 'admin'}
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 transition text-[11px] font-semibold"
            title="Encerrar sessão (Logout)"
          >
            <LogOut className="w-3 h-3" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
