/**
 * LeftToolbar Component
 * Creative toolbox: Terrain Brush, Eraser, Splines, Procedural Stamps, Text, Markers, Fog of War.
 */

import React, { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { BiomeType, StampType, ToolType } from '../types/map';
import {
  MousePointer,
  Hand,
  Paintbrush,
  Eraser,
  Stamp,
  Spline,
  Footprints,
  Type,
  MapPin,
  Cloud,
  Eye,
  Sliders,
  ChevronRight,
  Mountain,
  Trees,
  Castle,
  Skull,
} from 'lucide-react';

export const LeftToolbar: React.FC = () => {
  const { activeTool, setTool, toolSettings, updateToolSettings, doc } = useMapStore();
  const [activeDrawer, setActiveDrawer] = useState<'biome' | 'stamp' | 'brush' | 'scatter' | null>(null);

  const tools: { id: ToolType; label: string; icon: React.ReactNode; shortcut: string; hasDrawer?: 'biome' | 'stamp' | 'brush' | 'scatter' }[] = [
    { id: 'select', label: 'Seleção', icon: <MousePointer className="w-5 h-5" />, shortcut: 'V' },
    { id: 'pan', label: 'Navegar / Mão', icon: <Hand className="w-5 h-5" />, shortcut: 'H' },
    { id: 'brush', label: 'Pincel de Terreno', icon: <Paintbrush className="w-5 h-5" />, shortcut: 'B', hasDrawer: 'biome' },
    { id: 'eraser', label: 'Borracha', icon: <Eraser className="w-5 h-5" />, shortcut: 'E' },
    { id: 'stamp', label: 'Carimbos de Tinta', icon: <Stamp className="w-5 h-5" />, shortcut: 'S', hasDrawer: 'stamp' },
    { id: 'scatter_image', label: 'Espalhar / Scatter', icon: <Trees className="w-5 h-5 text-emerald-400" />, shortcut: 'K', hasDrawer: 'scatter' },
    { id: 'spline_river', label: 'Rio por Spline', icon: <Spline className="w-5 h-5 text-sky-400" />, shortcut: 'R' },
    { id: 'spline_road', label: 'Estrada por Spline', icon: <Footprints className="w-5 h-5 text-amber-500" />, shortcut: 'P' },
    { id: 'text', label: 'Rótulo de Texto', icon: <Type className="w-5 h-5" />, shortcut: 'T' },
    { id: 'marker', label: 'Marcador / POI', icon: <MapPin className="w-5 h-5 text-red-400" />, shortcut: 'M' },
    { id: 'fog_add', label: 'Cobrir com Névoa', icon: <Cloud className="w-5 h-5 text-neutral-400" />, shortcut: 'F' },
    { id: 'fog_remove', label: 'Revelar Área', icon: <Eye className="w-5 h-5 text-emerald-400" />, shortcut: 'G' },
  ];

  const biomes: { id: BiomeType; name: string; color: string; category: string }[] = [
    { id: 'grassland', name: 'Planície', color: '#b8cfa3', category: 'Natureza' },
    { id: 'forest', name: 'Floresta', color: '#7ba86d', category: 'Natureza' },
    { id: 'dense_forest', name: 'Mata Fechada', color: '#4f7d43', category: 'Natureza' },
    { id: 'swamp', name: 'Pântano', color: '#889873', category: 'Natureza' },
    { id: 'desert', name: 'Deserto', color: '#e8cd9b', category: 'Árido' },
    { id: 'mountain', name: 'Montanha', color: '#b5a593', category: 'Elevação' },
    { id: 'peak', name: 'Pico Rochoso', color: '#ded6cb', category: 'Elevação' },
    { id: 'snow', name: 'Neve Eterna', color: '#f3f4f6', category: 'Gélido' },
    { id: 'tundra', name: 'Tundra', color: '#c5d3ce', category: 'Gélido' },
    { id: 'beach', name: 'Praia / Areia', color: '#f0e0b4', category: 'Costa' },
    { id: 'shallow_ocean', name: 'Mar Raso', color: '#b2cbcc', category: 'Água' },
    { id: 'deep_ocean', name: 'Oceano Profundo', color: '#7a9699', category: 'Água' },
    { id: 'volcano', name: 'Vulcão / Magma', color: '#b85e4d', category: 'Perigo' },
    { id: 'stone_road', name: 'Calçamento Pedra', color: '#94a3b8', category: 'Construção' },
    { id: 'wood_floor', name: 'Madeira / Assoalho', color: '#c8a97e', category: 'Construção' },
    { id: 'dungeon_floor', name: 'Piso Masmorra', color: '#d1c7b7', category: 'Masmorra' },
    { id: 'dungeon_wall', name: 'Parede de Rocha', color: '#3f3328', category: 'Masmorra' },
  ];

  const stampCategories: {
    title: string;
    items: { type: StampType; name: string }[];
  }[] = [
    {
      title: 'Montanhas & Relevo',
      items: [
        { type: 'mountain_single', name: 'Montanha' },
        { type: 'mountain_range', name: 'Cordilheira' },
        { type: 'hill', name: 'Colinas' },
      ],
    },
    {
      title: 'Vegetação & Florestas',
      items: [
        { type: 'tree_deciduous', name: 'Carvalho' },
        { type: 'tree_pine', name: 'Pinheiro' },
        { type: 'forest_cluster', name: 'Bosque' },
      ],
    },
    {
      title: 'Civilização & Assentamentos',
      items: [
        { type: 'castle', name: 'Castelo' },
        { type: 'fortress', name: 'Fortaleza' },
        { type: 'city_icon', name: 'Cidade' },
        { type: 'village', name: 'Vila' },
        { type: 'tower', name: 'Torre de Vigia' },
        { type: 'ruins', name: 'Ruínas Antigas' },
      ],
    },
    {
      title: 'Mistério & Fantasia',
      items: [
        { type: 'cave_entrance', name: 'Caverna' },
        { type: 'portal', name: 'Portal Astral' },
        { type: 'ship', name: 'Caravela' },
        { type: 'sea_serpent', name: 'Serpente Marinha' },
        { type: 'dragon', name: 'Dragão Heráldico' },
      ],
    },
    {
      title: 'Masmorra & Props',
      items: [
        { type: 'dungeon_door', name: 'Porta de Ferro' },
        { type: 'dungeon_stairs', name: 'Escadaria' },
        { type: 'dungeon_trap', name: 'Armadilha' },
        { type: 'dungeon_chest', name: 'Baú do Tesouro' },
        { type: 'torch', name: 'Tocha' },
      ],
    },
  ];

  return (
    <aside className="relative flex z-20">
      {/* Main vertical tool stripe */}
      <div className="w-14 bg-[#141820] border-r border-[#252a36] flex flex-col items-center py-3 gap-1 select-none shadow-xl">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTool(t.id);
                if (t.hasDrawer) {
                  setActiveDrawer(activeDrawer === t.hasDrawer ? null : t.hasDrawer);
                } else {
                  setActiveDrawer(null);
                }
              }}
              title={`${t.label} (${t.shortcut})`}
              className={`relative group w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/60'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#1f2430]'
              }`}
            >
              {t.icon}

              {/* Tooltip */}
              <span className="absolute left-14 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1f2c] border border-neutral-700 text-neutral-200 text-xs font-medium rounded-lg whitespace-nowrap shadow-xl z-50">
                {t.label}
                <kbd className="px-1 py-0.2 bg-neutral-800 rounded text-[10px] text-neutral-400 font-mono">
                  {t.shortcut}
                </kbd>
              </span>
            </button>
          );
        })}

        <div className="w-8 h-[1px] bg-neutral-800 my-2" />

        {/* Quick Drawer trigger for active settings */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'brush' ? null : 'brush')}
          title="Ajustes de Pincel / Tamanho ([ e ])"
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeDrawer === 'brush'
              ? 'bg-[#273042] text-amber-300'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#1f2430]'
          }`}
        >
          <Sliders className="w-5 h-5" />
        </button>
      </div>

      {/* Flyout Drawer for Biome Selection */}
      {activeDrawer === 'biome' && (
        <div className="w-64 bg-[#181d27]/98 backdrop-blur-xl border-r border-[#2c3344] p-3 text-neutral-200 shadow-2xl flex flex-col h-full max-h-[calc(100vh-3.5rem)] overflow-y-auto animate-fadeIn">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
            <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-amber-300">
              Biomas de Terreno
            </span>
            <span className="text-[10px] text-neutral-400">Clique para pintar</span>
          </div>

          <div className="space-y-3">
            {['Natureza', 'Árido', 'Elevação', 'Gélido', 'Costa', 'Água', 'Masmorra', 'Construção'].map((cat) => {
              const catBiomes = biomes.filter((b) => b.category === cat);
              if (catBiomes.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 px-1">
                    {cat}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {catBiomes.map((b) => {
                      const isSelected = toolSettings.selectedBiome === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => {
                            updateToolSettings({ selectedBiome: b.id });
                            setTool('brush');
                          }}
                          className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-medium border text-left transition-all ${
                            isSelected
                              ? 'bg-[#2b3345] border-amber-500 text-amber-200 shadow-sm'
                              : 'bg-[#1e2330] border-transparent hover:border-neutral-700 text-neutral-300'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/40 shrink-0"
                            style={{ backgroundColor: b.color }}
                          />
                          <span className="truncate">{b.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Flyout Drawer for Stamp Picker */}
      {activeDrawer === 'stamp' && (
        <div className="w-72 bg-[#181d27]/98 backdrop-blur-xl border-r border-[#2c3344] p-3 text-neutral-200 shadow-2xl flex flex-col h-full max-h-[calc(100vh-3.5rem)] overflow-y-auto animate-fadeIn">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
            <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-amber-300">
              Carimbos de Fantasia
            </span>
            <span className="text-[10px] text-neutral-400">Traço de Tinta</span>
          </div>

          <div className="space-y-4">
            {stampCategories.map((cat) => (
              <div key={cat.title}>
                <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 px-1">
                  {cat.title}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {cat.items.map((st) => {
                    const isSelected = toolSettings.selectedStamp === st.type;
                    return (
                      <button
                        key={st.type}
                        onClick={() => {
                          updateToolSettings({ selectedStamp: st.type });
                          setTool('stamp');
                        }}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-[#2b3345] border-amber-500 text-amber-200 shadow-sm'
                            : 'bg-[#1e2330] border-transparent hover:border-neutral-700 text-neutral-300'
                        }`}
                      >
                        <Stamp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{st.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Stamp transform controls */}
          <div className="mt-4 pt-3 border-t border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Escala: {toolSettings.stampScale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={toolSettings.stampScale}
              onChange={(e) => updateToolSettings({ stampScale: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Flyout Drawer for Brush & Tools Settings */}
      {activeDrawer === 'brush' && (
        <div className="w-64 bg-[#181d27]/98 backdrop-blur-xl border-r border-[#2c3344] p-3 text-neutral-200 shadow-2xl flex flex-col gap-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-amber-300">
              Ajustes do Pincel
            </span>
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-1.5">
              <span>Raio do Pincel</span>
              <span className="font-mono text-amber-300">{toolSettings.brushSize} px</span>
            </div>
            <input
              type="range"
              min="8"
              max="120"
              value={toolSettings.brushSize}
              onChange={(e) => updateToolSettings({ brushSize: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
              <span>Fino [</span>
              <span>Largo ]</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-1.5">
              <span>Espessura de Rio/Estrada</span>
              <span className="font-mono text-amber-300">{toolSettings.pathWidth} px</span>
            </div>
            <input
              type="range"
              min="2"
              max="24"
              value={toolSettings.pathWidth}
              onChange={(e) => updateToolSettings({ pathWidth: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-1.5">
              <span>Raio da Névoa de Guerra</span>
              <span className="font-mono text-amber-300">{toolSettings.fogBrushSize} px</span>
            </div>
            <input
              type="range"
              min="16"
              max="140"
              value={toolSettings.fogBrushSize}
              onChange={(e) => updateToolSettings({ fogBrushSize: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Flyout Drawer for Scatter Tool */}
      {activeDrawer === 'scatter' && (
        <div className="w-72 bg-[#181d27]/98 backdrop-blur-xl border-r border-[#2c3344] p-3 text-neutral-200 shadow-2xl flex flex-col gap-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-amber-300">
              Espalhar / Scatter
            </span>
            <span className="text-[10px] text-neutral-400">Pincel de Clones</span>
          </div>

          <div>
            <label className="text-xs text-neutral-400 block mb-1.5">Asset para Espalhar</label>
            {doc.assets && doc.assets.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-[#12151e] rounded-lg border border-neutral-800">
                {doc.assets.map((a) => {
                  const isSelected = toolSettings.selectedAssetId === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => updateToolSettings({ selectedAssetId: a.id })}
                      className={`p-1.5 rounded-lg border flex flex-col items-center transition-all ${
                        isSelected
                          ? 'bg-[#2b3345] border-amber-500 text-amber-200'
                          : 'bg-[#181d2a] border-neutral-800 hover:border-neutral-700 text-neutral-400'
                      }`}
                    >
                      <img src={a.dataUrl} alt={a.name} className="w-8 h-8 object-contain" />
                      <span className="text-[9px] truncate w-full text-center mt-0.5">{a.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-[#13161f] rounded-lg border border-neutral-800 text-center text-xs text-neutral-400">
                Nenhum asset importado. Abra a Biblioteca de Assets para importar imagens.
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-1">
              <span>Raio de Dispersão</span>
              <span className="font-mono text-amber-300">{toolSettings.scatterRadius} px</span>
            </div>
            <input
              type="range"
              min="20"
              max="160"
              value={toolSettings.scatterRadius}
              onChange={(e) => updateToolSettings({ scatterRadius: parseInt(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-1">
              <span>Densidade (Cópias por clique)</span>
              <span className="font-mono text-amber-300">{toolSettings.scatterDensity}</span>
            </div>
            <input
              type="range"
              min="2"
              max="16"
              value={toolSettings.scatterDensity}
              onChange={(e) => updateToolSettings({ scatterDensity: parseInt(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div className="space-y-1.5 pt-1 border-t border-neutral-800">
            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={toolSettings.scatterRandomRotation}
                onChange={(e) => updateToolSettings({ scatterRandomRotation: e.target.checked })}
                className="rounded accent-amber-500"
              />
              <span>Variação de Rotação</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={toolSettings.scatterRespectBiome}
                onChange={(e) => updateToolSettings({ scatterRespectBiome: e.target.checked })}
                className="rounded accent-amber-500"
              />
              <span>Respeitar Bioma (Evitar Água)</span>
            </label>
          </div>
        </div>
      )}
    </aside>
  );
};
