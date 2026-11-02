import type { AdvantageType, DieDefinition, GroupRollResult, KeepRule, PackageDieGroup, RollResult, SingleDieResult } from '../types';

/**
 * Standard dice definitions with distinctive neon colors
 */
export const STANDARD_DICE: DieDefinition[] = [
  { id: 'd4', name: 'd4', sides: 4, color: '#f43f5e', isStandard: true },
  { id: 'd6', name: 'd6', sides: 6, color: '#f59e0b', isStandard: true },
  { id: 'd8', name: 'd8', sides: 8, color: '#10b981', isStandard: true },
  { id: 'd10', name: 'd10', sides: 10, color: '#06b6d4', isStandard: true },
  { id: 'd12', name: 'd12', sides: 12, color: '#8b5cf6', isStandard: true },
  { id: 'd20', name: 'd20', sides: 20, color: '#e879f9', isStandard: true },
  { id: 'd100', name: 'd100', sides: 100, color: '#3b82f6', isStandard: true },
];

/**
 * Default sample custom dice
 */
export const DEFAULT_CUSTOM_DICE: DieDefinition[] = [
  {
    id: 'fate',
    name: 'Fate / Fudge',
    sides: 3,
    isCustomFaces: true,
    customFaces: ['-1', '0', '+1'],
    color: '#38bdf8',
    symbol: '⚖️',
  },
  {
    id: 'coin',
    name: 'Moeda da Sorte',
    sides: 2,
    isCustomFaces: true,
    customFaces: ['Cara', 'Coroa'],
    color: '#fbbf24',
    symbol: '🪙',
  },
];

const UINT32_MAX = 0x100000000; // 2^32

/**
 * Cryptographically secure unbiased random integer in range [1, sides].
 * Uses rejection sampling to eliminate modulo bias completely.
 */
export function rollSingleDieRaw(sides: number): number {
  if (sides <= 1) return 1;

  // Find the largest multiple of 'sides' <= 2^32
  const limit = UINT32_MAX - (UINT32_MAX % sides);
  const buffer = new Uint32Array(1);

  while (true) {
    crypto.getRandomValues(buffer);
    const val = buffer[0];
    if (val < limit) {
      return (val % sides) + 1;
    }
  }
}

/**
 * Rolls an individual die taking into account rerolling 1s, custom faces, and crits
 */
export function rollDie(
  die: DieDefinition,
  options?: {
    rerollOnes?: boolean;
    advantage?: AdvantageType;
  }
): { primary: SingleDieResult; dropped?: SingleDieResult } {
  const sides = die.sides;
  const isD20 = die.id === 'd20' || sides === 20;

  const rollOnce = (): { raw: number; rerolled: boolean } => {
    let r = rollSingleDieRaw(sides);
    let rerolled = false;
    if (options?.rerollOnes && r === 1 && sides > 1) {
      r = rollSingleDieRaw(sides);
      rerolled = true;
    }
    return { raw: r, rerolled };
  };

  const createResult = (raw: number, rerolled: boolean): SingleDieResult => {
    let val = raw;
    let display = String(raw);

    if (die.isCustomFaces && die.customFaces && die.customFaces.length > 0) {
      const faceIndex = (raw - 1) % die.customFaces.length;
      display = die.customFaces[faceIndex];
      // Try parsing numeric value if possible (e.g. "+1" -> 1, "-1" -> -1)
      const parsed = parseInt(display, 10);
      val = isNaN(parsed) ? (display === 'Cara' ? 1 : 0) : parsed;
    }

    const isCritSuccess = isD20 ? raw === 20 : !die.isCustomFaces && raw === sides;
    const isCritFail = isD20 ? raw === 1 : !die.isCustomFaces && raw === 1 && sides > 2;

    return {
      id: crypto.randomUUID(),
      value: val,
      displayValue: display,
      rawValue: raw,
      isCriticalSuccess: isCritSuccess,
      isCriticalFailure: isCritFail,
      wasRerolled: rerolled,
      dieName: die.name,
      sides: die.sides,
      color: die.color,
    };
  };

  // Advantage or Disadvantage on this die roll
  if (options?.advantage && options.advantage !== 'none') {
    const roll1 = rollOnce();
    const roll2 = rollOnce();
    const res1 = createResult(roll1.raw, roll1.rerolled);
    const res2 = createResult(roll2.raw, roll2.rerolled);

    if (options.advantage === 'advantage') {
      if (res1.value >= res2.value) {
        res2.isDropped = true;
        return { primary: res1, dropped: res2 };
      } else {
        res1.isDropped = true;
        return { primary: res2, dropped: res1 };
      }
    } else {
      // Disadvantage: pick lowest
      if (res1.value <= res2.value) {
        res2.isDropped = true;
        return { primary: res1, dropped: res2 };
      } else {
        res1.isDropped = true;
        return { primary: res2, dropped: res1 };
      }
    }
  }

  const { raw, rerolled } = rollOnce();
  return { primary: createResult(raw, rerolled) };
}

/**
 * Evaluates a dice group roll (e.g., 8d6 or 1d20+5)
 */
export function evaluateDieGroup(
  group: PackageDieGroup,
  diceLookup: Map<string, DieDefinition>
): GroupRollResult {
  const dieDef = diceLookup.get(group.dieId) || {
    id: group.dieId,
    name: group.dieId,
    sides: parseInt(group.dieId.replace('d', ''), 10) || 6,
    color: '#22d3ee',
  };

  const rolledDice: SingleDieResult[] = [];

  for (let i = 0; i < group.count; i++) {
    const { primary, dropped } = rollDie(dieDef, {
      rerollOnes: group.rerollOnes,
      advantage: group.advantage,
    });
    rolledDice.push(primary);
    if (dropped) {
      rolledDice.push(dropped);
    }
  }

  // Handle keep rules (keep-highest or keep-lowest)
  if (group.keepRule && group.keepRule !== 'all' && rolledDice.length > 0) {
    const keepCount = Math.min(group.keepCount || 1, group.count);
    // Sort active (non-dropped) dice by value
    const activeDice = rolledDice.filter((d) => !d.isDropped);
    if (group.keepRule === 'keep-highest') {
      activeDice.sort((a, b) => b.value - a.value);
    } else {
      activeDice.sort((a, b) => a.value - b.value);
    }

    const keptSet = new Set(activeDice.slice(0, keepCount).map((d) => d.id));
    for (const d of rolledDice) {
      if (!keptSet.has(d.id)) {
        d.isDropped = true;
      }
    }
  }

  // Calculate sum of active dice
  const activeSum = rolledDice
    .filter((d) => !d.isDropped)
    .reduce((sum, d) => sum + d.value, 0);

  const groupSubtotal = activeSum + (group.modifier || 0);

  // Generate readable formula
  let formula = `${group.count}×${dieDef.name}`;
  if (group.advantage === 'advantage') formula += ' (vantagem)';
  if (group.advantage === 'disadvantage') formula += ' (desvantagem)';
  if (group.keepRule === 'keep-highest') formula += ` [maiores ${group.keepCount || 1}]`;
  if (group.keepRule === 'keep-lowest') formula += ` [menores ${group.keepCount || 1}]`;
  if (group.rerollOnes) formula += ' [rerrola 1s]';
  if (group.modifier > 0) formula += `+${group.modifier}`;
  if (group.modifier < 0) formula += `${group.modifier}`;

  return {
    groupId: group.id,
    label: group.label,
    dieId: group.dieId,
    dieName: dieDef.name,
    sides: dieDef.sides,
    count: group.count,
    modifier: group.modifier || 0,
    dice: rolledDice,
    groupSubtotal,
    formula,
  };
}

/**
 * Performs a complete roll for an ad-hoc tray or a package
 */
export function executeRoll({
  title,
  groups,
  globalModifier = 0,
  diceLookup,
  packageId,
}: {
  title: string;
  groups: PackageDieGroup[];
  globalModifier?: number;
  diceLookup: Map<string, DieDefinition>;
  packageId?: string;
}): RollResult {
  const groupResults: GroupRollResult[] = groups
    .filter((g) => g.count > 0)
    .map((g) => evaluateDieGroup(g, diceLookup));

  const totalBeforeGlobal = groupResults.reduce((acc, g) => acc + g.groupSubtotal, 0);
  const total = totalBeforeGlobal + globalModifier;

  // Check critical success / failure (e.g. natural 20 or natural 1 on any d20 rolled and not dropped)
  const d20Dice = groupResults
    .flatMap((g) => g.dice)
    .filter((d) => !d.isDropped && (d.sides === 20 || d.dieName === 'd20'));

  const isCriticalSuccess = d20Dice.some((d) => d.isCriticalSuccess);
  const isCriticalFailure = !isCriticalSuccess && d20Dice.some((d) => d.isCriticalFailure);

  // Formula description
  const parts = groupResults.map((g) => g.formula);
  if (globalModifier > 0) parts.push(`+${globalModifier}`);
  if (globalModifier < 0) parts.push(`${globalModifier}`);
  const formula = parts.join(' + ') || '0';

  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    title,
    formula,
    groups: groupResults,
    globalModifier,
    total,
    isCriticalSuccess,
    isCriticalFailure,
    packageId,
  };
}
