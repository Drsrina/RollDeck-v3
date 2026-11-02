import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle,
  Database,
  Download,
  Dices,
  Eye,
  FileCheck,
  FileUp,
  HardDrive,
  Info,
  Lock,
  LogOut,
  Palette,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import {
  clearAllDatabaseData,
  exportBackupJSON,
  exportNotesAsMarkdownZip,
  importBackupJSON,
  isPersistenceGranted,
  requestPersistence,
  BackupSchema,
} from '../db/indexedDB';
import { playDiceRollSound } from '../lib/audio';
import { triggerHaptic } from '../lib/haptics';
import { applyTheme, getThemePreset, THEME_PRESETS, type ThemePreset } from '../lib/theme';
import { useAppStore } from '../store/useAppStore';
import { AdminManagementPanel } from '../components/admin/AdminManagementPanel';
import { useAuthStore } from '../store/useAuthStore';
import type { DieDefinition } from '../types';

const NEON_COLORS = ['#22d3ee', '#e879f9', '#a3e635', '#f59e0b', '#8b5cf6', '#f43f5e', '#38bdf8'];

export const SettingsScreen: React.FC = () => {
  const {
    customDice,
    saveCustomDie,
    deleteCustomDie,
    settings,
    updateSettings,
    refreshFromDB,
    tray,
    addDieToTray,
    rollTray,
  } = useAppStore();

  const { logout, currentUser, userProfile } = useAuthStore();
  const currentPreset = getThemePreset(settings.themeId);
  const [persisted, setPersisted] = useState(false);
  const [persistenceChecking, setPersistenceChecking] = useState(false);
  const [activeSubtab, setActiveSubtab] = useState<'themes' | 'backup' | 'dice' | 'preferences'>('themes');
  const [demoRoll, setDemoRoll] = useState<number | null>(20);
  const [isDemoRolling, setIsDemoRolling] = useState(false);

  const handleSelectTheme = async (themeId: string) => {
    triggerHaptic('tap', settings.hapticsEnabled);
    applyTheme(themeId);
    await updateSettings({ themeId });
    const preset = getThemePreset(themeId);
    setStatusMessage(`Tema "${preset.name}" ativado com sucesso em todo o app (inclusive barra lateral)!`);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleLaunchLive3DDemo = async () => {
    triggerHaptic('roll', settings.hapticsEnabled);
    if (tray.length === 0) {
      addDieToTray('d20');
      addDieToTray('d6');
    }
    await rollTray();
  };

  const handleTestDemoRoll = () => {
    setIsDemoRolling(true);
    triggerHaptic('roll', settings.hapticsEnabled);
    if (settings.soundEnabled) playDiceRollSound(1);

    setTimeout(() => {
      const val = Math.floor(Math.random() * 20) + 1;
      setDemoRoll(val);
      setIsDemoRolling(false);
      if (val === 20) {
        triggerHaptic('crit-success', settings.hapticsEnabled);
      } else if (val === 1) {
        triggerHaptic('crit-fail', settings.hapticsEnabled);
      }
    }, 450);
  };

  // Custom Die Editor State
  const [editingDie, setEditingDie] = useState<DieDefinition | null>(null);
  const [isDieModalOpen, setIsDieModalOpen] = useState(false);
  const [customFacesInput, setCustomFacesInput] = useState('');

  // Backup & Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSummary, setImportSummary] = useState<{
    data: any;
    summary: {
      dice: number;
      packages: number;
      categories: number;
      history: number;
      notes?: number;
      links?: number;
      layers?: number;
    };
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Clear data double confirmation
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');

  useEffect(() => {
    isPersistenceGranted().then(setPersisted);
  }, []);

  const handleRequestPersistence = async () => {
    setPersistenceChecking(true);
    const granted = await requestPersistence();
    setPersisted(granted);
    setPersistenceChecking(false);
    if (granted) {
      setStatusMessage('Armazenamento persistente ativado com sucesso!');
    } else {
      setStatusMessage('O navegador não concedeu persistência total no momento.');
    }
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Export JSON save
  const handleExportBackup = async () => {
    try {
      const json = await exportBackupJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rolldeck-save-${today}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusMessage(`Backup exportado: rolldeck-save-${today}.json`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      alert(`Falha ao exportar backup: ${err.message}`);
    }
  };

  // Export Notes as Obsidian Markdown ZIP
  const handleExportMarkdownZip = async () => {
    try {
      const blob = await exportNotesAsMarkdownZip();
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rolldeck-notas-obsidian-${today}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusMessage(`Notas exportadas: rolldeck-notas-obsidian-${today}.zip`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      alert(`Falha ao exportar notas ZIP: ${err.message}`);
    }
  };

  // Select File to Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const validated = BackupSchema.safeParse(raw);

      if (!validated.success) {
        setImportError(
          `Arquivo inválido: ${validated.error.issues[0]?.message || 'Formato de save incompatível'}`
        );
        setImportSummary(null);
        return;
      }

      setImportError(null);
      setImportSummary({
        data: text,
        summary: {
          dice: validated.data.dice.length,
          packages: validated.data.packages.length,
          categories: validated.data.categories.length,
          history: validated.data.history.length,
          notes: validated.data.notes?.length || 0,
          links: validated.data.links?.length || 0,
        },
      });
    } catch {
      setImportError('Erro ao ler arquivo. Certifique-se de que é um JSON válido.');
      setImportSummary(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyImport = async (mode: 'replace' | 'merge') => {
    if (!importSummary) return;

    const res = await importBackupJSON(importSummary.data, mode);
    if (res.success) {
      await refreshFromDB();
      setImportSummary(null);
      setStatusMessage(
        mode === 'replace'
          ? 'Backup restaurado com sucesso! Todos os dados foram substituídos.'
          : 'Backup mesclado com sucesso com seus dados existentes!'
      );
      setTimeout(() => setStatusMessage(null), 4000);
    } else {
      setImportError(res.error || 'Erro ao importar backup');
    }
  };

  const handleClearAll = async () => {
    if (clearConfirmText.trim().toUpperCase() !== 'ZERAR') return;
    await clearAllDatabaseData();
    await refreshFromDB();
    setIsClearModalOpen(false);
    setClearConfirmText('');
    setStatusMessage('Todos os dados foram apagados com sucesso.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Custom Die Helpers
  const handleOpenCreateDie = () => {
    const newDie: DieDefinition = {
      id: `custom-${crypto.randomUUID()}`,
      name: 'd',
      sides: 6,
      color: '#22d3ee',
      isCustomFaces: false,
      customFaces: [],
      symbol: '',
    };
    setEditingDie(newDie);
    setCustomFacesInput('');
    setIsDieModalOpen(true);
  };

  const handleOpenEditDie = (die: DieDefinition) => {
    setEditingDie({ ...die });
    setCustomFacesInput(die.customFaces?.join(', ') || '');
    setIsDieModalOpen(true);
  };

  const handleSaveDie = async () => {
    if (!editingDie || !editingDie.name.trim()) return;

    let faces: string[] = [];
    if (editingDie.isCustomFaces) {
      faces = customFacesInput
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
      if (faces.length < 2) {
        alert('Dados com faces personalizadas devem ter pelo menos 2 faces.');
        return;
      }
    }

    const sides = editingDie.isCustomFaces ? faces.length : Math.max(2, Math.min(1000, editingDie.sides));

    await saveCustomDie({
      ...editingDie,
      name: editingDie.name.trim(),
      sides,
      customFaces: editingDie.isCustomFaces ? faces : undefined,
    });

    setIsDieModalOpen(false);
    setEditingDie(null);
  };

  return (
    <div className="flex flex-col min-h-full pb-24 lg:pb-8 w-full space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-lg md:text-xl font-black text-white tracking-wide">AJUSTES & DADOS</h1>
        <p className="text-xs text-slate-400">Personalização, persistência e backup seguro</p>
      </div>

      {/* Status banner if message present */}
      {statusMessage && (
        <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 text-xs flex items-center gap-2 animate-fade-in shadow-md">
          <CheckCircle className="w-4 h-4 text-cyan-300 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Admin Panel */}
      {userProfile?.role === 'admin' && <AdminManagementPanel />}

      {/* Subtabs navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-xl glass-panel p-1 border border-white/10">
        <button
          onClick={() => setActiveSubtab('themes')}
          className={`py-2 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
            activeSubtab === 'themes'
              ? 'text-white border shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          style={
            activeSubtab === 'themes'
              ? {
                  backgroundColor: `${currentPreset.colors.primary}25`,
                  color: currentPreset.colors.primary,
                  borderColor: `${currentPreset.colors.primary}50`,
                }
              : undefined
          }
        >
          <Palette className="w-3.5 h-3.5 shrink-0" />
          <span>Temas & Cores</span>
        </button>
        <button
          onClick={() => setActiveSubtab('backup')}
          className={`py-2 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
            activeSubtab === 'backup'
              ? 'text-white border shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          style={
            activeSubtab === 'backup'
              ? {
                  backgroundColor: `${currentPreset.colors.primary}25`,
                  color: currentPreset.colors.primary,
                  borderColor: `${currentPreset.colors.primary}50`,
                }
              : undefined
          }
        >
          <Database className="w-3.5 h-3.5 shrink-0" />
          <span>Backup & Save</span>
        </button>
        <button
          onClick={() => setActiveSubtab('dice')}
          className={`py-2 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
            activeSubtab === 'dice'
              ? 'text-white border shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          style={
            activeSubtab === 'dice'
              ? {
                  backgroundColor: `${currentPreset.colors.primary}25`,
                  color: currentPreset.colors.primary,
                  borderColor: `${currentPreset.colors.primary}50`,
                }
              : undefined
          }
        >
          <Dices className="w-3.5 h-3.5 shrink-0" />
          <span>Dados Custom ({customDice.length})</span>
        </button>
        <button
          onClick={() => setActiveSubtab('preferences')}
          className={`py-2 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
            activeSubtab === 'preferences'
              ? 'text-white border shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          style={
            activeSubtab === 'preferences'
              ? {
                  backgroundColor: `${currentPreset.colors.primary}25`,
                  color: currentPreset.colors.primary,
                  borderColor: `${currentPreset.colors.primary}50`,
                }
              : undefined
          }
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>Preferências</span>
        </button>
      </div>

      {/* SUBTAB 0: THEMES & COLOR PRESETS */}
      {activeSubtab === 'themes' && (
        <div className="space-y-4">
          {/* Active Theme Banner */}
          {(() => {
            const currentPreset = getThemePreset(settings.themeId);
            return (
              <div
                className="rounded-2xl glass-panel p-4 md:p-5 border transition-all duration-300 relative overflow-hidden"
                style={{
                  borderColor: `${currentPreset.colors.primary}50`,
                  boxShadow: `0 0 20px -5px ${currentPreset.colors.primaryGlow}`,
                }}
              >
                <div
                  className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl pointer-events-none opacity-40"
                  style={{ backgroundColor: currentPreset.colors.primary }}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg border"
                      style={{
                        backgroundColor: currentPreset.colors.bgSecondary,
                        borderColor: `${currentPreset.colors.primary}60`,
                        boxShadow: `0 0 15px ${currentPreset.colors.primaryGlow}`,
                      }}
                    >
                      {currentPreset.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm md:text-base font-black text-white tracking-wide">
                          {currentPreset.name}
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase"
                          style={{
                            backgroundColor: `${currentPreset.colors.primary}20`,
                            color: currentPreset.colors.primary,
                            borderColor: `${currentPreset.colors.primary}60`,
                          }}
                        >
                          Tema Ativo
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{currentPreset.description}</p>
                      <p
                        className="text-[11px] mt-1.5 flex items-center gap-1.5 font-semibold"
                        style={{ color: currentPreset.colors.primary }}
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Aplica-se à barra lateral esquerda, topo móvel, botões, modais e dados 3D na tela.</span>
                      </p>
                    </div>
                  </div>

                  {/* Swatches preview of active theme */}
                  <div className="flex items-center gap-2.5 bg-black/40 px-3 py-2 rounded-xl border border-white/10 shrink-0">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: currentPreset.colors.bgDark }}
                        title="Fundo Principal"
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5">Fundo</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div
                        className="w-4 h-4 rounded-full border shadow-sm"
                        style={{
                          backgroundColor: currentPreset.colors.primary,
                          borderColor: currentPreset.colors.primary,
                          boxShadow: `0 0 8px ${currentPreset.colors.primaryGlow}`,
                        }}
                        title="Neon Primário"
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5">Neon</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div
                        className="w-4 h-4 rounded-full border shadow-sm"
                        style={{
                          backgroundColor: currentPreset.colors.secondary,
                          borderColor: currentPreset.colors.secondary,
                          boxShadow: `0 0 8px ${currentPreset.colors.secondaryGlow}`,
                        }}
                        title="Neon Secundário"
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5">Secundária</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: currentPreset.colors.accent }}
                        title="Acento"
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5">Acento</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Theme Presets Gallery Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs md:text-sm font-bold text-white uppercase tracking-wider">
                  Presets de Cores Disponíveis ({THEME_PRESETS.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">1 toque para aplicar</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {THEME_PRESETS.map((preset) => {
                const isActive = (settings.themeId || 'cyberpunk') === preset.id;

                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectTheme(preset.id)}
                    className={`rounded-2xl glass-panel p-4 border transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                      isActive
                        ? 'ring-2 ring-offset-1 ring-offset-black shadow-lg scale-[1.01]'
                        : 'hover:border-white/25 hover:bg-white/5 active:scale-98'
                    }`}
                    style={{
                      borderColor: isActive ? preset.colors.primary : 'rgba(255, 255, 255, 0.1)',
                      boxShadow: isActive ? `0 0 20px -3px ${preset.colors.primaryGlow}` : undefined,
                    }}
                  >
                    {/* Top Row: Icon, Title & Badge */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl p-1.5 rounded-lg bg-white/5 border border-white/10">
                            {preset.icon}
                          </span>
                          <div>
                            <h3 className="font-bold text-sm text-white group-hover:text-cyan-200 transition-colors">
                              {preset.name}
                            </h3>
                            <span className="text-[10px] font-medium text-slate-400">
                              {preset.genre}
                            </span>
                          </div>
                        </div>

                        {isActive ? (
                          <span
                            className="text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border shadow-xs shrink-0"
                            style={{
                              backgroundColor: `${preset.colors.primary}25`,
                              color: preset.colors.primary,
                              borderColor: `${preset.colors.primary}70`,
                            }}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            Ativo
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 group-hover:text-white shrink-0">
                            Selecionar
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-300 leading-relaxed min-h-[36px]">
                        {preset.description}
                      </p>

                      {/* Swatches preview palette */}
                      <div className="flex items-center justify-between py-2 px-2.5 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[10px] text-slate-400 font-mono">Paleta:</span>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-4 h-4 rounded-full border border-white/30"
                            style={{ backgroundColor: preset.colors.bgDark }}
                            title={`Fundo: ${preset.colors.bgDark}`}
                          />
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{
                              backgroundColor: preset.colors.primary,
                              borderColor: preset.colors.primary,
                              boxShadow: `0 0 6px ${preset.colors.primaryGlow}`,
                            }}
                            title={`Primária: ${preset.colors.primary}`}
                          />
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{
                              backgroundColor: preset.colors.secondary,
                              borderColor: preset.colors.secondary,
                              boxShadow: `0 0 6px ${preset.colors.secondaryGlow}`,
                            }}
                            title={`Secundária: ${preset.colors.secondary}`}
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-white/30"
                            style={{ backgroundColor: preset.colors.accent }}
                            title={`Acento: ${preset.colors.accent}`}
                          />
                        </div>
                      </div>

                      {/* Mini Simulation Preview Box */}
                      <div
                        className="p-2.5 rounded-xl border flex items-center justify-between text-[11px]"
                        style={{
                          backgroundColor: `${preset.colors.bgSecondary}cc`,
                          borderColor: `${preset.colors.primary}30`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-lg font-black flex items-center justify-center text-xs border"
                            style={{
                              backgroundColor: `${preset.colors.primary}20`,
                              color: preset.colors.primary,
                              borderColor: `${preset.colors.primary}60`,
                              boxShadow: `0 0 8px ${preset.colors.primaryGlow}`,
                            }}
                          >
                            20
                          </div>
                          <span className="text-slate-300 font-medium">d20 Crítico</span>
                        </div>
                        <span
                          className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${preset.colors.secondary}20`,
                            color: preset.colors.secondary,
                          }}
                        >
                          +5 Vantagem
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Button */}
                    <div className="mt-3 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTheme(preset.id);
                        }}
                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          isActive
                            ? 'text-black shadow-md'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        style={{
                          backgroundColor: isActive ? preset.colors.primary : undefined,
                        }}
                      >
                        {isActive ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Tema em Uso</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Aplicar {preset.name}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Live Playground / Tester */}
          <div className="rounded-2xl glass-panel p-4 md:p-5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs md:text-sm font-bold text-white">
                  Mesa de Teste do Tema Ativo
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Verificação de contraste e brilho</span>
            </div>

            <p className="text-xs text-slate-300">
              Teste abaixo como os dados, números críticos e efeitos de neon reagem com a paleta
              selecionada no seu dispositivo.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Normal Roll Sample */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-slate-400 mb-1">Rolagem Regular</span>
                <span className="text-2xl font-black text-slate-200">14</span>
                <span className="text-[10px] text-slate-400 mt-1">1d20 + 3 = 17</span>
              </div>

              {/* Critical Success Sample */}
              <div className="p-3 rounded-xl glass-panel border border-cyan-400/40 glow-cyan flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-cyan-300 font-bold mb-1">Sucesso Crítico</span>
                <span className="text-2xl font-black text-cyan-300 text-glow-cyan">20</span>
                <span className="text-[10px] text-cyan-200 font-bold mt-1">Dano Dobrado!</span>
              </div>

              {/* Critical Failure Sample */}
              <div className="p-3 rounded-xl glass-panel border border-rose-400/40 glow-red flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-rose-300 font-bold mb-1">Falha Natural</span>
                <span className="text-2xl font-black text-rose-400 text-glow-red">1</span>
                <span className="text-[10px] text-rose-200 mt-1">Erro Crítico</span>
              </div>
            </div>

            {/* Quick Roll Demo Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={handleTestDemoRoll}
                disabled={isDemoRolling}
                className="w-full sm:w-auto py-2 px-4 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 hover:bg-cyan-500/30 text-xs font-bold transition flex items-center justify-center gap-2 active:scale-98"
              >
                <Dices className={`w-4 h-4 ${isDemoRolling ? 'animate-spin' : ''}`} />
                <span>{isDemoRolling ? 'Rolando d20...' : 'Rolar Teste de d20'}</span>
              </button>

              {demoRoll !== null && (
                <div className="text-xs text-slate-300 flex items-center gap-2">
                  <span>Resultado do teste:</span>
                  <span
                    className={`font-black text-base px-2 py-0.5 rounded-lg border ${
                      demoRoll === 20
                        ? 'border-cyan-400 text-cyan-300 glow-cyan'
                        : demoRoll === 1
                        ? 'border-rose-400 text-rose-300 glow-red'
                        : 'border-white/20 text-white bg-white/10'
                    }`}
                  >
                    {demoRoll}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {demoRoll === 20 ? '(CRÍTICO!)' : demoRoll === 1 ? '(FALHA!)' : '(Normal)'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 1: BACKUP & PERSISTENCE */}
      {activeSubtab === 'backup' && (
        <div className="space-y-4">
          {/* Storage persistence card */}
          <div className="rounded-2xl glass-panel p-4 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-400" />
                Armazenamento Offline (IndexedDB)
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  persisted
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                }`}
              >
                {persisted ? 'Persistente' : 'Padrão'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Todos os seus dados (dados, pacotes, histórico e preferências) são salvos
              localmente no seu dispositivo via IndexedDB e funcionam 100% offline.
            </p>

            {!persisted && (
              <button
                onClick={handleRequestPersistence}
                disabled={persistenceChecking}
                className="w-full py-2 px-3 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-500/30 active:scale-98 transition flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Solicitar Persistência Garantida</span>
              </button>
            )}
          </div>

          {/* Export / Import Save Section */}
          <div className="rounded-2xl glass-panel p-4 border border-white/10 space-y-3">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-purple-400" />
              Backup em Arquivo JSON
            </span>

            <p className="text-xs text-slate-400 leading-relaxed">
              Exporte seus dados para sincronizar entre celular e PC ou proteger seus combos de
              dados favoritos.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleExportBackup}
                className="py-3 px-3 rounded-xl bg-purple-600/30 text-purple-200 border border-purple-500/40 text-xs font-bold hover:bg-purple-600/40 active:scale-95 transition flex items-center justify-center gap-2 min-h-[46px]"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Save JSON</span>
              </button>

              <label className="py-3 px-3 rounded-xl bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-500/30 active:scale-95 transition flex items-center justify-center gap-2 min-h-[46px] cursor-pointer text-center">
                <FileUp className="w-4 h-4" />
                <span>Importar Save</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={handleExportMarkdownZip}
              className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold active:scale-98 transition flex items-center justify-center gap-2 mt-2"
            >
              <Archive className="w-4 h-4 text-purple-400" />
              <span>Exportar Notas em .ZIP (Obsidian Markdown)</span>
            </button>
          </div>

          {/* Import Summary Modal / Box */}
          {importSummary && (
            <div className="p-4 rounded-2xl glass-panel-elevated border border-cyan-400/50 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" />
                  Arquivo Validado (Schema Zod)
                </span>
                <button
                  onClick={() => setImportSummary(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">
                <div className="p-2 rounded-lg bg-black/40">
                  Dados: <strong className="text-white">{importSummary.summary.dice}</strong>
                </div>
                <div className="p-2 rounded-lg bg-black/40">
                  Pacotes: <strong className="text-white">{importSummary.summary.packages}</strong>
                </div>
                <div className="p-2 rounded-lg bg-black/40">
                  Categorias: <strong className="text-white">{importSummary.summary.categories}</strong>
                </div>
                <div className="p-2 rounded-lg bg-black/40">
                  Histórico: <strong className="text-white">{importSummary.summary.history}</strong>
                </div>
                <div className="p-2 rounded-lg bg-black/40">
                  Notas Mapa: <strong className="text-cyan-300">{(importSummary.summary as any).notes ?? 0}</strong>
                </div>
                <div className="p-2 rounded-lg bg-black/40">
                  Links: <strong className="text-purple-300">{(importSummary.summary as any).links ?? 0}</strong>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Escolha como deseja aplicar as informações do backup:
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleApplyImport('merge')}
                  className="py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs active:scale-95 transition"
                >
                  Mesclar Dados
                </button>
                <button
                  onClick={() => handleApplyImport('replace')}
                  className="py-2.5 px-3 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs active:scale-95 transition"
                >
                  Substituir Tudo
                </button>
              </div>
            </div>
          )}

          {importError && (
            <div className="p-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{importError}</span>
            </div>
          )}

          {/* Danger Zone: Clear Data */}
          <div className="pt-2">
            <button
              onClick={() => setIsClearModalOpen(true)}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Zerar Todos os Dados do App</span>
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 2: CUSTOM DICE */}
      {activeSubtab === 'dice' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Crie dados com 2 a 1000 faces ou símbolos e textos personalizados.
            </span>
            <button
              onClick={handleOpenCreateDie}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-500/30 transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Dado</span>
            </button>
          </div>

          {customDice.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-center space-y-2">
              <Dices className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-300">Nenhum dado customizado cadastrado.</p>
              <button
                onClick={handleOpenCreateDie}
                className="text-xs text-cyan-400 underline font-semibold"
              >
                Criar dado personalizado
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customDice.map((die) => (
                <div
                  key={die.id}
                  className="rounded-xl glass-panel p-3 border border-white/10 flex items-center justify-between gap-3"
                  style={{ borderLeftColor: die.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{die.symbol || '🎲'}</span>
                    <div>
                      <h4 className="font-bold text-sm text-white">{die.name}</h4>
                      <p className="text-[11px] text-slate-400">
                        {die.isCustomFaces
                          ? `Faces custom: [${die.customFaces?.join(', ')}]`
                          : `Numérico: 1 a ${die.sides}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditDie(die)}
                      className="p-1.5 text-slate-400 hover:text-white"
                      title="Editar dado"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir o dado customizado "${die.name}"?`)) {
                          deleteCustomDie(die.id);
                        }
                      }}
                      className="p-1.5 text-rose-400 hover:text-rose-300"
                      title="Excluir dado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: PREFERENCES */}
      {activeSubtab === 'preferences' && (
        <div className="space-y-3 text-xs">
          {/* Theme Quick Selector */}
          <div className="flex items-center justify-between p-3.5 rounded-xl glass-panel border border-white/10">
            <div>
              <span className="font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-cyan-400" />
                Tema Visual do Sistema
              </span>
              <span className="text-slate-400 text-[11px]">
                Tema atual:{' '}
                <strong className="text-cyan-300">
                  {getThemePreset(settings.themeId).name}
                </strong>{' '}
                ({getThemePreset(settings.themeId).genre})
              </span>
            </div>
            <button
              onClick={() => setActiveSubtab('themes')}
              className="py-1.5 px-3 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-xs font-bold hover:bg-cyan-500/30 transition flex items-center gap-1.5 shrink-0"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Ver 7 Temas</span>
            </button>
          </div>

          {/* Audio */}
          <div className="flex items-center justify-between p-3.5 rounded-xl glass-panel border border-white/10">
            <div>
              <span className="font-bold text-white block">Efeitos Sonoros (Sintetizados)</span>
              <span className="text-slate-400 text-[11px]">
                Som tátil de rolar dados via Web Audio API (100% offline).
              </span>
            </div>
            <button
              onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              aria-label={settings.soundEnabled ? 'Desativar som' : 'Ativar som'}
              className="w-12 h-7 rounded-full p-1 transition-colors cursor-pointer"
              style={{
                backgroundColor: settings.soundEnabled ? currentPreset.colors.primary : '#334155',
              }}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Haptics */}
          <div className="flex items-center justify-between p-3.5 rounded-xl glass-panel border border-white/10">
            <div>
              <span className="font-bold text-white block">Vibração Háptica</span>
              <span className="text-slate-400 text-[11px]">
                Vibração no toque e no pouso dos dados em dispositivos compatíveis.
              </span>
            </div>
            <button
              onClick={() => updateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
              aria-label={settings.hapticsEnabled ? 'Desativar vibração' : 'Ativar vibração'}
              className="w-12 h-7 rounded-full p-1 transition-colors cursor-pointer"
              style={{
                backgroundColor: settings.hapticsEnabled ? currentPreset.colors.primary : '#334155',
              }}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.hapticsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 3D Dice Rolling Across the Screen Toggle (User Request) */}
          <div
            className="p-3.5 rounded-xl glass-panel border space-y-2.5 transition-all duration-300"
            style={{
              borderColor: `${currentPreset.colors.primary}45`,
              boxShadow: `0 0 16px -3px ${currentPreset.colors.primaryGlow}`,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-white flex items-center gap-2">
                  <Dices className="w-4 h-4" style={{ color: currentPreset.colors.primary }} />
                  Dados 3D Rolando pela Tela
                </span>
                <span className="text-slate-400 text-[11px] block mt-0.5 leading-relaxed">
                  Lança dados poliédricos realistas com física 3D que quicam, giram em alta velocidade e colidem por toda a tela do app.
                </span>
              </div>
              <button
                onClick={() =>
                  updateSettings({
                    diceRoll3DEnabled: settings.diceRoll3DEnabled === false ? true : false,
                  })
                }
                aria-label={
                  settings.diceRoll3DEnabled !== false
                    ? 'Desativar dados 3D na tela'
                    : 'Ativar dados 3D na tela'
                }
                className="w-12 h-7 rounded-full p-1 transition-colors shrink-0 cursor-pointer"
                style={{
                  backgroundColor:
                    settings.diceRoll3DEnabled !== false
                      ? currentPreset.colors.primary
                      : '#334155',
                }}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.diceRoll3DEnabled !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Live Test Button & Status Pill */}
            <div className="pt-2 flex items-center justify-between border-t border-white/5">
              <span className="text-[11px] text-slate-400">
                {settings.diceRoll3DEnabled !== false ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    Física 3D ativa na tela
                  </span>
                ) : (
                  <span className="text-amber-300 font-medium">Modo rápido simplificado ativo</span>
                )}
              </span>

              <button
                onClick={handleLaunchLive3DDemo}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border active:scale-95 shadow-sm"
                style={{
                  backgroundColor: `${currentPreset.colors.primary}25`,
                  borderColor: `${currentPreset.colors.primary}60`,
                  color: currentPreset.colors.primary,
                }}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Testar Rolagem 3D</span>
              </button>
            </div>
          </div>

          {/* Reduce Motion */}
          <div className="flex items-center justify-between p-3.5 rounded-xl glass-panel border border-white/10">
            <div>
              <span className="font-bold text-white block">Reduzir Movimento</span>
              <span className="text-slate-400 text-[11px]">
                Desativa giros 3D intensos em prol de acessibilidade ou bateria.
              </span>
            </div>
            <button
              onClick={() => updateSettings({ reduceMotion: !settings.reduceMotion })}
              aria-label={settings.reduceMotion ? 'Desativar redução de movimento' : 'Ativar redução de movimento'}
              className="w-12 h-7 rounded-full p-1 transition-colors cursor-pointer"
              style={{
                backgroundColor: settings.reduceMotion ? currentPreset.colors.primary : '#334155',
              }}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.reduceMotion ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* History Limit */}
          <div className="p-3.5 rounded-xl glass-panel border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Limite do Histórico:</span>
              <span
                className="font-mono font-bold"
                style={{ color: currentPreset.colors.primary }}
              >
                {settings.historyLimit} itens
              </span>
            </div>
            <div className="flex gap-2">
              {[50, 100, 200, 500].map((lim) => (
                <button
                  key={lim}
                  onClick={() => updateSettings({ historyLimit: lim })}
                  className="flex-1 py-1.5 rounded-lg font-semibold transition"
                  style={
                    settings.historyLimit === lim
                      ? {
                          backgroundColor: currentPreset.colors.primary,
                          color: '#000000',
                          fontWeight: 'bold',
                        }
                      : {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: '#cbd5e1',
                        }
                  }
                >
                  {lim}
                </button>
              ))}
            </div>
          </div>

          {/* Sessão & Segurança do App */}
          <div className="p-4 rounded-xl glass-panel border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-sm">Sessão & Segurança</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Ativo
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Você está conectado como o administrador mestre do RollDeck. Ao sair, a tela de validação principal será exigida novamente na próxima entrada.
            </p>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                  <User className="w-4 h-4 text-cyan-300" />
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-white">
                    {currentUser || 'admin'}
                  </div>
                  <div className="text-[10px] text-slate-400">Privilégios de Administrador / Mestre</div>
                </div>
              </div>

              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Encerrar Sessão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIE EDITOR MODAL */}
      {isDieModalOpen && editingDie && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl glass-panel-elevated p-5 border border-white/20 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white">
                {editingDie.id.includes('custom') ? 'Personalizar Dado' : 'Editar Dado'}
              </h3>
              <button
                onClick={() => setIsDieModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Name & Emoji */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-slate-300 block mb-1">Nome do Dado</label>
                  <input
                    type="text"
                    value={editingDie.name}
                    placeholder="Ex: d3, d30, Moeda, Fate..."
                    onChange={(e) => setEditingDie({ ...editingDie, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="w-16">
                  <label className="text-slate-300 block mb-1">Símbolo</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={editingDie.symbol || ''}
                    placeholder="🪙"
                    onChange={(e) => setEditingDie({ ...editingDie, symbol: e.target.value })}
                    className="w-full text-center px-1 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-base"
                  />
                </div>
              </div>

              {/* Mode: Numeric vs Custom Faces */}
              <div className="flex rounded-lg bg-black/40 p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingDie({ ...editingDie, isCustomFaces: false })}
                  className={`flex-1 py-1.5 rounded-md font-semibold transition ${
                    !editingDie.isCustomFaces ? 'bg-cyan-500 text-black' : 'text-slate-400'
                  }`}
                >
                  Numérico (Faces 2-1000)
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDie({ ...editingDie, isCustomFaces: true })}
                  className={`flex-1 py-1.5 rounded-md font-semibold transition ${
                    editingDie.isCustomFaces ? 'bg-cyan-500 text-black' : 'text-slate-400'
                  }`}
                >
                  Faces Customizadas
                </button>
              </div>

              {/* Numerical sides */}
              {!editingDie.isCustomFaces ? (
                <div>
                  <label className="text-slate-300 block mb-1">Número de Faces (2 a 1000):</label>
                  <input
                    type="number"
                    min={2}
                    max={1000}
                    value={editingDie.sides}
                    onChange={(e) =>
                      setEditingDie({
                        ...editingDie,
                        sides: parseInt(e.target.value, 10) || 6,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-slate-300 block mb-1">
                    Faces separadas por vírgula:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: -1, 0, +1 ou Cara, Coroa"
                    value={customFacesInput}
                    onChange={(e) => setCustomFacesInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Exemplo Fate: <code className="text-cyan-300">-1, 0, +1</code>
                  </span>
                </div>
              )}

              {/* Color */}
              <div>
                <label className="text-slate-300 block mb-1">Cor Neon:</label>
                <div className="flex items-center gap-2">
                  {NEON_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setEditingDie({ ...editingDie, color: col })}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        editingDie.color === col ? 'scale-125 ring-2 ring-white shadow-md' : ''
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveDie}
                disabled={!editingDie.name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs"
              >
                Salvar Dado
              </button>
              <button
                type="button"
                onClick={() => setIsDieModalOpen(false)}
                className="py-2.5 px-3 rounded-xl glass-panel text-slate-300 text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOUBLE CONFIRMATION MODAL TO CLEAR ALL DATA */}
      {isClearModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl glass-panel-elevated p-5 border border-rose-500/50 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-white">Atenção Extrema</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta ação excluirá permanentemente todos os seus pacotes personalizados, dados customizados e histórico do IndexedDB.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block">
                Digite <strong className="text-rose-400">ZERAR</strong> para confirmar:
              </label>
              <input
                type="text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="ZERAR"
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-rose-500/40 text-rose-300 font-mono text-center text-sm uppercase focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearConfirmText.trim().toUpperCase() !== 'ZERAR'}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-30 transition"
              >
                Apagar Definitivamente
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsClearModalOpen(false);
                  setClearConfirmText('');
                }}
                className="py-2.5 px-3 rounded-xl glass-panel text-slate-300 text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
