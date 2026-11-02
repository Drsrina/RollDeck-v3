import React, { useState } from 'react';
import { TopBar } from '../modules/cartography/ui/TopBar';
import { LeftToolbar } from '../modules/cartography/ui/LeftToolbar';
import { CanvasView } from '../modules/cartography/ui/CanvasView';
import { RightSidebar } from '../modules/cartography/ui/RightSidebar';
import { GeneratorModal } from '../modules/cartography/ui/GeneratorModal';
import { ExportModal } from '../modules/cartography/ui/ExportModal';
import { AssetLibraryModal } from '../modules/cartography/ui/AssetLibraryModal';
import { AiChatDrawer } from '../modules/cartography/ui/AiChatDrawer';

interface BattlemapScreenProps {
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export const BattlemapScreen: React.FC<BattlemapScreenProps> = ({ isZenMode = false, onToggleZenMode }) => {
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4rem)] md:h-screen overflow-hidden bg-[#0c0e14] text-neutral-100 font-sans rounded-2xl border border-slate-800 shadow-2xl relative select-none">
      {/* Top Application Bar for Map Maker */}
      <TopBar
        onOpenGenerator={() => setIsGeneratorOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenAssets={() => setIsAssetLibraryOpen(true)}
        onOpenAi={() => setIsAiChatOpen(true)}
        isZenMode={isZenMode}
        onToggleZenMode={onToggleZenMode}
      />

      {/* Main Workspace: Left Toolbox, Center Canvas, Right Inspector */}
      <div className="flex flex-1 w-full h-full overflow-hidden relative">
        <LeftToolbar />
        <main className="flex-1 h-full relative overflow-hidden">
          <CanvasView />
        </main>
        <RightSidebar />
      </div>

      {/* Modals & Drawers */}
      <GeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
      />
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
      <AssetLibraryModal
        isOpen={isAssetLibraryOpen}
        onClose={() => setIsAssetLibraryOpen(false)}
      />
      <AiChatDrawer
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
      />
    </div>
  );
};
