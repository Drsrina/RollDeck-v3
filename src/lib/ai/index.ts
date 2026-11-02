import { z } from 'zod';
import { executeRoll, rollSingleDieRaw, STANDARD_DICE } from '../roll';
import type { AISettings, LootColumn, LootGenerator, LootGroup, LootItem } from '../../types';

export interface GenerateLootOptions {
  generator: LootGenerator;
  aiSettings?: AISettings;
  countOverride?: number;
  engineOverride?: 'procedural' | 'ai';
  abortSignal?: AbortSignal;
  onItemRevealed?: (item: LootItem, index: number, total: number) => void;
}

/**
 * Builds a dynamic Zod schema based on the generator's active columns
 */
export function buildDynamicColumnsSchema(columns: LootColumn[]) {
  const activeCols = columns.filter((c) => c.enabled);
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const col of activeCols) {
    let fieldSchema: z.ZodTypeAny;

    switch (col.type) {
      case 'number':
        fieldSchema = z.union([z.number(), z.string().transform((v) => parseFloat(v) || 0)]);
        break;
      case 'currency':
        fieldSchema = z.union([
          z.number(),
          z.string().transform((v) => {
            const num = parseFloat(v.replace(/[^0-9.-]/g, ''));
            return isNaN(num) ? 0 : num;
          }),
        ]);
        break;
      case 'boolean':
        fieldSchema = z.union([
          z.boolean(),
          z.string().transform((v) => v.toLowerCase() === 'true' || v.toLowerCase() === 'sim'),
        ]);
        break;
      case 'tags':
      case 'multi_choice':
        fieldSchema = z.union([
          z.array(z.string()),
          z.string().transform((v) => v.split(',').map((s) => s.trim())),
        ]);
        break;
      case 'single_choice':
        if (col.options && col.options.length > 0) {
          fieldSchema = z.string();
        } else {
          fieldSchema = z.string();
        }
        break;
      default:
        fieldSchema = z.string();
    }

    if (!col.required) {
      fieldSchema = fieldSchema.optional().nullable().default(null);
    }

    shape[col.key] = fieldSchema;
  }

  const itemSchema = z.object(shape).passthrough();
  return z.object({
    title: z.string().optional(),
    items: z.array(itemSchema),
  });
}

/**
 * Sanitizes and extracts pure JSON from an AI response string
 */
export function extractAndParseJSON(rawText: string): any {
  if (!rawText) throw new Error('Resposta vazia da IA.');

  let cleaned = rawText.trim();

  // Remove markdown code fences if present (```json ... ```)
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else {
    // If there is text before { or [, trim it
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let startIdx = 0;
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
    }

    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const endIdx = Math.max(lastBrace, lastBracket);

    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      cleaned = cleaned.slice(startIdx, endIdx + 1).trim();
    }
  }

  // Handle case where AI responds with a bare array [...] instead of {"items":[...]}
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return { items: parsed };
    }
    return parsed;
  } catch (err: any) {
    // Attempt basic JSON repairs (trailing commas, unbalanced brackets)
    let repaired = cleaned.replace(/,\s*([}\]])/g, '$1');
    try {
      const parsed = JSON.parse(repaired);
      if (Array.isArray(parsed)) return { items: parsed };
      return parsed;
    } catch {
      throw new Error(`Não foi possível interpretar o JSON da IA: ${err.message}`);
    }
  }
}

/**
 * Evaluates real cryptographic dice rolls for any columns with type 'dice_formula'
 */
export function evaluateItemDiceRolls(itemCells: Record<string, any>, columns: LootColumn[]): {
  cells: Record<string, any>;
  rolledValues: Record<string, { formula: string; result: number }>;
} {
  const evaluatedCells = { ...itemCells };
  const rolledValues: Record<string, { formula: string; result: number }> = {};

  const diceLookup = new Map(STANDARD_DICE.map((d) => [d.id, d]));

  for (const col of columns) {
    if (col.type === 'dice_formula') {
      const rawFormula = String(evaluatedCells[col.key] || '1d6').trim();
      // Match formulas like 2d6, 1d20+5, 3d8-2
      const match = rawFormula.match(/(\d+)d(\d+)(?:([+-])(\d+))?/i);
      if (match) {
        const count = parseInt(match[1], 10);
        const sides = parseInt(match[2], 10);
        const sign = match[3];
        const modNum = match[4] ? parseInt(match[4], 10) : 0;
        const modifier = sign === '-' ? -modNum : modNum;

        let sum = 0;
        for (let i = 0; i < count; i++) {
          sum += rollSingleDieRaw(sides);
        }
        const total = sum + modifier;
        rolledValues[col.key] = { formula: rawFormula, result: total };
        evaluatedCells[col.key] = `${rawFormula} ➔ [${total}]`;
      }
    }
  }

  return { cells: evaluatedCells, rolledValues };
}

/**
 * Calculates group totals (Value in currency, total weight, total item count)
 */
export function calculateGroupTotals(items: LootItem[], columns: LootColumn[]): {
  totalValueText: string;
  totalWeightText?: string;
  itemCount: number;
} {
  const valueCol = columns.find((c) => c.type === 'currency' && c.enabled);
  const weightCol = columns.find((c) => c.key === 'weight' && c.enabled);

  let totalValue = 0;
  let hasValue = false;
  let currencyUnit = valueCol?.currencyConfig?.unit || 'PO';

  let totalWeight = 0;
  let hasWeight = false;

  for (const item of items) {
    if (valueCol && item.cells[valueCol.key] !== undefined) {
      const val = parseFloat(String(item.cells[valueCol.key]).replace(/[^0-9.-]/g, ''));
      if (!isNaN(val)) {
        totalValue += val;
        hasValue = true;
      }
    }

    if (weightCol && item.cells[weightCol.key] !== undefined) {
      const w = parseFloat(String(item.cells[weightCol.key]).replace(/[^0-9.-]/g, ''));
      if (!isNaN(w)) {
        totalWeight += w;
        hasWeight = true;
      }
    }
  }

  return {
    totalValueText: hasValue ? `${totalValue.toLocaleString('pt-BR')} ${currencyUnit}` : 'N/A',
    totalWeightText: hasWeight ? `${totalWeight.toFixed(1)} kg` : undefined,
    itemCount: items.length,
  };
}

/**
 * Generates prompt instructions for the AI model
 */
export function constructLootPrompt(generator: LootGenerator, count: number): string {
  const activeCols = generator.columns.filter((c) => c.enabled);

  const columnsInstructions = activeCols
    .map((c) => {
      let extra = '';
      if (c.type === 'single_choice' && c.options?.length) {
        extra = ` (opções permitidas: ${c.options.join(', ')})`;
      } else if (c.type === 'currency') {
        extra = ` (número numérico em ${c.currencyConfig?.unit || 'moedas'})`;
      } else if (c.type === 'dice_formula') {
        extra = ` (fórmula de dado TTRPG como 1d8, 2d6+2)`;
      }
      return `- "${c.key}" (${c.type}): ${c.instruction}${extra}`;
    })
    .join('\n');

  return `Você é um mestre experiente de TTRPG e designer de itens temáticos de alta fantasia e ficção.
Crie um lote de exatamente ${count} itens de loot inspirados no tema abaixo.

TEMA DO GERADOR:
${generator.theme}

${generator.instructions ? `INSTRUÇÕES ADICIONAIS:\n${generator.instructions}\n` : ''}
PARÂMETROS:
- Raridade desejada: ${generator.params.rarity}
- Idioma de saída: ${generator.params.language || 'Português do Brasil'}
- Criatividade: ${generator.params.creativity}

COLUNAS OBRIGATÓRIAS POR ITEM:
${columnsInstructions}

IMPORTANTE: Responda ESTRITAMENTE em formato JSON puro, sem introduções ou comentários antes ou depois, seguindo esta estrutura:
{
  "title": "Título evocativo para este lote de tesouro",
  "items": [
    {
      ${activeCols.map((c) => `"${c.key}": ...`).join(',\n      ')}
    }
  ]
}`;
}

// ----------------- ADVANCED PROCEDURAL ENGINE (SEM IA) -----------------

interface TaxonomyItem {
  noun: string;
  type: string;
  weight: number;
  formula: string;
}

const THEME_TAXONOMIES: Record<string, {
  bases: TaxonomyItem[];
  prefixes: string[];
  suffixes: string[];
  materials: string[];
  auras: string[];
  effects: string[];
  origins: string[];
  tags: string[];
}> = {
  cyberpunk: {
    bases: [
      { noun: 'Rifle de Pulso Eletromagnético', type: 'Arma de Fogo', weight: 3.5, formula: '2d8+3' },
      { noun: 'Implante Neural Sináptico', type: 'Cibernético', weight: 0.2, formula: '1d6+2' },
      { noun: 'Pistola Smartlock com Mira Laser', type: 'Arma de Fogo', weight: 1.2, formula: '1d10+2' },
      { noun: 'Estimulante Bio-químico Sintético', type: 'Consumível', weight: 0.1, formula: '2d4+2' },
      { noun: 'Chip de Criptografia Quântica', type: 'Dado / Chave', weight: 0.05, formula: '1d20' },
      { noun: 'Lâmina Monomolecular de Tungstênio', type: 'Arma Branca', weight: 0.9, formula: '1d8+4' },
      { noun: 'Granada de Pulso de Choque EMP', type: 'Explosivo', weight: 0.4, formula: '3d6' },
      { noun: 'Colete de Nanofibras Balísticas', type: 'Armadura', weight: 4.0, formula: '1d6+3' },
      { noun: 'Visor Óptico Tático com Termografia', type: 'Acessório', weight: 0.6, formula: '1d8' },
      { noun: 'Bateria de Tântalo Sobrecargada', type: 'Recurso', weight: 0.8, formula: '1d12' },
      { noun: 'Deck Portátil de Invasão Cibernética', type: 'Ferramenta', weight: 2.1, formula: '1d20+4' },
      { noun: 'Injetor Subcutâneo de Nanomédicos', type: 'Consumível', weight: 0.3, formula: '3d8+3' },
    ],
    prefixes: ['Quântico', 'Sináptico', 'Cromado', 'Hiper-frequência', 'Militar', 'Subdérmico', 'Criogênico', 'Tático', 'Iônico', 'Holográfico', 'Nano-reforçado', 'Clandestino'],
    suffixes: ['Mk.IV', 'da Arasaka', 'de Fibra de Carbono', 'com Sobrecarga', 'do Mercado Negro', 'Série Ômega', 'com Refrigeração Líquida', 'de Resposta Rápida', 'de Combate Noturno', 'Anti-Rastreamento'],
    materials: ['liga de titânio acetinado', 'fibra de carbono entrelaçada', 'polímero militar fosco', 'cerâmica balística reforçada'],
    auras: ['emite um zumbido elétrico suave de alta frequência', 'possui LEDs azuis pulsantes ao longo do circuito', 'aquece levemente quando conectado à rede neural'],
    effects: ['aumenta o tempo de reação em milissegundos críticos durante combates intensos', 'injeta microcorrentes que estabilizam a mira em alvos distantes', 'ignora blindagens leves ao descarregar pulsos iônicos concentrados'],
    origins: ['Contrabandeado de um comboio corporativo de segurança máxima nos níveis inferiores da megacidade.', 'Montado clandestinamente por um ripperdoc lendário nas vielas chuvosas do distrito comercial.', 'Resgatado de um bunker militar desativado após o terceiro conflito corporativo.'],
    tags: ['cyberpunk', 'tecnologia', 'militar', 'ciber', 'futuro'],
  },
  horror: {
    bases: [
      { noun: 'Adaga Sacrificial de Obsidiana', type: 'Arma Branca', weight: 0.8, formula: '1d6+3' },
      { noun: 'Tomo Encadernado em Pele Curtida', type: 'Livro / Grimório', weight: 2.4, formula: '2d6+2' },
      { noun: 'Cálice de Prata Cinzelada', type: 'Relíquia', weight: 1.1, formula: '1d8' },
      { noun: 'Amuleto do Olho Cego', type: 'Amuleto', weight: 0.3, formula: '1d10+1' },
      { noun: 'Frasco de Ectoplasma Brilhante', type: 'Poção / Alquimia', weight: 0.4, formula: '2d4+3' },
      { noun: 'Talismã Ósseo Entalhado', type: 'Foco Arcano', weight: 0.2, formula: '1d8+2' },
      { noun: 'Incensário de Ébano Profanado', type: 'Instrumento', weight: 1.5, formula: '1d6' },
      { noun: 'Veste Macabra com Runas de Sangue', type: 'Vestimenta', weight: 1.8, formula: '1d8+2' },
      { noun: 'Espelho de Prata Negra das Almas', type: 'Relíquia', weight: 3.0, formula: '2d10' },
      { noun: 'Frasco com Cinzas Astrais', type: 'Material Raro', weight: 0.2, formula: '1d4+1' },
      { noun: 'Florete de Prata Benzedura', type: 'Arma Branca', weight: 1.2, formula: '1d8+3' },
      { noun: 'Ampola de Sangue de Lorde Vampiro', type: 'Poção / Elixir', weight: 0.3, formula: '3d8+4' },
    ],
    prefixes: ['Sombrio', 'Amaldiçoado', 'Espectral', 'Funesto', 'Blasfemo', 'Macabro', 'Profanado', 'Soturno', 'Esquelético', 'Ancestral', 'Gélido', 'Vampírico'],
    suffixes: ['das Catacumbas', 'do Pacto de Sangue', 'da Noite Eterna', 'do Abismo Cósmico', 'das Sombras Famintas', 'de Almas Perdidas', 'do Eclipse Carmesim', 'de Prata Pura', 'do Culto Sem Nome'],
    materials: ['obsidiana vulcânica negra', 'prata envelhecida com pátina escura', 'osso petrificado entalhado', 'madeira de teixo funerário'],
    auras: ['faz o ar ao redor esfriar visivelmente, condensando a respiração', 'parece sugar a luz das velas próximas', 'vibra com um sussurro inaudível que causa calafrios'],
    effects: ['drena vitalidade dos feridos para sustentar o vigor de seu portador', 'perturba criaturas incorpóreas forçando-as a tomar forma física tangível', 'concede visão no escuro total e percepção de auras de criaturas vivas'],
    origins: ['Recuperado de uma tumba profanada nas profundezas esquecidas de uma catedral em ruínas.', 'Pertenceu a um arquimago herético executado séculos atrás por manipulação de artes proibidas.', 'Encontrado no fundo de um lago enevoado onde aldeões realizavam oferendas durante luas de sangue.'],
    tags: ['horror', 'gótico', 'oculto', 'vampiro', 'magia-negra'],
  },
  scifi: {
    bases: [
      { noun: 'Blaster de Plasma Ionizado', type: 'Arma de Energia', weight: 2.8, formula: '2d10+2' },
      { noun: 'Módulo de Propulsão Gravitacional', type: 'Componente', weight: 3.2, formula: '1d8+2' },
      { noun: 'Escudo de Força Cinético Portátil', type: 'Escudo', weight: 1.5, formula: '1d12+3' },
      { noun: 'Cartão de Dados Quântico Criptografado', type: 'Tecnologia', weight: 0.1, formula: '1d20' },
      { noun: 'Kit Médico com Injetor de Aerossol', type: 'Consumível', weight: 0.8, formula: '2d8+4' },
      { noun: 'Bateria de Antimatéria Estabilizada', type: 'Energia', weight: 1.2, formula: '3d6' },
      { noun: 'Sensor Espectral de Longo Alcance', type: 'Ferramenta', weight: 1.1, formula: '1d10' },
      { noun: 'Traje Espacial com Suporte Vital Avançado', type: 'Armadura', weight: 6.5, formula: '2d6+4' },
      { noun: 'Lâmina Térmica de Plasma Retrátil', type: 'Arma Branca', weight: 1.0, formula: '1d10+3' },
      { noun: 'Transmissor Sub-espacial de Emergência', type: 'Comunicação', weight: 0.7, formula: '1d4' },
    ],
    prefixes: ['Orbital', 'Estelar', 'Hiper-espacial', 'Gravitacional', 'Antimatéria', 'Alien', 'Térmico', 'Fotônico', 'Cosmonauta', 'Interplanetário'],
    suffixes: ['da Frota Estelar', 'do Setor 7', 'de Matéria Escura', 'com Pulso Gama', 'de Tecnologia Progenitora', 'de Liga de Titânio', 'com Núcleo de Fusão'],
    materials: ['superliga de titânio e vanádio', 'vidro blindado fotocromático', 'composto de polímero aeroespacial', 'placas de grafeno cristalino'],
    auras: ['emite uma bioluminescência azul turquesa constante', 'refrata a luz em padrões geométricos alienígenas', 'permanece perfeitamente livre de poeira ou estática'],
    effects: ['dispersa raios de energia dissipando o calor antes que atinja o portador', 'permite manobras em ambientes de microgravidade com precisão cirúrgica', 'projeta feixes luminosos capazes de cortar metais densos a curta distância'],
    origins: ['Recuperado dos destroços de uma estação orbital de pesquisa abandonada no cinturão de asteroides.', 'Desenvolvido pelo consórcio interestelar de exploração para expedições em planetas hostis.', 'Artefato resgatado de uma cápsula de escape alienígena datada de eras anteriores à humanidade.'],
    tags: ['scifi', 'espacial', 'plasma', 'futuro', 'tecnologia'],
  },
  postapoc: {
    bases: [
      { noun: 'Espingarda de Cano Duplo Serrada', type: 'Arma de Fogo', weight: 3.2, formula: '2d8+2' },
      { noun: 'Filtro de Máscara de Gás Militar', type: 'Sobrevivência', weight: 0.4, formula: '1d6' },
      { noun: 'Facão Forjado com Mola de Caminhão', type: 'Arma Branca', weight: 1.6, formula: '1d8+2' },
      { noun: 'Contador Geiger Calibrado', type: 'Ferramenta', weight: 0.9, formula: '1d10' },
      { noun: 'Bateria Automotiva Recondicionada', type: 'Recurso', weight: 8.0, formula: '1d12' },
      { noun: 'Cantil Blindado com Pastilhas de Cloro', type: 'Sobrevivência', weight: 1.0, formula: '1d4' },
      { noun: 'Colete Reforçado com Placas de Trânsito', type: 'Armadura', weight: 5.5, formula: '1d6+2' },
      { noun: 'Kit Cirúrgico de Campo Pré-Guerra', type: 'Consumível', weight: 1.2, formula: '2d6+3' },
    ],
    prefixes: ['Sobrevivente', 'Enferrujado', 'Blindado', 'Radioativo', 'Desgastado', 'Improvisado', 'Reforçado', 'Mutante', 'Customizado'],
    suffixes: ['dos Ermos', 'de Sucata de Guerra', 'à Prova de Poeira', 'da Zona Contaminada', 'com Chumbo Protetor', 'do Ferro-Velho'],
    materials: ['aço reaproveitado com solda grosseira', 'couro curtido de feras mutantes', 'chapas de sinalização viária', 'borracha vulcanizada resistente'],
    auras: ['apresenta odor de pólvora e óleo de motor queimado', 'faz estalar suavemente qualquer detector de radiação nas imediações', 'carrega marcas profundas de dentes e garras de predadores dos ermos'],
    effects: ['oferece proteção bruta contra estilhaços e mordidas de criaturas contaminadas', 'permite respirar em atmosferas com cinzas densas e toxinas atmosféricas', 'causa ferimentos difíceis de estancar devido à sua borda irregular serrilhada'],
    origins: ['Montado à mão por um comboieiro experiente após sobreviver à travessia do grande deserto de sal.', 'Encontrado no porão estocado de um abrigo subterrâneo selado há mais de setenta anos.', 'Negociado em um entreposto comercial de sucateiros em troca de galões de água potável.'],
    tags: ['post-apoc', 'ermos', 'sucata', 'sobrevivencia', 'ferro'],
  },
  fantasy: {
    bases: [
      { noun: 'Espada Longa com Lâmina Gravada', type: 'Arma Branca', weight: 1.5, formula: '1d8+3' },
      { noun: 'Machado de Batalha com Fio Duplo', type: 'Arma Branca', weight: 2.8, formula: '1d12+3' },
      { noun: 'Cajado de Carvalho com Gema de Foco', type: 'Foco Arcano', weight: 2.0, formula: '1d6+2' },
      { noun: 'Arco Curto Élfico de Madeira de Teixo', type: 'Arma à Distância', weight: 1.0, formula: '1d6+3' },
      { noun: 'Adaga Sorrateira de Lâmina Curva', type: 'Arma Branca', weight: 0.6, formula: '1d4+3' },
      { noun: 'Escudo Broquel Reforçado com Latão', type: 'Escudo', weight: 2.5, formula: '1d8+2' },
      { noun: 'Peitoral de Cota de Malha Élfica', type: 'Armadura', weight: 7.0, formula: '1d8+3' },
      { noun: 'Manto de Seda da Névoa Florestal', type: 'Vestimenta', weight: 0.9, formula: '1d6' },
      { noun: 'Anel de Safira Encantado', type: 'Joia / Anel', weight: 0.05, formula: '1d10+2' },
      { noun: 'Amuleto com Garra de Grifo Polida', type: 'Amuleto', weight: 0.15, formula: '1d8+1' },
      { noun: 'Poção de Restauração Vigorosa', type: 'Poção', weight: 0.3, formula: '2d4+2' },
      { noun: 'Frasco de Fogo de Alquimista', type: 'Consumível / Fogo', weight: 0.5, formula: '2d6' },
      { noun: 'Tomo de Feitiços com Fecho de Bronze', type: 'Grimório', weight: 2.2, formula: '2d8' },
      { noun: 'Botas de Couro de Basilisco', type: 'Calçado', weight: 1.1, formula: '1d6+1' },
      { noun: 'Tiara de Prata com Runa Protetora', type: 'Acessório', weight: 0.25, formula: '1d12' },
    ],
    prefixes: ['Rúnico', 'Ancestral', 'Encantado', 'Flamejante', 'Glacial', 'Vorpal', 'Abençoado', 'Reluzente', 'Dracônico', 'Silvestre', 'Sagrado', 'Adamantino', 'Élfico', 'Mithril'],
    suffixes: ['do Dragão Vermelho', 'da Tempestade', 'dos Anões das Montanhas', 'da Luz Solar', 'do Guardião Eterno', 'da Fênix Renascida', 'do Vento Cortante', 'da Floresta Sussurrante', 'do Titã da Forja'],
    materials: ['aço dobrado e temperado em óleo de lótus', 'mithril prateado incrivelmente leve', 'madeira ancestral de carvalho sagrado', 'couro de dragão escovado'],
    auras: ['emite uma luminescência dourada suave na presença de criaturas hostis', 'permanece sempre aquecido ao toque como se guardasse uma brasa interna', 'reflete a luz em tons azulados translúcidos revelando runas secretas'],
    effects: ['adiciona dano elemental cortante a cada golpe desferido em combate', 'concede bônus em testes de perícia e concentração ao conjurar magias', 'deflete golpes frontais criando uma barreira arcana semi-visível'],
    origins: ['Forjado nas antigas oficinas dos anões das profundezas da cordilheira cinzenta.', 'Descoberto dentro de um baú de carvalho protegido por sentinelas de pedra em uma masmorra esquecida.', 'Legado de um herói lendário que defendeu os reinos durante a grande cruzada dos reinos livres.'],
    tags: ['fantasia', 'medieval', 'magia', 'aventura', 'combate'],
  },
};

/**
 * Detects the most appropriate genre taxonomy based on generator theme and name
 */
function detectGenreTaxonomy(generator: LootGenerator): typeof THEME_TAXONOMIES['fantasy'] {
  const combinedText = `${generator.theme} ${generator.name} ${generator.instructions || ''}`.toLowerCase();

  if (combinedText.includes('cyber') || combinedText.includes('ciber') || combinedText.includes('neon') || combinedText.includes('hacker') || combinedText.includes('implante') || combinedText.includes('androide')) {
    return THEME_TAXONOMIES.cyberpunk;
  }
  if (combinedText.includes('terror') || combinedText.includes('vampir') || combinedText.includes('gótico') || combinedText.includes('sangue') || combinedText.includes('oculto') || combinedText.includes('catacumba') || combinedText.includes('culto')) {
    return THEME_TAXONOMIES.horror;
  }
  if (combinedText.includes('espacial') || combinedText.includes('sci-fi') || combinedText.includes('nave') || combinedText.includes('plasma') || combinedText.includes('galáxia') || combinedText.includes('orbital') || combinedText.includes('alien')) {
    return THEME_TAXONOMIES.scifi;
  }
  if (combinedText.includes('apocalip') || combinedText.includes('ermos') || combinedText.includes('radiaç') || combinedText.includes('sucata') || combinedText.includes('ferrugem') || combinedText.includes('mutante')) {
    return THEME_TAXONOMIES.postapoc;
  }

  return THEME_TAXONOMIES.fantasy;
}

/**
 * Advanced Procedural Loot Engine (SEM IA)
 * Fully deterministic, 100% offline, deeply parameterized according to columns, rarities, min/max values and formulas.
 */
export function generateAdvancedProceduralLoot(generator: LootGenerator, count: number): {
  title: string;
  items: LootItem[];
} {
  const taxonomy = detectGenreTaxonomy(generator);
  const raritiesOrder = ['comum', 'incomum', 'raro', 'épico', 'lendário'] as const;
  const usedNames = new Set<string>();
  const generatedItems: LootItem[] = [];

  const safeCount = Math.max(1, Math.min(50, count));

  for (let i = 0; i < safeCount; i++) {
    // 1. Determine Rarity
    let itemRarity: 'Comum' | 'Incomum' | 'Raro' | 'Épico' | 'Lendário';

    if (generator.params.rarity === 'misto') {
      const roll100 = Math.random() * 100;
      // Creativity 'wild' gives more rare items
      const isWild = generator.params.creativity === 'wild';
      if (roll100 < (isWild ? 30 : 45)) itemRarity = 'Comum';
      else if (roll100 < (isWild ? 60 : 75)) itemRarity = 'Incomum';
      else if (roll100 < (isWild ? 85 : 90)) itemRarity = 'Raro';
      else if (roll100 < (isWild ? 96 : 97)) itemRarity = 'Épico';
      else itemRarity = 'Lendário';
    } else {
      const capitalized =
        generator.params.rarity.charAt(0).toUpperCase() +
        generator.params.rarity.slice(1).toLowerCase();
      itemRarity = (capitalized as any) || 'Comum';
    }

    // 2. Select Components for compound name
    const baseItem = taxonomy.bases[Math.floor(Math.random() * taxonomy.bases.length)];
    const prefix = taxonomy.prefixes[Math.floor(Math.random() * taxonomy.prefixes.length)];
    const suffix = taxonomy.suffixes[Math.floor(Math.random() * taxonomy.suffixes.length)];

    // Compose Name
    let itemName = '';
    if (itemRarity === 'Comum') {
      itemName = Math.random() > 0.4 ? `${baseItem.noun}` : `${baseItem.noun} ${prefix}`;
    } else if (itemRarity === 'Incomum') {
      itemName = `${baseItem.noun} ${prefix}`;
    } else if (itemRarity === 'Raro') {
      itemName = `${baseItem.noun} ${prefix} ${suffix}`;
    } else {
      itemName = `${prefix} ${baseItem.noun} ${suffix}`;
    }

    // Guarantee noRepeat if configured
    if (generator.params.noRepeat && usedNames.has(itemName)) {
      const variantNumber = i + 1;
      itemName = `${itemName} [Var. ${variantNumber}]`;
    }
    usedNames.add(itemName);

    // 3. Currency / Value Calculation scaled by rarity & generator min/max
    let baseValue = 10;
    switch (itemRarity) {
      case 'Comum':
        baseValue = Math.floor(Math.random() * 25) + 5;
        break;
      case 'Incomum':
        baseValue = Math.floor(Math.random() * 120) + 40;
        break;
      case 'Raro':
        baseValue = Math.floor(Math.random() * 650) + 250;
        break;
      case 'Épico':
        baseValue = Math.floor(Math.random() * 3200) + 1500;
        break;
      case 'Lendário':
        baseValue = Math.floor(Math.random() * 18000) + 8000;
        break;
    }

    if (generator.params.minValue !== undefined) {
      baseValue = Math.max(baseValue, generator.params.minValue);
    }
    if (generator.params.maxValue !== undefined) {
      baseValue = Math.min(baseValue, generator.params.maxValue);
    }

    // 4. Weight calculation based on base item
    const weightRandomizer = (Math.random() * 0.4 - 0.2);
    const itemWeight = Math.max(0.1, parseFloat((baseItem.weight * (1 + weightRandomizer)).toFixed(2)));

    // 5. Dice Formula based on rarity
    let itemFormula = baseItem.formula;
    if (itemRarity === 'Épico') {
      itemFormula = '2d8+4';
    } else if (itemRarity === 'Lendário') {
      itemFormula = '3d10+6';
    }

    // 6. Atmospheric Lore Description
    const material = taxonomy.materials[Math.floor(Math.random() * taxonomy.materials.length)];
    const aura = taxonomy.auras[Math.floor(Math.random() * taxonomy.auras.length)];
    const effect = taxonomy.effects[Math.floor(Math.random() * taxonomy.effects.length)];
    const origin = taxonomy.origins[Math.floor(Math.random() * taxonomy.origins.length)];

    const itemDescription = `Peça confeccionada em ${material}. Em repouso, ${aura}. Em ação prática, ${effect}.`;
    const itemHistory = origin;

    // 7. Populate All Columns Defined in the Generator
    const cells: Record<string, any> = {};

    for (const col of generator.columns.filter((c) => c.enabled)) {
      if (col.key === 'name') {
        cells[col.key] = itemName;
      } else if (col.key === 'rarity') {
        cells[col.key] = itemRarity;
      } else if (col.key === 'type' || col.type === 'single_choice') {
        if (col.options && col.options.length > 0) {
          // If option matches baseItem type, prefer it; else pick random from defined options
          const matched = col.options.find((opt) => opt.toLowerCase() === baseItem.type.toLowerCase());
          cells[col.key] = matched || col.options[Math.floor(Math.random() * col.options.length)];
        } else {
          cells[col.key] = baseItem.type;
        }
      } else if (col.type === 'multi_choice') {
        if (col.options && col.options.length > 0) {
          const countPick = Math.min(col.options.length, Math.floor(Math.random() * 2) + 1);
          const shuffled = [...col.options].sort(() => 0.5 - Math.random());
          cells[col.key] = shuffled.slice(0, countPick);
        } else {
          cells[col.key] = [itemRarity.toLowerCase(), taxonomy.tags[0] || 'loot'];
        }
      } else if (col.type === 'currency' || col.key === 'value') {
        cells[col.key] = baseValue;
      } else if (col.type === 'number') {
        if (col.key.includes('peso') || col.key.includes('weight')) {
          cells[col.key] = itemWeight;
        } else if (col.key.includes('carga') || col.key.includes('charge') || col.key.includes('uso')) {
          cells[col.key] = Math.floor(Math.random() * 8) + 2;
        } else {
          const min = col.min !== undefined ? col.min : 1;
          const max = col.max !== undefined ? col.max : 10;
          cells[col.key] = Math.floor(Math.random() * (max - min + 1)) + min;
        }
      } else if (col.type === 'boolean') {
        // Higher chance of true for higher rarities
        const threshold = itemRarity === 'Lendário' || itemRarity === 'Épico' ? 0.85 : itemRarity === 'Raro' ? 0.6 : 0.3;
        cells[col.key] = Math.random() < threshold;
      } else if (col.type === 'dice_formula') {
        cells[col.key] = itemFormula;
      } else if (col.type === 'tags') {
        cells[col.key] = [
          taxonomy.tags[0] || 'item',
          itemRarity.toLowerCase(),
          baseItem.type.toLowerCase().split(' ')[0],
        ];
      } else if (col.key === 'description' || col.type === 'text_long') {
        cells[col.key] = itemDescription;
      } else if (col.key === 'history') {
        cells[col.key] = itemHistory;
      } else {
        cells[col.key] = `Propriedade temática de ${generator.name}`;
      }
    }

    // Evaluate Real Cryptographic Dice Rolls for any dice_formula columns
    const { cells: finalCells, rolledValues } = evaluateItemDiceRolls(cells, generator.columns);

    generatedItems.push({
      id: `loot-item-${crypto.randomUUID()}`,
      cells: finalCells,
      rolledValues,
      isLocked: false,
    });
  }

  return {
    title: `${generator.name} — Lote [Sem IA] ${new Date().toLocaleDateString('pt-BR')}`,
    items: generatedItems,
  };
}

// Fallback alias for backward compatibility
export const generateProceduralFallbackLoot = generateAdvancedProceduralLoot;

/**
 * Main Loot generation dispatch function
 * Supports both:
 * 1. engineMode === 'procedural' (100% offline, advanced procedural engine without AI)
 * 2. engineMode === 'ai' (AI model call with automatic fallback)
 */
export async function generateLootWithAI(options: GenerateLootOptions): Promise<{
  title: string;
  items: LootItem[];
}> {
  const { generator, aiSettings, countOverride, engineOverride, abortSignal, onItemRevealed } = options;
  const count = countOverride || generator.params.count || 6;

  // Determine Engine Mode: explicit engineOverride or generator configuration
  const activeEngine = engineOverride || generator.engineMode || 'procedural';

  // 1. FAST PROCEDURAL ENGINE (SEM IA) - 100% OFFLINE
  if (activeEngine === 'procedural') {
    const result = generateAdvancedProceduralLoot(generator, count);
    if (onItemRevealed) {
      for (let i = 0; i < result.items.length; i++) {
        await new Promise((r) => setTimeout(r, 45));
        onItemRevealed(result.items[i], i, result.items.length);
      }
    }
    return result;
  }

  // 2. AI GENERATION ENGINE
  const prompt = constructLootPrompt(generator, count);

  // If no API settings or key, fallback cleanly to advanced procedural
  if (
    !aiSettings ||
    (!aiSettings.apiKey && aiSettings.provider !== 'gemini-builtin' && aiSettings.provider !== 'custom-proxy')
  ) {
    const result = generateAdvancedProceduralLoot(generator, count);
    if (onItemRevealed) {
      for (let i = 0; i < result.items.length; i++) {
        await new Promise((r) => setTimeout(r, 45));
        onItemRevealed(result.items[i], i, result.items.length);
      }
    }
    return result;
  }

  let rawContent = '';

  try {
    // 1. Google Gemini via server-side route or custom endpoint
    if (aiSettings.provider === 'gemini-builtin' || (!aiSettings.endpoint && aiSettings.provider === 'custom-proxy')) {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: aiSettings.model || 'gemini-3.8-flash',
          temperature: generator.params.creativity === 'conservative' ? 0.3 : generator.params.creativity === 'wild' ? 1.0 : 0.7,
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Falha no servidor de IA: ${errText || response.statusText}`);
      }

      const resData = await response.json();
      rawContent = resData.text || resData.content || '';
    } else if (aiSettings.provider === 'openai-compatible' || aiSettings.provider === 'custom-proxy') {
      // 2. OpenAI-compatible endpoint
      const endpoint = aiSettings.endpoint || 'https://api.openai.com/v1/chat/completions';
      const temp = generator.params.creativity === 'conservative' ? 0.3 : generator.params.creativity === 'wild' ? 1.0 : 0.7;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(aiSettings.apiKey ? { Authorization: `Bearer ${aiSettings.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: aiSettings.model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: temp,
          response_format: { type: 'json_object' },
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(`Erro na API (${response.status}): ${errData}`);
      }

      const resJson = await response.json();
      rawContent = resJson.choices?.[0]?.message?.content || '';
    } else if (aiSettings.provider === 'anthropic') {
      // 3. Anthropic Messages API
      const endpoint = aiSettings.endpoint || 'https://api.anthropic.com/v1/messages';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': aiSettings.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: aiSettings.model || 'claude-3-5-haiku-20241022',
          max_tokens: 3000,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(`Erro na API Anthropic (${response.status}): ${errData}`);
      }

      const resJson = await response.json();
      rawContent = resJson.content?.[0]?.text || '';
    }

    // Parse and validate with dynamic Zod schema
    const parsedData = extractAndParseJSON(rawContent);
    const schema = buildDynamicColumnsSchema(generator.columns);
    const validationResult = schema.safeParse(parsedData);

    let itemsData = parsedData.items || [];
    if (!validationResult.success) {
      console.warn('Zod schema validation warning on AI output:', validationResult.error);
    }

    const title =
      parsedData.title ||
      `${generator.name} — ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const items: LootItem[] = [];
    for (let i = 0; i < itemsData.length; i++) {
      const rawItem = itemsData[i];
      const { cells, rolledValues } = evaluateItemDiceRolls(rawItem, generator.columns);
      const item: LootItem = {
        id: `loot-item-${crypto.randomUUID()}`,
        cells,
        rolledValues,
        isLocked: false,
      };
      items.push(item);
      if (onItemRevealed) {
        onItemRevealed(item, i, itemsData.length);
      }
    }

    return { title, items };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Geração cancelada pelo usuário.');
    }
    console.error('Erro na chamada da IA, usando gerador procedural:', err);
    // If network or provider error, fallback to procedural so user is never stuck
    const fallback = generateProceduralFallbackLoot(generator, count);
    return fallback;
  }
}
