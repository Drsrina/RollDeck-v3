/**
 * ExportModal Component
 * Hi-Res PNG (up to 8K / 300 DPI), Vector SVG export, JSON project save & load, DM vs Player view.
 */

import React, { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { CartographyRenderer } from '../render/cartographyRender';
import { exportMapToSvg } from '../render/svgExport';
import { MapDocument } from '../types/map';
import {
  Download,
  X,
  FileImage,
  FileCode,
  FileJson,
  Upload,
  Check,
  Shield,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { doc, setDocument } = useMapStore();

  const [exportFormat, setExportFormat] = useState<'png' | 'svg' | 'json'>('png');
  const [resolution, setResolution] = useState<{ width: number; height: number; label: string; dpi: number }>({
    width: 2400,
    height: 1600,
    label: '2K Quad-HD (Recomendado para VTT / Roll20 / Foundry)',
    dpi: 150,
  });
  const [isPlayerExport, setIsPlayerExport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resolutionOptions = [
    { width: 1200, height: 800, label: 'Padrão (1200 x 800 - 72 DPI)', dpi: 72 },
    { width: 2400, height: 1600, label: '2K Quad-HD (2400 x 1600 - 150 DPI)', dpi: 150 },
    { width: 4800, height: 3200, label: '4K Ultra-HD (4800 x 3200 - 300 DPI para Impressão)', dpi: 300 },
    { width: 8192, height: 5461, label: '8K Máxima Resolução (8192 x 5461 - 300 DPI)', dpi: 300 },
  ];

  // Export to Hi-Res PNG
  const handleExportPng = async () => {
    setIsExporting(true);
    try {
      // Offscreen canvas at target resolution
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = resolution.width;
      exportCanvas.height = resolution.height;
      const ctx = exportCanvas.getContext('2d');

      if (!ctx) throw new Error('Não foi possível obter contexto 2D');

      // Scale document view to resolution
      const scaleX = resolution.width / doc.width;
      const scaleY = resolution.height / doc.height;

      ctx.save();
      ctx.scale(scaleX, scaleY);

      const renderer = new CartographyRenderer();
      renderer.render(ctx, doc, {
        isPlayerMode: isPlayerExport,
      });

      ctx.restore();

      // Convert to blob and trigger download
      exportCanvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const modeSuffix = isPlayerExport ? 'jogadores' : 'mestre';
            a.download = `${doc.title.toLowerCase().replace(/\s+/g, '_')}_${modeSuffix}_${resolution.width}x${resolution.height}.png`;
            a.href = url;
            a.click();
            URL.revokeObjectURL(url);
            setSuccessMessage('Mapa PNG exportado com sucesso!');
            setTimeout(() => setSuccessMessage(null), 3000);
          }
          setIsExporting(false);
        },
        'image/png',
        0.95
      );
    } catch (err) {
      console.error(err);
      setIsExporting(false);
    }
  };

  // Export to Vector SVG
  const handleExportSvg = () => {
    const svgStr = exportMapToSvg(doc, isPlayerExport);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${doc.title.toLowerCase().replace(/\s+/g, '_')}.svg`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMessage('Arquivo vetorial SVG baixado!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Save JSON Project
  const handleExportJson = () => {
    // Convert Uint8Array to regular array for serialization
    const serializable = {
      ...doc,
      terrainData: Array.from(doc.terrainData),
      fogData: Array.from(doc.fogData),
    };

    const jsonStr = JSON.stringify(serializable, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${doc.title.toLowerCase().replace(/\s+/g, '_')}_projeto.cartografo.json`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMessage('Projeto Cartógrafo JSON salvo!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Load JSON Project
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const restoredDoc: MapDocument = {
          ...parsed,
          terrainData: new Uint8Array(parsed.terrainData),
          fogData: new Uint8Array(parsed.fogData || new Uint8Array(300 * 200)),
        };
        setDocument(restoredDoc);
        setSuccessMessage('Projeto carregado com sucesso!');
        setTimeout(() => setSuccessMessage(null), 3000);
        onClose();
      } catch (err) {
        alert('Erro ao carregar arquivo de projeto JSON');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#141822] border border-[#2b3345] rounded-2xl shadow-2xl text-neutral-200 overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252a3a] flex items-center justify-between bg-[#11141c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-base text-neutral-100">
                Exportar Mapa & Projeto
              </h3>
              <p className="text-[11px] text-neutral-400">
                Imagens prontas para mesa de RPG, VTT (Roll20, Foundry) e impressão
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#202636] text-neutral-400 hover:text-neutral-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="grid grid-cols-3 border-b border-[#252a3a] bg-[#0f121a]">
          <button
            onClick={() => setExportFormat('png')}
            className={`py-3 flex items-center justify-center gap-2 text-xs font-semibold border-b-2 transition-all ${
              exportFormat === 'png'
                ? 'border-amber-500 text-amber-300 bg-[#161a26]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileImage className="w-4 h-4" />
            <span>Imagem PNG (Alta Res)</span>
          </button>

          <button
            onClick={() => setExportFormat('svg')}
            className={`py-3 flex items-center justify-center gap-2 text-xs font-semibold border-b-2 transition-all ${
              exportFormat === 'svg'
                ? 'border-amber-500 text-amber-300 bg-[#161a26]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Vetorial SVG</span>
          </button>

          <button
            onClick={() => setExportFormat('json')}
            className={`py-3 flex items-center justify-center gap-2 text-xs font-semibold border-b-2 transition-all ${
              exportFormat === 'json'
                ? 'border-amber-500 text-amber-300 bg-[#161a26]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileJson className="w-4 h-4" />
            <span>Projeto JSON</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {successMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-600/50 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* DM vs Player Mode Toggle for Image & SVG */}
          {exportFormat !== 'json' && (
            <div className="p-3.5 bg-[#1b202e] rounded-xl border border-neutral-800 space-y-2">
              <label className="text-xs font-semibold text-neutral-300 block">
                Destinatário do Mapa
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsPlayerExport(false)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    !isPlayerExport
                      ? 'bg-purple-950/50 border-purple-500 text-purple-200 shadow-sm'
                      : 'bg-[#141822] border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs mb-0.5">
                    <Eye className="w-3.5 h-3.5 text-purple-400" />
                    <span>Versão do Mestre</span>
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Inclui todos os segredos, números de POI e névoa translúcida.
                  </div>
                </button>

                <button
                  onClick={() => setIsPlayerExport(true)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    isPlayerExport
                      ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 shadow-sm'
                      : 'bg-[#141822] border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs mb-0.5">
                    <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Versão dos Jogadores</span>
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Oculta marcadores secretos e renderiza névoa de guerra opaca.
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* PNG Resolution Selector */}
          {exportFormat === 'png' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300 block">
                Resolução da Imagem
              </label>
              <div className="space-y-1.5">
                {resolutionOptions.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setResolution(opt)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      resolution.label === opt.label
                        ? 'bg-[#283144] border-amber-500 text-amber-200'
                        : 'bg-[#1b202e] border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs">{opt.label}</div>
                      <div className="text-[10px] text-neutral-400">
                        {opt.width} x {opt.height} pixels • {opt.dpi} DPI
                      </div>
                    </div>
                    {resolution.label === opt.label && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SVG Vector details */}
          {exportFormat === 'svg' && (
            <div className="text-xs text-neutral-400 leading-relaxed space-y-2">
              <p>
                Exporta um arquivo vetorial em formato SVG contendo todas as curvas de rios, estradas, rótulos de texto com fontes tipográficas e marcadores de aventura.
              </p>
              <p className="text-amber-300">
                Ideal para abrir no Adobe Illustrator, Inkscape ou para impressão vetorial em qualquer escala sem perda de qualidade.
              </p>
            </div>
          )}

          {/* JSON Project Save / Load */}
          {exportFormat === 'json' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-400">
                O arquivo de projeto contém todos os dados do mapa (camadas, biomas, semente, anotações de campanha, carimbos e splines) para que você possa continuar editando quando quiser.
              </p>

              <div className="p-4 bg-[#1b202e] rounded-xl border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-neutral-200">Importar Projeto Existente</div>
                  <div className="text-[10px] text-neutral-400">Carregar arquivo .cartografo.json</div>
                </div>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#252c3c] hover:bg-[#30394e] border border-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Escolher Arquivo</span>
                  <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#252a3a] bg-[#11141c] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-[#202636] text-neutral-300 rounded-lg text-xs font-medium transition-colors"
          >
            Fechar
          </button>

          {exportFormat === 'png' && (
            <button
              onClick={handleExportPng}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-lg shadow-amber-950/50 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Renderizando Imagem...' : 'Baixar Imagem PNG'}</span>
            </button>
          )}

          {exportFormat === 'svg' && (
            <button
              onClick={handleExportSvg}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs rounded-lg shadow-lg shadow-amber-950/50 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo SVG</span>
            </button>
          )}

          {exportFormat === 'json' && (
            <button
              onClick={handleExportJson}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs rounded-lg shadow-lg shadow-amber-950/50 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Salvar Projeto (.json)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
