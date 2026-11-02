/**
 * TopBar Component
 * Branding, Visual Style Selector, Mode Switcher, Undo/Redo, Master/Player Toggle, Export and Generation
 */

import React from 'react';
import { useMapStore } from '../store/mapStore';
import { VisualStyleId, MapMode } from '../types/map';
import {
  Undo2,
  Redo2,
  Grid,
  Eye,
  EyeOff,
  Sparkles,
  Download,
  Scroll,
  Map,
  Shield,
  Layers,
  Wand2,
  Image as ImageIcon,
  Bot,
} from 'lucide-react';

interface TopBarProps {
  onOpenGenerator: () => void;
  onOpenExport: () => void;
  onOpenAssets: () => void;
  onOpenAi: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenGenerator, onOpenExport, onOpenAssets, onOpenAi }) => {
  const {
    doc,
    setStyle,
    setTitle,
    undo,
    redo,
    canUndo,
    canRedo,
    isPlayerMode,
    togglePlayerMode,
    toggleGrid,
  } = useMapStore();

  const styles: { id: VisualStyleId; name: string }[] = [
    { id: 'parchment', name: 'Pergaminho Antigo' },
    { id: 'watercolor', name: 'Aquarela de Fantasia' },
    { id: 'atlas', name: 'Atlas Moderno / VTT' },
    { id: 'arcane', name: 'Noturno / Arcano' },
  ];

  return (
    <header className="h-14 bg-[#11141b] border-b border-[#252a36] px-4 flex items-center justify-between text-neutral-200 z-30 select-none shadow-md">
      {/* Brand & Document Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-900 border border-amber-500/40 flex items-center justify-center shadow-md">
            <Scroll className="w-4 h-4 text-amber-200" />
          </div>
          <span className="font-cinzel font-bold text-lg tracking-wider text-amber-100 hidden sm:inline">
            Cartógrafo
          </span>
        </div>

        <div className="h-5 w-[1px] bg-neutral-800" />

        <input
          type="text"
          value={doc.title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-transparent hover:bg-[#1a1f2c] focus:bg-[#1a1f2c] px-2.5 py-1 rounded-md text-sm font-medium text-neutral-200 border border-transparent focus:border-amber-500/50 outline-none transition-colors max-w-[200px] md:max-w-[280px] truncate"
          title="Clique para renomear o mapa"
        />

        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-800 text-neutral-400 border border-neutral-700">
          {doc.mode === 'world' ? 'Mundo' : doc.mode === 'city' ? 'Cidade' : doc.mode === 'dungeon' ? 'Masmorra' : 'Battle Map'}
        </span>
      </div>

      {/* Middle Controls: Undo, Redo, Visual Styles */}
      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={!canUndo()}
          title="Desfazer (Ctrl+Z)"
          className="p-2 text-neutral-400 hover:text-neutral-100 disabled:opacity-30 disabled:hover:text-neutral-400 hover:bg-[#1a1f2c] rounded-lg transition-colors"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          title="Refazer (Ctrl+Y)"
          className="p-2 text-neutral-400 hover:text-neutral-100 disabled:opacity-30 disabled:hover:text-neutral-400 hover:bg-[#1a1f2c] rounded-lg transition-colors"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-5 w-[1px] bg-neutral-800 mx-1" />

        {/* Visual Style Selector Dropdown */}
        <div className="flex items-center bg-[#181c26] border border-[#2c3342] rounded-lg p-0.5">
          {styles.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                doc.style === s.id
                  ? 'bg-amber-600/90 text-white shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#222836]'
              }`}
            >
              {s.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Right Controls: Grid, Master/Player View, Generator, Export */}
      <div className="flex items-center gap-2.5">
        {/* Grid Toggle */}
        <button
          onClick={toggleGrid}
          title={doc.grid.show ? 'Ocultar Grade' : 'Exibir Grade Tática'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            doc.grid.show
              ? 'bg-amber-950/40 border-amber-600/60 text-amber-200'
              : 'bg-[#181c26] border-[#2c3342] text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Grade</span>
        </button>

        {/* DM vs Player Mode Toggle */}
        <button
          onClick={togglePlayerMode}
          title={isPlayerMode ? 'Visão de Jogador (Segredos Ocultos)' : 'Visão do Mestre (Todos os Segredos Visíveis)'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isPlayerMode
              ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
              : 'bg-purple-950/40 border-purple-600/50 text-purple-200'
          }`}
        >
          {isPlayerMode ? <EyeOff className="w-3.5 h-3.5 text-emerald-400" /> : <Eye className="w-3.5 h-3.5 text-purple-400" />}
          <span>{isPlayerMode ? 'Modo Jogadores' : 'Modo Mestre'}</span>
        </button>

        {/* Asset Library Trigger */}
        <button
          onClick={onOpenAssets}
          title="Biblioteca de Imagens e Tokens (JPG, PNG, WebP, SVG)"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181c26] hover:bg-[#202738] border border-[#2c3342] hover:border-amber-600/50 text-neutral-200 rounded-lg text-xs font-medium transition-colors shadow-sm"
        >
          <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
          <span>Assets</span>
        </button>

        {/* AI Assistant Drawer Trigger */}
        <button
          onClick={onOpenAi}
          title="Assistente Cartográfico de IA (Claude, GPT-4o, Gemini, Ollama)"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 border border-purple-500/50 text-purple-200 hover:text-white rounded-lg text-xs font-medium transition-all shadow-sm active:scale-95"
        >
          <Bot className="w-3.5 h-3.5 text-purple-300" />
          <span>Assistente IA</span>
        </button>

        {/* Procedural Generator Modal Trigger */}
        <button
          onClick={onOpenGenerator}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#202738] hover:bg-[#283247] border border-[#343e56] text-amber-300 hover:text-amber-200 rounded-lg text-xs font-medium transition-colors shadow-sm"
        >
          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Gerar Novo</span>
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
};
