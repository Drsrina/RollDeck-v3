/**
 * Anthropic (Claude) Provider via Messages API
 */

import { AIProvider, AIProviderConfig, ChatMessage, StreamCallback, ToolCall, ToolDefinition } from './types';

export class AnthropicProvider implements AIProvider {
  name = 'Anthropic (Claude)';

  async testConnection(config: AIProviderConfig): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true',
        },
        body: JSON.stringify({
          model: config.model || 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });

      if (!res.ok) {
        if (res.status === 401) return { success: false, message: 'Chave Anthropic inválida (401 Unauthorized).' };
        if (res.status === 429) return { success: false, message: 'Limite de taxa excedido (429).' };
        return { success: false, message: `Erro HTTP Anthropic ${res.status}: ${res.statusText}` };
      }

      return { success: true, message: 'Conexão com Anthropic Claude estabelecida com sucesso!' };
    } catch (e: any) {
      return { success: false, message: `Erro ao conectar na Anthropic: ${e.message}. Verifique CORS ou modo Proxy.` };
    }
  }

  async chatStream(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    config: AIProviderConfig,
    callback: StreamCallback,
    signal?: AbortSignal
  ): Promise<{ text: string; toolCalls: ToolCall[]; usage?: { promptTokens: number; completionTokens: number } }> {
    const model = config.model || 'claude-3-5-sonnet-20241022';

    const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
    const userMessages = messages.filter((m) => m.role !== 'system').map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const formattedTools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));

    const body: any = {
      model,
      max_tokens: config.maxTokens ?? 2048,
      temperature: config.temperature ?? 0.7,
      system: systemMsg,
      messages: userMessages,
    };

    if (formattedTools.length > 0) {
      body.tools = formattedTools;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Erro Anthropic (${res.status}): ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    let text = '';
    const toolCalls: ToolCall[] = [];

    for (const block of data.content || []) {
      if (block.type === 'text') {
        text += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input || {},
        });
      }
    }

    if (text) callback.onChunk(text);
    if (toolCalls.length > 0 && callback.onToolCall) {
      toolCalls.forEach((tc) => callback.onToolCall!(tc));
    }

    return {
      text,
      toolCalls,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
      },
    };
  }
}
