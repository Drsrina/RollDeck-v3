/**
 * Mock AI Provider for offline testing without API keys
 */

import { AIProvider, AIProviderConfig, ChatMessage, StreamCallback, ToolCall, ToolDefinition } from './types';

export class MockProvider implements AIProvider {
  name = 'Simulador Local (Sem Chave)';

  async testConnection(_config: AIProviderConfig): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: 'Conexão simulada com sucesso! O provedor local funciona sem chaves.',
    };
  }

  async chatStream(
    messages: ChatMessage[],
    _tools: ToolDefinition[],
    _config: AIProviderConfig,
    callback: StreamCallback,
    signal?: AbortSignal
  ): Promise<{ text: string; toolCalls: ToolCall[]; usage: { promptTokens: number; completionTokens: number } }> {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content.toLowerCase() || '';

    let replyText = '';
    const toolCalls: ToolCall[] = [];

    if (lastUserMsg.includes('floresta') || lastUserMsg.includes('norte') || lastUserMsg.includes('vila')) {
      replyText = 'Certamente! Analisei a geografia do mapa. Estou adicionando uma densa floresta ao norte e fundando um novo assentamento costeiro.';
      toolCalls.push(
        {
          id: `call-${Date.now()}-1`,
          name: 'paint_terrain',
          arguments: { biome: 'dense_forest', circle: { x: 600, y: 180, radius: 90 } },
        },
        {
          id: `call-${Date.now()}-2`,
          name: 'add_stamp',
          arguments: { type: 'forest_cluster', x: 580, y: 170, scale: 1.2, rotation: 0 },
        },
        {
          id: `call-${Date.now()}-3`,
          name: 'add_stamp',
          arguments: { type: 'village', x: 720, y: 350, scale: 1.0, rotation: 0 },
        },
        {
          id: `call-${Date.now()}-4`,
          name: 'add_label',
          arguments: { text: 'Vila da Enseada Sombria', position: { x: 720, y: 380 }, font: 'Cinzel', size: 14 },
        }
      );
    } else if (lastUserMsg.includes('descreva') || lastUserMsg.includes('história')) {
      replyText = `Este reino é uma terra de antigas disputas e mistérios esquecidos. Ao sul, as águas profundas guardam rotas mercantis outrora prósperas, vigiadas por fortalezas de pedra. Rumando para as colinas centrais, as vilas agrícolas vivem sob a sombra de rumores sobre câmaras funerárias subterrâneas. Um grande perigo espreita nas terras altas, onde relíquias de uma era arcana começam a pulsar novamente.`;
    } else if (lastUserMsg.includes('gancho') || lastUserMsg.includes('aventura')) {
      replyText = `Aqui estão 3 ganchos de aventura prontos para sua sessão:\n\n1. **O Farol das Almas Perdidas**: Marinheiros relatam luzes azuis fantasmagóricas atraindo navios para os recifes perto do porto.\n2. **O Selo Rombado**: Uma antiga cripta sob as ruínas teve seu feitiço rompido; aldeões próximos têm pesadelos sincronizados.\n3. **A Besta do Desfiladeiro**: A rota da estrada principal foi bloqueada por deslizamentos e grifos famintos descendo das montanhas.`;
    } else if (lastUserMsg.includes('nome') || lastUserMsg.includes('cultura')) {
      replyText = 'Propondo nomes toponímicos baseados na geografia para o reino e suas províncias.';
      toolCalls.push({
        id: `call-${Date.now()}-names`,
        name: 'generate_names',
        arguments: { culture: 'elven', kind: 'settlement', count: 4 },
      });
    } else {
      replyText = `Compreendido! Estou examinando a topologia do seu mapa de RPG. Você pode me pedir para pintar florestas, criar rios, posicionar masmorras com armadilhas, ou gerar descrições e ganchos de aventura para a sua campanha.`;
    }

    // Stream text in small chunks
    const words = replyText.split(' ');
    for (const w of words) {
      if (signal?.aborted) break;
      callback.onChunk(w + ' ');
      await new Promise((r) => setTimeout(r, 20));
    }

    if (toolCalls.length > 0 && callback.onToolCall) {
      toolCalls.forEach((tc) => callback.onToolCall!(tc));
    }

    return {
      text: replyText,
      toolCalls,
      usage: { promptTokens: 120, completionTokens: 180 },
    };
  }
}
