/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ThemeColors {
  primary: string;
  primaryGlow: string;
  secondary: string;
  secondaryGlow: string;
  accent: string;
  accentGlow: string;
  bgDark: string;
  bgSecondary: string;
  orb1: string;
  orb2: string;
  orb3: string;
  glassBorder: string;
  textGlow: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  genre: string;
  icon: string;
  description: string;
  colors: ThemeColors;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    genre: 'Sci-Fi / Padrão',
    icon: '⚡',
    description: 'Ciano elétrico, magenta vibrante e fundo ultravioleta profundo.',
    colors: {
      primary: '#22d3ee',
      primaryGlow: 'rgba(34, 211, 238, 0.45)',
      secondary: '#e879f9',
      secondaryGlow: 'rgba(232, 121, 249, 0.45)',
      accent: '#8b5cf6',
      accentGlow: 'rgba(139, 92, 246, 0.45)',
      bgDark: '#07060d',
      bgSecondary: '#0d0b1a',
      orb1: 'rgba(34, 211, 238, 0.16)',
      orb2: 'rgba(232, 121, 249, 0.13)',
      orb3: 'rgba(139, 92, 246, 0.13)',
      glassBorder: 'rgba(34, 211, 238, 0.22)',
      textGlow: '0 0 10px #22d3ee, 0 0 20px rgba(34, 211, 238, 0.6)',
    },
  },
  {
    id: 'eldritch',
    name: 'Eldritch Void',
    genre: 'Arcano / Ocultismo',
    icon: '🔮',
    description: 'Violeta cósmico misterioso, rosa arcano e sombras astrais profundas.',
    colors: {
      primary: '#c084fc',
      primaryGlow: 'rgba(192, 132, 252, 0.45)',
      secondary: '#f472b6',
      secondaryGlow: 'rgba(244, 114, 182, 0.45)',
      accent: '#818cf8',
      accentGlow: 'rgba(129, 140, 248, 0.45)',
      bgDark: '#090514',
      bgSecondary: '#120b24',
      orb1: 'rgba(192, 132, 252, 0.18)',
      orb2: 'rgba(244, 114, 182, 0.13)',
      orb3: 'rgba(129, 140, 248, 0.14)',
      glassBorder: 'rgba(192, 132, 252, 0.25)',
      textGlow: '0 0 10px #c084fc, 0 0 20px rgba(192, 132, 252, 0.6)',
    },
  },
  {
    id: 'crimson',
    name: 'Pacto Carmesim',
    genre: 'Vampírico / Combate',
    icon: '🩸',
    description: 'Vermelho sangue visceral, brasas incandescentes e aço temperado.',
    colors: {
      primary: '#f43f5e',
      primaryGlow: 'rgba(244, 63, 94, 0.5)',
      secondary: '#fb923c',
      secondaryGlow: 'rgba(251, 146, 60, 0.45)',
      accent: '#fda4af',
      accentGlow: 'rgba(253, 164, 175, 0.4)',
      bgDark: '#0e0407',
      bgSecondary: '#1a080f',
      orb1: 'rgba(244, 63, 94, 0.18)',
      orb2: 'rgba(251, 146, 60, 0.13)',
      orb3: 'rgba(190, 18, 60, 0.14)',
      glassBorder: 'rgba(244, 63, 94, 0.25)',
      textGlow: '0 0 10px #f43f5e, 0 0 20px rgba(244, 63, 94, 0.65)',
    },
  },
  {
    id: 'emerald',
    name: 'Floresta Ancestral',
    genre: 'Druida / Veneno',
    icon: '🌿',
    description: 'Verde esmeralda bio-luminescente, lima ácida e musgo lendário.',
    colors: {
      primary: '#10b981',
      primaryGlow: 'rgba(16, 185, 129, 0.45)',
      secondary: '#a3e635',
      secondaryGlow: 'rgba(163, 230, 53, 0.45)',
      accent: '#2dd4bf',
      accentGlow: 'rgba(45, 212, 191, 0.4)',
      bgDark: '#040d08',
      bgSecondary: '#08170f',
      orb1: 'rgba(16, 185, 129, 0.18)',
      orb2: 'rgba(163, 230, 53, 0.14)',
      orb3: 'rgba(45, 212, 191, 0.13)',
      glassBorder: 'rgba(16, 185, 129, 0.25)',
      textGlow: '0 0 10px #10b981, 0 0 20px rgba(16, 185, 129, 0.65)',
    },
  },
  {
    id: 'amber',
    name: 'Fogo Solar',
    genre: 'Paladino / Forja',
    icon: '☀️',
    description: 'Ouro sagrado resplandecente, chamas de forja e luz celestial.',
    colors: {
      primary: '#f59e0b',
      primaryGlow: 'rgba(245, 158, 11, 0.5)',
      secondary: '#fbbf24',
      secondaryGlow: 'rgba(251, 191, 36, 0.45)',
      accent: '#ea580c',
      accentGlow: 'rgba(234, 88, 12, 0.4)',
      bgDark: '#0d0803',
      bgSecondary: '#1a1106',
      orb1: 'rgba(245, 158, 11, 0.18)',
      orb2: 'rgba(251, 191, 36, 0.13)',
      orb3: 'rgba(234, 88, 12, 0.13)',
      glassBorder: 'rgba(245, 158, 11, 0.25)',
      textGlow: '0 0 10px #f59e0b, 0 0 20px rgba(245, 158, 11, 0.65)',
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidiana Furtiva',
    genre: 'Ladino / Sombra',
    icon: '🗡️',
    description: 'Monocromático tático de alta discrição com reflexos de gelo azulado.',
    colors: {
      primary: '#38bdf8',
      primaryGlow: 'rgba(56, 189, 248, 0.4)',
      secondary: '#e2e8f0',
      secondaryGlow: 'rgba(226, 232, 240, 0.35)',
      accent: '#94a3b8',
      accentGlow: 'rgba(148, 163, 184, 0.3)',
      bgDark: '#050608',
      bgSecondary: '#0d0f15',
      orb1: 'rgba(56, 189, 248, 0.12)',
      orb2: 'rgba(226, 232, 240, 0.08)',
      orb3: 'rgba(100, 116, 139, 0.12)',
      glassBorder: 'rgba(56, 189, 248, 0.2)',
      textGlow: '0 0 10px #38bdf8, 0 0 20px rgba(56, 189, 248, 0.5)',
    },
  },
  {
    id: 'abyss',
    name: 'Abismo Cósmico',
    genre: 'Kraken / Oceânico',
    icon: '🌊',
    description: 'Azul safira elétrico, anil das fossas abissais e ciano bioluminescente.',
    colors: {
      primary: '#3b82f6',
      primaryGlow: 'rgba(59, 130, 246, 0.45)',
      secondary: '#06b6d4',
      secondaryGlow: 'rgba(6, 182, 212, 0.45)',
      accent: '#6366f1',
      accentGlow: 'rgba(99, 102, 241, 0.4)',
      bgDark: '#030713',
      bgSecondary: '#071025',
      orb1: 'rgba(59, 130, 246, 0.18)',
      orb2: 'rgba(6, 182, 212, 0.14)',
      orb3: 'rgba(99, 102, 241, 0.13)',
      glassBorder: 'rgba(59, 130, 246, 0.25)',
      textGlow: '0 0 10px #3b82f6, 0 0 20px rgba(59, 130, 246, 0.65)',
    },
  },
];

export const DEFAULT_THEME_ID = 'cyberpunk';

export function getThemePreset(themeId?: string): ThemePreset {
  if (!themeId) return THEME_PRESETS[0];
  const found = THEME_PRESETS.find((t) => t.id === themeId);
  return found || THEME_PRESETS[0];
}

/**
 * Applies the selected theme preset to document root CSS variables and meta tags.
 */
export function applyTheme(themeId?: string): ThemePreset {
  const preset = getThemePreset(themeId);
  if (typeof document === 'undefined') return preset;

  const root = document.documentElement;

  // Set data-theme attribute
  root.setAttribute('data-theme', preset.id);

  // Update core CSS variables
  root.style.setProperty('--bg-dark', preset.colors.bgDark);
  root.style.setProperty('--bg-dark-secondary', preset.colors.bgSecondary);
  
  // Neon variables map to the active theme's primary and secondary accents
  root.style.setProperty('--neon-cyan', preset.colors.primary);
  root.style.setProperty('--neon-cyan-glow', preset.colors.primaryGlow);
  root.style.setProperty('--neon-magenta', preset.colors.secondary);
  root.style.setProperty('--neon-magenta-glow', preset.colors.secondaryGlow);

  // Theme-specific aliases
  root.style.setProperty('--theme-primary', preset.colors.primary);
  root.style.setProperty('--theme-primary-glow', preset.colors.primaryGlow);
  root.style.setProperty('--theme-secondary', preset.colors.secondary);
  root.style.setProperty('--theme-secondary-glow', preset.colors.secondaryGlow);
  root.style.setProperty('--theme-accent', preset.colors.accent);
  root.style.setProperty('--theme-accent-glow', preset.colors.accentGlow);

  // Ambient orbs
  root.style.setProperty('--ambient-orb-1', preset.colors.orb1);
  root.style.setProperty('--ambient-orb-2', preset.colors.orb2);
  root.style.setProperty('--ambient-orb-3', preset.colors.orb3);

  // Update theme-color meta tag for mobile status bar
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.setAttribute('name', 'theme-color');
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute('content', preset.colors.bgDark);

  return preset;
}
