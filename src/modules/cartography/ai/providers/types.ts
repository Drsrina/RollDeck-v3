/**
 * AI Provider Types & Interfaces
 */

export type ProviderType = 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'custom_openai' | 'mock';

export interface AIProviderConfig {
  provider: ProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  useProxy?: boolean;
  proxyUrl?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolParamSchema {
  type: string;
  description?: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParamSchema;
}

export interface StreamCallback {
  onChunk: (deltaText: string) => void;
  onToolCall?: (toolCall: ToolCall) => void;
}

export interface AIProvider {
  name: string;
  testConnection(config: AIProviderConfig): Promise<{ success: boolean; message: string }>;
  chatStream(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    config: AIProviderConfig,
    callback: StreamCallback,
    signal?: AbortSignal
  ): Promise<{ text: string; toolCalls: ToolCall[]; usage?: { promptTokens: number; completionTokens: number } }>;
}
