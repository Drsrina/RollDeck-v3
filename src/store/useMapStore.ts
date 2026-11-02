import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import MiniSearch from 'minisearch';
import { create } from 'zustand';
import {
  deleteLayer as dbDeleteLayer,
  deleteLink as dbDeleteLink,
  deleteNote as dbDeleteNote,
  saveFrame as dbSaveFrame,
  saveLayer as dbSaveLayer,
  saveLayers as dbSaveLayers,
  saveLink as dbSaveLink,
  saveLinks as dbSaveLinks,
  saveMapViewState as dbSaveMapViewState,
  saveNote as dbSaveNote,
  saveNotes as dbSaveNotes,
} from '../db/indexedDB';
import { syncLinksFromNoteBody } from '../lib/wikiLinks';
import type { MapFrame, MapViewState, NoteLayer, NoteLink, NoteNode } from '../types';

interface MapHistorySnapshot {
  notes: NoteNode[];
  links: NoteLink[];
}

interface MapStoreState {
  notes: NoteNode[];
  links: NoteLink[];
  layers: NoteLayer[];
  frames: MapFrame[];
  viewState: MapViewState;

  // Selection
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  isSelectMode: boolean;

  // Editor & Panels
  isEditorOpen: boolean;
  editingNoteId: string | null;
  isLayersPanelOpen: boolean;
  isListPanelOpen: boolean;

  // Radial / Action Menu for node
  radialNodeId: string | null;
  radialPosition: { x: number; y: number } | null;

  // Search Engine
  searchQuery: string;
  matchedNodeIds: string[];

  // Undo / Redo
  undoStack: MapHistorySnapshot[];
  redoStack: MapHistorySnapshot[];

  // Actions
  setViewState: (updater: Partial<MapViewState> | ((prev: MapViewState) => MapViewState)) => void;
  selectNode: (id: string | null, multi?: boolean) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  toggleSelectMode: () => void;

  openEditor: (noteId: string | null) => void;
  closeEditor: () => void;
  setLayersPanelOpen: (open: boolean) => void;
  setListPanelOpen: (open: boolean) => void;
  setRadialMenu: (nodeId: string | null, pos?: { x: number; y: number } | null) => void;

  // CRUD Notes
  createNoteAt: (x: number, y: number, layerId?: string, title?: string, body?: string) => Promise<NoteNode>;
  saveNoteData: (note: NoteNode) => Promise<void>;
  updateNotePosition: (id: string, x: number, y: number) => void;
  commitNotePositions: () => Promise<void>;
  deleteNoteData: (id: string, removeLinks?: boolean) => Promise<void>;
  togglePinNode: (id: string) => Promise<void>;
  toggleGravityOrbit: () => void;

  // Links
  addLink: (fromId: string, toId: string, label?: string, type?: NoteLink['type']) => Promise<void>;
  removeLink: (linkId: string) => Promise<void>;

  // Layers
  createLayer: (name: string, color: string) => Promise<NoteLayer>;
  updateLayer: (layer: NoteLayer) => Promise<void>;
  toggleLayerVisibility: (layerId: string) => Promise<void>;
  toggleLayerLock: (layerId: string) => Promise<void>;
  deleteLayerData: (layerId: string) => Promise<void>;

  // Search
  setSearchQuery: (query: string) => void;

  // Layout & History
  runForceLayout: (alpha?: number) => void;
  pushHistorySnapshot: () => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  // Initialization
  setInitialData: (data: {
    notes: NoteNode[];
    links: NoteLink[];
    layers: NoteLayer[];
    frames: MapFrame[];
    viewState: MapViewState;
  }) => void;
}

// Global in-memory MiniSearch instance
let miniSearch = new MiniSearch<NoteNode>({
  fields: ['title', 'body', 'tags'],
  storeFields: ['id', 'title'],
  searchOptions: {
    fuzzy: 0.25,
    prefix: true,
    boost: { title: 2 },
  },
});

function rebuildSearchIndex(notes: NoteNode[]) {
  miniSearch.removeAll();
  if (notes.length > 0) {
    miniSearch.addAll(notes);
  }
}

export const useMapStore = create<MapStoreState>((set, get) => ({
  notes: [],
  links: [],
  layers: [],
  frames: [],
  viewState: {
    zoom: 1,
    panX: 0,
    panY: 0,
    mode: 'free',
    snapToGrid: false,
    showMinimap: true,
    focusHops: 1,
  },

  selectedNodeId: null,
  selectedNodeIds: [],
  isSelectMode: false,

  isEditorOpen: false,
  editingNoteId: null,
  isLayersPanelOpen: false,
  isListPanelOpen: false,

  radialNodeId: null,
  radialPosition: null,

  searchQuery: '',
  matchedNodeIds: [],

  undoStack: [],
  redoStack: [],

  setViewState: (updater) => {
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.viewState) : { ...state.viewState, ...updater };
      dbSaveMapViewState(next).catch(() => {});
      return { viewState: next };
    });
  },

  selectNode: (id, multi = false) => {
    set((state) => {
      if (!id) {
        return { selectedNodeId: null, selectedNodeIds: [] };
      }
      if (multi) {
        const next = state.selectedNodeIds.includes(id)
          ? state.selectedNodeIds.filter((item) => item !== id)
          : [...state.selectedNodeIds, id];
        return { selectedNodeIds: next, selectedNodeId: id };
      }
      return { selectedNodeId: id, selectedNodeIds: [id] };
    });
  },

  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids, selectedNodeId: ids[0] || null }),

  toggleSelectMode: () => set((state) => ({ isSelectMode: !state.isSelectMode, selectedNodeIds: [] })),

  openEditor: (noteId) => set({ isEditorOpen: true, editingNoteId: noteId, radialNodeId: null }),

  closeEditor: () => set({ isEditorOpen: false, editingNoteId: null }),

  setLayersPanelOpen: (open) => set({ isLayersPanelOpen: open }),

  setListPanelOpen: (open) => set({ isListPanelOpen: open }),

  setRadialMenu: (nodeId, pos = null) => set({ radialNodeId: nodeId, radialPosition: pos }),

  // Push history snapshot for undo/redo (max 50)
  pushHistorySnapshot: () => {
    const { notes, links, undoStack } = get();
    const snapshot: MapHistorySnapshot = {
      notes: JSON.parse(JSON.stringify(notes)),
      links: JSON.parse(JSON.stringify(links)),
    };
    const nextUndo = [snapshot, ...undoStack.slice(0, 49)];
    set({ undoStack: nextUndo, redoStack: [] });
  },

  undo: async () => {
    const { undoStack, redoStack, notes, links } = get();
    if (undoStack.length === 0) return;

    const currentSnapshot: MapHistorySnapshot = {
      notes: JSON.parse(JSON.stringify(notes)),
      links: JSON.parse(JSON.stringify(links)),
    };

    const [prev, ...restUndo] = undoStack;
    await dbSaveNotes(prev.notes);
    await dbSaveLinks(prev.links);
    rebuildSearchIndex(prev.notes);

    set({
      notes: prev.notes,
      links: prev.links,
      undoStack: restUndo,
      redoStack: [currentSnapshot, ...redoStack],
    });
  },

  redo: async () => {
    const { undoStack, redoStack, notes, links } = get();
    if (redoStack.length === 0) return;

    const currentSnapshot: MapHistorySnapshot = {
      notes: JSON.parse(JSON.stringify(notes)),
      links: JSON.parse(JSON.stringify(links)),
    };

    const [next, ...restRedo] = redoStack;
    await dbSaveNotes(next.notes);
    await dbSaveLinks(next.links);
    rebuildSearchIndex(next.notes);

    set({
      notes: next.notes,
      links: next.links,
      undoStack: [currentSnapshot, ...undoStack],
      redoStack: restRedo,
    });
  },

  createNoteAt: async (x, y, layerId, title = 'Nova Nota', body = '') => {
    get().pushHistorySnapshot();
    const { layers, notes } = get();
    const activeLayer = layerId || layers[0]?.id || 'layer-default';

    const newNote: NoteNode = {
      id: `note-${crypto.randomUUID()}`,
      title,
      body,
      tags: [],
      layerId: activeLayer,
      x: Math.round(x),
      y: Math.round(y),
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await dbSaveNote(newNote);
    const updatedNotes = [...notes, newNote];
    rebuildSearchIndex(updatedNotes);

    set({
      notes: updatedNotes,
      selectedNodeId: newNote.id,
      selectedNodeIds: [newNote.id],
    });

    return newNote;
  },

  saveNoteData: async (note) => {
    get().pushHistorySnapshot();
    const { notes, links } = get();
    const updatedNote = { ...note, updatedAt: Date.now() };

    // Update note in database
    await dbSaveNote(updatedNote);

    // Auto-sync [[wiki-links]] from markdown body
    const updatedNotesList = notes.map((n) => (n.id === note.id ? updatedNote : n));
    const updatedLinksList = syncLinksFromNoteBody(note.id, note.body, updatedNotesList, links);

    await dbSaveLinks(updatedLinksList);
    rebuildSearchIndex(updatedNotesList);

    set({
      notes: updatedNotesList,
      links: updatedLinksList,
    });
  },

  updateNotePosition: (id, x, y) => {
    const { viewState } = get();
    let finalX = x;
    let finalY = y;

    // Optional snap to grid (20px)
    if (viewState.snapToGrid) {
      finalX = Math.round(x / 20) * 20;
      finalY = Math.round(y / 20) * 20;
    }

    set((state) => ({
      notes: state.notes.map((n) => (n.id === id && !n.pinned ? { ...n, x: finalX, y: finalY } : n)),
    }));
  },

  commitNotePositions: async () => {
    const { notes } = get();
    await dbSaveNotes(notes);
  },

  deleteNoteData: async (id, removeLinks = true) => {
    get().pushHistorySnapshot();
    await dbDeleteNote(id, removeLinks);

    set((state) => {
      const remainingNotes = state.notes.filter((n) => n.id !== id);
      const remainingLinks = removeLinks
        ? state.links.filter((l) => l.fromId !== id && l.toId !== id)
        : state.links;
      rebuildSearchIndex(remainingNotes);

      return {
        notes: remainingNotes,
        links: remainingLinks,
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        selectedNodeIds: state.selectedNodeIds.filter((item) => item !== id),
        isEditorOpen: state.editingNoteId === id ? false : state.isEditorOpen,
        editingNoteId: state.editingNoteId === id ? null : state.editingNoteId,
      };
    });
  },

  togglePinNode: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const updated = { ...note, pinned: !note.pinned };
    await dbSaveNote(updated);
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? updated : n)),
    }));
  },

  toggleGravityOrbit: () => {
    const current = get().viewState.gravityOrbit ?? false;
    get().setViewState({ gravityOrbit: !current });
  },

  addLink: async (fromId, toId, label, type = 'link') => {
    if (fromId === toId) return;
    get().pushHistorySnapshot();

    const newLink: NoteLink = {
      id: `link-${fromId}-${toId}-${Date.now()}`,
      fromId,
      toId,
      label,
      type,
    };

    await dbSaveLink(newLink);
    set((state) => ({
      links: [...state.links, newLink],
    }));
  },

  removeLink: async (linkId) => {
    get().pushHistorySnapshot();
    await dbDeleteLink(linkId);
    set((state) => ({
      links: state.links.filter((l) => l.id !== linkId),
    }));
  },

  createLayer: async (name, color) => {
    const { layers } = get();
    const newLayer: NoteLayer = {
      id: `layer-${crypto.randomUUID()}`,
      name,
      color,
      order: layers.length,
      visible: true,
      locked: false,
    };
    await dbSaveLayer(newLayer);
    set({ layers: [...layers, newLayer] });
    return newLayer;
  },

  updateLayer: async (layer) => {
    await dbSaveLayer(layer);
    set((state) => ({
      layers: state.layers.map((l) => (l.id === layer.id ? layer : l)),
    }));
  },

  toggleLayerVisibility: async (layerId) => {
    const layer = get().layers.find((l) => l.id === layerId);
    if (!layer) return;
    const updated = { ...layer, visible: !layer.visible };
    await dbSaveLayer(updated);
    set((state) => ({
      layers: state.layers.map((l) => (l.id === layerId ? updated : l)),
    }));
  },

  toggleLayerLock: async (layerId) => {
    const layer = get().layers.find((l) => l.id === layerId);
    if (!layer) return;
    const updated = { ...layer, locked: !layer.locked };
    await dbSaveLayer(updated);
    set((state) => ({
      layers: state.layers.map((l) => (l.id === layerId ? updated : l)),
    }));
  },

  deleteLayerData: async (layerId) => {
    await dbDeleteLayer(layerId);
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== layerId),
    }));
  },

  setSearchQuery: (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      set({ searchQuery: '', matchedNodeIds: [] });
      return;
    }

    try {
      const results = miniSearch.search(trimmed);
      const matched = results.map((r) => String(r.id));
      set({ searchQuery: query, matchedNodeIds: matched });
    } catch {
      set({ searchQuery: query, matchedNodeIds: [] });
    }
  },

  // Obsidian-style Force-directed graph layout
  runForceLayout: (alpha = 0.8) => {
    get().pushHistorySnapshot();
    const { notes, links } = get();
    if (notes.length === 0) return;

    // Build node simulation objects
    const simNodes = notes.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      fx: n.pinned ? n.x : undefined,
      fy: n.pinned ? n.y : undefined,
    }));

    const simLinks = links
      .filter((l) => notes.some((n) => n.id === l.fromId) && notes.some((n) => n.id === l.toId))
      .map((l) => ({ source: l.fromId, target: l.toId }));

    const sim = forceSimulation(simNodes as any)
      .force(
        'link',
        forceLink(simLinks as any)
          .id((d: any) => d.id)
          .distance(160)
      )
      .force('charge', forceManyBody().strength(-350))
      .force('collide', forceCollide().radius(70))
      .force('x', forceX(0).strength(0.04))
      .force('y', forceY(0).strength(0.04))
      .alpha(alpha)
      .stop();

    // Run 120 iterations synchronously for instant settling
    for (let i = 0; i < 120; i++) {
      sim.tick();
    }

    // Apply new computed positions
    const posMap = new Map<string, { x: number; y: number }>();
    simNodes.forEach((sn) => {
      posMap.set(sn.id, { x: Math.round(sn.x || 0), y: Math.round(sn.y || 0) });
    });

    const updatedNotes = notes.map((n) => {
      if (n.pinned) return n;
      const pos = posMap.get(n.id);
      return pos ? { ...n, x: pos.x, y: pos.y } : n;
    });

    dbSaveNotes(updatedNotes).catch(() => {});
    set({ notes: updatedNotes });
  },

  setInitialData: (data) => {
    rebuildSearchIndex(data.notes);
    set({
      notes: data.notes,
      links: data.links,
      layers: data.layers,
      frames: data.frames,
      viewState: data.viewState,
    });
  },
}));
