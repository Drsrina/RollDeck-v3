import type { NoteLink, NoteNode } from '../types';

/**
 * Regex to extract wiki links [[Page Title]] or [[Page Title|Label]]
 */
export const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export interface ExtractedWikiLink {
  raw: string;
  targetTitle: string;
  displayLabel?: string;
  index: number;
}

/**
 * Extracts all [[wiki-links]] from a Markdown string
 */
export function extractWikiLinks(text: string): ExtractedWikiLink[] {
  if (!text) return [];
  const links: ExtractedWikiLink[] = [];
  let match: RegExpExecArray | null;

  // Reset regex index
  WIKI_LINK_REGEX.lastIndex = 0;
  while ((match = WIKI_LINK_REGEX.exec(text)) !== null) {
    links.push({
      raw: match[0],
      targetTitle: match[1].trim(),
      displayLabel: match[2]?.trim(),
      index: match.index,
    });
  }

  return links;
}

/**
 * Automatically syncs note links from body markdown:
 * Finds targets in existing notes by title, returns updated NoteLink[] array
 */
export function syncLinksFromNoteBody(
  sourceNoteId: string,
  body: string,
  allNotes: NoteNode[],
  existingLinks: NoteLink[]
): NoteLink[] {
  const extracted = extractWikiLinks(body);
  const noteTitleMap = new Map<string, string>(); // lowerTitle -> noteId

  for (const n of allNotes) {
    noteTitleMap.set(n.title.trim().toLowerCase(), n.id);
  }

  // Keep manual links (type !== 'link' or from different source note)
  const otherLinks = existingLinks.filter(
    (l) => l.fromId !== sourceNoteId || l.type !== 'link'
  );

  const newLinks: NoteLink[] = [];
  const linkedTargetIds = new Set<string>();

  for (const item of extracted) {
    const targetId = noteTitleMap.get(item.targetTitle.toLowerCase());
    if (targetId && targetId !== sourceNoteId && !linkedTargetIds.has(targetId)) {
      linkedTargetIds.add(targetId);
      newLinks.push({
        id: `link-${sourceNoteId}-${targetId}`,
        fromId: sourceNoteId,
        toId: targetId,
        label: item.displayLabel,
        type: 'link',
      });
    }
  }

  return [...otherLinks, ...newLinks];
}

/**
 * Computes backlinks for each note (which notes link to this note)
 */
export function computeBacklinks(
  targetNoteId: string,
  links: NoteLink[],
  allNotes: NoteNode[]
): NoteNode[] {
  const notesMap = new Map<string, NoteNode>(allNotes.map((n) => [n.id, n]));
  const backlinkNoteIds = new Set<string>();

  for (const l of links) {
    if (l.toId === targetNoteId) {
      backlinkNoteIds.add(l.fromId);
    }
  }

  return Array.from(backlinkNoteIds)
    .map((id) => notesMap.get(id))
    .filter((n): n is NoteNode => !!n);
}

/**
 * Detects orphan notes (notes with 0 incoming and 0 outgoing links)
 */
export function detectOrphanNoteIds(notes: NoteNode[], links: NoteLink[]): Set<string> {
  const connectedIds = new Set<string>();
  for (const l of links) {
    connectedIds.add(l.fromId);
    connectedIds.add(l.toId);
  }

  const orphans = new Set<string>();
  for (const n of notes) {
    if (!connectedIds.has(n.id)) {
      orphans.add(n.id);
    }
  }
  return orphans;
}

/**
 * Replaces references to an old title with a new title across markdown text
 */
export function renameWikiLinksInText(text: string, oldTitle: string, newTitle: string): string {
  if (!text || !oldTitle || !newTitle || oldTitle === newTitle) return text;
  const escaped = oldTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\[\\[${escaped}(\\|[^\\]]+)?\\]\\]`, 'gi');
  return text.replace(regex, (match, label) => {
    return label ? `[[${newTitle}${label}]]` : `[[${newTitle}]]`;
  });
}
