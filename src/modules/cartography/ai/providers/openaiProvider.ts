/**
 * OpenAI / OpenRouter / Custom Endpoint (Ollama, LM Studio, vLLM) Provider
 */

import { AIProvider, AIProviderConfig, ChatMessage, StreamCallback, ToolCall, ToolDefinition } from './types';

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI / Compatível';

  private getBaseUrl(config: AIProviderConfig): string {
    if (config.provider === 'openrouter') {
      return 'https://openrouter.ai/api/v1';
    }
    if (config.provider === 'custom_openai' && config.baseUrl) {
      return config.baseUrl.replace(/\/+$/, '');
    }
    return config.baseUrl ? config.baseUrl.replace(/\/+$/, '') : 'https://api.openai.com/v1';
  }

  async testConnection(config: AIProviderConfig): Promise<{ success: boolean; message: string }> {
    try {
      const baseUrl = this.getBaseUrl(config);
      const res = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) return { success: false, message: 'Chave de API inválida (401 Unauthorized).' };
        if (res.status === 429) return { success: false, message: 'Limite de cota excedido (429 Rate Limit).' };
        return { success: false, message: `Erro HTTP ${res.status}: ${res.statusText}` };
      }

      return { success: true, message: 'Conexão com endpoint OpenAI estabelecida com sucesso!' };
    } catch (e: any) {
      return { success: false, message: `Falha de rede ou CORS ao conectar no endpoint: ${e.message}` };
    }
  }

  async chatStream(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    config: AIProviderConfig,
    callback: StreamCallback,
    signal?: AbortSignal
  ): Promise<{ text: string; toolCalls: ToolCall[]; usage?: { promptTokens: number; completionTokens: number } }> {
    const baseUrl = this.getBaseUrl(config);
    const model = config.model || (config.provider === 'openrouter' ? 'openai/gpt-4o-mini' : 'gpt-4o');

    const formattedTools = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const formattedMessages = messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: m.toolCallId,
          content: m.content,
        };
      }
      return {
        role: m.role,
        content: m.content,
      };
    });

    const body: any = {
      model,
      messages: formattedMessages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 2048,
    };

    if (formattedTools.length > 0) {
      body.tools = formattedTools;
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Erro OpenAI (${res.status}): ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const message = choice?.message;
    const text = message?.content || '';

    const toolCalls: ToolCall[] = (message?.tool_calls || []).map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || '{}'),
    }));

    if (text) {
      callback.onChunk(text);
    }
    if (toolCalls.length > 0 && callback.onToolCall) {
      toolCalls.forEach((tc) => callback.onToolCall!(tc));
    }

    return {
      text,
      toolCalls,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
      },
    };
  }
}
