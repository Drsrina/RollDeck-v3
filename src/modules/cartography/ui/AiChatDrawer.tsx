/**
 * AI Assistant Chat Drawer & Configuration Panel
 * Supports multiple providers, test connection, propose-and-approve previews, shortcuts and batch deletion.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useMapStore } from '../store/mapStore';
import { ProviderType } from '../ai/providers/types';
import { DEFAULT_AI_CONFIGS, testProviderConnection } from '../ai/providers/providerRegistry';
import { runAgentStep } from '../ai/agent/agentLoop';
import {
  Bot,
  X,
  Send,
  Settings,
  Sparkles,
  Check,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Square,
  ShieldCheck,
  Compass,
  ScrollText,
  MapPin,
  ChevronDown,
  KeyRound,
} from 'lucide-react';

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({ isOpen, onClose }) => {
  const {
    aiConfig,
    updateAiConfig,
    aiProposals,
    acceptProposal,
    rejectProposal,
    clearAiProposals,
    clearAllAiItems,
    sessionTokens,
    updateSessionTokens,
  } = useMapStore();

  const [messages, setMessages] = useState<UiChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Saudações, nobre Mestre! Sou seu assistente cartográfico de IA. Posso narrar lore, posicionar cidades coerentes, desenhar florestas e rios ou semear masmorras cheias de segredos. O que deseja criar?',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [proposeMode, setProposeMode] = useState(true);
  const [connStatus, setConnStatus] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setConnStatus({ status: 'testing', message: 'Testando conexão com o endpoint...' });
    const result = await testProviderConnection(aiConfig);
    setConnStatus({
      status: result.success ? 'success' : 'error',
      message: result.message,
    });
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputPrompt.trim();
    if (!text || isLoading) return;

    setInputPrompt('');
    const userMsg: UiChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    const assistantMsgId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', text: '' }]);

    try {
      const history = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as any, content: m.text }));

      await runAgentStep({
        userPrompt: text,
        config: aiConfig,
        chatHistory: history,
        proposeAndApprove: proposeMode,
        onTextChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, text: m.text + chunk } : m))
          );
        },
        onProposalCreated: (proposal) => {
          useMapStore.setState((s) => ({
            aiProposals: [...s.aiProposals.filter((p) => p.id !== proposal.id), proposal],
          }));
        },
        onUsageUpdated: (usage) => {
          updateSessionTokens(usage);
        },
        signal: abortCtrl.signal,
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: `⚠️ Erro na execução da IA: ${err.message}. Verifique sua chave de API e configurações.`,
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#13161f]/98 backdrop-blur-2xl border-l border-[#262c3c] shadow-2xl z-40 flex flex-col text-neutral-200 animate-slideLeft">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#242938] bg-[#0f121a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-300">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-cinzel font-bold text-sm text-neutral-100 flex items-center gap-1.5">
              <span>Agente de Cartografia</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <span className="text-[10px] text-neutral-400 capitalize">
              {aiConfig.provider === 'mock' ? 'Simulador Local' : aiConfig.provider} • {aiConfig.model}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors ${
              showSettings ? 'bg-[#293245] text-amber-300' : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#1e2330]'
            }`}
            title="Configurações de Provedor & Chaves"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#1e2330] text-neutral-400 hover:text-neutral-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mode Selector & Token Usage */}
      <div className="px-4 py-2 bg-[#171c28] border-b border-[#242938] flex items-center justify-between text-xs">
        <button
          onClick={() => setProposeMode(!proposeMode)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md font-semibold transition-colors ${
            proposeMode
              ? 'bg-amber-950/60 border border-amber-500/50 text-amber-200'
              : 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-200'
          }`}
          title={proposeMode ? 'Mostra prévia e pede confirmação antes de aplicar' : 'Aplica ferramentas diretamente'}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{proposeMode ? 'Modo: Propor e Aprovar' : 'Modo: Autônomo'}</span>
        </button>

        <span className="text-[10px] font-mono text-neutral-400">
          Tokens: {sessionTokens.promptTokens + sessionTokens.completionTokens}
        </span>
      </div>

      {/* Settings Panel Drawer */}
      {showSettings && (
        <div className="p-4 bg-[#181d2a] border-b border-[#242938] text-xs space-y-3 max-h-72 overflow-y-auto animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-200">Provedor de Inteligência Artificial</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'mock', label: 'Simulador' },
              { id: 'gemini', label: 'Gemini' },
              { id: 'openai', label: 'OpenAI' },
              { id: 'anthropic', label: 'Claude' },
              { id: 'openrouter', label: 'OpenRouter' },
              { id: 'custom_openai', label: 'Ollama/Local' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  const defaults = DEFAULT_AI_CONFIGS[p.id as ProviderType] || {};
                  updateAiConfig({ provider: p.id as ProviderType, ...defaults });
                  setConnStatus({ status: 'idle', message: '' });
                }}
                className={`py-1.5 rounded-lg font-medium border transition-all ${
                  aiConfig.provider === p.id
                    ? 'bg-amber-600/90 border-amber-500 text-white'
                    : 'bg-[#12151e] border-neutral-700 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {aiConfig.provider !== 'mock' && (
            <>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Chave de API (Armazenada em memória)</label>
                <div className="relative">
                  <input
                    type="password"
                    value={aiConfig.apiKey}
                    onChange={(e) => updateAiConfig({ apiKey: e.target.value })}
                    placeholder="Cole sua chave de API..."
                    className="w-full bg-[#10131a] border border-neutral-700 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-100 outline-none focus:border-amber-500"
                  />
                  <KeyRound className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-neutral-500" />
                </div>
              </div>

              {(aiConfig.provider === 'custom_openai' || aiConfig.provider === 'openai') && (
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">URL Base (Endpoint)</label>
                  <input
                    type="text"
                    value={aiConfig.baseUrl}
                    onChange={(e) => updateAiConfig({ baseUrl: e.target.value })}
                    placeholder="http://localhost:11434/v1"
                    className="w-full bg-[#10131a] border border-neutral-700 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-100 outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Modelo</label>
                <input
                  type="text"
                  value={aiConfig.model}
                  onChange={(e) => updateAiConfig({ model: e.target.value })}
                  placeholder="ex: gemini-2.5-flash ou gpt-4o"
                  className="w-full bg-[#10131a] border border-neutral-700 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleTestConnection}
                  disabled={connStatus.status === 'testing'}
                  className="flex-1 py-1.5 bg-[#252c3c] hover:bg-[#30394e] border border-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  {connStatus.status === 'testing' ? 'Testando...' : 'Testar Conexão'}
                </button>
              </div>

              {connStatus.message && (
                <div
                  className={`p-2 rounded-lg text-[11px] ${
                    connStatus.status === 'success'
                      ? 'bg-emerald-950/70 border border-emerald-600/50 text-emerald-200'
                      : 'bg-red-950/70 border border-red-600/50 text-red-200'
                  }`}
                >
                  {connStatus.message}
                </div>
              )}
            </>
          )}

          <div className="p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-lg text-[10px] text-amber-200/80 leading-relaxed flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
            <span>
              <strong>Segurança:</strong> Suas chaves de API nunca são salvas nos arquivos exportados, nem no JSON do projeto.
            </span>
          </div>
        </div>
      )}

      {/* Pending Proposals Banner */}
      {aiProposals.length > 0 && (
        <div className="p-3 bg-cyan-950/40 border-b border-cyan-800/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{aiProposals.length} Ações Propostas (Prévia no Mapa)</span>
            </span>
            <button
              onClick={() => {
                aiProposals.forEach((p) => acceptProposal(p.id));
              }}
              className="text-[11px] text-emerald-400 hover:underline font-bold"
            >
              Aprovar Todas
            </button>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {aiProposals.map((prop) => (
              <div
                key={prop.id}
                className="flex items-center justify-between p-2 bg-[#121620] border border-cyan-800/40 rounded-lg text-[11px]"
              >
                <span className="truncate pr-2 text-neutral-300 font-medium">
                  {prop.description}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => acceptProposal(prop.id)}
                    title="Aprovar"
                    className="p-1 hover:bg-emerald-950 text-emerald-400 rounded"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => rejectProposal(prop.id)}
                    title="Rejeitar"
                    className="p-1 hover:bg-red-950 text-red-400 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message History */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-2xl leading-relaxed ${
                m.role === 'user'
                  ? 'bg-amber-600 text-white rounded-br-none shadow-md'
                  : 'bg-[#1a202c] border border-[#2b3345] text-neutral-200 rounded-bl-none shadow-md font-sans whitespace-pre-line'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-amber-300 font-mono animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Consultando os tomos cartográficos...</span>
            <button
              onClick={handleCancel}
              className="ml-auto text-[11px] text-neutral-400 hover:text-red-400 flex items-center gap-1 px-2 py-0.5 bg-[#1b202c] rounded border border-neutral-700"
            >
              <Square className="w-3 h-3" />
              <span>Cancelar</span>
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Shortcuts */}
      <div className="p-2 border-t border-[#242938] bg-[#11141c] flex flex-wrap gap-1.5">
        <button
          onClick={() => handleSendMessage('Descreva a geografia e lore deste mapa para o mestre de RPG')}
          className="px-2.5 py-1 bg-[#1a202c] hover:bg-[#252d3e] border border-neutral-700 rounded-lg text-[11px] text-neutral-300 flex items-center gap-1"
        >
          <ScrollText className="w-3 h-3 text-amber-400" />
          <span>Descrever mapa</span>
        </button>
        <button
          onClick={() => handleSendMessage('Gere ganchos de aventura misteriosos baseados nos marcadores')}
          className="px-2.5 py-1 bg-[#1a202c] hover:bg-[#252d3e] border border-neutral-700 rounded-lg text-[11px] text-neutral-300 flex items-center gap-1"
        >
          <Compass className="w-3 h-3 text-sky-400" />
          <span>Ganchos de aventura</span>
        </button>
        <button
          onClick={() => handleSendMessage('Adicione uma densa floresta ao norte e uma vila costeira')}
          className="px-2.5 py-1 bg-[#1a202c] hover:bg-[#252d3e] border border-neutral-700 rounded-lg text-[11px] text-neutral-300 flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Adicionar floresta & vila</span>
        </button>
        <button
          onClick={() => clearAllAiItems()}
          className="px-2 py-1 bg-red-950/40 hover:bg-red-900/50 border border-red-800 text-red-300 rounded-lg text-[11px] ml-auto flex items-center gap-1"
          title="Apagar todos os elementos gerados por IA em bloco"
        >
          <Trash2 className="w-3 h-3" />
          <span>Limpar IA</span>
        </button>
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-[#242938] bg-[#0e1118]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="Peça alterações, florestas, vilas ou lore..."
            className="flex-1 bg-[#161a24] border border-neutral-700 px-3 py-2 rounded-xl text-xs text-neutral-100 outline-none focus:border-amber-500 placeholder-neutral-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || isLoading}
            className="p-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl shadow-md transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
