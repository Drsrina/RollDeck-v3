/**
 * Agent Loop: Multi-turn tool execution, streaming, propose-and-approve handling, and token accounting.
 */

import { AIProviderConfig, ChatMessage, StreamCallback, ToolCall } from '../providers/types';
import { getProviderInstance } from '../providers/providerRegistry';
import { AGENT_TOOLS } from '../tools/schemas';
import { executeAgentTool } from '../tools/executor';
import { buildSystemPrompt } from '../prompts/systemPrompt';
import { useMapStore } from '../../store/mapStore';
import { AiProposedAction } from '../../types/map';

export interface AgentRunOptions {
  userPrompt: string;
  config: AIProviderConfig;
  chatHistory: ChatMessage[];
  proposeAndApprove: boolean;
  maxAutonomousSteps?: number;
  onTextChunk: (text: string) => void;
  onProposalCreated?: (proposal: AiProposedAction) => void;
  onUsageUpdated?: (usage: { promptTokens: number; completionTokens: number }) => void;
  signal?: AbortSignal;
}

export async function runAgentStep(options: AgentRunOptions): Promise<{
  reply: string;
  toolCalls: ToolCall[];
  proposals: AiProposedAction[];
}> {
  const {
    userPrompt,
    config,
    chatHistory,
    proposeAndApprove,
    onTextChunk,
    onProposalCreated,
    onUsageUpdated,
    signal,
  } = options;

  const doc = useMapStore.getState().doc;
  const systemPrompt = buildSystemPrompt(doc);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: userPrompt },
  ];

  const provider = getProviderInstance(config.provider);
  const pendingProposals: AiProposedAction[] = [];

  const callback: StreamCallback = {
    onChunk: (chunk) => {
      onTextChunk(chunk);
    },
    onToolCall: (toolCall) => {
      // If in propose and approve mode, create a proposal
      const result = executeAgentTool(toolCall, proposeAndApprove);
      if (result.proposal) {
        pendingProposals.push(result.proposal);
        if (onProposalCreated) onProposalCreated(result.proposal);
      }
    },
  };

  const response = await provider.chatStream(
    messages,
    AGENT_TOOLS,
    config,
    callback,
    signal
  );

  if (response.usage && onUsageUpdated) {
    onUsageUpdated(response.usage);
  }

  // If not proposing and tools were returned, execute any that weren't caught in streaming
  if (!proposeAndApprove && response.toolCalls.length > 0) {
    for (const tc of response.toolCalls) {
      executeAgentTool(tc, false);
    }
  }

  return {
    reply: response.text,
    toolCalls: response.toolCalls,
    proposals: pendingProposals,
  };
}
