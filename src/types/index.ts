export type AdvantageType = 'none' | 'advantage' | 'disadvantage';

export type KeepRule = 'all' | 'keep-highest' | 'keep-lowest';

export interface DieDefinition {
  id: string;
  name: string;
  sides: number;
  isCustomFaces?: boolean;
  customFaces?: string[]; // E.g., ["-1", "0", "+1"] for Fate or ["Cara", "Coroa"]
  color: string;
  symbol?: string;
  isStandard?: boolean;
}

export interface SelectedDieGroup {
  dieId: string;
  count: number;
}

export interface PackageDieGroup {
  id: string;
  count: number;
  dieId: string;
  modifier: number;
  label?: string;
  advantage?: AdvantageType;
  keepRule?: KeepRule;
  keepCount?: number;
  rerollOnes?: boolean;
}

export interface Package {
  id: string;
  name: string;
  color: string;
  icon: string;
  categoryId: string;
  groups: PackageDieGroup[];
  globalModifier: number;
  isFavorite: boolean;
  order: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface SingleDieResult {
  id: string;
  value: number;
  displayValue: string;
  rawValue: number;
  isCriticalSuccess: boolean;
  isCriticalFailure: boolean;
  isDropped?: boolean;
  wasRerolled?: boolean;
  dieName: string;
  sides: number;
  color: string;
}

export interface GroupRollResult {
  groupId: string;
  label?: string;
  dieId: string;
  dieName: string;
  sides: number;
  count: number;
  modifier: number;
  dice: SingleDieResult[];
  groupSubtotal: number;
  formula: string;
}

export interface RollResult {
  id: string;
  timestamp: number;
  title: string;
  formula: string;
  groups: GroupRollResult[];
  globalModifier: number;
  total: number;
  isCriticalSuccess: boolean;
  isCriticalFailure: boolean;
  isPinned?: boolean;
  packageId?: string;
}

export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reduceMotion: boolean;
  diceRoll3DEnabled?: boolean;
  historyLimit: number;
  schemaVersion: number;
  themeId?: string;
}

// ----------------- MAP & NOTES TYPES -----------------

export type NodeShape = 'circle' | 'hexagon' | 'card';

export interface NoteNode {
  id: string;
  title: string;
  body: string;
  tags: string[];
  layerId: string;
  color?: string;
  x: number;
  y: number;
  pinned: boolean;
  shape?: NodeShape;
  createdAt: number;
  updatedAt: number;
  rollRefId?: string; // If this note represents a pinned roll or package
}

export interface NoteLink {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  type?: 'link' | 'ally' | 'enemy' | 'lore' | 'custom';
  color?: string;
}

export interface NoteLayer {
  id: string;
  name: string;
  color: string;
  order: number;
  visible: boolean;
  locked: boolean;
  isRollLayer?: boolean;
}

export interface MapFrame {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface MapAttachment {
  id: string;
  noteId: string;
  name: string;
  type: string;
  data: string; // base64 data url for easy transport & export
  createdAt: number;
}

export interface MapViewState {
  zoom: number;
  panX: number;
  panY: number;
  mode: 'free' | 'force';
  snapToGrid: boolean;
  showMinimap: boolean;
  focusNodeId?: string | null;
  focusHops: number; // 1, 2, 3
  gravityOrbit?: boolean;
}

// ----------------- LOOT GENERATION & COLUMNS TYPES -----------------

export type LootColumnType =
  | 'text_short'
  | 'text_long'
  | 'number'
  | 'currency'
  | 'single_choice'
  | 'multi_choice'
  | 'boolean'
  | 'tags'
  | 'dice_formula';

export interface CurrencyConfig {
  unit: string; // e.g. "PO", "créditos", "GP"
  conversionRate: number; // base conversion multiplier
}

export interface LootColumn {
  id: string;
  key: string;
  label: string;
  type: LootColumnType;
  instruction: string;
  required: boolean;
  enabled: boolean;
  options?: string[];
  unit?: string;
  currencyConfig?: CurrencyConfig;
  min?: number;
  max?: number;
}

export interface LootItem {
  id: string;
  isLocked?: boolean;
  cells: Record<string, any>;
  rolledValues?: Record<string, { formula: string; result: number }>;
}

export interface LootGeneratorParams {
  count: number;
  rarity: 'comum' | 'incomum' | 'raro' | 'épico' | 'lendário' | 'misto';
  minValue?: number;
  maxValue?: number;
  language: string;
  creativity: 'conservative' | 'balanced' | 'wild';
  noRepeat: boolean;
}

export type LootEngineMode = 'procedural' | 'ai';

export interface LootGenerator {
  id: string;
  name: string;
  icon: string;
  color: string;
  theme: string;
  instructions?: string;
  engineMode?: LootEngineMode;
  params: LootGeneratorParams;
  columns: LootColumn[];
  createdAt: number;
  updatedAt: number;
}

export interface LootGroupTotals {
  totalValueText: string;
  totalWeightText?: string;
  itemCount: number;
}

export interface LootGroup {
  id: string;
  generatorId: string;
  title: string;
  theme: string;
  columnsSnapshot: LootColumn[];
  items: LootItem[];
  totals: LootGroupTotals;
  createdAt: number;
  linkedNoteIds: string[];
  linkedTableObjectId?: string;
}

export interface AISettings {
  provider: 'gemini-builtin' | 'openai-compatible' | 'anthropic' | 'custom-proxy';
  model: string;
  endpoint?: string;
  apiKey?: string;
}

export interface CanvasTableObject {
  id: string;
  title: string;
  theme: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columns: LootColumn[];
  items: LootItem[];
  layerId: string;
  sourceGroupId: string;
  createdAt: number;
}

export interface BackupData {
  app: 'RollDeck';
  schemaVersion: number;
  exportedAt: string;
  dice: DieDefinition[];
  packages: Package[];
  categories: Category[];
  history: RollResult[];
  settings: AppSettings;
  notes?: NoteNode[];
  links?: NoteLink[];
  layers?: NoteLayer[];
  frames?: MapFrame[];
  attachments?: MapAttachment[];
  viewState?: Partial<MapViewState>;
  generators?: LootGenerator[];
  lootGroups?: LootGroup[];
  tableObjects?: CanvasTableObject[];
  aiSettings?: Partial<AISettings>;
}
