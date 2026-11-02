/**
 * Google Gemini Provider via Google GenAI REST API
 */

import { AIProvider, AIProviderConfig, ChatMessage, StreamCallback, ToolCall, ToolDefinition } from './types';

export class GeminiProvider implements AIProvider {
  name = 'Google Gemini';

  async testConnection(config: AIProviderConfig): Promise<{ success: boolean; message: string }> {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-2.5-flash'}:generateContent?key=${config.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'ping' }] }],
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        if (res.status === 400 || res.status === 403) return { success: false, message: 'Chave de API inválida ou sem permissão (401/403).' };
        if (res.status === 429) return { success: false, message: 'Limite de requisições excedido (429 Quota).' };
        return { success: false, message: `Erro da API Gemini: ${res.status} - ${error.error?.message || 'Falha na conexão'}` };
      }

      return { success: true, message: 'Conexão com Google Gemini estabelecida com sucesso!' };
    } catch (e: any) {
      return { success: false, message: `Erro de rede ou CORS: ${e.message}` };
    }
  }

  async chatStream(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    config: AIProviderConfig,
    callback: StreamCallback,
    signal?: AbortSignal
  ): Promise<{ text: string; toolCalls: ToolCall[]; usage?: { promptTokens: number; completionTokens: number } }> {
    const model = config.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

    // Format Gemini function declarations
    const functionDeclarations = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    // Convert messages
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => {
        const role = m.role === 'assistant' ? 'model' : 'user';
        return {
          role,
          parts: [{ text: m.content }],
        };
      });

    const systemInstruction = messages.find((m) => m.role === 'system');

    const body: any = {
      contents,
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens ?? 2048,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction.content }],
      };
    }

    if (functionDeclarations.length > 0) {
      body.tools = [{ functionDeclarations }];
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Erro Gemini (${res.status}): ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.find((p: any) => p.text)?.text || '';
    const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall) || [];

    const toolCalls: ToolCall[] = functionCalls.map((fc: any, i: number) => ({
      id: `call-gemini-${Date.now()}-${i}`,
      name: fc.functionCall.name,
      arguments: fc.functionCall.args || {},
    }));

    if (textPart) {
      callback.onChunk(textPart);
    }
    if (toolCalls.length > 0 && callback.onToolCall) {
      toolCalls.forEach((tc) => callback.onToolCall!(tc));
    }

    return {
      text: textPart,
      toolCalls,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      },
    };
  }
}
