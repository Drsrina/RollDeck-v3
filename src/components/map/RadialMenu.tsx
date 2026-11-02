import { Edit3, Link2, Pin, Trash2, X } from 'lucide-react';
import React from 'react';
import { useMapStore } from '../../store/useMapStore';

interface RadialMenuProps {
  onStartLink: (fromId: string) => void;
}

export const RadialMenu: React.FC<RadialMenuProps> = ({ onStartLink }) => {
  const { radialNodeId, radialPosition, setRadialMenu, notes, openEditor, togglePinNode, deleteNoteData } =
    useMapStore();

  if (!radialNodeId || !radialPosition) return null;

  const note = notes.find((n) => n.id === radialNodeId);
  if (!note) return null;

  const handleEdit = () => {
    openEditor(radialNodeId);
    setRadialMenu(null);
  };

  const handleLink = () => {
    onStartLink(radialNodeId);
    setRadialMenu(null);
  };

  const handleTogglePin = () => {
    togglePinNode(radialNodeId);
    setRadialMenu(null);
  };

  const handleDelete = () => {
    if (confirm(`Excluir a nota "${note.title}"?`)) {
      deleteNoteData(radialNodeId);
    }
    setRadialMenu(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto bg-black/40 backdrop-blur-xs flex items-center justify-center"
      onClick={() => setRadialMenu(null)}
    >
      <div
        className="absolute p-2 rounded-2xl glass-panel-elevated border border-cyan-400/50 shadow-[0_0_25px_rgba(34,211,238,0.4)] flex flex-col gap-1.5 min-w-[160px] animate-scale"
        style={{
          left: Math.max(16, Math.min(window.innerWidth - 180, radialPosition.x - 80)),
          top: Math.max(16, Math.min(window.innerHeight - 200, radialPosition.y - 60)),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-white/10 px-1">
          <span className="text-xs font-bold text-white truncate max-w-[120px]">{note.title}</span>
          <button
            onClick={() => setRadialMenu(null)}
            className="text-slate-400 hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={handleEdit}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold transition"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Editar Nota</span>
        </button>

        <button
          onClick={handleLink}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-purple-500/20 text-purple-300 text-xs font-semibold transition"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Conectar Link</span>
        </button>

        <button
          onClick={handleTogglePin}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition"
        >
          <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-current' : ''}`} />
          <span>{note.pinned ? 'Desafixar Nó' : 'Fixar Posição'}</span>
        </button>

        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition border-t border-white/5 pt-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Excluir</span>
        </button>
      </div>
    </div>
  );
};
