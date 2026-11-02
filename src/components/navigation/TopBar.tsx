import { Dices, LogOut, ShieldCheck, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { isPersistenceGranted } from '../../db/indexedDB';
import { getThemePreset } from '../../lib/theme';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

export const TopBar: React.FC = () => {
  const [persisted, setPersisted] = useState(false);
  const { settings } = useAppStore();
  const { logout, currentUser } = useAuthStore();
  const currentPreset = getThemePreset(settings.themeId);

  useEffect(() => {
    isPersistenceGranted().then(setPersisted);
  }, []);

  return (
    <header
      className="md:hidden sticky top-0 z-30 w-full pt-[calc(0.5rem+var(--safe-top))] pb-2.5 px-4 backdrop-blur-xl border-b transition-colors duration-500"
      style={{
        backgroundColor: `${currentPreset.colors.bgDark}dd`,
        borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.1))',
      }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div
            className="relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, ${currentPreset.colors.primary}33, ${currentPreset.colors.secondary}22)`,
              borderColor: `${currentPreset.colors.primary}60`,
              boxShadow: `0 0 15px ${currentPreset.colors.primaryGlow}`,
            }}
          >
            <Dices
              className="w-5 h-5 animate-pulse"
              style={{ color: currentPreset.colors.primary }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span
                className="font-black tracking-wider text-base bg-clip-text text-transparent transition-all duration-300"
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
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>100% Offline</span>
              {persisted && (
                <span className="text-emerald-400 inline-flex items-center gap-0.5" title="Dados protegidos no navegador">
                  • <ShieldCheck className="w-3 h-3 inline" /> Salvo Seguro
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right side: PWA Install & User / Logout */}
        <div className="flex items-center gap-1.5">
          <PWAInstallButton />
          <button
            onClick={logout}
            title={`Conectado como ${currentUser || 'admin'}. Clique para sair.`}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/20 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 transition flex items-center gap-1 text-[11px]"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
