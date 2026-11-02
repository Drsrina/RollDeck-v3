import { describe, expect, it } from 'vitest';
import { BackupSchema } from '../db/indexedDB';
import type { NoteLink, NoteNode } from '../types';
import {
  computeBacklinks,
  detectOrphanNoteIds,
  extractWikiLinks,
  renameWikiLinksInText,
  syncLinksFromNoteBody,
} from './wikiLinks';

describe('WikiLinks Parser & Graph Relations (src/lib/wikiLinks.ts)', () => {
  it('extractWikiLinks deve extrair todos os links [[Nota]] e [[Nota|Rótulo]]', () => {
    const text = 'Encontrar [[Gundren Rockseeker]] na [[Taverna do Dragão|Taverna]] antes de ir para [[Mina Oculta]].';
    const links = extractWikiLinks(text);

    expect(links.length).toBe(3);
    expect(links[0].targetTitle).toBe('Gundren Rockseeker');
    expect(links[0].displayLabel).toBeUndefined();

    expect(links[1].targetTitle).toBe('Taverna do Dragão');
    expect(links[1].displayLabel).toBe('Taverna');

    expect(links[2].targetTitle).toBe('Mina Oculta');
  });

  it('syncLinksFromNoteBody deve criar links internos referenciando IDs de notas existentes', () => {
    const notes: NoteNode[] = [
      {
        id: 'note-1',
        title: 'Taverna',
        body: 'Visitar [[Gundren]] e comprar provisões.',
        tags: [],
        layerId: 'layer-1',
        x: 0,
        y: 0,
        pinned: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'note-2',
        title: 'Gundren',
        body: 'NPC anão.',
        tags: [],
        layerId: 'layer-1',
        x: 100,
        y: 100,
        pinned: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    const existingLinks: NoteLink[] = [];
    const synced = syncLinksFromNoteBody('note-1', notes[0].body, notes, existingLinks);

    expect(synced.length).toBe(1);
    expect(synced[0].fromId).toBe('note-1');
    expect(synced[0].toId).toBe('note-2');
  });

  it('computeBacklinks deve identificar quais notas apontam para um nó de destino', () => {
    const notes: NoteNode[] = [
      { id: 'n1', title: 'A', body: '', tags: [], layerId: 'l1', x: 0, y: 0, pinned: false, createdAt: 1, updatedAt: 1 },
      { id: 'n2', title: 'B', body: '', tags: [], layerId: 'l1', x: 0, y: 0, pinned: false, createdAt: 1, updatedAt: 1 },
      { id: 'n3', title: 'C', body: '', tags: [], layerId: 'l1', x: 0, y: 0, pinned: false, createdAt: 1, updatedAt: 1 },
    ];

    const links: NoteLink[] = [
      { id: 'l1', fromId: 'n1', toId: 'n3' },
      { id: 'l2', fromId: 'n2', toId: 'n3' },
    ];

    const backlinksForC = computeBacklinks('n3', links, notes);
    expect(backlinksForC.length).toBe(2);
    expect(backlinksForC.map((n) => n.id)).toContain('n1');
    expect(backlinksForC.map((n) => n.id)).toContain('n2');
  });

  it('detectOrphanNoteIds deve encontrar nós sem conexões de entrada ou saída', () => {
    const notes: NoteNode[] = [
      { id: 'n1', title: 'Conectada 1', body: '', tags: [], layerId: 'l1', x: 0, y: 0, pinned: false, createdAt: 1, updatedAt: 1 },
      { id: 'n2', title: 'Conectada 2', body: '', tags: [], layerId: 'l1', x: 0, y: 0, pinned: false, createdAt: 1, updatedAt: 1 },
      { id: 'n3', title: 'Órfã', body: '', tags: [], layerId: 'l1', x: 0, y: 0, pinned: false, createdAt: 1, updatedAt: 1 },
    ];

    const links: NoteLink[] = [{ id: 'l1', fromId: 'n1', toId: 'n2' }];

    const orphans = detectOrphanNoteIds(notes, links);
    expect(orphans.has('n3')).toBe(true);
    expect(orphans.has('n1')).toBe(false);
    expect(orphans.has('n2')).toBe(false);
  });

  it('renameWikiLinksInText deve atualizar [[Títulos Antigos]] mantendo rótulos se houver', () => {
    const text = 'Ver [[Mina Antiga]] ou [[Mina Antiga|Entrada Secreta]].';
    const updated = renameWikiLinksInText(text, 'Mina Antiga', 'Mina de Phandelver');

    expect(updated).toBe('Ver [[Mina de Phandelver]] ou [[Mina de Phandelver|Entrada Secreta]].');
  });

  it('BackupSchema deve validar e migrar saves da v1 e v2 com sucesso', () => {
    // V1 save fixture (without notes, links, layers)
    const v1Data = {
      app: 'RollDeck',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      dice: [{ id: 'd6', name: 'd6', sides: 6, color: '#f59e0b' }],
      packages: [],
      categories: [],
      history: [],
      settings: {
        soundEnabled: true,
        hapticsEnabled: true,
        reduceMotion: false,
        historyLimit: 200,
        schemaVersion: 1,
      },
    };

    const parseResultV1 = BackupSchema.safeParse(v1Data);
    expect(parseResultV1.success).toBe(true);
    if (parseResultV1.success) {
      expect(parseResultV1.data.notes).toBeDefined();
      expect(Array.isArray(parseResultV1.data.notes)).toBe(true);
      expect(parseResultV1.data.links).toBeDefined();
      expect(Array.isArray(parseResultV1.data.links)).toBe(true);
    }

    // V2 save fixture with full notes and links
    const v2Data = {
      ...v1Data,
      schemaVersion: 2,
      notes: [
        {
          id: 'note-test',
          title: 'Castelo',
          body: 'Lore do castelo',
          tags: ['fortaleza'],
          layerId: 'layer-locations',
          x: 100,
          y: 200,
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      links: [{ id: 'link-1', fromId: 'note-test', toId: 'note-other' }],
      layers: [{ id: 'layer-locations', name: 'Locais', color: '#38bdf8', order: 0, visible: true, locked: false }],
    };

    const parseResultV2 = BackupSchema.safeParse(v2Data);
    expect(parseResultV2.success).toBe(true);
    if (parseResultV2.success) {
      expect(parseResultV2.data.notes.length).toBe(1);
      expect(parseResultV2.data.links.length).toBe(1);
    }
  });
});
