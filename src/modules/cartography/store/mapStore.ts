/**
 * Zustand Store with Undo/Redo History, Tool State, Selection and Viewport
 */

import { create } from 'zustand';
import {
  Asset,
  BiomeType,
  ImageObject,
  AiProposedAction,
  MapDocument,
  MapMode,
  Point,
  StampItem,
  StampType,
  TextLabel,
  ToolSettings,
  ToolType,
  VisualStyleId,
} from '../types/map';
import { generateWorldMap, BIOME_INDEX } from '../core/generators/worldGen';
import { generateCityMap } from '../core/generators/cityGen';
import { generateDungeonMap } from '../core/generators/dungeonGen';
import { generateBattleMap, BattlemapScenario } from '../core/generators/battlemapGen';
import { AIProviderConfig } from '../ai/providers/types';
import { DEFAULT_AI_CONFIGS } from '../ai/providers/providerRegistry';
import { generateScatterInstances } from '../assets/scatter';
import { executeAgentTool, clearAllAiGeneratedItems } from '../ai/tools/executor';

const MAX_HISTORY = 30;

function createInitialDoc(): MapDocument {
  const seed = 12345;
  const initial = generateWorldMap({
    seed,
    width: 1200,
    height: 800,
    landRatio: 0.52,
    roughness: 4,
    numSettlements: 8,
  });

  return {
    id: `map-${Date.now()}`,
    title: initial.title || 'Reino de Eldoria',
    mode: 'world',
    style: 'parchment',
    width: 1200,
    height: 800,
    seed,
    terrainData: initial.terrainData!,
    gridResolution: 4,
    layers: [
      { id: 'l-terrain', name: 'Terreno & Oceanos', visible: true, locked: false, opacity: 1, type: 'terrain' },
      { id: 'l-paths', name: 'Rios & Estradas', visible: true, locked: false, opacity: 1, type: 'paths' },
      { id: 'l-stamps', name: 'Ícones & Relevo', visible: true, locked: false, opacity: 1, type: 'stamps' },
      { id: 'l-images', name: 'Imagens & Tokens', visible: true, locked: false, opacity: 1, type: 'images' },
      { id: 'l-text', name: 'Rótulos & Nomes', visible: true, locked: false, opacity: 1, type: 'text' },
      { id: 'l-markers', name: 'Marcadores de POI', visible: true, locked: false, opacity: 1, type: 'markers' },
      { id: 'l-fog', name: 'Névoa de Guerra', visible: true, locked: false, opacity: 1, type: 'fog' },
      { id: 'l-ai', name: 'Camada de IA', visible: true, locked: false, opacity: 1, type: 'ai' },
      { id: 'l-deco', name: 'Moldura & Bússola', visible: true, locked: false, opacity: 1, type: 'decorations' },
    ],
    stamps: initial.stamps || [],
    paths: initial.paths || [],
    labels: initial.labels || [],
    markers: initial.markers || [],
    settlements: initial.settlements || [],
    imageObjects: [],
    assets: [],
    grid: {
      show: false,
      type: 'square',
      size: 40,
      color: 'rgba(58, 38, 24, 0.2)',
      opacity: 0.5,
      scaleUnit: '1,5 m',
      scalePerCell: 1.5,
    },
    showCompass: true,
    compassPos: { x: 1100, y: 100 },
    showScaleBar: true,
    scaleBarPos: { x: 50, y: 750 },
    showBorder: true,
    borderStyle: 'ornate',
    fogData: initial.fogData || new Uint8Array(300 * 200),
    fogResolution: 4,
    notes: 'Campanha de RPG - Mestre:\n- Ponto 1: Capital com castelo fortificado.\n- Ponto secreto na cripta abandonada ao sul.\n- O dragão dorme no cume norte.',
    updatedAt: Date.now(),
  };
}

export interface MapState {
  doc: MapDocument;
  past: MapDocument[];
  future: MapDocument[];

  activeTool: ToolType;
  toolSettings: ToolSettings;

  zoom: number;
  pan: Point;

  isPlayerMode: boolean;
  selectedItemId: string | null;
  selectedItemType: 'stamp' | 'path' | 'label' | 'marker' | 'image' | null;

  activePathDraft: Point[] | null;
  brushCursor: { x: number; y: number; radius: number; color?: string } | null;

  // AI & Proposals
  aiProposals: AiProposedAction[];
  aiConfig: AIProviderConfig;
  sessionTokens: { promptTokens: number; completionTokens: number };

  // Actions
  setTool: (tool: ToolType) => void;
  updateToolSettings: (settings: Partial<ToolSettings>) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (pan: Point | ((prev: Point) => Point)) => void;
  resetView: () => void;
  togglePlayerMode: () => void;
  setSelected: (id: string | null, type?: MapState['selectedItemType']) => void;
  setBrushCursor: (cursor: MapState['brushCursor']) => void;

  // Document & History actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setDocument: (doc: MapDocument) => void;
  setStyle: (style: VisualStyleId) => void;
  setTitle: (title: string) => void;
  setNotes: (notes: string) => void;
  toggleLayer: (layerId: string) => void;
  toggleGrid: () => void;
  setGridConfig: (config: Partial<MapDocument['grid']>) => void;

  // Canvas drawing tools
  paintTerrain: (worldX: number, worldY: number, biome: BiomeType, radius: number) => void;
  addStampItem: (stamp: StampItem) => void;
  updateStampItem: (id: string, updates: Partial<StampItem>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;

  // Image Objects & Assets
  addImageObject: (img: ImageObject) => void;
  updateImageObject: (id: string, updates: Partial<ImageObject>) => void;
  deleteImageObject: (id: string) => void;
  addAsset: (asset: Asset) => void;
  scatterImages: (center: Point) => void;

  // Path draft
  addPathDraftPoint: (p: Point) => void;
  finishPathDraft: () => void;
  cancelPathDraft: () => void;

  // Text & Markers
  addTextLabel: (label: TextLabel) => void;
  updateTextLabel: (id: string, updates: Partial<TextLabel>) => void;
  addMarker: (marker: MapDocument['markers'][0]) => void;
  updateMarker: (id: string, updates: Partial<MapDocument['markers'][0]>) => void;
  deleteMarker: (id: string) => void;

  // Fog of war
  paintFog: (worldX: number, worldY: number, radius: number, reveal: boolean) => void;

  // AI Actions & Proposals
  setAiProposals: (proposals: AiProposedAction[]) => void;
  acceptProposal: (id: string) => void;
  rejectProposal: (id: string) => void;
  clearAiProposals: () => void;
  clearAllAiItems: () => void;
  updateAiConfig: (config: Partial<AIProviderConfig>) => void;
  updateSessionTokens: (tokens: { promptTokens: number; completionTokens: number }) => void;

  // Generators
  generateWorld: (opts?: any) => void;
  generateCity: (seed?: number) => void;
  generateDungeon: (seed?: number) => void;
  generateBattlemap: (scenario?: BattlemapScenario, seed?: number, gridType?: 'square' | 'hex') => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  doc: createInitialDoc(),
  past: [],
  future: [],

  activeTool: 'brush',
  toolSettings: {
    brushSize: 28,
    brushOpacity: 1,
    selectedBiome: 'grassland',
    selectedStamp: 'mountain_single',
    stampScale: 1,
    stampRotation: 0,
    pathWidth: 4,
    fontSize: 18,
    fontFamily: 'Cinzel',
    textColor: '#3a2618',
    curvedText: false,
    markerCategory: 'poi',
    markerSecret: false,
    fogBrushSize: 40,
    selectedAssetId: null,
    scatterRadius: 70,
    scatterDensity: 6,
    scatterRandomScale: 0.25,
    scatterRandomRotation: true,
    scatterRespectBiome: true,
  },

  zoom: 1,
  pan: { x: 50, y: 50 },

  isPlayerMode: false,
  selectedItemId: null,
  selectedItemType: null,

  activePathDraft: null,
  brushCursor: null,

  aiProposals: [],
  aiConfig: {
    provider: 'mock',
    apiKey: '',
    baseUrl: '',
    model: 'simulador-offline',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 20000,
  },
  sessionTokens: { promptTokens: 0, completionTokens: 0 },

  setTool: (tool) => {
    set({ activeTool: tool, activePathDraft: null });
  },

  updateToolSettings: (settings) => {
    set((state) => ({
      toolSettings: { ...state.toolSettings, ...settings },
    }));
  },

  setZoom: (zoom) => {
    set((state) => ({
      zoom: typeof zoom === 'function' ? zoom(state.zoom) : zoom,
    }));
  },

  setPan: (pan) => {
    set((state) => ({
      pan: typeof pan === 'function' ? pan(state.pan) : pan,
    }));
  },

  resetView: () => {
    set({ zoom: 1, pan: { x: 50, y: 50 } });
  },

  togglePlayerMode: () => {
    set((state) => ({ isPlayerMode: !state.isPlayerMode }));
  },

  setSelected: (id, type = null) => {
    set({ selectedItemId: id, selectedItemType: id ? type : null });
  },

  setBrushCursor: (cursor) => {
    set({ brushCursor: cursor });
  },

  pushHistory: () => {
    const current = get().doc;
    const cloned: MapDocument = {
      ...current,
      terrainData: new Uint8Array(current.terrainData),
      fogData: new Uint8Array(current.fogData),
      stamps: [...current.stamps],
      paths: current.paths.map((p) => ({ ...p, points: [...p.points] })),
      labels: [...current.labels],
      markers: [...current.markers],
      settlements: [...current.settlements],
      imageObjects: current.imageObjects ? current.imageObjects.map((img) => ({ ...img, adjustments: { ...img.adjustments } })) : [],
      assets: current.assets ? [...current.assets] : [],
    };

    set((state) => ({
      past: [...state.past.slice(-MAX_HISTORY), cloned],
      future: [],
    }));
  },

  undo: () => {
    const { past, doc, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    const clonedCurrent: MapDocument = {
      ...doc,
      terrainData: new Uint8Array(doc.terrainData),
      fogData: new Uint8Array(doc.fogData),
      stamps: [...doc.stamps],
      paths: doc.paths.map((p) => ({ ...p, points: [...p.points] })),
      labels: [...doc.labels],
      markers: [...doc.markers],
      settlements: [...doc.settlements],
      imageObjects: doc.imageObjects ? doc.imageObjects.map((img) => ({ ...img, adjustments: { ...img.adjustments } })) : [],
      assets: doc.assets ? [...doc.assets] : [],
    };

    set({
      doc: previous,
      past: newPast,
      future: [clonedCurrent, ...future],
    });
  },

  redo: () => {
    const { past, doc, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    const clonedCurrent: MapDocument = {
      ...doc,
      terrainData: new Uint8Array(doc.terrainData),
      fogData: new Uint8Array(doc.fogData),
      stamps: [...doc.stamps],
      paths: doc.paths.map((p) => ({ ...p, points: [...p.points] })),
      labels: [...doc.labels],
      markers: [...doc.markers],
      settlements: [...doc.settlements],
      imageObjects: doc.imageObjects ? doc.imageObjects.map((img) => ({ ...img, adjustments: { ...img.adjustments } })) : [],
      assets: doc.assets ? [...doc.assets] : [],
    };

    set({
      doc: next,
      past: [...past, clonedCurrent],
      future: newFuture,
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  setDocument: (doc) => {
    get().pushHistory();
    set({ doc: { ...doc, updatedAt: Date.now() } });
  },

  setStyle: (style) => {
    set((state) => ({
      doc: { ...state.doc, style, updatedAt: Date.now() },
    }));
  },

  setTitle: (title) => {
    set((state) => ({
      doc: { ...state.doc, title, updatedAt: Date.now() },
    }));
  },

  setNotes: (notes) => {
    set((state) => ({
      doc: { ...state.doc, notes, updatedAt: Date.now() },
    }));
  },

  toggleLayer: (layerId) => {
    set((state) => ({
      doc: {
        ...state.doc,
        layers: state.doc.layers.map((l) =>
          l.id === layerId ? { ...l, visible: !l.visible } : l
        ),
      },
    }));
  },

  toggleGrid: () => {
    set((state) => ({
      doc: {
        ...state.doc,
        grid: { ...state.doc.grid, show: !state.doc.grid.show },
      },
    }));
  },

  setGridConfig: (config) => {
    set((state) => ({
      doc: {
        ...state.doc,
        grid: { ...state.doc.grid, ...config },
      },
    }));
  },

  paintTerrain: (worldX, worldY, biome, radius) => {
    const { doc } = get();
    const res = doc.gridResolution || 4;
    const cols = Math.floor(doc.width / res);
    const rows = Math.floor(doc.height / res);
    const cellX = Math.floor(worldX / res);
    const cellY = Math.floor(worldY / res);
    const cellRadius = Math.max(1, Math.floor(radius / res));
    const biomeIdx = BIOME_INDEX[biome] ?? 3;

    let modified = false;
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        if (dx * dx + dy * dy <= cellRadius * cellRadius) {
          const cx = cellX + dx;
          const cy = cellY + dy;
          if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
            const idx = cy * cols + cx;
            if (doc.terrainData[idx] !== biomeIdx) {
              doc.terrainData[idx] = biomeIdx;
              modified = true;
            }
          }
        }
      }
    }

    if (modified) {
      set((state) => ({
        doc: { ...state.doc, updatedAt: Date.now() },
      }));
    }
  },

  addStampItem: (stamp) => {
    get().pushHistory();
    set((state) => ({
      doc: {
        ...state.doc,
        stamps: [...state.doc.stamps, stamp],
        updatedAt: Date.now(),
      },
      selectedItemId: stamp.id,
      selectedItemType: 'stamp',
    }));
  },

  updateStampItem: (id, updates) => {
    set((state) => ({
      doc: {
        ...state.doc,
        stamps: state.doc.stamps.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        updatedAt: Date.now(),
      },
    }));
  },

  deleteSelected: () => {
    const { selectedItemId, selectedItemType, doc } = get();
    if (!selectedItemId) return;
    get().pushHistory();

    if (selectedItemType === 'stamp') {
      set({
        doc: { ...doc, stamps: doc.stamps.filter((s) => s.id !== selectedItemId) },
        selectedItemId: null,
      });
    } else if (selectedItemType === 'path') {
      set({
        doc: { ...doc, paths: doc.paths.filter((p) => p.id !== selectedItemId) },
        selectedItemId: null,
      });
    } else if (selectedItemType === 'label') {
      set({
        doc: { ...doc, labels: doc.labels.filter((l) => l.id !== selectedItemId) },
        selectedItemId: null,
      });
    } else if (selectedItemType === 'marker') {
      set({
        doc: { ...doc, markers: doc.markers.filter((m) => m.id !== selectedItemId) },
        selectedItemId: null,
      });
    } else if (selectedItemType === 'image') {
      set({
        doc: { ...doc, imageObjects: (doc.imageObjects || []).filter((img) => img.id !== selectedItemId) },
        selectedItemId: null,
        selectedItemType: null,
      });
    }
  },

  duplicateSelected: () => {
    const { selectedItemId, selectedItemType, doc } = get();
    if (!selectedItemId) return;
    get().pushHistory();

    if (selectedItemType === 'stamp') {
      const stamp = doc.stamps.find((s) => s.id === selectedItemId);
      if (stamp) {
        const copy: StampItem = {
          ...stamp,
          id: `stamp-${Date.now()}`,
          x: stamp.x + 20,
          y: stamp.y + 20,
        };
        set({
          doc: { ...doc, stamps: [...doc.stamps, copy] },
          selectedItemId: copy.id,
        });
      }
    } else if (selectedItemType === 'label') {
      const lbl = doc.labels.find((l) => l.id === selectedItemId);
      if (lbl) {
        const copy: TextLabel = {
          ...lbl,
          id: `label-${Date.now()}`,
          x: lbl.x + 15,
          y: lbl.y + 15,
        };
        set({
          doc: { ...doc, labels: [...doc.labels, copy] },
          selectedItemId: copy.id,
        });
      }
    } else if (selectedItemType === 'image') {
      const img = doc.imageObjects?.find((i) => i.id === selectedItemId);
      if (img) {
        const copy: ImageObject = {
          ...img,
          id: `img-${Date.now()}`,
          x: img.x + 20,
          y: img.y + 20,
          adjustments: { ...img.adjustments },
        };
        set({
          doc: { ...doc, imageObjects: [...(doc.imageObjects || []), copy] },
          selectedItemId: copy.id,
          selectedItemType: 'image',
        });
      }
    }
  },

  addImageObject: (img) => {
    get().pushHistory();
    set((state) => ({
      doc: {
        ...state.doc,
        imageObjects: [...(state.doc.imageObjects || []), img],
        updatedAt: Date.now(),
      },
      selectedItemId: img.id,
      selectedItemType: 'image',
    }));
  },

  updateImageObject: (id, updates) => {
    set((state) => ({
      doc: {
        ...state.doc,
        imageObjects: (state.doc.imageObjects || []).map((img) => (img.id === id ? { ...img, ...updates } : img)),
        updatedAt: Date.now(),
      },
    }));
  },

  deleteImageObject: (id) => {
    get().pushHistory();
    set((state) => ({
      doc: {
        ...state.doc,
        imageObjects: (state.doc.imageObjects || []).filter((img) => img.id !== id),
        updatedAt: Date.now(),
      },
      selectedItemId: null,
      selectedItemType: null,
    }));
  },

  addAsset: (asset) => {
    set((state) => ({
      doc: {
        ...state.doc,
        assets: [...(state.doc.assets || []).filter((a) => a.id !== asset.id), asset],
      },
    }));
  },

  scatterImages: (center) => {
    const { doc, toolSettings } = get();
    if (!toolSettings.selectedAssetId) return;
    const asset = doc.assets?.find((a) => a.id === toolSettings.selectedAssetId);
    if (!asset) return;

    get().pushHistory();
    const newInstances = generateScatterInstances({
      center,
      radius: toolSettings.scatterRadius,
      count: toolSettings.scatterDensity,
      asset,
      randomScale: toolSettings.scatterRandomScale,
      randomRotation: toolSettings.scatterRandomRotation,
      respectBiome: toolSettings.scatterRespectBiome,
      doc,
    });

    set((state) => ({
      doc: {
        ...state.doc,
        imageObjects: [...(state.doc.imageObjects || []), ...newInstances],
        updatedAt: Date.now(),
      },
    }));
  },

  setAiProposals: (proposals) => {
    set({ aiProposals: proposals });
  },

  acceptProposal: (id) => {
    const { aiProposals } = get();
    const prop = aiProposals.find((p) => p.id === id);
    if (!prop) return;

    // Execute tool directly
    executeAgentTool({ id: prop.id, name: prop.tool, arguments: prop.payload }, false);

    set((state) => ({
      aiProposals: state.aiProposals.filter((p) => p.id !== id),
    }));
  },

  rejectProposal: (id) => {
    set((state) => ({
      aiProposals: state.aiProposals.filter((p) => p.id !== id),
    }));
  },

  clearAiProposals: () => {
    set({ aiProposals: [] });
  },

  clearAllAiItems: () => {
    clearAllAiGeneratedItems();
  },

  updateAiConfig: (config) => {
    set((state) => ({
      aiConfig: { ...state.aiConfig, ...config },
    }));
  },

  updateSessionTokens: (tokens) => {
    set((state) => ({
      sessionTokens: {
        promptTokens: state.sessionTokens.promptTokens + tokens.promptTokens,
        completionTokens: state.sessionTokens.completionTokens + tokens.completionTokens,
      },
    }));
  },

  addPathDraftPoint: (p) => {
    const { activePathDraft } = get();
    if (!activePathDraft) {
      set({ activePathDraft: [p] });
    } else {
      set({ activePathDraft: [...activePathDraft, p] });
    }
  },

  finishPathDraft: () => {
    const { activePathDraft, activeTool, toolSettings, doc } = get();
    if (!activePathDraft || activePathDraft.length < 2) {
      set({ activePathDraft: null });
      return;
    }

    get().pushHistory();
    const isRiver = activeTool === 'spline_river';
    const newPath: MapDocument['paths'][0] = {
      id: `${isRiver ? 'river' : 'road'}-${Date.now()}`,
      type: isRiver ? 'river' : 'road',
      points: activePathDraft,
      width: isRiver ? 5 : toolSettings.pathWidth,
      dashed: !isRiver,
    };

    set({
      doc: {
        ...doc,
        paths: [...doc.paths, newPath],
        updatedAt: Date.now(),
      },
      activePathDraft: null,
    });
  },

  cancelPathDraft: () => {
    set({ activePathDraft: null });
  },

  addTextLabel: (label) => {
    get().pushHistory();
    set((state) => ({
      doc: {
        ...state.doc,
        labels: [...state.doc.labels, label],
        updatedAt: Date.now(),
      },
      selectedItemId: label.id,
      selectedItemType: 'label',
    }));
  },

  updateTextLabel: (id, updates) => {
    set((state) => ({
      doc: {
        ...state.doc,
        labels: state.doc.labels.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        updatedAt: Date.now(),
      },
    }));
  },

  addMarker: (marker) => {
    get().pushHistory();
    set((state) => ({
      doc: {
        ...state.doc,
        markers: [...state.doc.markers, marker],
        updatedAt: Date.now(),
      },
      selectedItemId: marker.id,
      selectedItemType: 'marker',
    }));
  },

  updateMarker: (id, updates) => {
    set((state) => ({
      doc: {
        ...state.doc,
        markers: state.doc.markers.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        updatedAt: Date.now(),
      },
    }));
  },

  deleteMarker: (id) => {
    get().pushHistory();
    set((state) => ({
      doc: {
        ...state.doc,
        markers: state.doc.markers.filter((m) => m.id !== id),
        updatedAt: Date.now(),
      },
      selectedItemId: null,
    }));
  },

  paintFog: (worldX, worldY, radius, reveal) => {
    const { doc } = get();
    const res = doc.fogResolution || 4;
    const cols = Math.floor(doc.width / res);
    const rows = Math.floor(doc.height / res);
    const cellX = Math.floor(worldX / res);
    const cellY = Math.floor(worldY / res);
    const cellRadius = Math.max(1, Math.floor(radius / res));
    const targetVal = reveal ? 0 : 1;

    let modified = false;
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        if (dx * dx + dy * dy <= cellRadius * cellRadius) {
          const cx = cellX + dx;
          const cy = cellY + dy;
          if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
            const idx = cy * cols + cx;
            if (doc.fogData[idx] !== targetVal) {
              doc.fogData[idx] = targetVal;
              modified = true;
            }
          }
        }
      }
    }

    if (modified) {
      set((state) => ({
        doc: { ...state.doc, updatedAt: Date.now() },
      }));
    }
  },

  generateWorld: (opts) => {
    get().pushHistory();
    const seed = opts?.seed ?? Math.floor(Math.random() * 1000000);
    const newDoc = generateWorldMap({
      seed,
      width: 1200,
      height: 800,
      ...opts,
    });

    set((state) => ({
      doc: {
        ...state.doc,
        ...newDoc,
        mode: 'world',
        updatedAt: Date.now(),
      } as MapDocument,
      selectedItemId: null,
    }));
  },

  generateCity: (seed) => {
    get().pushHistory();
    const s = seed ?? Math.floor(Math.random() * 1000000);
    const newDoc = generateCityMap(s, 1200, 800);

    set((state) => ({
      doc: {
        ...state.doc,
        ...newDoc,
        mode: 'city',
        updatedAt: Date.now(),
      } as MapDocument,
      selectedItemId: null,
    }));
  },

  generateDungeon: (seed) => {
    get().pushHistory();
    const s = seed ?? Math.floor(Math.random() * 1000000);
    const newDoc = generateDungeonMap(s, 1200, 800);

    set((state) => ({
      doc: {
        ...state.doc,
        ...newDoc,
        mode: 'dungeon',
        updatedAt: Date.now(),
      } as MapDocument,
      selectedItemId: null,
    }));
  },

  generateBattlemap: (scenario = 'forest', seed, gridType = 'square') => {
    get().pushHistory();
    const s = seed ?? Math.floor(Math.random() * 1000000);
    const newDoc = generateBattleMap(scenario, s, gridType, 1200, 800);

    set((state) => ({
      doc: {
        ...state.doc,
        ...newDoc,
        mode: 'battlemap',
        updatedAt: Date.now(),
      } as MapDocument,
      selectedItemId: null,
    }));
  },
}));
