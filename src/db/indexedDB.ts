import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import JSZip from 'jszip';
import { z } from 'zod';
import { DEFAULT_LOOT_GENERATOR_TEMPLATES } from '../lib/lootTemplates';
import { DEFAULT_CUSTOM_DICE, STANDARD_DICE } from '../lib/roll';
import type {
  AISettings,
  AppSettings,
  BackupData,
  CanvasTableObject,
  Category,
  DieDefinition,
  LootGenerator,
  LootGroup,
  MapAttachment,
  MapFrame,
  MapViewState,
  NoteLayer,
  NoteLink,
  NoteNode,
  Package,
  RollResult,
} from '../types';

export const CURRENT_SCHEMA_VERSION = 3;
const DB_NAME = 'rolldeck_ttrpg_db';

interface RollDeckDBSchema extends DBSchema {
  dice: {
    key: string;
    value: DieDefinition;
  };
  packages: {
    key: string;
    value: Package;
    indexes: { 'by-order': number };
  };
  categories: {
    key: string;
    value: Category;
  };
  history: {
    key: string;
    value: RollResult;
    indexes: { 'by-timestamp': number };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  notes: {
    key: string;
    value: NoteNode;
    indexes: {
      'by-layerId': string;
      'by-updatedAt': number;
      'by-title': string;
    };
  };
  links: {
    key: string;
    value: NoteLink;
    indexes: {
      'by-fromId': string;
      'by-toId': string;
    };
  };
  layers: {
    key: string;
    value: NoteLayer;
  };
  frames: {
    key: string;
    value: MapFrame;
  };
  attachments: {
    key: string;
    value: MapAttachment;
    indexes: { 'by-noteId': string };
  };
  viewState: {
    key: string;
    value: MapViewState;
  };
  // Version 3: Loot & AI Stores
  lootGenerators: {
    key: string;
    value: LootGenerator;
  };
  lootGroups: {
    key: string;
    value: LootGroup;
    indexes: {
      'by-generatorId': string;
      'by-createdAt': number;
    };
  };
  aiSettings: {
    key: string;
    value: AISettings;
  };
  tableObjects: {
    key: string;
    value: CanvasTableObject;
  };
}

let dbPromise: Promise<IDBPDatabase<RollDeckDBSchema>> | null = null;

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  reduceMotion: false,
  diceRoll3DEnabled: true,
  historyLimit: 200,
  schemaVersion: CURRENT_SCHEMA_VERSION,
  themeId: 'cyberpunk',
};

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'gemini-builtin',
  model: 'gemini-3.8-flash',
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'combat', name: 'Combate', icon: '⚔️', color: '#f43f5e' },
  { id: 'spells', name: 'Magias', icon: '✨', color: '#e879f9' },
  { id: 'skills', name: 'Perícias', icon: '📜', color: '#22d3ee' },
  { id: 'general', name: 'Geral', icon: '🎲', color: '#a3e635' },
];

export const DEFAULT_PACKAGES: Package[] = [
  {
    id: 'pkg-sword-attack',
    name: 'Ataque com Espada Longa',
    color: '#22d3ee',
    icon: '⚔️',
    categoryId: 'combat',
    globalModifier: 0,
    isFavorite: true,
    order: 0,
    groups: [
      {
        id: 'g-atk',
        dieId: 'd20',
        count: 1,
        modifier: 5,
        label: 'Ataque',
        advantage: 'none',
      },
      {
        id: 'g-dmg',
        dieId: 'd8',
        count: 1,
        modifier: 3,
        label: 'Dano Cortante',
        advantage: 'none',
      },
    ],
  },
  {
    id: 'pkg-fireball',
    name: 'Bola de Fogo (Nível 3)',
    color: '#f97316',
    icon: '🔥',
    categoryId: 'spells',
    globalModifier: 0,
    isFavorite: true,
    order: 1,
    groups: [
      {
        id: 'g-fire',
        dieId: 'd6',
        count: 8,
        modifier: 0,
        label: 'Dano Ígneo',
        advantage: 'none',
      },
    ],
  },
  {
    id: 'pkg-skill-check',
    name: 'Teste de Perícia (Percepção)',
    color: '#a3e635',
    icon: '👁️',
    categoryId: 'skills',
    globalModifier: 0,
    isFavorite: true,
    order: 2,
    groups: [
      {
        id: 'g-perception',
        dieId: 'd20',
        count: 1,
        modifier: 4,
        label: 'Percepção Sabedoria',
        advantage: 'none',
      },
    ],
  },
];

export const DEFAULT_LAYERS: NoteLayer[] = [
  { id: 'layer-locations', name: 'Locais & Cidades', color: '#38bdf8', order: 0, visible: true, locked: false },
  { id: 'layer-npcs', name: 'NPCs & Aliados', color: '#a3e635', order: 1, visible: true, locked: false },
  { id: 'layer-quests', name: 'Missões & Lore', color: '#e879f9', order: 2, visible: true, locked: false },
  { id: 'layer-loot', name: 'Loot & Tesouros', color: '#f59e0b', order: 3, visible: true, locked: false },
  { id: 'layer-rolls', name: 'Rolagens Fixadas', color: '#f43f5e', order: 4, visible: true, locked: false, isRollLayer: true },
];

export const DEFAULT_SAMPLE_NOTES: NoteNode[] = [
  {
    id: 'note-tavern',
    title: 'Taverna do Dragão Bêbado',
    body: 'Ponto de encontro da campanha na cidade de Neverwinter. O taverneiro é [[Gundren Rockseeker]]. O local esconde uma passagem subterrânea para [[Mina Oculta]].\n\n- [x] Contratar guarda-costas\n- [ ] Investigar adega',
    tags: ['taverna', 'neverwinter'],
    layerId: 'layer-locations',
    color: '#38bdf8',
    x: 0,
    y: 0,
    pinned: true,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: 'note-gundren',
    title: 'Gundren Rockseeker',
    body: 'Anão minerador e antigo parceiro de negócios. Frequenta a [[Taverna do Dragão Bêbado]] e precisa de escolta até a [[Mina Oculta]]. Prometeu 50 moedas de ouro.',
    tags: ['npc', 'anão', 'contratante'],
    layerId: 'layer-npcs',
    color: '#a3e635',
    x: 240,
    y: -140,
    pinned: false,
    createdAt: Date.now() - 50000000,
    updatedAt: Date.now() - 50000000,
  },
  {
    id: 'note-mine',
    title: 'Mina Oculta',
    body: 'Local lendário esquecido repleto de minérios encantados. [[Gundren Rockseeker]] encontrou o mapa antigo.\n\nPerigos conhecidos:\n- Goblins emboscadores\n- Magia instável',
    tags: ['dungeon', 'missão'],
    layerId: 'layer-quests',
    color: '#e879f9',
    x: 280,
    y: 150,
    pinned: false,
    createdAt: Date.now() - 30000000,
    updatedAt: Date.now() - 30000000,
  },
];

export const DEFAULT_SAMPLE_LINKS: NoteLink[] = [
  { id: 'link-tavern-gundren', fromId: 'note-tavern', toId: 'note-gundren', label: 'proprietário', type: 'link' },
  { id: 'link-tavern-mine', fromId: 'note-tavern', toId: 'note-mine', label: 'passagem secreta', type: 'link' },
  { id: 'link-gundren-mine', fromId: 'note-gundren', toId: 'note-mine', label: 'guia para', type: 'link' },
];

export const DEFAULT_VIEW_STATE: MapViewState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  mode: 'free',
  snapToGrid: false,
  showMinimap: true,
  focusHops: 1,
};

export async function getDB(): Promise<IDBPDatabase<RollDeckDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<RollDeckDBSchema>(DB_NAME, CURRENT_SCHEMA_VERSION, {
      upgrade(db, oldVersion) {
        // Version 1 setup
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('dice')) {
            db.createObjectStore('dice', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('packages')) {
            const pkgStore = db.createObjectStore('packages', { keyPath: 'id' });
            pkgStore.createIndex('by-order', 'order');
          }
          if (!db.objectStoreNames.contains('categories')) {
            db.createObjectStore('categories', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('history')) {
            const histStore = db.createObjectStore('history', { keyPath: 'id' });
            histStore.createIndex('by-timestamp', 'timestamp');
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings');
          }
        }

        // Version 2: Map & Notes stores
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('notes')) {
            const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
            noteStore.createIndex('by-layerId', 'layerId');
            noteStore.createIndex('by-updatedAt', 'updatedAt');
            noteStore.createIndex('by-title', 'title');
          }
          if (!db.objectStoreNames.contains('links')) {
            const linkStore = db.createObjectStore('links', { keyPath: 'id' });
            linkStore.createIndex('by-fromId', 'fromId');
            linkStore.createIndex('by-toId', 'toId');
          }
          if (!db.objectStoreNames.contains('layers')) {
            db.createObjectStore('layers', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('frames')) {
            db.createObjectStore('frames', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('attachments')) {
            const attStore = db.createObjectStore('attachments', { keyPath: 'id' });
            attStore.createIndex('by-noteId', 'noteId');
          }
          if (!db.objectStoreNames.contains('viewState')) {
            db.createObjectStore('viewState');
          }
        }

        // Version 3: Loot Generators, Groups, AI Settings & Table Objects
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('lootGenerators')) {
            db.createObjectStore('lootGenerators', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('lootGroups')) {
            const groupStore = db.createObjectStore('lootGroups', { keyPath: 'id' });
            groupStore.createIndex('by-generatorId', 'generatorId');
            groupStore.createIndex('by-createdAt', 'createdAt');
          }
          if (!db.objectStoreNames.contains('aiSettings')) {
            db.createObjectStore('aiSettings');
          }
          if (!db.objectStoreNames.contains('tableObjects')) {
            db.createObjectStore('tableObjects', { keyPath: 'id' });
          }
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Initializes database and seeds default presets, custom dice, layers, sample notes and loot templates
 */
export async function initStorage(): Promise<{
  dice: DieDefinition[];
  packages: Package[];
  categories: Category[];
  history: RollResult[];
  settings: AppSettings;
  notes: NoteNode[];
  links: NoteLink[];
  layers: NoteLayer[];
  frames: MapFrame[];
  viewState: MapViewState;
  generators: LootGenerator[];
  lootGroups: LootGroup[];
  tableObjects: CanvasTableObject[];
  aiSettings: AISettings;
}> {
  try {
    const db = await getDB();

    // Check categories
    let categories = await db.getAll('categories');
    if (categories.length === 0) {
      const tx = db.transaction('categories', 'readwrite');
      for (const cat of DEFAULT_CATEGORIES) await tx.store.put(cat);
      await tx.done;
      categories = DEFAULT_CATEGORIES;
    }

    // Check custom dice
    let dice = await db.getAll('dice');
    if (dice.length === 0) {
      const tx = db.transaction('dice', 'readwrite');
      for (const d of DEFAULT_CUSTOM_DICE) await tx.store.put(d);
      await tx.done;
      dice = DEFAULT_CUSTOM_DICE;
    }

    // Check packages
    let packages = await db.getAllFromIndex('packages', 'by-order');
    if (packages.length === 0) {
      const tx = db.transaction('packages', 'readwrite');
      for (const p of DEFAULT_PACKAGES) await tx.store.put(p);
      await tx.done;
      packages = DEFAULT_PACKAGES;
    }

    // History
    let history = await db.getAllFromIndex('history', 'by-timestamp');
    history.sort((a, b) => b.timestamp - a.timestamp);

    // Settings
    let settings = await db.get('settings', 'app_config');
    if (!settings) {
      settings = DEFAULT_SETTINGS;
      await db.put('settings', settings, 'app_config');
    } else if (settings.schemaVersion < CURRENT_SCHEMA_VERSION) {
      settings = { ...settings, schemaVersion: CURRENT_SCHEMA_VERSION };
      await db.put('settings', settings, 'app_config');
    }

    // Layers
    let layers = await db.getAll('layers');
    if (layers.length === 0) {
      const tx = db.transaction('layers', 'readwrite');
      for (const l of DEFAULT_LAYERS) await tx.store.put(l);
      await tx.done;
      layers = DEFAULT_LAYERS;
    }

    // Notes
    let notes = await db.getAll('notes');
    let links = await db.getAll('links');
    if (notes.length === 0) {
      const tx = db.transaction(['notes', 'links'], 'readwrite');
      for (const n of DEFAULT_SAMPLE_NOTES) await tx.objectStore('notes').put(n);
      for (const l of DEFAULT_SAMPLE_LINKS) await tx.objectStore('links').put(l);
      await tx.done;
      notes = DEFAULT_SAMPLE_NOTES;
      links = DEFAULT_SAMPLE_LINKS;
    }

    // Frames
    const frames = await db.getAll('frames');

    // ViewState
    let viewState = await db.get('viewState', 'map_view');
    if (!viewState) {
      viewState = DEFAULT_VIEW_STATE;
      await db.put('viewState', viewState, 'map_view');
    }

    // Loot Generators
    let generators = await db.getAll('lootGenerators');
    if (generators.length === 0) {
      const tx = db.transaction('lootGenerators', 'readwrite');
      for (const gen of DEFAULT_LOOT_GENERATOR_TEMPLATES) {
        await tx.store.put(gen);
      }
      await tx.done;
      generators = DEFAULT_LOOT_GENERATOR_TEMPLATES;
    }

    // Loot Groups
    let lootGroups = await db.getAllFromIndex('lootGroups', 'by-createdAt');
    lootGroups.sort((a, b) => b.createdAt - a.createdAt);

    // Table Objects
    let tableObjects = await db.getAll('tableObjects');

    // AI Settings
    let aiSettings = await db.get('aiSettings', 'current_ai_config');
    if (!aiSettings) {
      aiSettings = DEFAULT_AI_SETTINGS;
      await db.put('aiSettings', aiSettings, 'current_ai_config');
    }

    requestPersistence();

    return {
      dice,
      packages,
      categories,
      history,
      settings,
      notes,
      links,
      layers,
      frames,
      viewState,
      generators,
      lootGroups,
      tableObjects,
      aiSettings,
    };
  } catch (err) {
    console.warn('Erro ao inicializar IndexedDB:', err);
    return {
      dice: DEFAULT_CUSTOM_DICE,
      packages: DEFAULT_PACKAGES,
      categories: DEFAULT_CATEGORIES,
      history: [],
      settings: DEFAULT_SETTINGS,
      notes: DEFAULT_SAMPLE_NOTES,
      links: DEFAULT_SAMPLE_LINKS,
      layers: DEFAULT_LAYERS,
      frames: [],
      viewState: DEFAULT_VIEW_STATE,
      generators: DEFAULT_LOOT_GENERATOR_TEMPLATES,
      lootGroups: [],
      tableObjects: [],
      aiSettings: DEFAULT_AI_SETTINGS,
    };
  }
}

export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) return await navigator.storage.persist();
      return isPersisted;
    } catch {
      return false;
    }
  }
  return false;
}

export async function isPersistenceGranted(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}

// ----------------- CRUD Operations -----------------

export async function saveDie(die: DieDefinition): Promise<void> {
  const db = await getDB();
  await db.put('dice', die);
}

export async function deleteDie(dieId: string): Promise<void> {
  const db = await getDB();
  await db.delete('dice', dieId);
}

export async function savePackage(pkg: Package): Promise<void> {
  const db = await getDB();
  await db.put('packages', pkg);
}

export async function savePackages(pkgs: Package[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('packages', 'readwrite');
  for (const pkg of pkgs) await tx.store.put(pkg);
  await tx.done;
}

export async function deletePackage(pkgId: string): Promise<void> {
  const db = await getDB();
  await db.delete('packages', pkgId);
}

export async function saveCategory(cat: Category): Promise<void> {
  const db = await getDB();
  await db.put('categories', cat);
}

export async function deleteCategory(catId: string): Promise<void> {
  const db = await getDB();
  await db.delete('categories', catId);
}

export async function saveHistoryItem(item: RollResult, limit = 200): Promise<void> {
  const db = await getDB();
  await db.put('history', item);

  const allHistory = await db.getAllFromIndex('history', 'by-timestamp');
  if (allHistory.length > limit) {
    allHistory.sort((a, b) => b.timestamp - a.timestamp);
    const toPrune = allHistory.slice(limit).filter((item) => !item.isPinned);
    if (toPrune.length > 0) {
      const tx = db.transaction('history', 'readwrite');
      for (const p of toPrune) await tx.store.delete(p.id);
      await tx.done;
    }
  }
}

export async function updateHistoryItem(item: RollResult): Promise<void> {
  const db = await getDB();
  await db.put('history', item);
}

export async function clearHistory(): Promise<void> {
  const db = await getDB();
  await db.clear('history');
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('history', id);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings, 'app_config');
}

// ----------------- NOTES & MAP DB OPERATIONS -----------------

export async function saveNote(note: NoteNode): Promise<void> {
  const db = await getDB();
  await db.put('notes', note);
}

export async function saveNotes(notes: NoteNode[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('notes', 'readwrite');
  for (const n of notes) await tx.store.put(n);
  await tx.done;
}

export async function deleteNote(noteId: string, removeLinks = true): Promise<void> {
  const db = await getDB();
  await db.delete('notes', noteId);
  if (removeLinks) {
    const allLinks = await db.getAll('links');
    const toDelete = allLinks.filter((l) => l.fromId === noteId || l.toId === noteId);
    if (toDelete.length > 0) {
      const tx = db.transaction('links', 'readwrite');
      for (const l of toDelete) await tx.store.delete(l.id);
      await tx.done;
    }
  }
}

export async function saveLink(link: NoteLink): Promise<void> {
  const db = await getDB();
  await db.put('links', link);
}

export async function saveLinks(links: NoteLink[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('links', 'readwrite');
  for (const l of links) await tx.store.put(l);
  await tx.done;
}

export async function deleteLink(linkId: string): Promise<void> {
  const db = await getDB();
  await db.delete('links', linkId);
}

export async function saveLayer(layer: NoteLayer): Promise<void> {
  const db = await getDB();
  await db.put('layers', layer);
}

export async function saveLayers(layers: NoteLayer[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('layers', 'readwrite');
  for (const l of layers) await tx.store.put(l);
  await tx.done;
}

export async function deleteLayer(layerId: string): Promise<void> {
  const db = await getDB();
  await db.delete('layers', layerId);
}

export async function saveFrame(frame: MapFrame): Promise<void> {
  const db = await getDB();
  await db.put('frames', frame);
}

export async function deleteFrame(frameId: string): Promise<void> {
  const db = await getDB();
  await db.delete('frames', frameId);
}

export async function saveMapViewState(state: MapViewState): Promise<void> {
  const db = await getDB();
  await db.put('viewState', state, 'map_view');
}

// ----------------- LOOT & AI DB OPERATIONS -----------------

export async function saveLootGenerator(generator: LootGenerator): Promise<void> {
  const db = await getDB();
  await db.put('lootGenerators', generator);
}

export async function saveLootGenerators(generators: LootGenerator[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('lootGenerators', 'readwrite');
  for (const gen of generators) await tx.store.put(gen);
  await tx.done;
}

export async function deleteLootGenerator(generatorId: string): Promise<void> {
  const db = await getDB();
  await db.delete('lootGenerators', generatorId);
}

export async function saveLootGroup(group: LootGroup, maxHistory = 50): Promise<void> {
  const db = await getDB();
  await db.put('lootGroups', group);

  // Limit generator history to maxHistory
  const allGroups = await db.getAllFromIndex('lootGroups', 'by-generatorId', group.generatorId);
  if (allGroups.length > maxHistory) {
    allGroups.sort((a, b) => b.createdAt - a.createdAt);
    const toPrune = allGroups.slice(maxHistory);
    const tx = db.transaction('lootGroups', 'readwrite');
    for (const g of toPrune) await tx.store.delete(g.id);
    await tx.done;
  }
}

export async function deleteLootGroup(groupId: string): Promise<void> {
  const db = await getDB();
  await db.delete('lootGroups', groupId);
}

export async function saveAISettings(settings: AISettings): Promise<void> {
  const db = await getDB();
  await db.put('aiSettings', settings, 'current_ai_config');
}

export async function saveTableObject(table: CanvasTableObject): Promise<void> {
  const db = await getDB();
  await db.put('tableObjects', table);
}

export async function deleteTableObject(tableId: string): Promise<void> {
  const db = await getDB();
  await db.delete('tableObjects', tableId);
}

export async function clearAllDatabaseData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    [
      'dice',
      'packages',
      'categories',
      'history',
      'settings',
      'notes',
      'links',
      'layers',
      'frames',
      'attachments',
      'viewState',
      'lootGenerators',
      'lootGroups',
      'tableObjects',
      'aiSettings',
    ],
    'readwrite'
  );
  await tx.objectStore('dice').clear();
  await tx.objectStore('packages').clear();
  await tx.objectStore('categories').clear();
  await tx.objectStore('history').clear();
  await tx.objectStore('settings').clear();
  await tx.objectStore('notes').clear();
  await tx.objectStore('links').clear();
  await tx.objectStore('layers').clear();
  await tx.objectStore('frames').clear();
  await tx.objectStore('attachments').clear();
  await tx.objectStore('viewState').clear();
  await tx.objectStore('lootGenerators').clear();
  await tx.objectStore('lootGroups').clear();
  await tx.objectStore('tableObjects').clear();
  await tx.objectStore('aiSettings').clear();
  await tx.done;
}

// ----------------- Backup & Schema Validation with Zod -----------------

export const BackupSchema = z.object({
  app: z.literal('RollDeck'),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  dice: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sides: z.number().int().min(2),
      isCustomFaces: z.boolean().optional(),
      customFaces: z.array(z.string()).optional(),
      color: z.string(),
      symbol: z.string().optional(),
      isStandard: z.boolean().optional(),
    })
  ),
  packages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      color: z.string(),
      icon: z.string(),
      categoryId: z.string(),
      groups: z.array(
        z.object({
          id: z.string(),
          count: z.number().int().min(1),
          dieId: z.string(),
          modifier: z.number().default(0),
          label: z.string().optional(),
          advantage: z.enum(['none', 'advantage', 'disadvantage']).optional(),
          keepRule: z.enum(['all', 'keep-highest', 'keep-lowest']).optional(),
          keepCount: z.number().optional(),
          rerollOnes: z.boolean().optional(),
        })
      ),
      globalModifier: z.number().default(0),
      isFavorite: z.boolean().default(false),
      order: z.number().default(0),
    })
  ),
  categories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      icon: z.string(),
      color: z.string(),
    })
  ),
  history: z.array(z.any()).optional().default([]),
  settings: z
    .object({
      soundEnabled: z.boolean().default(true),
      hapticsEnabled: z.boolean().default(true),
      reduceMotion: z.boolean().default(false),
      diceRoll3DEnabled: z.boolean().default(true),
      historyLimit: z.number().default(200),
      schemaVersion: z.number().default(CURRENT_SCHEMA_VERSION),
      themeId: z.string().default('cyberpunk'),
    })
    .optional()
    .default(DEFAULT_SETTINGS as any),
  notes: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        body: z.string(),
        tags: z.array(z.string()).default([]),
        layerId: z.string(),
        color: z.string().optional(),
        x: z.number().default(0),
        y: z.number().default(0),
        pinned: z.boolean().default(false),
        shape: z.enum(['circle', 'hexagon', 'card']).optional(),
        createdAt: z.number(),
        updatedAt: z.number(),
        rollRefId: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  links: z
    .array(
      z.object({
        id: z.string(),
        fromId: z.string(),
        toId: z.string(),
        label: z.string().optional(),
        type: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  layers: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        color: z.string(),
        order: z.number().default(0),
        visible: z.boolean().default(true),
        locked: z.boolean().default(false),
        isRollLayer: z.boolean().optional(),
      })
    )
    .optional()
    .default([]),
  frames: z.array(z.any()).optional().default([]),
  attachments: z.array(z.any()).optional().default([]),
  viewState: z.any().optional(),
  generators: z.array(z.any()).optional().default([]),
  lootGroups: z.array(z.any()).optional().default([]),
  tableObjects: z.array(z.any()).optional().default([]),
  aiSettings: z.any().optional(),
});

export type ValidatedBackup = z.infer<typeof BackupSchema>;

export async function exportBackupJSON(includeApiKeys = false): Promise<string> {
  const db = await getDB();
  const dice = await db.getAll('dice');
  const packages = await db.getAll('packages');
  const categories = await db.getAll('categories');
  const history = await db.getAll('history');
  let settings = await db.get('settings', 'app_config');
  if (!settings) settings = DEFAULT_SETTINGS;

  const notes = await db.getAll('notes');
  const links = await db.getAll('links');
  const layers = await db.getAll('layers');
  const frames = await db.getAll('frames');
  const attachments = await db.getAll('attachments');
  const viewState = await db.get('viewState', 'map_view');

  const generators = await db.getAll('lootGenerators');
  const lootGroups = await db.getAll('lootGroups');
  const tableObjects = await db.getAll('tableObjects');
  let rawAiSettings = await db.get('aiSettings', 'current_ai_config');

  let sanitizedAiSettings = rawAiSettings ? { ...rawAiSettings } : undefined;
  if (sanitizedAiSettings && !includeApiKeys) {
    delete sanitizedAiSettings.apiKey;
  }

  const data: BackupData = {
    app: 'RollDeck',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    dice,
    packages,
    categories,
    history,
    settings,
    notes,
    links,
    layers,
    frames,
    attachments,
    viewState: viewState || DEFAULT_VIEW_STATE,
    generators,
    lootGroups,
    tableObjects,
    aiSettings: sanitizedAiSettings,
  };

  return JSON.stringify(data, null, 2);
}

export async function importBackupJSON(
  jsonText: string,
  mode: 'replace' | 'merge'
): Promise<{
  success: boolean;
  error?: string;
  summary?: {
    dice: number;
    packages: number;
    categories: number;
    history: number;
    notes: number;
    links: number;
    layers: number;
    generators: number;
    lootGroups: number;
  };
}> {
  try {
    const rawParsed = JSON.parse(jsonText);
    const parsed = BackupSchema.safeParse(rawParsed);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: `Arquivo inválido ou corrompido: ${issue ? `${issue.path.join('.')}: ${issue.message}` : 'Formato incorreto'}`,
      };
    }

    const data = parsed.data;
    const db = await getDB();

    if (mode === 'replace') {
      await clearAllDatabaseData();

      const txDice = db.transaction('dice', 'readwrite');
      for (const d of data.dice) await txDice.store.put(d);
      await txDice.done;

      const txPkg = db.transaction('packages', 'readwrite');
      for (const p of data.packages) await txPkg.store.put(p);
      await txPkg.done;

      const txCat = db.transaction('categories', 'readwrite');
      for (const c of data.categories) await txCat.store.put(c);
      await txCat.done;

      const txHist = db.transaction('history', 'readwrite');
      for (const h of data.history) await txHist.store.put(h);
      await txHist.done;

      await db.put('settings', data.settings, 'app_config');

      if (data.layers && data.layers.length > 0) {
        const txLayers = db.transaction('layers', 'readwrite');
        for (const l of data.layers) await txLayers.store.put(l as NoteLayer);
        await txLayers.done;
      }

      if (data.notes && data.notes.length > 0) {
        const txNotes = db.transaction('notes', 'readwrite');
        for (const n of data.notes) await txNotes.store.put(n as NoteNode);
        await txNotes.done;
      }

      if (data.links && data.links.length > 0) {
        const txLinks = db.transaction('links', 'readwrite');
        for (const l of data.links) await txLinks.store.put(l as NoteLink);
        await txLinks.done;
      }

      if (data.generators && data.generators.length > 0) {
        const txGen = db.transaction('lootGenerators', 'readwrite');
        for (const g of data.generators) await txGen.store.put(g);
        await txGen.done;
      }

      if (data.lootGroups && data.lootGroups.length > 0) {
        const txGroups = db.transaction('lootGroups', 'readwrite');
        for (const grp of data.lootGroups) await txGroups.store.put(grp);
        await txGroups.done;
      }
    } else {
      // Merge mode
      const txDice = db.transaction('dice', 'readwrite');
      for (const d of data.dice) await txDice.store.put(d);
      await txDice.done;

      const txPkg = db.transaction('packages', 'readwrite');
      for (const p of data.packages) await txPkg.store.put(p);
      await txPkg.done;

      const txCat = db.transaction('categories', 'readwrite');
      for (const c of data.categories) await txCat.store.put(c);
      await txCat.done;

      const txHist = db.transaction('history', 'readwrite');
      for (const h of data.history) await txHist.store.put(h);
      await txHist.done;

      if (data.layers) {
        const txLayers = db.transaction('layers', 'readwrite');
        for (const l of data.layers) await txLayers.store.put(l as NoteLayer);
        await txLayers.done;
      }

      if (data.notes) {
        const txNotes = db.transaction('notes', 'readwrite');
        for (const n of data.notes) await txNotes.store.put(n as NoteNode);
        await txNotes.done;
      }

      if (data.links) {
        const txLinks = db.transaction('links', 'readwrite');
        for (const l of data.links) await txLinks.store.put(l as NoteLink);
        await txLinks.done;
      }

      if (data.generators) {
        const txGen = db.transaction('lootGenerators', 'readwrite');
        for (const g of data.generators) await txGen.store.put(g);
        await txGen.done;
      }

      if (data.lootGroups) {
        const txGroups = db.transaction('lootGroups', 'readwrite');
        for (const grp of data.lootGroups) await txGroups.store.put(grp);
        await txGroups.done;
      }
    }

    return {
      success: true,
      summary: {
        dice: data.dice.length,
        packages: data.packages.length,
        categories: data.categories.length,
        history: data.history.length,
        notes: data.notes?.length || 0,
        links: data.links?.length || 0,
        layers: data.layers?.length || 0,
        generators: data.generators?.length || 0,
        lootGroups: data.lootGroups?.length || 0,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao processar arquivo JSON' };
  }
}

/**
 * Exports all notes as a zip of Markdown (.md) files compatible with Obsidian
 */
export async function exportNotesAsMarkdownZip(): Promise<Blob> {
  const db = await getDB();
  const notes = await db.getAll('notes');
  const layers = await db.getAll('layers');
  const layersMap = new Map(layers.map((l) => [l.id, l.name]));

  const zip = new JSZip();

  for (const n of notes) {
    const layerName = layersMap.get(n.layerId) || 'Geral';
    const folder = zip.folder(layerName.replace(/[/\\?%*:|"<>]/g, '_')) || zip;

    const frontmatter = [
      '---',
      `title: "${n.title.replace(/"/g, '\\"')}"`,
      `tags: [${n.tags.map((t) => `"${t}"`).join(', ')}]`,
      `layer: "${layerName}"`,
      `pinned: ${n.pinned}`,
      `created: "${new Date(n.createdAt).toISOString()}"`,
      `updated: "${new Date(n.updatedAt).toISOString()}"`,
      '---',
      '',
    ].join('\n');

    const content = `${frontmatter}# ${n.title}\n\n${n.body}`;
    const safeFilename = `${n.title.replace(/[/\\?%*:|"<>]/g, '_') || n.id}.md`;
    folder.file(safeFilename, content);
  }

  return await zip.generateAsync({ type: 'blob' });
}
