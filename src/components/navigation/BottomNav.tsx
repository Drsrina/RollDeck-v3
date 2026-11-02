import { Dices, History, Map as MapIcon, PackageCheck, Settings, Sparkles } from 'lucide-react';
import React from 'react';
import { triggerHaptic } from '../../lib/haptics';
import { getThemePreset } from '../../lib/theme';
import { type ActiveTab, useAppStore } from '../../store/useAppStore';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, settings, tray } = useAppStore();
  const currentPreset = getThemePreset(settings.themeId);

  const totalDiceInTray = tray.reduce((acc, t) => acc + t.count, 0);

  const tabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string; style?: React.CSSProperties }>; badge?: number }[] = [
    { id: 'roll', label: 'Rolar', icon: Dices, badge: totalDiceInTray > 0 ? totalDiceInTray : undefined },
    { id: 'packages', label: 'Pacotes', icon: PackageCheck },
    { id: 'map', label: 'Mapa', icon: MapIcon },
    { id: 'loot', label: 'Loot', icon: Sparkles },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    triggerHaptic('tap', settings.hapticsEnabled);
    setActiveTab(tab);
  };

  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t pb-[var(--safe-bottom)] transition-colors duration-500"
      style={{
        backgroundColor: `${currentPreset.colors.bgDark}ea`,
        borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.1))',
      }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              aria-selected={isActive}
              aria-label={tab.label}
              className={`relative flex flex-col items-center justify-center flex-1 h-full min-h-[48px] px-1 transition-all duration-200 ${
                isActive ? 'font-semibold scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
              style={{
                color: isActive ? currentPreset.colors.primary : undefined,
              }}
            >
              <div className="relative">
                <Icon
                  className="w-5 h-5 transition-transform"
                  style={
                    isActive
                      ? {
                          color: currentPreset.colors.primary,
                          filter: `drop-shadow(0 0 8px ${currentPreset.colors.primaryGlow})`,
                          transform: 'scale(1.1)',
                        }
                      : undefined
                  }
                />
                {tab.badge !== undefined && (
                  <span
                    className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[9px] font-bold text-black shadow-md"
                    style={{ backgroundColor: currentPreset.colors.primary }}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-full">{tab.label}</span>
              {isActive && (
                <span
                  className="absolute bottom-1 w-5 h-0.5 rounded-full shadow-sm"
                  style={{
                    backgroundColor: currentPreset.colors.primary,
                    boxShadow: `0 0 8px ${currentPreset.colors.primary}`,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
