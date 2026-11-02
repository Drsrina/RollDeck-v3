import { Download, Share2, X } from 'lucide-react';
import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, don't show
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        aria-label="Instalar aplicativo RollDeck no dispositivo"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 active:scale-95 transition-all shadow-sm"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          aria-label="Como instalar no iOS"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 active:scale-95 transition-all"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-modal-title"
          >
            <div className="w-full max-w-sm rounded-2xl glass-panel-elevated p-6 border border-purple-500/30 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 id="ios-modal-title" className="text-base font-bold text-white flex items-center gap-2">
                  <span className="text-xl">📱</span> Instalar no iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs shrink-0 mt-0.5">
                    1
                  </span>
                  <p>
                    Toque no botão <strong className="text-cyan-300">Compartilhar</strong> (ícone de quadrado com seta para cima) na barra inferior do Safari.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs shrink-0 mt-0.5">
                    2
                  </span>
                  <p>
                    Role a lista e selecione <strong className="text-cyan-300">Adicionar à Tela de Início</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs shrink-0 mt-0.5">
                    3
                  </span>
                  <p>Toque em <strong>Adicionar</strong> no canto superior direito.</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition active:scale-98 shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
