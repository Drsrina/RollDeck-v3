import {
  ArrowRight,
  Dices,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import React, { useState } from 'react';
import { triggerHaptic } from '../lib/haptics';
import { useAuthStore } from '../store/useAuthStore';

export const LoginScreen: React.FC = () => {
  const { login, loginError, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('tap', true);
    setIsSubmitting(true);

    setTimeout(() => {
      const success = login(username, password, rememberMe);
      setIsSubmitting(false);
      if (success) {
        triggerHaptic('crit-success', true);
      } else {
        triggerHaptic('crit-fail', true);
      }
    }, 150);
  };

  const handleQuickFill = () => {
    triggerHaptic('tap', true);
    clearError();
    setUsername('admin');
    setPassword('admin');
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#07060d] text-slate-100 overflow-hidden select-none">
      {/* Background Ambient Neon Glow Orbs */}
      <div
        className="fixed top-[-10%] left-[-15%] w-[450px] h-[450px] rounded-full blur-[120px] pointer-events-none opacity-40 transition-colors duration-700"
        style={{ backgroundColor: 'rgba(34, 211, 238, 0.25)' }}
      />
      <div
        className="fixed bottom-[-10%] right-[-15%] w-[450px] h-[450px] rounded-full blur-[130px] pointer-events-none opacity-30 transition-colors duration-700"
        style={{ backgroundColor: 'rgba(232, 121, 249, 0.25)' }}
      />
      <div
        className="fixed top-[40%] right-[30%] w-[350px] h-[350px] rounded-full blur-[140px] pointer-events-none opacity-20 transition-colors duration-700"
        style={{ backgroundColor: 'rgba(139, 92, 246, 0.25)' }}
      />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md rounded-3xl glass-panel-elevated p-6 sm:p-8 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-400/40 shadow-[0_0_25px_rgba(34,211,238,0.35)]">
            <Dices className="w-10 h-10 text-cyan-400 animate-pulse" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 uppercase">
              RollDeck V3
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Painel de Acesso Seguro • TTRPG Master & Player Deck
            </p>
          </div>
        </div>

        {/* Credentials Info Badge */}
        <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-200">Acesso Padrão: </span>
              <span className="font-mono text-cyan-300 font-bold">admin</span> /{' '}
              <span className="font-mono text-cyan-300 font-bold">admin</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickFill}
            className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 font-semibold text-[11px] transition shrink-0 active:scale-95"
          >
            Preencher
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2 animate-shake">
              <span className="text-sm">⚠️</span>
              <p className="flex-1 leading-snug">{loginError}</p>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Usuário</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => {
                  clearError();
                  setUsername(e.target.value);
                }}
                placeholder="Ex: admin"
                autoComplete="username"
                className="w-full pl-3.5 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition text-sm font-medium"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>Senha</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  clearError();
                  setPassword(e.target.value);
                }}
                placeholder="•••••"
                autoComplete="current-password"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-white/20 bg-black/60 text-cyan-500 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
              />
              <span>Manter conectado</span>
            </label>

            <span className="text-[11px] text-slate-500 font-mono">RollDeck v3.0</span>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Validando...' : 'Entrar no RollDeck'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Offline & Local</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-300/80">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TTRPG Companion</span>
          </div>
        </div>
      </div>
    </div>
  );
};
