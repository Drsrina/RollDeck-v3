/**
 * Agent Tool Schemas validated via Zod and exposed as JSON Schema for LLM function calling
 */

import { z } from 'zod';
import { ToolDefinition } from '../providers/types';

export const GenerateWorldSchema = z.object({
  seed: z.number().optional().describe('Semente numérica para o PRNG determinístico'),
  landPercent: z.number().min(20).max(80).optional().describe('Porcentagem de terra (20 a 80)'),
  continents: z.number().min(1).max(4).optional().describe('Número de continentes principais (1 a 4)'),
  roughness: z.number().min(2).max(6).optional().describe('Aspereza do relevo / octaves (2 a 6)'),
  moisture: z.number().min(0).max(1).optional().describe('Nível de umidade e rios (0 a 1)'),
  cities: z.number().min(4).max(16).optional().describe('Número de cidades e vilas'),
});

export const PaintTerrainSchema = z.object({
  biome: z.enum([
    'deep_ocean', 'shallow_ocean', 'beach', 'grassland', 'forest', 'dense_forest',
    'desert', 'swamp', 'tundra', 'snow', 'mountain', 'peak', 'volcano',
    'stone_road', 'wood_floor', 'dungeon_floor', 'dungeon_wall'
  ]).describe('Tipo de bioma a pintar'),
  circle: z.object({
    x: z.number().describe('Coordenada X do centro em pixels'),
    y: z.number().describe('Coordenada Y do centro em pixels'),
    radius: z.number().min(10).max(300).describe('Raio da área circular a pintar'),
  }).optional(),
});

export const AddStampSchema = z.object({
  type: z.enum([
    'mountain_single', 'mountain_range', 'hill',
    'tree_deciduous', 'tree_pine', 'forest_cluster',
    'castle', 'fortress', 'city_icon', 'village', 'tower', 'ruins',
    'cave_entrance', 'portal', 'ship', 'sea_serpent', 'dragon',
    'dungeon_door', 'dungeon_stairs', 'dungeon_trap', 'dungeon_chest', 'torch'
  ]).describe('Tipo de carimbo cartográfico em traço de tinta'),
  x: z.number().describe('Posição X no mapa'),
  y: z.number().describe('Posição Y no mapa'),
  scale: z.number().min(0.3).max(3.0).optional().default(1).describe('Escala do carimbo'),
  rotation: z.number().min(-180).max(180).optional().default(0).describe('Rotação em graus'),
});

export const AddRiverSchema = z.object({
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(2).describe('Pontos da spline do curso do rio'),
  width: z.number().min(2).max(20).optional().default(4).describe('Largura do rio'),
});

export const AddRoadSchema = z.object({
  from: z.object({ x: z.number(), y: z.number() }).describe('Ponto de início da estrada'),
  to: z.object({ x: z.number(), y: z.number() }).describe('Ponto final da estrada'),
  waypoints: z.array(z.object({ x: z.number(), y: z.number() })).optional().describe('Pontos intermediários de curva'),
  width: z.number().min(2).max(10).optional().default(3).describe('Largura da estrada'),
});

export const AddLabelSchema = z.object({
  text: z.string().min(1).describe('Texto do rótulo toponímico'),
  position: z.object({ x: z.number(), y: z.number() }).describe('Posição do texto'),
  font: z.enum(['Cinzel', 'Cinzel Decorative', 'MedievalSharp', 'Uncial Antiqua', 'IM Fell English SC', 'Inter']).optional().default('Cinzel'),
  size: z.number().min(10).max(48).optional().default(16).describe('Tamanho da fonte em px'),
  isBanner: z.boolean().optional().default(false).describe('Exibir faixa decorativa de pergaminho atrás do texto'),
});

export const AddMarkerSchema = z.object({
  x: z.number().describe('Posição X do marcador'),
  y: z.number().describe('Posição Y do marcador'),
  title: z.string().describe('Nome ou título do local'),
  description: z.string().describe('Descrição, perigos, ganchos ou estatísticas'),
  secret: z.boolean().optional().default(false).describe('Verdadeiro se for segredo visível apenas para o mestre'),
  category: z.enum(['combat', 'quest', 'treasure', 'npc', 'poi']).optional().default('poi'),
});

export const PlaceImageSchema = z.object({
  assetId: z.string().describe('ID do asset de imagem importado'),
  x: z.number().describe('Posição X no mapa'),
  y: z.number().describe('Posição Y no mapa'),
  scale: z.number().optional().default(1).describe('Escala da imagem'),
  rotation: z.number().optional().default(0).describe('Rotação em graus'),
  layerId: z.string().optional().default('l-images'),
});

export const SetStyleSchema = z.object({
  styleId: z.enum(['parchment', 'watercolor', 'atlas', 'arcane']).describe('Identificador do estilo visual'),
});

export const CreateLayerSchema = z.object({
  name: z.string().describe('Nome da nova camada'),
  type: z.enum(['terrain', 'paths', 'stamps', 'text', 'markers', 'fog', 'decorations', 'images', 'ai']).describe('Tipo da camada'),
});

export const GetMapStateSchema = z.object({
  summary: z.boolean().optional().default(true).describe('Devolve resumo compacto sem sobrecarregar tokens'),
});

export const GenerateNamesSchema = z.object({
  culture: z.enum(['elven', 'dwarven', 'human', 'orc', 'arcane']).describe('Cultura fantástica'),
  kind: z.enum(['kingdom', 'settlement', 'mountain', 'river']).describe('Tipo de elemento geográfico'),
  count: z.number().min(1).max(10).optional().default(5).describe('Quantidade de nomes a gerar'),
});

// JSON Definitions for LLM function calling
export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: 'generate_world',
    description: 'Gera um mundo ou região proceduralmente com relevo, biomas, rios e assentamentos.',
    parameters: {
      type: 'object',
      description: 'Parâmetros de geração de mundo',
      properties: {
        seed: { type: 'number', description: 'Semente numérica determinística' },
        landPercent: { type: 'number', description: 'Porcentagem de terra (20 a 80)' },
        continents: { type: 'number', description: 'Número de continentes (1 a 4)' },
        roughness: { type: 'number', description: 'Aspereza do relevo (2 a 6)' },
        cities: { type: 'number', description: 'Número de cidades e vilas' },
      },
    },
  },
  {
    name: 'paint_terrain',
    description: 'Pinta uma área do mapa com um bioma específico (ex: floresta, montanha, água, pântano).',
    parameters: {
      type: 'object',
      description: 'Pintura de bioma',
      properties: {
        biome: {
          type: 'string',
          enum: ['grassland', 'forest', 'dense_forest', 'desert', 'swamp', 'mountain', 'peak', 'snow', 'shallow_ocean', 'deep_ocean', 'beach', 'volcano'],
          description: 'Nome do bioma a aplicar',
        },
        circle: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'Coordenada X em pixels' },
            y: { type: 'number', description: 'Coordenada Y em pixels' },
            radius: { type: 'number', description: 'Raio em pixels' },
          },
          required: ['x', 'y', 'radius'],
        },
      },
      required: ['biome', 'circle'],
    },
  },
  {
    name: 'add_stamp',
    description: 'Posiciona um carimbo vetorial em tinta no mapa (montanha, castelo, floresta, torre, ruína, monstro, caravela).',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['mountain_single', 'mountain_range', 'hill', 'tree_deciduous', 'tree_pine', 'forest_cluster', 'castle', 'fortress', 'city_icon', 'village', 'tower', 'ruins', 'cave_entrance', 'portal', 'ship', 'sea_serpent', 'dragon', 'dungeon_door', 'dungeon_stairs', 'dungeon_trap', 'dungeon_chest'],
        },
        x: { type: 'number', description: 'Posição X' },
        y: { type: 'number', description: 'Posição Y' },
        scale: { type: 'number', description: 'Escala do carimbo (0.5 a 2.5)' },
        rotation: { type: 'number', description: 'Rotação em graus' },
      },
      required: ['type', 'x', 'y'],
    },
  },
  {
    name: 'add_river',
    description: 'Traça um novo rio usando uma spline de pontos suaves.',
    parameters: {
      type: 'object',
      properties: {
        points: {
          type: 'array',
          items: {
            type: 'object',
            properties: { x: { type: 'number' }, y: { type: 'number' } },
            required: ['x', 'y'],
          },
        },
        width: { type: 'number', description: 'Largura do rio em px' },
      },
      required: ['points'],
    },
  },
  {
    name: 'add_road',
    description: 'Conecta dois pontos com uma estrada que contorna o relevo.',
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'] },
        to: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'] },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'add_label',
    description: 'Cria um rótulo de texto tipográfico no mapa para reinos, rios, montanhas ou cidades.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Texto do nome' },
        position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'] },
        font: { type: 'string', enum: ['Cinzel', 'MedievalSharp', 'Uncial Antiqua', 'IM Fell English SC', 'Inter'] },
        size: { type: 'number', description: 'Tamanho da fonte' },
        isBanner: { type: 'boolean', description: 'Moldura de pergaminho decorativa' },
      },
      required: ['text', 'position'],
    },
  },
  {
    name: 'add_marker',
    description: 'Insere um marcador de ponto de interesse numerado com notas e suporte a segredos do mestre.',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        title: { type: 'string' },
        description: { type: 'string' },
        secret: { type: 'boolean', description: 'Visível somente para o mestre' },
        category: { type: 'string', enum: ['combat', 'quest', 'treasure', 'npc', 'poi'] },
      },
      required: ['x', 'y', 'title', 'description'],
    },
  },
  {
    name: 'set_style',
    description: 'Altera o tema visual do mapa para Pergaminho, Aquarela, Atlas ou Arcano.',
    parameters: {
      type: 'object',
      properties: {
        styleId: { type: 'string', enum: ['parchment', 'watercolor', 'atlas', 'arcane'] },
      },
      required: ['styleId'],
    },
  },
  {
    name: 'get_map_state',
    description: 'Retorna um resumo compacto da topologia, estilo e pontos de interesse do mapa atual.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'boolean', description: 'Resumo compacto de entidades' },
      },
    },
  },
  {
    name: 'generate_names',
    description: 'Gera nomes toponímicos por cultura (élfico, anão, humano, orc, arcano) e adiciona ao mapa.',
    parameters: {
      type: 'object',
      properties: {
        culture: { type: 'string', enum: ['elven', 'dwarven', 'human', 'orc', 'arcane'] },
        kind: { type: 'string', enum: ['kingdom', 'settlement', 'mountain', 'river'] },
        count: { type: 'number' },
      },
      required: ['culture', 'kind'],
    },
  },
];
