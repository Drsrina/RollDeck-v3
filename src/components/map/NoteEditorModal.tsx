import {
  CheckSquare,
  Clock,
  Eye,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Save,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { computeBacklinks, extractWikiLinks } from '../../lib/wikiLinks';
import { useMapStore } from '../../store/useMapStore';
import type { NoteNode } from '../../types';

export const NoteEditorModal: React.FC = () => {
  const {
    isEditorOpen,
    editingNoteId,
    closeEditor,
    notes,
    links,
    layers,
    saveNoteData,
    createNoteAt,
    deleteNoteData,
  } = useMapStore();

  const note = notes.find((n) => n.id === editingNoteId);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [layerId, setLayerId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [color, setColor] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [tagList, setTagList] = useState<string[]>([]);

  // Autocomplete [[note]] state
  const [autocompleteQuery, setAutocompleteQuery] = useState<string | null>(null);
  const [autocompleteCursor, setAutocompleteCursor] = useState<{ start: number; end: number } | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body);
      setLayerId(note.layerId);
      setColor(note.color || '');
      setTagList(note.tags || []);
      setTagsInput((note.tags || []).join(', '));
      setIsPreview(false);
    }
  }, [note]);

  // Backlinks
  const backlinks = useMemo(() => {
    if (!editingNoteId) return [];
    return computeBacklinks(editingNoteId, links, notes);
  }, [editingNoteId, links, notes]);

  // Outgoing links
  const outgoingLinks = useMemo(() => {
    return extractWikiLinks(body);
  }, [body]);

  if (!isEditorOpen || !note) return null;

  // Autocomplete matching notes
  const autocompleteSuggestions = autocompleteQuery !== null
    ? notes.filter(
        (n) =>
          n.id !== note.id &&
          n.title.toLowerCase().includes(autocompleteQuery.toLowerCase())
      )
    : [];

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setBody(val);

    // Check if cursor is right after [[
    const beforeCursor = val.slice(0, cursorPos);
    const lastOpenBracket = beforeCursor.lastIndexOf('[[');
    const lastCloseBracket = beforeCursor.lastIndexOf(']]');

    if (lastOpenBracket !== -1 && lastOpenBracket > lastCloseBracket) {
      const query = beforeCursor.slice(lastOpenBracket + 2);
      // If query does not contain newlines or pipe
      if (!query.includes('\n') && !query.includes('|')) {
        setAutocompleteQuery(query);
        setAutocompleteCursor({ start: lastOpenBracket, end: cursorPos });
        return;
      }
    }
    setAutocompleteQuery(null);
    setAutocompleteCursor(null);
  };

  const handleSelectAutocomplete = (targetTitle: string) => {
    if (!autocompleteCursor || !bodyTextareaRef.current) return;
    const before = body.slice(0, autocompleteCursor.start);
    const after = body.slice(autocompleteCursor.end);
    const newBody = `${before}[[${targetTitle}]]${after}`;
    setBody(newBody);
    setAutocompleteQuery(null);
    setAutocompleteCursor(null);

    // Refocus textarea
    setTimeout(() => {
      if (bodyTextareaRef.current) {
        bodyTextareaRef.current.focus();
      }
    }, 50);
  };

  const handleCreateNoteFromAutocomplete = async (newTitle: string) => {
    const newNote = await createNoteAt(note.x + 120, note.y + 80, note.layerId, newTitle);
    handleSelectAutocomplete(newNote.title);
  };

  const handleSave = async () => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    await saveNoteData({
      ...note,
      title: title.trim() || 'Sem Título',
      body,
      layerId: layerId || layers[0]?.id || 'layer-default',
      tags,
      color: color || undefined,
    });
    closeEditor();
  };

  const handleAddImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setBody((prev) => `${prev}\n\n![${file.name}](${base64})\n`);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Render Markdown preview helper (clean simple parser)
  const renderMarkdownPreview = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-sm text-slate-200 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          if (line.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-xl font-black text-cyan-300 border-b border-white/10 pb-1 mt-2">
                {line.slice(2)}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-lg font-bold text-purple-300 mt-2">
                {line.slice(3)}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-base font-semibold text-lime-300 mt-1">
                {line.slice(4)}
              </h3>
            );
          }
          if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
            const isChecked = line.startsWith('- [x] ');
            const label = line.slice(6);
            return (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={isChecked}
                  readOnly
                  className="rounded text-cyan-500 bg-black/40 border-white/20"
                />
                <span className={isChecked ? 'line-through text-slate-400' : 'text-slate-200'}>
                  {label}
                </span>
              </div>
            );
          }
          if (line.startsWith('- ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-xs text-slate-300">
                {line.slice(2)}
              </li>
            );
          }
          if (line.startsWith('![')) {
            const match = line.match(/!\[(.*?)\]\((.*?)\)/);
            if (match) {
              return (
                <img
                  key={idx}
                  src={match[2]}
                  alt={match[1]}
                  className="max-h-48 rounded-xl object-cover my-2 border border-white/10"
                />
              );
            }
          }

          // Replace [[Links]] with colored spans
          const parts = line.split(/(\[\[.*?\]\])/g);
          return (
            <p key={idx} className="text-xs">
              {parts.map((p, pIdx) => {
                if (p.startsWith('[[') && p.endsWith(']]')) {
                  const target = p.slice(2, -2).split('|')[0];
                  return (
                    <span
                      key={pIdx}
                      className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30 inline-block my-0.5"
                    >
                      🔗 {target}
                    </span>
                  );
                }
                return p;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl md:max-w-3xl rounded-t-3xl sm:rounded-3xl glass-panel-elevated p-4 sm:p-6 max-h-[92vh] flex flex-col border border-white/20 shadow-2xl overflow-hidden pb-[calc(1.2rem+var(--safe-bottom))]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: note.color || '#22d3ee' }} />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Editor de Nota
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPreview(!isPreview)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-cyan-300 transition"
            >
              {isPreview ? <FileText className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isPreview ? 'Editar' : 'Prévia'}</span>
            </button>
            <button
              onClick={closeEditor}
              className="p-1 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form */}
        <div className="overflow-y-auto space-y-3.5 py-3 pr-1 text-xs flex-1">
          {/* Title */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Título da Nota
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da nota ou local..."
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Layer & Color */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Camada
              </label>
              <select
                value={layerId}
                onChange={(e) => setLayerId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs"
              >
                {layers.map((l) => (
                  <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Tags (separadas por vírgula)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="npc, taverna, magia..."
                className="w-full px-2.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs"
              />
            </div>
          </div>

          {/* Markdown Body or Preview */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Conteúdo Markdown (Digite [[ para linkar)
              </label>
              <button
                type="button"
                onClick={handleAddImage}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Anexar Imagem</span>
              </button>
            </div>

            {!isPreview ? (
              <>
                <textarea
                  ref={bodyTextareaRef}
                  value={body}
                  onChange={handleBodyChange}
                  rows={8}
                  placeholder="Escreva notas, lore, dicas... Digite [[ para vincular outras notas!"
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 resize-none leading-relaxed"
                />

                {/* Autocomplete Menu popup for [[links]] */}
                {autocompleteQuery !== null && (
                  <div className="absolute left-2 right-2 bottom-12 z-50 p-2 rounded-xl glass-panel-elevated border border-cyan-400 shadow-2xl max-h-44 overflow-y-auto space-y-1">
                    <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block px-1">
                      Vincular Nota com [[
                    </span>
                    {autocompleteSuggestions.map((sug) => (
                      <button
                        key={sug.id}
                        type="button"
                        onClick={() => handleSelectAutocomplete(sug.title)}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-cyan-500/20 text-xs text-white flex items-center justify-between"
                      >
                        <span className="font-semibold">{sug.title}</span>
                        <span className="text-[10px] text-slate-400">Existente</span>
                      </button>
                    ))}
                    {autocompleteQuery.trim() && !notes.some((n) => n.title.toLowerCase() === autocompleteQuery.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => handleCreateNoteFromAutocomplete(autocompleteQuery.trim())}
                        className="w-full text-left px-2 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Criar nova nota "{autocompleteQuery.trim()}"</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="p-3 rounded-xl bg-black/40 border border-white/15 min-h-[160px] max-h-60 overflow-y-auto">
                {body.trim() ? renderMarkdownPreview(body) : <span className="text-slate-500 italic">Sem conteúdo.</span>}
              </div>
            )}
          </div>

          {/* Links & Backlinks Info Cards */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Outgoing links */}
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
              <span className="text-[10px] font-bold text-cyan-300 uppercase block mb-1">
                Links de Saída ({outgoingLinks.length})
              </span>
              {outgoingLinks.length === 0 ? (
                <span className="text-[10px] text-slate-500">Nenhum [[link]] no texto.</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {outgoingLinks.map((l, idx) => (
                    <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 truncate max-w-[120px]">
                      {l.targetTitle}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Backlinks */}
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
              <span className="text-[10px] font-bold text-purple-300 uppercase block mb-1">
                Mencionada Em ({backlinks.length})
              </span>
              {backlinks.length === 0 ? (
                <span className="text-[10px] text-slate-500">Nenhuma nota menciona esta.</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {backlinks.map((bn) => (
                    <span key={bn.id} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/20 truncate max-w-[120px]">
                      {bn.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (confirm(`Excluir a nota "${note.title}"?`)) {
                deleteNoteData(note.id);
              }
            }}
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeEditor}
              className="py-2.5 px-3 rounded-xl glass-panel text-slate-300 text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-md active:scale-95 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Nota</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
