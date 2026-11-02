import { Sparkles, Star } from 'lucide-react';
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { Package } from '../../types';

export const DiceFavoritesBar: React.FC = () => {
  const { packages, rollPackage, isRolling } = useAppStore();

  const favoritePackages = packages.filter((p) => p.isFavorite);

  if (favoritePackages.length === 0) {
    return null;
  }

  const handlePackageClick = (pkg: Package) => {
    if (isRolling) return;
    rollPackage(pkg);
  };

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          Pacotes Favoritos (1 toque para rolar)
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth">
        {favoritePackages.map((pkg) => {
          const formulaSummary = pkg.groups
            .map((g) => `${g.count}${g.dieId}`)
            .join(' + ');

          return (
            <button
              key={pkg.id}
              onClick={() => handlePackageClick(pkg)}
              disabled={isRolling}
              aria-label={`Rolar pacote favorito ${pkg.name}: ${formulaSummary}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl glass-panel whitespace-nowrap shrink-0 transition-all duration-150 active:scale-95 hover:bg-white/10 group border text-left min-h-[46px]"
              style={{
                borderColor: `${pkg.color}66`,
                boxShadow: `0 0 12px -3px ${pkg.color}40`,
              }}
            >
              <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                {pkg.icon || '🎲'}
              </span>
              <div className="flex flex-col min-w-0 pr-1">
                <span className="text-xs font-bold text-white tracking-tight truncate max-w-[130px]">
                  {pkg.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                  {formulaSummary}
                  {pkg.globalModifier > 0 && ` +${pkg.globalModifier}`}
                  {pkg.globalModifier < 0 && ` ${pkg.globalModifier}`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
