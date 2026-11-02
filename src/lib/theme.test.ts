import { describe, expect, it } from 'vitest';
import { applyTheme, DEFAULT_THEME_ID, getThemePreset, THEME_PRESETS } from './theme';

describe('Theme System', () => {
  it('has at least 6 distinct themed presets', () => {
    expect(THEME_PRESETS.length).toBeGreaterThanOrEqual(6);
  });

  it('includes the default cyberpunk preset', () => {
    const defaultPreset = getThemePreset(DEFAULT_THEME_ID);
    expect(defaultPreset.id).toBe('cyberpunk');
    expect(defaultPreset.colors.primary).toBe('#22d3ee');
  });

  it('returns default preset when invalid or empty themeId is provided', () => {
    const fallback = getThemePreset('non-existent-theme-xyz');
    expect(fallback.id).toBe(DEFAULT_THEME_ID);

    const emptyFallback = getThemePreset(undefined);
    expect(emptyFallback.id).toBe(DEFAULT_THEME_ID);
  });

  it('retrieves custom presets correctly', () => {
    const crimson = getThemePreset('crimson');
    expect(crimson.name).toBe('Pacto Carmesim');
    expect(crimson.colors.primary).toBe('#f43f5e');

    const emerald = getThemePreset('emerald');
    expect(emerald.name).toBe('Floresta Ancestral');
    expect(emerald.colors.primary).toBe('#10b981');
  });

  it('applies theme variables to document root', () => {
    const applied = applyTheme('eldritch');
    expect(applied.id).toBe('eldritch');
    if (typeof document !== 'undefined') {
      expect(document.documentElement.getAttribute('data-theme')).toBe('eldritch');
    }
  });
});
