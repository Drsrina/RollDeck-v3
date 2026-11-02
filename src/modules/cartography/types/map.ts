/**
 * Types and Data Models for Cartógrafo
 */

export type MapMode = 'world' | 'city' | 'dungeon' | 'battlemap';

export type VisualStyleId = 'parchment' | 'watercolor' | 'atlas' | 'arcane';

export type BiomeType =
  | 'deep_ocean'
  | 'shallow_ocean'
  | 'beach'
  | 'grassland'
  | 'forest'
  | 'dense_forest'
  | 'desert'
  | 'swamp'
  | 'tundra'
  | 'snow'
  | 'mountain'
  | 'peak'
  | 'volcano'
  | 'dungeon_floor'
  | 'dungeon_wall'
  | 'stone_road'
  | 'wood_floor';

export type StampType =
  | 'mountain_single'
  | 'mountain_range'
  | 'hill'
  | 'tree_deciduous'
  | 'tree_pine'
  | 'forest_cluster'
  | 'castle'
  | 'fortress'
  | 'city_icon'
  | 'village'
  | 'tower'
  | 'ruins'
  | 'cave_entrance'
  | 'portal'
  | 'ship'
  | 'sea_serpent'
  | 'dragon'
  | 'dungeon_door'
  | 'dungeon_stairs'
  | 'dungeon_trap'
  | 'dungeon_chest'
  | 'torch';

export interface Point {
  x: number;
  y: number;
}

export interface StampItem {
  id: string;
  type: StampType;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  tint?: string;
  flipX?: boolean;
}

export interface SplinePath {
  id: string;
  type: 'river' | 'road' | 'wall' | 'border';
  points: Point[];
  width: number;
  color?: string;
  dashed?: boolean;
  roughness?: number;
}

export interface TextLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  rotation: number; // degrees
  curved?: boolean;
  curvePath?: Point[]; // optional control points for curved text
  fontSize: number;
  fontFamily: string; // 'Cinzel', 'MedievalSharp', etc.
  letterSpacing?: number;
  color?: string;
  isBanner?: boolean;
  bannerStyle?: 'ribbon' | 'stone' | 'simple';
  tracking?: number;
}

export interface MapMarker {
  id: string;
  number: number;
  x: number;
  y: number;
  title: string;
  description: string;
  isSecret: boolean; // Hide in Player mode
  icon?: string;
  category?: 'combat' | 'quest' | 'treasure' | 'npc' | 'poi';
  color?: string;
}

export interface Settlement {
  id: string;
  name: string;
  type: 'capital' | 'city' | 'town' | 'village' | 'port' | 'ruin';
  culture: 'elven' | 'dwarven' | 'human' | 'orc' | 'arcane';
  x: number;
  y: number;
  population?: number;
  description?: string;
}

export interface GridConfig {
  show: boolean;
  type: 'square' | 'hex' | 'isometric';
  size: number; // pixels per cell
  color: string;
  opacity: number;
  scaleUnit: string; // e.g. "1.5 m" or "5 ft"
  scalePerCell: number; // e.g. 5
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  type: 'terrain' | 'paths' | 'stamps' | 'text' | 'markers' | 'fog' | 'decorations' | 'images' | 'ai';
}

export interface FogCell {
  x: number;
  y: number;
}

export interface Asset {
  id: string;
  name: string;
  mime: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  anchor: { x: number; y: number }; // 0 to 1 (e.g. bottom-center: 0.5, 1)
  tags: string[];
  role: 'stamp' | 'texture' | 'background' | 'reference';
  dataUrl: string; // base64 data URL
  createdAt: number;
}

export interface ImageObjectAdjustments {
  brightness: number; // 0 to 200, default 100
  contrast: number; // 0 to 200, default 100
  hue: number; // -180 to 180, default 0
  sepia: number; // 0 to 100, default 0
  grayscale: number; // 0 to 100, default 0
  tintTheme: boolean; // blends with map visual theme
  shadow: boolean; // drop shadow
  outline: boolean; // subtle ink outline
}

export interface ImageObject {
  id: string;
  assetId: string;
  name: string;
  layerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // degrees
  opacity: number; // 0 to 1
  blendMode: 'source-over' | 'multiply' | 'overlay' | 'screen';
  isToken?: boolean; // rounded token border for battle map
  tokenShape?: 'circle' | 'square';
  isSecret?: boolean; // only visible in DM mode
  isLocked?: boolean;
  isReference?: boolean; // decalque: semi-transparent, not exported
  isAiGenerated?: boolean; // tagged for batch delete
  adjustments: ImageObjectAdjustments;
}

export interface AiProposedAction {
  id: string;
  tool: string;
  description: string;
  payload: any;
  status: 'pending' | 'approved' | 'rejected';
  previewElements?: {
    stamps?: StampItem[];
    labels?: TextLabel[];
    markers?: MapMarker[];
    paths?: SplinePath[];
    imageObjects?: ImageObject[];
  };
}

export interface MapDocument {
  id: string;
  title: string;
  mode: MapMode;
  style: VisualStyleId;
  width: number;
  height: number;
  seed: number;
  terrainData: Uint8Array; // indices to BiomeType (width x height downscaled or raster grid)
  gridResolution: number; // scale factor between terrainData and width/height (e.g. 4px per cell)
  layers: Layer[];
  stamps: StampItem[];
  paths: SplinePath[];
  labels: TextLabel[];
  markers: MapMarker[];
  settlements: Settlement[];
  imageObjects: ImageObject[];
  assets: Asset[];
  grid: GridConfig;
  showCompass: boolean;
  compassPos: Point;
  showScaleBar: boolean;
  scaleBarPos: Point;
  showBorder: boolean;
  borderStyle: 'ornate' | 'simple' | 'celtic' | 'minimal';
  fogData: Uint8Array; // 0 = revealed, 1 = fogged (low-res grid)
  fogResolution: number;
  notes: string;
  updatedAt: number;
}

export type ToolType =
  | 'select'
  | 'pan'
  | 'brush'
  | 'eraser'
  | 'stamp'
  | 'spline_river'
  | 'spline_road'
  | 'text'
  | 'marker'
  | 'fog_add'
  | 'fog_remove'
  | 'image_place'
  | 'scatter_image';

export interface ToolSettings {
  brushSize: number;
  brushOpacity: number;
  selectedBiome: BiomeType;
  selectedStamp: StampType;
  stampScale: number;
  stampRotation: number;
  pathWidth: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  curvedText: boolean;
  markerCategory: 'combat' | 'quest' | 'treasure' | 'npc' | 'poi';
  markerSecret: boolean;
  fogBrushSize: number;
  selectedAssetId: string | null;
  scatterRadius: number;
  scatterDensity: number;
  scatterRandomScale: number;
  scatterRandomRotation: boolean;
  scatterRespectBiome: boolean;
}

