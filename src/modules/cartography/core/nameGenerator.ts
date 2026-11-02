/**
 * Fantasy Name Generator by Culture (Elven, Dwarven, Human, Orc, Arcane)
 * for Kingdoms, Cities, Towns, Ports, Rivers and Mountain ranges.
 */

import { Mulberry32 } from './prng';

export type CultureType = 'elven' | 'dwarven' | 'human' | 'orc' | 'arcane';

const CULTURE_PARTS: Record<CultureType, { prefixes: string[]; infixes: string[]; suffixes: string[] }> = {
  elven: {
    prefixes: ['Ael', 'Aerin', 'Cael', 'Elys', 'Fae', 'Illyr', 'Lórien', 'Mith', 'Quel', 'Sylva', 'Thal', 'Val', 'Yv'],
    infixes: ['an', 'dril', 'eth', 'ien', 'las', 'mel', 'nor', 'riel', 'siel', 'thal', 'wyn'],
    suffixes: ['dor', 'ia', 'iel', 'ith', 'las', 'lon', 'mar', 'reth', 'sil', 'val', 'wen'],
  },
  dwarven: {
    prefixes: ['Baruk', 'Dulg', 'Grom', 'Kazad', 'Karak', 'Mor', 'Thar', 'Thor', 'Tor', 'Zund', 'Bal', 'Duer', 'Garn'],
    infixes: ['bad', 'dim', 'duhr', 'grim', 'gund', 'krag', 'lund', 'mar', 'vorn', 'zak'],
    suffixes: ['ak', 'bek', 'dum', 'gar', 'grim', 'kar', 'krag', 'modan', 'thron', 'vorn', 'zun'],
  },
  human: {
    prefixes: ['Alder', 'Ash', 'Barrow', 'Black', 'Bright', 'Crow', 'Falcon', 'Green', 'Iron', 'King', 'Oak', 'Raven', 'Red', 'Silver', 'Stone', 'West', 'Winter'],
    infixes: ['burn', 'bury', 'dale', 'field', 'ford', 'gate', 'ham', 'haven', 'moor', 'stead', 'ton', 'water', 'wood'],
    suffixes: ['bridge', 'brook', 'burg', 'caster', 'crest', 'fall', 'ford', 'guard', 'haven', 'hold', 'keep', 'port', 'shire', 'ville'],
  },
  orc: {
    prefixes: ['Ash', 'Brak', 'Durg', 'Gor', 'Grak', 'Grash', 'Krag', 'Mork', 'Ork', 'Ruk', 'Skar', 'Urz', 'Varg', 'Zul'],
    infixes: ['ash', 'drak', 'gul', 'krag', 'lug', 'mog', 'nak', 'rok', 'skag', 'tor', 'zog'],
    suffixes: ['bash', 'bog', 'crag', 'dum', 'gar', 'gash', 'gor', 'gul', 'krag', 'nak', 'rot', 'tar', 'tor', 'zod'],
  },
  arcane: {
    prefixes: ['Aether', 'Astra', 'Chrono', 'Cosmo', 'Eclipse', 'Lumi', 'Myst', 'Nex', 'Nova', 'Sol', 'Star', 'Umbra', 'Void', 'Zephyr'],
    infixes: ['cael', 'crys', 'drak', 'flux', 'gale', 'lux', 'mancy', 'phir', 'rune', 'spire', 'synth'],
    suffixes: ['arcanum', 'fall', 'gard', 'glen', 'haven', 'reach', 'sanctum', 'spire', 'vale', 'vault', 'vertex'],
  },
};

const GEOGRAPHIC_MODIFIERS = {
  port: ['Porto', 'Baía de', 'Cais de', 'Ancoradouro de', 'Enseada de'],
  capital: ['Alta', 'Grande', 'Império de', 'Cidadela de', 'Trono de'],
  mountain: [
    'Picos de', 'Montanhas de', 'Cordilheira de', 'Presas de', 'Espinha de',
    'Cumes Brancos de', 'Penhascos de'
  ],
  river: [
    'Rio', 'Torrente', 'Águas de', 'Serpente de', 'Afluente de',
    'Correnteza de', 'Riacho'
  ],
  ruin: ['Ruínas de', 'Túmulo de', 'Mausoléu de', 'Criptas de', 'Abandono de'],
  forest: ['Bosque de', 'Floresta de', 'Selva de', 'Mata Sussurrante de']
};

export function generateSettlementName(
  culture: CultureType,
  type: 'capital' | 'city' | 'town' | 'village' | 'port' | 'ruin',
  rng: Mulberry32
): string {
  const parts = CULTURE_PARTS[culture] || CULTURE_PARTS.human;
  const prefix = rng.choice(parts.prefixes);
  const suffix = rng.choice(parts.suffixes);
  const useInfix = rng.next() > 0.45;
  const infix = useInfix ? rng.choice(parts.infixes).toLowerCase() : '';

  let baseName = `${prefix}${infix}${suffix.toLowerCase()}`;
  // capitalize nicely
  baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

  if (type === 'port' && rng.next() > 0.4) {
    const mod = rng.choice(GEOGRAPHIC_MODIFIERS.port);
    return `${mod} ${baseName}`;
  }
  if (type === 'ruin' && rng.next() > 0.3) {
    const mod = rng.choice(GEOGRAPHIC_MODIFIERS.ruin);
    return `${mod} ${baseName}`;
  }
  if (type === 'capital' && rng.next() > 0.5) {
    const mod = rng.choice(GEOGRAPHIC_MODIFIERS.capital);
    return `${mod} ${baseName}`;
  }

  return baseName;
}

export function generateGeographicFeatureName(
  kind: 'mountain' | 'river' | 'forest',
  culture: CultureType,
  rng: Mulberry32
): string {
  const parts = CULTURE_PARTS[culture] || CULTURE_PARTS.human;
  const prefix = rng.choice(parts.prefixes);
  const suffix = rng.choice(parts.suffixes);
  const root = `${prefix}${suffix.toLowerCase()}`;
  const mod = rng.choice(GEOGRAPHIC_MODIFIERS[kind]);

  return `${mod} ${root}`;
}

export function generateKingdomName(culture: CultureType, rng: Mulberry32): string {
  const parts = CULTURE_PARTS[culture] || CULTURE_PARTS.human;
  const titles = ['Reino de', 'Domínio de', 'Grão-Ducado de', 'Terras de', 'Confederação de', 'Império de'];
  const title = rng.choice(titles);
  const root = rng.choice(parts.prefixes) + rng.choice(parts.suffixes).toLowerCase();
  return `${title} ${root}`;
}
