/**
 * GeneratorModal Component
 * Interactive procedural generator for World/Region, City, Dungeon, and Battle Maps with seeds.
 */

import React, { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { MapMode } from '../types/map';
import { BattlemapScenario } from '../core/generators/battlemapGen';
import {
  Wand2,
  X,
  Dice5,
  Globe,
  Building2,
  Skull,
  Swords,
  Layers,
  Sparkles,
} from 'lucide-react';

interface GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeneratorModal: React.FC<GeneratorModalProps> = ({ isOpen, onClose }) => {
  const { generateWorld, generateCity, generateDungeon, generateBattlemap } = useMapStore();

  const [activeTab, setActiveTab] = useState<MapMode>('world');
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 899999 + 100000));

  // World parameters
  const [landRatio, setLandRatio] = useState<number>(0.52);
  const [roughness, setRoughness] = useState<number>(4);
  const [continents, setContinents] = useState<number>(2);
  const [settlements, setSettlements] = useState<number>(8);
  const [moisture, setMoisture] = useState<number>(0.5);

  // Battle map parameters
  const [scenario, setScenario] = useState<BattlemapScenario>('forest');
  const [gridType, setGridType] = useState<'square' | 'hex'>('square');

  if (!isOpen) return null;

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 899999 + 100000));
  };

  const handleGenerate = () => {
    if (activeTab === 'world') {
      generateWorld({
        seed,
        landRatio,
        roughness,
        numContinents: continents,
        numSettlements: settlements,
        moistureLevel: moisture,
      });
    } else if (activeTab === 'city') {
      generateCity(seed);
    } else if (activeTab === 'dungeon') {
      generateDungeon(seed);
    } else if (activeTab === 'battlemap') {
      generateBattlemap(scenario, seed, gridType);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#141822] border border-[#2b3345] rounded-2xl shadow-2xl text-neutral-200 overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252a3a] flex items-center justify-between bg-[#11141c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-base text-neutral-100">
                Gerador Procedural de Mapas
              </h3>
              <p className="text-[11px] text-neutral-400">
                Algoritmos cartográficos determinísticos baseados em sementes PRNG
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#202636] text-neutral-400 hover:text-neutral-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-4 border-b border-[#252a3a] bg-[#0f121a]">
          <button
            onClick={() => setActiveTab('world')}
            className={`py-3 flex flex-col items-center gap-1 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'world'
                ? 'border-amber-500 text-amber-300 bg-[#161a26]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Mundo / Região</span>
          </button>

          <button
            onClick={() => setActiveTab('city')}
            className={`py-3 flex flex-col items-center gap-1 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'city'
                ? 'border-amber-500 text-amber-300 bg-[#161a26]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Cidade / Vila</span>
          </button>

          <button
            onClick={() => setActiveTab('dungeon')}
            className={`py-3 flex flex-col items-center gap-1 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'dungeon'
                ? 'border-amber-500 text-amber-300 bg-[#161a26]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Skull className="w-4 h-4" />
            <span>Masmorra</span>
          </button>

          <button
            onClick={() => setActiveTab('battlemap')}
            className={`py-3 flex flex-col items-center gap-1 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'battlemap'
                ? 'border-amber-500 text-amber-300 bg-[#161a26]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>Battle Map</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Seed Input */}
          <div className="bg-[#1b202e] p-3.5 rounded-xl border border-neutral-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <span>Semente (Seed Determinística)</span>
              </label>
              <button
                onClick={randomizeSeed}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                <Dice5 className="w-3.5 h-3.5" />
                <span>Sortear Nova Semente</span>
              </button>
            </div>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
              className="w-full bg-[#11141c] border border-neutral-700 px-3 py-1.5 rounded-lg text-sm font-mono text-amber-300 outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-neutral-500 mt-1">
              A mesma semente gerará exatamente a mesma geografia e relevo.
            </p>
          </div>

          {/* WORLD PARAMS */}
          {activeTab === 'world' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-neutral-300 mb-1">
                  <span>Proporção de Massa de Terra</span>
                  <span className="font-mono text-amber-300">{Math.round(landRatio * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="0.75"
                  step="0.05"
                  value={landRatio}
                  onChange={(e) => setLandRatio(parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-neutral-300 mb-1">
                  <span>Aspereza do Terreno (Octaves Simplex)</span>
                  <span className="font-mono text-amber-300">{roughness} octaves</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="6"
                  step="1"
                  value={roughness}
                  onChange={(e) => setRoughness(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs text-neutral-300 mb-1">
                    <span>Número de Continentes</span>
                    <span className="font-mono text-amber-300">{continents}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={continents}
                    onChange={(e) => setContinents(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-neutral-300 mb-1">
                    <span>Cidades & Vilas</span>
                    <span className="font-mono text-amber-300">{settlements}</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="16"
                    value={settlements}
                    onChange={(e) => setSettlements(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CITY PARAMS */}
          {activeTab === 'city' && (
            <div className="space-y-3 text-xs text-neutral-300">
              <p>
                Gera uma cidade medieval orgânica com muralhas defensivas, portões com torres de vigia, rio navegável com doca de caravelas, avenidas principais e pontos de interesse com segredos do mestre.
              </p>
            </div>
          )}

          {/* DUNGEON PARAMS */}
          {activeTab === 'dungeon' && (
            <div className="space-y-3 text-xs text-neutral-300">
              <p>
                Gera uma masmorra/cripta subterrânea com salas conectadas por corredores, portas reforçadas, escadarias para níveis inferiores, armadilhas com CDs de desarme e baús de tesouro.
              </p>
            </div>
          )}

          {/* BATTLE MAP PARAMS */}
          {activeTab === 'battlemap' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-2">
                  Cenário de Batalha
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'forest', title: 'Clareira na Floresta', desc: 'Riacho, árvores densas e portal central' },
                    { id: 'tavern', title: 'Taverna do Pônei', desc: 'Assoalho de madeira, lareira e balcão' },
                    { id: 'cave', title: 'Caverna Subterrânea', desc: 'Paredes de rocha irregular e lago' },
                    { id: 'road', title: 'Encruzilhada', desc: 'Desfiladeiro e torre em ruínas' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setScenario(s.id as BattlemapScenario)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        scenario === s.id
                          ? 'bg-[#293245] border-amber-500 text-amber-200'
                          : 'bg-[#1b202e] border-neutral-800 hover:border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <div className="font-semibold text-xs mb-0.5">{s.title}</div>
                      <div className="text-[10px] text-neutral-400">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Tipo de Grade Tática
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGridType('square')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      gridType === 'square'
                        ? 'bg-amber-600/90 border-amber-500 text-white'
                        : 'bg-[#1b202e] border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Grade Quadrada (D&D 5e / 1.5m)
                  </button>
                  <button
                    onClick={() => setGridType('hex')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      gridType === 'hex'
                        ? 'bg-amber-600/90 border-amber-500 text-white'
                        : 'bg-[#1b202e] border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Grade Hexagonal (Wargame / Hex)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#252a3a] bg-[#11141c] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-[#202636] text-neutral-300 rounded-lg text-xs font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs rounded-lg shadow-lg shadow-amber-950/50 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Gerar Mapa Agora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
