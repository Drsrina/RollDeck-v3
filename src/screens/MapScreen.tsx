import React from 'react';
import { LayersSheet } from '../components/map/LayersSheet';
import { MapCanvas } from '../components/map/MapCanvas';
import { NoteEditorModal } from '../components/map/NoteEditorModal';
import { NotesListSheet } from '../components/map/NotesListSheet';

export const MapScreen: React.FC = () => {
  return (
    <div className="relative w-full h-[calc(100vh-4rem)] md:h-full overflow-hidden">
      <MapCanvas />
      <NoteEditorModal />
      <LayersSheet />
      <NotesListSheet />
    </div>
  );
};
