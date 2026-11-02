import { create } from 'zustand';
import {
  deleteLootGenerator as dbDeleteLootGenerator,
  deleteLootGroup as dbDeleteLootGroup,
  saveAISettings as dbSaveAISettings,
  saveLootGenerator as dbSaveLootGenerator,
  saveLootGenerators as dbSaveLootGenerators,
  saveLootGroup as dbSaveLootGroup,
  saveNote as dbSaveNote,
  saveTableObject as dbSaveTableObject,
  DEFAULT_AI_SETTINGS,
} from '../db/indexedDB';
import { calculateGroupTotals, generateLootWithAI, generateProceduralFallbackLoot } from '../lib/ai';
import { useMapStore } from './useMapStore';
import type { AISettings, CanvasTableObject, LootColumn, LootGenerator, LootGroup, LootItem, NoteNode } from '../types';

interface LootStoreState {
  generators: LootGenerator[];
  activeGeneratorId: string | null;
  currentGroup: LootGroup | null;
  lootGroupsHistory: LootGroup[];
  aiSettings: AISettings;

  isGenerating: boolean;
  generationError: string | null;
  generationProgress: { current: number; total: number } | null;
  abortController: AbortController | null;

  viewMode: 'cards' | 'table';
  selectedItemIds: string[];

  // Actions
  setActiveGeneratorId: (id: string | null) => void;
  setViewMode: (mode: 'cards' | 'table') => void;
  toggleSelectItem: (itemId: string) => void;
  selectAllItems: (selectAll: boolean) => void;

  saveGenerator: (generator: LootGenerator) => Promise<void>;
  duplicateGenerator: (generator: LootGenerator) => Promise<void>;
  deleteGenerator: (id: string) => Promise<void>;

  generateLoot: (
    generatorId: string,
    countOverride?: number,
    engineOverride?: 'procedural' | 'ai'
  ) => Promise<LootGroup | null>;
  cancelGeneration: () => void;

  toggleLockItem: (itemId: string) => void;
  updateItemCell: (itemId: string, key: string, value: any) => void;
  deleteItemFromCurrentGroup: (itemId: string) => void;
  rerollSingleItem: (itemId: string) => Promise<void>;

  saveGroupAsNotes: (
    groupId: string,
    mode: 'single_note' | 'items_notes',
    targetLayerId?: string
  ) => Promise<string[]>;

  saveGroupAsCanvasTable: (groupId: string, targetLayerId?: string) => Promise<string>;

  updateAISettings: (settings: Partial<AISettings>) => Promise<void>;

  loadGroupFromHistory: (groupId: string) => void;
  deleteGroupHistoryItem: (groupId: string) => Promise<void>;

  setInitialData: (data: {
    generators: LootGenerator[];
    lootGroups: LootGroup[];
    aiSettings: AISettings;
  }) => void;
}

export const useLootStore = create<LootStoreState>((set, get) => ({
  generators: [],
  activeGeneratorId: null,
  currentGroup: null,
  lootGroupsHistory: [],
  aiSettings: DEFAULT_AI_SETTINGS,

  isGenerating: false,
  generationError: null,
  generationProgress: null,
  abortController: null,

  viewMode: 'cards',
  selectedItemIds: [],

  setActiveGeneratorId: (id) => set({ activeGeneratorId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),

  toggleSelectItem: (itemId) => {
    set((state) => {
      const exists = state.selectedItemIds.includes(itemId);
      return {
        selectedItemIds: exists
          ? state.selectedItemIds.filter((id) => id !== itemId)
          : [...state.selectedItemIds, itemId],
      };
    });
  },

  selectAllItems: (selectAll) => {
    const { currentGroup } = get();
    if (!currentGroup) return;
    set({
      selectedItemIds: selectAll ? currentGroup.items.map((i) => i.id) : [],
    });
  },

  saveGenerator: async (generator) => {
    const updated = { ...generator, updatedAt: Date.now() };
    await dbSaveLootGenerator(updated);
    set((state) => {
      const exists = state.generators.some((g) => g.id === generator.id);
      return {
        generators: exists
          ? state.generators.map((g) => (g.id === generator.id ? updated : g))
          : [...state.generators, updated],
        activeGeneratorId: updated.id,
      };
    });
  },

  duplicateGenerator: async (generator) => {
    const newGen: LootGenerator = {
      ...generator,
      id: `gen-${crypto.randomUUID()}`,
      name: `${generator.name} (Cópia)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      columns: generator.columns.map((c) => ({ ...c, id: `col-${crypto.randomUUID()}` })),
    };
    await get().saveGenerator(newGen);
  },

  deleteGenerator: async (id) => {
    await dbDeleteLootGenerator(id);
    set((state) => ({
      generators: state.generators.filter((g) => g.id !== id),
      activeGeneratorId: state.activeGeneratorId === id ? state.generators[0]?.id || null : state.activeGeneratorId,
    }));
  },

  generateLoot: async (generatorId, countOverride, engineOverride) => {
    const { generators, aiSettings } = get();
    const generator = generators.find((g) => g.id === generatorId);
    if (!generator) return null;

    const controller = new AbortController();
    set({
      isGenerating: true,
      generationError: null,
      generationProgress: { current: 0, total: countOverride || generator.params.count || 6 },
      abortController: controller,
      selectedItemIds: [],
    });

    try {
      const { title, items } = await generateLootWithAI({
        generator,
        aiSettings,
        countOverride,
        engineOverride,
        abortSignal: controller.signal,
        onItemRevealed: (item, index, total) => {
          set({ generationProgress: { current: index + 1, total } });
        },
      });

      const totals = calculateGroupTotals(items, generator.columns);

      const newGroup: LootGroup = {
        id: `loot-grp-${crypto.randomUUID()}`,
        generatorId: generator.id,
        title,
        theme: generator.theme,
        columnsSnapshot: JSON.parse(JSON.stringify(generator.columns)),
        items,
        totals,
        createdAt: Date.now(),
        linkedNoteIds: [],
      };

      await dbSaveLootGroup(newGroup);

      set((state) => ({
        currentGroup: newGroup,
        lootGroupsHistory: [newGroup, ...state.lootGroupsHistory.slice(0, 49)],
        isGenerating: false,
        generationProgress: null,
        abortController: null,
      }));

      return newGroup;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('cancelada')) {
        set({ isGenerating: false, generationProgress: null, abortController: null });
        return null;
      }
      set({
        isGenerating: false,
        generationError: err.message || 'Falha ao gerar itens com IA.',
        generationProgress: null,
        abortController: null,
      });
      return null;
    }
  },

  cancelGeneration: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({ isGenerating: false, generationProgress: null, abortController: null });
  },

  toggleLockItem: (itemId) => {
    set((state) => {
      if (!state.currentGroup) return state;
      const updatedItems = state.currentGroup.items.map((item) =>
        item.id === itemId ? { ...item, isLocked: !item.isLocked } : item
      );
      const updatedGroup = { ...state.currentGroup, items: updatedItems };
      dbSaveLootGroup(updatedGroup).catch(() => {});
      return { currentGroup: updatedGroup };
    });
  },

  updateItemCell: (itemId, key, value) => {
    set((state) => {
      if (!state.currentGroup) return state;
      const updatedItems = state.currentGroup.items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            cells: { ...item.cells, [key]: value },
          };
        }
        return item;
      });
      const totals = calculateGroupTotals(updatedItems, state.currentGroup.columnsSnapshot);
      const updatedGroup = { ...state.currentGroup, items: updatedItems, totals };
      dbSaveLootGroup(updatedGroup).catch(() => {});
      return { currentGroup: updatedGroup };
    });
  },

  deleteItemFromCurrentGroup: (itemId) => {
    set((state) => {
      if (!state.currentGroup) return state;
      const updatedItems = state.currentGroup.items.filter((item) => item.id !== itemId);
      const totals = calculateGroupTotals(updatedItems, state.currentGroup.columnsSnapshot);
      const updatedGroup = { ...state.currentGroup, items: updatedItems, totals };
      dbSaveLootGroup(updatedGroup).catch(() => {});
      return {
        currentGroup: updatedGroup,
        selectedItemIds: state.selectedItemIds.filter((id) => id !== itemId),
      };
    });
  },

  rerollSingleItem: async (itemId) => {
    const { currentGroup, generators } = get();
    if (!currentGroup) return;
    const generator = generators.find((g) => g.id === currentGroup.generatorId);
    if (!generator) return;

    // Generate single replacement item
    const fallback = generateProceduralFallbackLoot(generator, 1);
    if (fallback.items.length > 0) {
      const newItem = fallback.items[0];
      set((state) => {
        if (!state.currentGroup) return state;
        const updatedItems = state.currentGroup.items.map((item) =>
          item.id === itemId ? { ...newItem, id: itemId } : item
        );
        const totals = calculateGroupTotals(updatedItems, state.currentGroup.columnsSnapshot);
        const updatedGroup = { ...state.currentGroup, items: updatedItems, totals };
        dbSaveLootGroup(updatedGroup).catch(() => {});
        return { currentGroup: updatedGroup };
      });
    }
  },

  // Save loot group into Map Notes
  saveGroupAsNotes: async (groupId, mode, targetLayerId) => {
    const { currentGroup, lootGroupsHistory } = get();
    const group = currentGroup?.id === groupId ? currentGroup : lootGroupsHistory.find((g) => g.id === groupId);
    if (!group) return [];

    const mapStore = useMapStore.getState();
    const layer = targetLayerId || mapStore.layers.find((l) => l.id === 'layer-loot')?.id || mapStore.layers[0]?.id || 'layer-default';

    const createdNoteIds: string[] = [];

    if (mode === 'single_note') {
      // Option A: Single comprehensive note with Markdown Table
      const headers = group.columnsSnapshot.filter((c) => c.enabled).map((c) => c.label);
      const headerRow = `| ${headers.join(' | ')} |`;
      const dividerRow = `| ${headers.map(() => '---').join(' | ')} |`;

      const dataRows = group.items.map((item) => {
        const rowCells = group.columnsSnapshot
          .filter((c) => c.enabled)
          .map((c) => String(item.cells[c.key] ?? '-').replace(/\n/g, ' '));
        return `| ${rowCells.join(' | ')} |`;
      });

      const body = `## ${group.title}\n\n**Tema:** ${group.theme}\n**Total:** ${group.totals.totalValueText}${group.totals.totalWeightText ? ` • **Peso:** ${group.totals.totalWeightText}` : ''}\n\n${headerRow}\n${dividerRow}\n${dataRows.join('\n')}\n\n#loot #tesouro`;

      const note = await mapStore.createNoteAt(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
        layer,
        group.title,
        body
      );
      createdNoteIds.push(note.id);
    } else {
      // Option B: Hub index note + individual notes for each item linked with [[WikiLinks]]
      const indexBody = `## Índice de Tesouro: ${group.title}\n\nItens recuperados no lote:\n\n${group.items
        .map((i) => `- [[${i.cells.name || 'Item'}]]`)
        .join('\n')}\n\n**Valor Total:** ${group.totals.totalValueText}\n\n#loot #indice`;

      const indexNote = await mapStore.createNoteAt(0, 0, layer, group.title, indexBody);
      createdNoteIds.push(indexNote.id);

      // Create individual notes in an orbital pattern around the index note
      const angleStep = (2 * Math.PI) / group.items.length;
      const radius = 220;

      for (let i = 0; i < group.items.length; i++) {
        const item = group.items[i];
        const itemTitle = String(item.cells.name || `Item ${i + 1}`);

        const itemDetails = group.columnsSnapshot
          .filter((c) => c.enabled && c.key !== 'name')
          .map((c) => `**${c.label}:** ${item.cells[c.key] ?? '-'}`)
          .join('\n\n');

        const itemBody = `${itemDetails}\n\nOrigem: [[${group.title}]]\n\n#loot #${String(item.cells.rarity || 'item').toLowerCase()}`;

        const posX = Math.round(Math.cos(i * angleStep) * radius);
        const posY = Math.round(Math.sin(i * angleStep) * radius);

        const itemNote = await mapStore.createNoteAt(posX, posY, layer, itemTitle, itemBody);
        createdNoteIds.push(itemNote.id);

        // Add visual link from index note to item note
        await mapStore.addLink(indexNote.id, itemNote.id, 'contém');
      }
    }

    // Update group's linkedNoteIds
    const updatedGroup = { ...group, linkedNoteIds: createdNoteIds };
    await dbSaveLootGroup(updatedGroup);
    set((state) => ({
      currentGroup: state.currentGroup?.id === groupId ? updatedGroup : state.currentGroup,
      lootGroupsHistory: state.lootGroupsHistory.map((g) => (g.id === groupId ? updatedGroup : g)),
    }));

    return createdNoteIds;
  },

  // Save loot group as an interactive Canvas Table object
  saveGroupAsCanvasTable: async (groupId, targetLayerId) => {
    const { currentGroup, lootGroupsHistory } = get();
    const group = currentGroup?.id === groupId ? currentGroup : lootGroupsHistory.find((g) => g.id === groupId);
    if (!group) return '';

    const mapStore = useMapStore.getState();
    const layer = targetLayerId || mapStore.layers.find((l) => l.id === 'layer-loot')?.id || mapStore.layers[0]?.id || 'layer-default';

    const tableObj: CanvasTableObject = {
      id: `table-obj-${crypto.randomUUID()}`,
      title: group.title,
      theme: group.theme,
      x: 50,
      y: 50,
      width: 440,
      height: 320,
      columns: group.columnsSnapshot,
      items: group.items,
      layerId: layer,
      sourceGroupId: group.id,
      createdAt: Date.now(),
    };

    await dbSaveTableObject(tableObj);

    // Also link in group
    const updatedGroup = { ...group, linkedTableObjectId: tableObj.id };
    await dbSaveLootGroup(updatedGroup);
    set((state) => ({
      currentGroup: state.currentGroup?.id === groupId ? updatedGroup : state.currentGroup,
    }));

    return tableObj.id;
  },

  updateAISettings: async (newSettings) => {
    const updated = { ...get().aiSettings, ...newSettings };
    await dbSaveAISettings(updated);
    set({ aiSettings: updated });
  },

  loadGroupFromHistory: (groupId) => {
    const { lootGroupsHistory } = get();
    const target = lootGroupsHistory.find((g) => g.id === groupId);
    if (target) {
      set({ currentGroup: target, selectedItemIds: [] });
    }
  },

  deleteGroupHistoryItem: async (groupId) => {
    await dbDeleteLootGroup(groupId);
    set((state) => ({
      lootGroupsHistory: state.lootGroupsHistory.filter((g) => g.id !== groupId),
      currentGroup: state.currentGroup?.id === groupId ? null : state.currentGroup,
    }));
  },

  setInitialData: (data) => {
    set({
      generators: data.generators,
      activeGeneratorId: data.generators[0]?.id || null,
      lootGroupsHistory: data.lootGroups,
      currentGroup: data.lootGroups[0] || null,
      aiSettings: data.aiSettings,
    });
  },
}));
