/**
 * Provider Registry and Factory
 */

import { AIProvider, AIProviderConfig, ProviderType } from './types';
import { GeminiProvider } from './geminiProvider';
import { OpenAIProvider } from './openaiProvider';
import { AnthropicProvider } from './anthropicProvider';
import { MockProvider } from './mockProvider';

export const DEFAULT_AI_CONFIGS: Record<ProviderType, Partial<AIProviderConfig>> = {
  mock: {
    provider: 'mock',
    model: 'simulador-offline',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 15000,
  },
  gemini: {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    baseUrl: 'https://generativelanguage.googleapis.com',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 25000,
  },
  openai: {
    provider: 'openai',
    model: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 25000,
  },
  anthropic: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    baseUrl: 'https://api.anthropic.com/v1',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 30000,
  },
  openrouter: {
    provider: 'openrouter',
    model: 'openai/gpt-4o-mini',
    baseUrl: 'https://openrouter.ai/api/v1',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 25000,
  },
  custom_openai: {
    provider: 'custom_openai',
    model: 'llama3:latest',
    baseUrl: 'http://localhost:11434/v1',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 30000,
  },
};

export function getProviderInstance(providerType: ProviderType): AIProvider {
  switch (providerType) {
    case 'gemini':
      return new GeminiProvider();
    case 'openai':
    case 'openrouter':
    case 'custom_openai':
      return new OpenAIProvider();
    case 'anthropic':
      return new AnthropicProvider();
    case 'mock':
    default:
      return new MockProvider();
  }
}

export async function testProviderConnection(config: AIProviderConfig): Promise<{ success: boolean; message: string }> {
  const provider = getProviderInstance(config.provider);
  return provider.testConnection(config);
}
