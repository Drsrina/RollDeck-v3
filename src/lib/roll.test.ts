import { describe, expect, it } from 'vitest';
import { evaluateDieGroup, executeRoll, rollDie, rollSingleDieRaw, STANDARD_DICE } from './roll';
import type { DieDefinition, PackageDieGroup } from '../types';

describe('Módulo de Rolagem (src/lib/roll.ts)', () => {
  it('rollSingleDieRaw deve retornar valores estritamente dentro de [1, sides]', () => {
    const sides = 6;
    for (let i = 0; i < 200; i++) {
      const res = rollSingleDieRaw(sides);
      expect(res).toBeGreaterThanOrEqual(1);
      expect(res).toBeLessThanOrEqual(sides);
      expect(Number.isInteger(res)).toBe(true);
    }
  });

  it('rollSingleDieRaw com d20 deve atingir o range completo', () => {
    const results = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const res = rollSingleDieRaw(20);
      expect(res).toBeGreaterThanOrEqual(1);
      expect(res).toBeLessThanOrEqual(20);
      results.add(res);
    }
    // With 500 unbiased rolls of d20, should hit almost all faces
    expect(results.size).toBeGreaterThanOrEqual(15);
  });

  it('Vantagem deve rolar dois dados e selecionar o maior', () => {
    const d20Def: DieDefinition = { id: 'd20', name: 'd20', sides: 20, color: '#e879f9' };
    for (let i = 0; i < 50; i++) {
      const { primary, dropped } = rollDie(d20Def, { advantage: 'advantage' });
      expect(dropped).toBeDefined();
      if (dropped) {
        expect(primary.value).toBeGreaterThanOrEqual(dropped.value);
        expect(dropped.isDropped).toBe(true);
      }
    }
  });

  it('Desvantagem deve rolar dois dados e selecionar o menor', () => {
    const d20Def: DieDefinition = { id: 'd20', name: 'd20', sides: 20, color: '#e879f9' };
    for (let i = 0; i < 50; i++) {
      const { primary, dropped } = rollDie(d20Def, { advantage: 'disadvantage' });
      expect(dropped).toBeDefined();
      if (dropped) {
        expect(primary.value).toBeLessThanOrEqual(dropped.value);
        expect(dropped.isDropped).toBe(true);
      }
    }
  });

  it('Regra keep-highest deve manter apenas os N maiores dados', () => {
    const group: PackageDieGroup = {
      id: 'g-test-keep',
      count: 4,
      dieId: 'd6',
      modifier: 0,
      keepRule: 'keep-highest',
      keepCount: 3,
    };
    const lookup = new Map<string, DieDefinition>([
      ['d6', { id: 'd6', name: 'd6', sides: 6, color: '#f59e0b' }],
    ]);

    const result = evaluateDieGroup(group, lookup);
    const activeDice = result.dice.filter((d) => !d.isDropped);
    const droppedDice = result.dice.filter((d) => d.isDropped);

    expect(activeDice.length).toBe(3);
    expect(droppedDice.length).toBe(1);

    // Each active die must be >= dropped die
    for (const act of activeDice) {
      expect(act.value).toBeGreaterThanOrEqual(droppedDice[0].value);
    }
  });

  it('Regra keep-lowest deve manter apenas os N menores dados', () => {
    const group: PackageDieGroup = {
      id: 'g-test-keep-low',
      count: 4,
      dieId: 'd6',
      modifier: 0,
      keepRule: 'keep-lowest',
      keepCount: 2,
    };
    const lookup = new Map<string, DieDefinition>([
      ['d6', { id: 'd6', name: 'd6', sides: 6, color: '#f59e0b' }],
    ]);

    const result = evaluateDieGroup(group, lookup);
    const activeDice = result.dice.filter((d) => !d.isDropped);
    const droppedDice = result.dice.filter((d) => d.isDropped);

    expect(activeDice.length).toBe(2);
    expect(droppedDice.length).toBe(2);

    for (const act of activeDice) {
      for (const drp of droppedDice) {
        expect(act.value).toBeLessThanOrEqual(drp.value);
      }
    }
  });

  it('Faces customizadas como Fate [-1, 0, +1] devem ser mapeadas corretamente', () => {
    const fateDie: DieDefinition = {
      id: 'fate',
      name: 'Fate',
      sides: 3,
      isCustomFaces: true,
      customFaces: ['-1', '0', '+1'],
      color: '#38bdf8',
    };

    for (let i = 0; i < 30; i++) {
      const { primary } = rollDie(fateDie);
      expect(['-1', '0', '+1']).toContain(primary.displayValue);
      expect([-1, 0, 1]).toContain(primary.value);
    }
  });

  it('executeRoll deve calcular soma total, grupos e modificadores globais', () => {
    const lookup = new Map<string, DieDefinition>();
    STANDARD_DICE.forEach((d) => lookup.set(d.id, d));

    const groups: PackageDieGroup[] = [
      { id: '1', count: 2, dieId: 'd6', modifier: 2 },
      { id: '2', count: 1, dieId: 'd4', modifier: 0 },
    ];

    const result = executeRoll({
      title: 'Teste Geral',
      groups,
      globalModifier: 3,
      diceLookup: lookup,
    });

    expect(result.groups.length).toBe(2);
    const sumGroups = result.groups.reduce((acc, g) => acc + g.groupSubtotal, 0);
    expect(result.total).toBe(sumGroups + 3);
  });
});
