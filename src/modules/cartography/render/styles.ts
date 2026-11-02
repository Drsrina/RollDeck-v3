/**
 * Visual Styles / Themes for Cartógrafo
 * Each style is a self-contained theme object: palette, stroke rules, textures, fonts, filters.
 */

import { BiomeType, VisualStyleId } from '../types/map';

export interface ThemeConfig {
  id: VisualStyleId;
  name: string;
  description: string;
  background: string;
  paperTexture: 'parchment' | 'watercolor' | 'clean' | 'arcane_nebula';
  inkColor: string;
  inkSecondary: string;
  coastColor: string;
  coastRippleCount: number;
  riverColor: string;
  roadColor: string;
  gridColor: string;
  borderColor: string;
  compassColor: string;
  fontPrimary: string;
  fontSecondary: string;
  textColor: string;
  textGlow?: string;
  biomeColors: Record<BiomeType, string>;
  fogColor: string;
}

export const VISUAL_THEMES: Record<VisualStyleId, ThemeConfig> = {
  parchment: {
    id: 'parchment',
    name: 'Pergaminho Antigo',
    description: 'Estilo manuscrito medieval clássico com tinta sépia e textura envelhecida.',
    background: '#f2e8d5',
    paperTexture: 'parchment',
    inkColor: '#3a2618',
    inkSecondary: '#6e4c34',
    coastColor: '#7a9693',
    coastRippleCount: 3,
    riverColor: '#5c7882',
    roadColor: '#8a6240',
    gridColor: 'rgba(78, 52, 33, 0.16)',
    borderColor: '#3a2618',
    compassColor: '#3a2618',
    fontPrimary: 'Cinzel, serif',
    fontSecondary: 'IM Fell English SC, serif',
    textColor: '#2a1a0f',
    fogColor: 'rgba(38, 26, 18, 0.88)',
    biomeColors: {
      deep_ocean: '#b8c9c7',
      shallow_ocean: '#cddbd8',
      beach: '#ebdcb9',
      grassland: '#d8dec3',
      forest: '#a8b693',
      dense_forest: '#889873',
      desert: '#e8cd9b',
      swamp: '#a6b092',
      tundra: '#d2dad4',
      snow: '#f6f7f2',
      mountain: '#c4b5a0',
      peak: '#ded6cb',
      volcano: '#b88c7d',
      dungeon_floor: '#dfd7c5',
      dungeon_wall: '#4a382a',
      stone_road: '#9f9282',
      wood_floor: '#c8a97e',
    },
  },

  watercolor: {
    id: 'watercolor',
    name: 'Aquarela de Fantasia',
    description: 'Manchas suaves de pigmento natural, tons vibrantes e linhas delicadas.',
    background: '#faf7f2',
    paperTexture: 'watercolor',
    inkColor: '#203038',
    inkSecondary: '#4b6573',
    coastColor: '#87bdd8',
    coastRippleCount: 2,
    riverColor: '#4f94b8',
    roadColor: '#b4835a',
    gridColor: 'rgba(50, 80, 100, 0.14)',
    borderColor: '#2b3f4d',
    compassColor: '#2b3f4d',
    fontPrimary: 'MedievalSharp, cursive',
    fontSecondary: 'Cinzel, serif',
    textColor: '#1f2e38',
    fogColor: 'rgba(25, 40, 52, 0.85)',
    biomeColors: {
      deep_ocean: '#7baec7',
      shallow_ocean: '#a6d0e4',
      beach: '#f9e7b9',
      grassland: '#b9e0a5',
      forest: '#7ec07c',
      dense_forest: '#519e59',
      desert: '#f5cb88',
      swamp: '#8cae86',
      tundra: '#c8e2dc',
      snow: '#f0f7fb',
      mountain: '#d0b4a4',
      peak: '#eadcd4',
      volcano: '#d67c69',
      dungeon_floor: '#e5ded5',
      dungeon_wall: '#384852',
      stone_road: '#a6abb0',
      wood_floor: '#d9a979',
    },
  },

  atlas: {
    id: 'atlas',
    name: 'Atlas Moderno / VTT',
    description: 'Cores topográficas precisas, relevo sombreado e alta clareza de leitura.',
    background: '#eef3f6',
    paperTexture: 'clean',
    inkColor: '#0f172a',
    inkSecondary: '#334155',
    coastColor: '#3b82f6',
    coastRippleCount: 1,
    riverColor: '#2563eb',
    roadColor: '#92400e',
    gridColor: 'rgba(15, 23, 42, 0.18)',
    borderColor: '#0f172a',
    compassColor: '#0f172a',
    fontPrimary: 'Inter, sans-serif',
    fontSecondary: 'Cinzel, serif',
    textColor: '#0f172a',
    fogColor: 'rgba(15, 23, 42, 0.9)',
    biomeColors: {
      deep_ocean: '#60a5fa',
      shallow_ocean: '#93c5fd',
      beach: '#fde68a',
      grassland: '#86efac',
      forest: '#4ade80',
      dense_forest: '#16a34a',
      desert: '#fcd34d',
      swamp: '#6ee7b7',
      tundra: '#cbd5e1',
      snow: '#f8fafc',
      mountain: '#d6d3d1',
      peak: '#a8a29e',
      volcano: '#f87171',
      dungeon_floor: '#e2e8f0',
      dungeon_wall: '#1e293b',
      stone_road: '#94a3b8',
      wood_floor: '#fbcfe8',
    },
  },

  arcane: {
    id: 'arcane',
    name: 'Noturno / Arcano',
    description: 'Plano astral, fundo cósmico sombrio com runas e linhas bioluminescentes.',
    background: '#090d16',
    paperTexture: 'arcane_nebula',
    inkColor: '#67e8f9',
    inkSecondary: '#c084fc',
    coastColor: '#38bdf8',
    coastRippleCount: 3,
    riverColor: '#38bdf8',
    roadColor: '#f472b6',
    gridColor: 'rgba(103, 232, 249, 0.22)',
    borderColor: '#38bdf8',
    compassColor: '#67e8f9',
    fontPrimary: 'Uncial Antiqua, cursive',
    fontSecondary: 'Cinzel Decorative, cursive',
    textColor: '#e0f2fe',
    textGlow: '0 0 8px rgba(56, 189, 248, 0.8)',
    fogColor: 'rgba(4, 6, 12, 0.95)',
    biomeColors: {
      deep_ocean: '#050a14',
      shallow_ocean: '#0d1d33',
      beach: '#22384f',
      grassland: '#112e2c',
      forest: '#0f3d32',
      dense_forest: '#124e3d',
      desert: '#38251e',
      swamp: '#261b36',
      tundra: '#1a2936',
      snow: '#475569',
      mountain: '#282b3c',
      peak: '#42455e',
      volcano: '#4c151b',
      dungeon_floor: '#161b26',
      dungeon_wall: '#2e1065',
      stone_road: '#334155',
      wood_floor: '#3b1f2b',
    },
  },
};
