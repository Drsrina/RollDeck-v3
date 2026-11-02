/**
 * RightSidebar Component
 * Tabbed panel: Properties Inspector, Layers Manager, Fantasy Name Generator, DM Notes & Secret Markers.
 */

import React, { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { CultureType, generateGeographicFeatureName, generateKingdomName, generateSettlementName } from '../core/nameGenerator';
import { Mulberry32 } from '../core/prng';
import {
  SlidersHorizontal,
  Layers,
  Sparkles,
  BookOpen,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Plus,
  ShieldAlert,
  Compass,
  Check,
} from 'lucide-react';

export const RightSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'props' | 'layers' | 'names' | 'notes'>('props');
  const [copiedName, setCopiedName] = useState<string | null>(null);

  // Name Generator State
  const [selectedCulture, setSelectedCulture] = useState<CultureType>('elven');
  const [generatedNames, setGeneratedNames] = useState<string[]>([]);

  const {
    doc,
    selectedItemId,
    selectedItemType,
    updateStampItem,
    updateTextLabel,
    updateMarker,
    updateImageObject,
    deleteSelected,
    duplicateSelected,
    toggleLayer,
    setNotes,
    addTextLabel,
    setSelected,
    setPan,
    setZoom,
  } = useMapStore();

  // Find selected item
  const selectedStamp = doc.stamps.find((s) => s.id === selectedItemId);
  const selectedLabel = doc.labels.find((l) => l.id === selectedItemId);
  const selectedMarker = doc.markers.find((m) => m.id === selectedItemId);
  const selectedPath = doc.paths.find((p) => p.id === selectedItemId);
  const selectedImage = doc.imageObjects?.find((img) => img.id === selectedItemId);

  // Handle generating fresh culture names
  const handleGenerateNames = () => {
    const rng = new Mulberry32(Math.floor(Math.random() * 9999999));
    const names: string[] = [];
    names.push(generateKingdomName(selectedCulture, rng));
    names.push(generateSettlementName(selectedCulture, 'capital', rng));
    names.push(generateSettlementName(selectedCulture, 'city', rng));
    names.push(generateSettlementName(selectedCulture, 'port', rng));
    names.push(generateGeographicFeatureName('mountain', selectedCulture, rng));
    names.push(generateGeographicFeatureName('river', selectedCulture, rng));
    setGeneratedNames(names);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedName(text);
    setTimeout(() => setCopiedName(null), 2000);
  };

  const addNameToMap = (text: string) => {
    addTextLabel({
      id: `label-${Date.now()}`,
      text,
      x: doc.width * 0.5,
      y: doc.height * 0.5,
      rotation: 0,
      fontSize: 18,
      fontFamily: 'Cinzel',
      color: '#3a2618',
    });
  };

  return (
    <aside className="w-80 bg-[#141820] border-l border-[#252a36] flex flex-col text-neutral-200 select-none shadow-2xl z-20">
      {/* Tabs Header */}
      <div className="flex border-b border-[#252a36] bg-[#10131a]">
        <button
          onClick={() => setActiveTab('props')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'props'
              ? 'border-amber-500 text-amber-300 bg-[#161a24]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
          title="Propriedades do Objeto"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Ajustes</span>
        </button>

        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'layers'
              ? 'border-amber-500 text-amber-300 bg-[#161a24]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
          title="Camadas do Mapa"
        >
          <Layers className="w-4 h-4" />
          <span className="hidden sm:inline">Camadas</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('names');
            if (generatedNames.length === 0) handleGenerateNames();
          }}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'names'
              ? 'border-amber-500 text-amber-300 bg-[#161a24]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
          title="Gerador de Nomes Fantásticos"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Nomes</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'notes'
              ? 'border-amber-500 text-amber-300 bg-[#161a24]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
          title="Notas do Mestre e POIs"
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">Mestre</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: PROPERTIES */}
        {activeTab === 'props' && (
          <div>
            {selectedStamp && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-amber-300">
                    Carimbo Selecionado
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={duplicateSelected}
                      title="Duplicar (Ctrl+D)"
                      className="p-1.5 hover:bg-[#252b38] rounded text-neutral-400 hover:text-neutral-200"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={deleteSelected}
                      title="Excluir (Del)"
                      className="p-1.5 hover:bg-red-950/40 rounded text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>Escala: {selectedStamp.scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="3"
                    step="0.05"
                    value={selectedStamp.scale}
                    onChange={(e) => updateStampItem(selectedStamp.id, { scale: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>Rotação: {Math.round(selectedStamp.rotation)}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={selectedStamp.rotation}
                    onChange={(e) => updateStampItem(selectedStamp.id, { rotation: parseInt(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="flipx"
                    checked={!!selectedStamp.flipX}
                    onChange={(e) => updateStampItem(selectedStamp.id, { flipX: e.target.checked })}
                    className="rounded accent-amber-500 cursor-pointer"
                  />
                  <label htmlFor="flipx" className="text-xs text-neutral-300 cursor-pointer">
                    Espelhar Horizontalmente
                  </label>
                </div>
              </div>
            )}

            {selectedLabel && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-amber-300">
                    Rótulo de Texto
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={deleteSelected}
                      title="Excluir"
                      className="p-1.5 hover:bg-red-950/40 rounded text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Texto</label>
                  <input
                    type="text"
                    value={selectedLabel.text}
                    onChange={(e) => updateTextLabel(selectedLabel.id, { text: e.target.value })}
                    className="w-full bg-[#1b202c] border border-neutral-700 px-3 py-1.5 rounded-lg text-sm text-neutral-100 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Fonte Cartográfica</label>
                  <select
                    value={selectedLabel.fontFamily}
                    onChange={(e) => updateTextLabel(selectedLabel.id, { fontFamily: e.target.value })}
                    className="w-full bg-[#1b202c] border border-neutral-700 px-3 py-1.5 rounded-lg text-xs text-neutral-100 outline-none focus:border-amber-500"
                  >
                    <option value="Cinzel">Cinzel (Clássica Romana)</option>
                    <option value="Cinzel Decorative">Cinzel Decorative (Capitular)</option>
                    <option value="MedievalSharp">MedievalSharp (Gótica Manuscrita)</option>
                    <option value="Uncial Antiqua">Uncial Antiqua (Élfica / Celta)</option>
                    <option value="IM Fell English SC">IM Fell (Parchment Antigo)</option>
                    <option value="Inter">Inter (Atlas Moderno)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>Tamanho da Fonte: {selectedLabel.fontSize} px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="64"
                    value={selectedLabel.fontSize}
                    onChange={(e) => updateTextLabel(selectedLabel.id, { fontSize: parseInt(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>Rotação: {Math.round(selectedLabel.rotation)}°</span>
                  </div>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    value={selectedLabel.rotation}
                    onChange={(e) => updateTextLabel(selectedLabel.id, { rotation: parseInt(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="banner"
                    checked={!!selectedLabel.isBanner}
                    onChange={(e) => updateTextLabel(selectedLabel.id, { isBanner: e.target.checked })}
                    className="rounded accent-amber-500 cursor-pointer"
                  />
                  <label htmlFor="banner" className="text-xs text-neutral-300 cursor-pointer">
                    Moldura / Faixa de Pergaminho
                  </label>
                </div>
              </div>
            )}

            {selectedMarker && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-amber-300">
                    Marcador #{selectedMarker.number}
                  </span>
                  <button
                    onClick={deleteSelected}
                    title="Excluir Marcador"
                    className="p-1.5 hover:bg-red-950/40 rounded text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Título do Local</label>
                  <input
                    type="text"
                    value={selectedMarker.title}
                    onChange={(e) => updateMarker(selectedMarker.id, { title: e.target.value })}
                    className="w-full bg-[#1b202c] border border-neutral-700 px-3 py-1.5 rounded-lg text-sm text-neutral-100 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Descrição / Encontro</label>
                  <textarea
                    rows={4}
                    value={selectedMarker.description}
                    onChange={(e) => updateMarker(selectedMarker.id, { description: e.target.value })}
                    className="w-full bg-[#1b202c] border border-neutral-700 px-3 py-2 rounded-lg text-xs text-neutral-100 outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="secretMarker"
                      checked={selectedMarker.isSecret}
                      onChange={(e) => updateMarker(selectedMarker.id, { isSecret: e.target.checked })}
                      className="rounded accent-red-500 cursor-pointer"
                    />
                    <label htmlFor="secretMarker" className="text-xs font-semibold text-red-300 cursor-pointer flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      Segredo do Mestre (Ocultar de Jogadores)
                    </label>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Marcadores secretos não aparecem no mapa exportado para jogadores nem no modo de visualização de jogadores.
                  </p>
                </div>
              </div>
            )}

            {selectedPath && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-amber-300">
                    Caminho / Spline
                  </span>
                  <button
                    onClick={deleteSelected}
                    className="p-1.5 hover:bg-red-950/40 rounded text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-neutral-300">
                  Tipo: <strong className="capitalize">{selectedPath.type}</strong>
                </div>
                <div className="text-xs text-neutral-400">
                  Contém {selectedPath.points.length} pontos de curvatura.
                </div>
              </div>
            )}

            {selectedImage && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-amber-300">
                    Objeto de Imagem
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={duplicateSelected}
                      title="Duplicar"
                      className="p-1.5 hover:bg-[#252b38] rounded text-neutral-400 hover:text-neutral-200"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={deleteSelected}
                      title="Excluir"
                      className="p-1.5 hover:bg-red-950/40 rounded text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Nome</label>
                  <input
                    type="text"
                    value={selectedImage.name}
                    onChange={(e) => updateImageObject(selectedImage.id, { name: e.target.value })}
                    className="w-full bg-[#1b202c] border border-neutral-700 px-3 py-1.5 rounded-lg text-xs text-neutral-100 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>Escala: {(selectedImage.scaleX ?? 1).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={selectedImage.scaleX ?? 1}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      updateImageObject(selectedImage.id, { scaleX: val, scaleY: val });
                    }}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>Rotação: {Math.round(selectedImage.rotation)}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={selectedImage.rotation}
                    onChange={(e) => updateImageObject(selectedImage.id, { rotation: parseInt(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>Opacidade: {Math.round((selectedImage.opacity ?? 1) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={selectedImage.opacity ?? 1}
                    onChange={(e) => updateImageObject(selectedImage.id, { opacity: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Modo de Mesclagem (Blend Mode)</label>
                  <select
                    value={selectedImage.blendMode || 'source-over'}
                    onChange={(e) => updateImageObject(selectedImage.id, { blendMode: e.target.value as any })}
                    className="w-full bg-[#1b202c] border border-neutral-700 px-3 py-1.5 rounded-lg text-xs text-neutral-100 outline-none focus:border-amber-500"
                  >
                    <option value="source-over">Normal (Padrão)</option>
                    <option value="multiply">Multiplicar (Tinta / Papel)</option>
                    <option value="overlay">Sobrepor (Contraste)</option>
                    <option value="screen">Tela (Brilho / Arcano)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selectedImage.isToken}
                      onChange={(e) => updateImageObject(selectedImage.id, { isToken: e.target.checked })}
                      className="rounded accent-amber-500"
                    />
                    <span>Borda de Token</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selectedImage.isSecret}
                      onChange={(e) => updateImageObject(selectedImage.id, { isSecret: e.target.checked })}
                      className="rounded accent-red-500"
                    />
                    <span>Segredo (Mestre)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selectedImage.adjustments.tintTheme}
                      onChange={(e) =>
                        updateImageObject(selectedImage.id, {
                          adjustments: { ...selectedImage.adjustments, tintTheme: e.target.checked },
                        })
                      }
                      className="rounded accent-amber-500"
                    />
                    <span>Tingir pelo Tema</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selectedImage.adjustments.shadow}
                      onChange={(e) =>
                        updateImageObject(selectedImage.id, {
                          adjustments: { ...selectedImage.adjustments, shadow: e.target.checked },
                        })
                      }
                      className="rounded accent-amber-500"
                    />
                    <span>Sombra Projetada</span>
                  </label>
                </div>

                {/* Adjustments: Brightness & Sepia */}
                <div className="pt-2 border-t border-neutral-800 space-y-2">
                  <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>Brilho</span>
                    <span>{selectedImage.adjustments.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    value={selectedImage.adjustments.brightness}
                    onChange={(e) =>
                      updateImageObject(selectedImage.id, {
                        adjustments: { ...selectedImage.adjustments, brightness: parseInt(e.target.value) },
                      })
                    }
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>Sépia / Envelhecido</span>
                    <span>{selectedImage.adjustments.sepia}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedImage.adjustments.sepia}
                    onChange={(e) =>
                      updateImageObject(selectedImage.id, {
                        adjustments: { ...selectedImage.adjustments, sepia: parseInt(e.target.value) },
                      })
                    }
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>
            )}

            {!selectedStamp && !selectedLabel && !selectedMarker && !selectedPath && !selectedImage && (
              <div className="text-center py-12 px-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1d222e] border border-neutral-700 mx-auto flex items-center justify-center text-neutral-400">
                  <SlidersHorizontal className="w-6 h-6" />
                </div>
                <h4 className="font-cinzel font-semibold text-sm text-neutral-300">
                  Nenhum item selecionado
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Use a ferramenta <strong>Seleção (V)</strong> e clique em um carimbo, imagem, rótulo ou marcador para editar suas propriedades.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LAYERS */}
        {activeTab === 'layers' && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Camadas Visíveis
            </div>
            {doc.layers.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between p-2.5 bg-[#1b202c] border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => toggleLayer(l.id)}
                    className="text-neutral-400 hover:text-amber-400 transition-colors"
                  >
                    {l.visible ? <Eye className="w-4 h-4 text-amber-400" /> : <EyeOff className="w-4 h-4 text-neutral-600" />}
                  </button>
                  <span className={`text-xs font-medium ${l.visible ? 'text-neutral-200' : 'text-neutral-500'}`}>
                    {l.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: NAME GENERATOR */}
        {activeTab === 'names' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Cultura Fantástica</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['elven', 'dwarven', 'human', 'orc', 'arcane'] as CultureType[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCulture(c)}
                    className={`py-1.5 text-xs font-semibold rounded-lg capitalize border transition-all ${
                      selectedCulture === c
                        ? 'bg-amber-600/90 border-amber-500 text-white shadow-sm'
                        : 'bg-[#1b202c] border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {c === 'elven' ? 'Élfico' : c === 'dwarven' ? 'Anão' : c === 'human' ? 'Humano' : c === 'orc' ? 'Orc' : 'Arcano'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateNames}
              className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Sortear Novos Nomes</span>
            </button>

            <div className="space-y-2 pt-2">
              {generatedNames.map((n, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-[#1b202c] border border-neutral-800 rounded-lg group hover:border-amber-500/40 transition-colors"
                >
                  <span className="font-cinzel text-xs text-neutral-200 truncate pr-2">
                    {n}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => addNameToMap(n)}
                      title="Adicionar ao mapa como rótulo"
                      className="p-1 hover:bg-[#283042] text-neutral-400 hover:text-amber-300 rounded"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(n)}
                      title="Copiar nome"
                      className="p-1 hover:bg-[#283042] text-neutral-400 hover:text-neutral-200 rounded"
                    >
                      {copiedName === n ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DM NOTES */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Notas da Campanha
                </span>
                <span className="text-[10px] text-neutral-500">Salvo automaticamente</span>
              </div>
              <textarea
                rows={6}
                value={doc.notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escreva aqui segredos, ganchos de aventura, estatísticas de monstros..."
                className="w-full bg-[#1b202c] border border-neutral-700 p-2.5 rounded-lg text-xs text-neutral-200 outline-none focus:border-amber-500 resize-none font-mono leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Marcadores de Aventura ({doc.markers.length})
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {doc.markers.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelected(m.id, 'marker');
                      // Pan to marker
                      setPan({ x: -m.x * 1.2 + 400, y: -m.y * 1.2 + 300 });
                      setZoom(1.2);
                    }}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedItemId === m.id
                        ? 'bg-[#293245] border-amber-500 text-amber-200 shadow-sm'
                        : 'bg-[#1b202c] border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {m.number}
                        </span>
                        {m.title}
                      </span>
                      {m.isSecret && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-950 text-red-300 border border-red-800">
                          Segredo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-2">
                      {m.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
