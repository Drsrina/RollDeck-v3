/**
 * AssetLibraryModal Component
 * Image Asset Library, Background Removal (Magic Wand / Color Key / Trim), and Composition Setup
 */

import React, { useState, useRef, useEffect } from 'react';
import { useMapStore } from '../store/mapStore';
import { Asset, ImageObject } from '../types/map';
import { fileToAsset, getAllAssets, deleteAsset, saveAsset } from '../assets/assetStore';
import { removeColorBackground, trimTransparentEdges } from '../assets/backgroundRemoval';
import {
  Upload,
  X,
  Search,
  Wand2,
  Trash2,
  Check,
  Scissors,
  Sliders,
  ShieldAlert,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Stamp,
  CircleDot,
  FileImage,
} from 'lucide-react';

interface AssetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssetLibraryModal: React.FC<AssetLibraryModalProps> = ({ isOpen, onClose }) => {
  const { doc, addAsset, addImageObject, setTool, updateToolSettings } = useMapStore();

  const [activeTab, setActiveTab] = useState<'library' | 'remove_bg'>('library');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);

  // Background Removal state
  const [bgTolerance, setBgTolerance] = useState(25);
  const [bgContiguous, setBgContiguous] = useState(true);
  const [pickedColor, setPickedColor] = useState<{ r: number; g: number; b: number }>({ r: 255, g: 255, b: 255 });
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Draw preview on canvas when remove_bg tab or previewDataUrl changes
  useEffect(() => {
    if (activeTab === 'remove_bg' && previewCanvasRef.current && previewDataUrl) {
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        };
        img.src = previewDataUrl;
      }
    }
  }, [activeTab, previewDataUrl]);

  // Load assets from storage / document
  useEffect(() => {
    if (isOpen) {
      getAllAssets().then((stored) => {
        const combined = [...(doc.assets || [])];
        stored.forEach((s) => {
          if (!combined.some((c) => c.id === s.id)) combined.push(s);
        });
        setAssets(combined);
        if (combined.length > 0 && !selectedAsset) {
          setSelectedAsset(combined[0]);
          setPreviewDataUrl(combined[0].dataUrl);
        }
      });
    }
  }, [isOpen, doc.assets]);

  // Support Ctrl+V paste directly in modal
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleUploadFiles([file]);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUploadFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    try {
      const newAssets: Asset[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const asset = await fileToAsset(file, 'stamp');
        addAsset(asset);
        newAssets.push(asset);
      }
      setAssets((prev) => [...newAssets, ...prev]);
      if (newAssets.length > 0) {
        setSelectedAsset(newAssets[0]);
        setPreviewDataUrl(newAssets[0].dataUrl);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao importar imagem');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlaceOnMap = (role: 'stamp' | 'token' | 'reference') => {
    if (!selectedAsset) return;

    const baseW = Math.min(selectedAsset.width, 140);
    const baseH = (selectedAsset.height / selectedAsset.width) * baseW;

    const newObj: ImageObject = {
      id: `img-${Date.now()}`,
      assetId: selectedAsset.id,
      name: selectedAsset.name,
      layerId: 'l-images',
      x: doc.width * 0.5,
      y: doc.height * 0.5,
      width: baseW,
      height: baseH,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: role === 'reference' ? 0.4 : 1,
      blendMode: 'source-over',
      isToken: role === 'token',
      tokenShape: 'circle',
      isReference: role === 'reference',
      adjustments: {
        brightness: 100,
        contrast: 100,
        hue: 0,
        sepia: 0,
        grayscale: 0,
        tintTheme: role !== 'reference',
        shadow: role === 'stamp',
        outline: false,
      },
    };

    addImageObject(newObj);
    setTool('select');
    onClose();
  };

  const handlePickColorFromCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const p = ctx.getImageData(x, y, 1, 1).data;
      setPickedColor({ r: p[0], g: p[1], b: p[2] });
    }
  };

  const handleApplyRemoveBg = async () => {
    if (!selectedAsset || !previewDataUrl) return;
    setIsProcessing(true);
    try {
      const removed = await removeColorBackground(previewDataUrl, {
        targetR: pickedColor.r,
        targetG: pickedColor.g,
        targetB: pickedColor.b,
        tolerance: bgTolerance,
        contiguous: bgContiguous,
      });

      const trimmed = await trimTransparentEdges(removed);
      setPreviewDataUrl(trimmed.dataUrl);

      // Create new clean asset
      const cleanedAsset: Asset = {
        ...selectedAsset,
        id: `asset-clean-${Date.now()}`,
        name: `${selectedAsset.name} (Sem Fundo)`,
        dataUrl: trimmed.dataUrl,
        width: trimmed.width,
        height: trimmed.height,
        hasAlpha: true,
      };

      await saveAsset(cleanedAsset);
      addAsset(cleanedAsset);
      setAssets((prev) => [cleanedAsset, ...prev]);
      setSelectedAsset(cleanedAsset);
      setActiveTab('library');
    } catch (err) {
      console.error(err);
      alert('Erro ao processar remoção de fundo');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredAssets = assets.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || a.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#141822] border border-[#2b3345] rounded-2xl shadow-2xl text-neutral-200 overflow-hidden flex flex-col h-[85vh] animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252a3a] flex items-center justify-between bg-[#11141c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-base text-neutral-100">
                Biblioteca de Assets & Imagens
              </h3>
              <p className="text-[11px] text-neutral-400">
                Importação com transparência, remoção de fundo e composição de tokens
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

        {/* Tab Headers */}
        <div className="flex border-b border-[#252a3a] bg-[#0f121a]">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-6 py-3 flex items-center gap-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'library'
                ? 'border-amber-500 text-amber-300 bg-[#161a26]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Biblioteca do Projeto ({assets.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('remove_bg');
              if (selectedAsset) setPreviewDataUrl(selectedAsset.dataUrl);
            }}
            disabled={!selectedAsset}
            className={`px-6 py-3 flex items-center gap-2 text-xs font-semibold border-b-2 transition-all disabled:opacity-40 ${
              activeTab === 'remove_bg'
                ? 'border-amber-500 text-amber-300 bg-[#161a26]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>Remover Fundo (Varinha Mágica & Trim)</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">
          {/* TAB 1: LIBRARY */}
          {activeTab === 'library' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Asset Grid & Controls */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                {/* Search & Upload bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar assets por nome..."
                      className="w-full bg-[#1b202e] border border-neutral-700 pl-9 pr-3 py-1.5 rounded-xl text-xs text-neutral-200 outline-none focus:border-amber-500"
                    />
                  </div>

                  <label className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md transition-all active:scale-95">
                    <Upload className="w-4 h-4" />
                    <span>Importar Imagem (PNG/JPG/SVG)</span>
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Dropzone Hint & Copyright notice */}
                <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl text-[11px] text-amber-300/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Dica: Você pode colar imagens diretamente com <strong>Ctrl+V</strong> ou arrastar arquivos. Respeite direitos autorais.</span>
                  </div>
                </div>

                {/* Assets Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {filteredAssets.map((asset) => {
                    const isSelected = selectedAsset?.id === asset.id;
                    return (
                      <div
                        key={asset.id}
                        onClick={() => {
                          setSelectedAsset(asset);
                          setPreviewDataUrl(asset.dataUrl);
                        }}
                        className={`group relative p-2 rounded-xl border flex flex-col items-center cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#293245] border-amber-500 shadow-md ring-2 ring-amber-500/30'
                            : 'bg-[#181d2a] border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="w-full aspect-square bg-[#0e1118] rounded-lg overflow-hidden flex items-center justify-center p-1.5 checkerboard-bg">
                          <img
                            src={asset.dataUrl}
                            alt={asset.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <span className="text-[11px] text-neutral-300 font-medium truncate w-full text-center mt-1.5">
                          {asset.name}
                        </span>
                        {asset.hasAlpha && (
                          <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400" title="Transparência Alfa" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Asset Preview & Placement Sidebar */}
              {selectedAsset && (
                <div className="w-72 bg-[#10131a] border-l border-[#252a3a] p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="w-full aspect-square bg-[#0a0c10] border border-neutral-800 rounded-xl p-3 flex items-center justify-center checkerboard-bg">
                      <img
                        src={selectedAsset.dataUrl}
                        alt={selectedAsset.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-neutral-100 truncate">
                        {selectedAsset.name}
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        {selectedAsset.width} x {selectedAsset.height} px • {selectedAsset.hasAlpha ? 'PNG Alfa' : 'Sem Alfa'}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => handlePlaceOnMap('stamp')}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                      >
                        <Stamp className="w-4 h-4" />
                        <span>Inserir como Carimbo</span>
                      </button>

                      <button
                        onClick={() => handlePlaceOnMap('token')}
                        className="w-full py-2 bg-[#252c3c] hover:bg-[#30394e] border border-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <CircleDot className="w-4 h-4 text-amber-400" />
                        <span>Inserir como Token (VTT)</span>
                      </button>

                      <button
                        onClick={() => handlePlaceOnMap('reference')}
                        className="w-full py-2 bg-[#1b202e] hover:bg-[#252b3a] border border-neutral-800 text-neutral-400 hover:text-neutral-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <FileImage className="w-4 h-4" />
                        <span>Decalque / Referência</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('remove_bg')}
                        className="w-full py-2 bg-sky-950/40 hover:bg-sky-900/50 border border-sky-800/60 text-sky-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Wand2 className="w-4 h-4" />
                        <span>Remover Fundo</span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      deleteAsset(selectedAsset.id);
                      setAssets((prev) => prev.filter((a) => a.id !== selectedAsset.id));
                      setSelectedAsset(null);
                    }}
                    className="flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-300 py-2 hover:bg-red-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Asset</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REMOVE BACKGROUND (MAGIC WAND & TRIM) */}
          {activeTab === 'remove_bg' && selectedAsset && (
            <div className="flex-1 flex overflow-hidden p-6 gap-6">
              {/* Interactive Preview Canvas */}
              <div className="flex-1 bg-[#0b0e14] border border-[#252a3a] rounded-2xl flex flex-col items-center justify-center p-4 relative overflow-hidden checkerboard-bg">
                <canvas
                  ref={previewCanvasRef}
                  width={selectedAsset.width}
                  height={selectedAsset.height}
                  onClick={handlePickColorFromCanvas}
                  className="max-w-full max-h-full object-contain cursor-crosshair border border-neutral-700 rounded-lg shadow-xl"
                />
                <span className="absolute bottom-3 text-[11px] text-neutral-400 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                  Clique na imagem para selecionar a cor de fundo a ser removida
                </span>
              </div>

              {/* Controls */}
              <div className="w-80 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-cinzel font-semibold text-sm text-neutral-100">
                      Varinha Mágica & Recorte
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      Substitui a cor de fundo por canal alfa transparente
                    </p>
                  </div>

                  {/* Picked color preview */}
                  <div className="p-3 bg-[#1b202e] rounded-xl border border-neutral-800 flex items-center justify-between">
                    <span className="text-xs text-neutral-300">Cor Alvo Selecionada</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md border border-neutral-600 shadow-sm"
                        style={{ backgroundColor: `rgb(${pickedColor.r}, ${pickedColor.g}, ${pickedColor.b})` }}
                      />
                      <span className="text-xs font-mono text-neutral-400">
                        #{pickedColor.r.toString(16).padStart(2, '0')}{pickedColor.g.toString(16).padStart(2, '0')}{pickedColor.b.toString(16).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-neutral-300 mb-1">
                      <span>Tolerância de Cor</span>
                      <span className="font-mono text-amber-300">{bgTolerance}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      value={bgTolerance}
                      onChange={(e) => setBgTolerance(parseInt(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="contiguous"
                      checked={bgContiguous}
                      onChange={(e) => setBgContiguous(e.target.checked)}
                      className="rounded accent-amber-500 cursor-pointer"
                    />
                    <label htmlFor="contiguous" className="text-xs text-neutral-300 cursor-pointer">
                      Apenas pixels contíguos (Varinha Mágica)
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleApplyRemoveBg}
                    disabled={isProcessing}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>{isProcessing ? 'Processando...' : 'Remover Fundo & Auto-Trim'}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('library')}
                    className="w-full py-2 bg-[#1b202e] hover:bg-[#252b3a] text-neutral-300 rounded-xl text-xs font-medium transition-colors"
                  >
                    Voltar para Biblioteca
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
