import { describe, expect, it } from 'vitest';
import { generateAdvancedProceduralLoot, generateLootWithAI } from './ai';
import { DEFAULT_LOOT_GENERATOR_TEMPLATES } from './lootTemplates';
import type { LootColumn, LootItem } from '../types';

describe('Procedural Loot Generation (Sem IA)', () => {
  it('generates items matching count without any external API or keys', () => {
    const generator = DEFAULT_LOOT_GENERATOR_TEMPLATES[0]; // Tesouro de masmorra
    const count = 4;

    const result = generateAdvancedProceduralLoot(generator, count);

    expect(result).toBeDefined();
    expect(result.items).toHaveLength(count);
    expect(typeof result.title).toBe('string');

    // Verify each item has mandatory cells filled
    for (const item of result.items) {
      expect(item.id).toBeDefined();
      expect(typeof item.cells.name).toBe('string');
      expect((item.cells.name as string).length).toBeGreaterThan(0);
      expect(item.cells.rarity).toBeDefined();
      expect(typeof item.cells.description).toBe('string');
      expect((item.cells.description as string).length).toBeGreaterThan(0);
      expect(typeof item.cells.value).toBe('number');
    }
  });

  it('respects rarity settings when specified', () => {
    const generator = {
      ...DEFAULT_LOOT_GENERATOR_TEMPLATES[0],
      params: {
        ...DEFAULT_LOOT_GENERATOR_TEMPLATES[0].params,
        rarity: 'lendário' as const,
      },
    };

    const result = generateAdvancedProceduralLoot(generator, 3);
    expect(result.items).toHaveLength(3);
    for (const item of result.items) {
      expect(String(item.cells.rarity).toLowerCase()).toBe('lendário');
    }
  });

  it('generates dice formulas and respects custom columns with min/max', () => {
    const customColumns: LootColumn[] = [
      {
        id: 'col-name',
        key: 'name',
        label: 'Nome',
        type: 'text_short',
        instruction: 'Nome do item',
        required: true,
        enabled: true,
      },
      {
        id: 'col-dice',
        key: 'damage',
        label: 'Dano',
        type: 'dice_formula',
        instruction: 'Fórmula de dano',
        required: true,
        enabled: true,
      },
      {
        id: 'col-stock',
        key: 'stock',
        label: 'Estoque',
        type: 'number',
        instruction: 'Quantidade em estoque',
        min: 10,
        max: 20,
        required: true,
        enabled: true,
      },
    ];

    const customGenerator = {
      ...DEFAULT_LOOT_GENERATOR_TEMPLATES[0],
      columns: customColumns,
    };

    const result = generateAdvancedProceduralLoot(customGenerator, 5);
    expect(result.items).toHaveLength(5);

    for (const item of result.items) {
      // Stock should respect min/max
      const stock = item.cells.stock as number;
      expect(stock).toBeGreaterThanOrEqual(10);
      expect(stock).toBeLessThanOrEqual(20);

      // Dice formula should match standard dice expression
      const damage = item.cells.damage as string;
      expect(damage).toMatch(/\d+d\d+/);
    }
  });

  it('integrates with generateLootWithAI in procedural mode', async () => {
    const generator = DEFAULT_LOOT_GENERATOR_TEMPLATES[1]; // Loot de Monstro
    const revealed: number[] = [];

    const result = await generateLootWithAI({
      generator,
      countOverride: 3,
      engineOverride: 'procedural',
      onItemRevealed: (_item: LootItem, idx: number) => {
        revealed.push(idx);
      },
    });

    expect(result.items).toHaveLength(3);
    expect(revealed).toEqual([0, 1, 2]);
  });
});
