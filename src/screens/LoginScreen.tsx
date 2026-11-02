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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('tap', true);
    setIsSubmitting(true);

    try {
      const success = await login(username, password, rememberMe);
      setIsSubmitting(false);
      if (success) {
        triggerHaptic('crit-success', true);
      } else {
        triggerHaptic('crit-fail', true);
      }
    } catch {
      setIsSubmitting(false);
      triggerHaptic('crit-fail', true);
    }
  };

  const handleQuickFill = () => {
    triggerHaptic('tap', true);
    clearError();
    setUsername('admin');
    setPassword('admin123');
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

      <div className="relative z-10 w-full max-w-md">
        {/* Header App Branding */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.35)] mb-2">
            <Dices className="w-9 h-9 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400">
            ROLLDECK V3
          </h1>
          <p className="text-xs text-slate-400 tracking-widest uppercase font-medium">
            TTRPG Master & Player Deck
          </p>
        </div>

        {/* Login Box */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-indigo-500" />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-semibold text-slate-200">Acesso Restrito</span>
            </div>
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40"
              title="Preencher com credenciais padrão admin/admin123"
            >
              <Sparkles className="w-3 h-3" />
              Preencher (admin)
            </button>
          </div>

          {loginError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <div className="flex-1">{loginError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                Usuário
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    clearError();
                    setUsername(e.target.value);
                  }}
                  placeholder="Nome de usuário"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    clearError();
                    setPassword(e.target.value);
                  }}
                  placeholder="Senha"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-slate-950/70 border border-slate-700/80 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0 focus:ring-1 cursor-pointer"
                />
                <span className="text-xs text-slate-400">Manter conectado</span>
              </label>

              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <KeyRound className="w-3 h-3 text-slate-400" />
                <span>Autenticação Local / VPS</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-6 py-3.5 px-4 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 active:scale-[0.99] transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Deck</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Card Info */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Ambiente Seguro com Banco de Dados Relacional e RBAC
            </p>
          </div>
        </div>

        {/* Bottom build tag */}
        <div className="text-center mt-6 text-[11px] text-slate-600 font-mono">
          RollDeck V3.0 • PostgreSQL + Docker Ready
        </div>
      </div>
    </div>
  );
};
