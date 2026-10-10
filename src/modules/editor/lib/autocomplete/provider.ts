import {
  type AutocompleteProviderId,
  DEFAULT_AUTOCOMPLETE_MODEL,
  LMSTUDIO_DEFAULT_BASE_URL,
  modelSupportsTemperature,
  modelUsesReasoningTokens,
} from "@/modules/ai/config";
import { buildLanguageModel } from "@/modules/ai/lib/agent";
import { EMPTY_PROVIDER_KEYS } from "@/modules/ai/lib/keyring";
import { generateText } from "ai";
import {
  buildUserPrompt,
  COMPLETION_SYSTEM_PROMPT,
  type CompletionRequest,
} from "./prompt";

export type CompletionDeps = {
  endpointId?: string;
  provider: AutocompleteProviderId;
  modelId: string;
  apiKey: string | null;
  lmstudioBaseURL: string;
  mlxBaseURL?: string;
  ollamaBaseURL?: string;
  openaiCompatibleBaseURL?: string;
};

const MAX_OUTPUT_TOKENS_DEFAULT = 1024;
// Reasoning models burn output tokens on internal thought before producing
// any visible content; with a tight cap they finish_reason="length" with
// empty text. The trim step still caps visible output at MAX_LINES.
const MAX_OUTPUT_TOKENS_REASONING = 4096;

export async function requestCompletion(
  req: CompletionRequest,
  deps: CompletionDeps,
  signal: AbortSignal,
): Promise<string> {
  const modelId =
    deps.modelId.trim() || DEFAULT_AUTOCOMPLETE_MODEL[deps.provider] || "";
  if (!modelId) {
    throw new Error(`No autocomplete model id set for ${deps.provider}.`);
  }
  const keys = { ...EMPTY_PROVIDER_KEYS, [deps.provider]: deps.apiKey };
  const model = await buildLanguageModel(deps.provider, keys, modelId, {
    lmstudioBaseURL: deps.lmstudioBaseURL || LMSTUDIO_DEFAULT_BASE_URL,
    mlxBaseURL: deps.mlxBaseURL,
    ollamaBaseURL: deps.ollamaBaseURL,
    openaiCompatibleBaseURL: deps.openaiCompatibleBaseURL,
  });

  const isReasoning =
    modelUsesReasoningTokens(deps.provider, modelId) ||
    /(?:^|\/)(?:gpt-[5-9]|o[134](?:[-.]|$))/.test(modelId);
  const custom = deps.provider === "openai-compatible";
  const providerOptions = isReasoning
    ? {
        anthropic: { effort: "low" },
        cerebras: { reasoningEffort: "low" },
        groq: { reasoningEffort: "low" },
        openai: { reasoningEffort: "low" },
        "openai-compatible": { reasoningEffort: "low" },
        xai: { reasoningEffort: "low" },
      }
    : undefined;

  const { text, finishReason } = await generateText({
    model,
    system: COMPLETION_SYSTEM_PROMPT,
    prompt: buildUserPrompt(req),
    maxOutputTokens:
      isReasoning || custom
        ? MAX_OUTPUT_TOKENS_REASONING
        : MAX_OUTPUT_TOKENS_DEFAULT,
    maxRetries: 0,
    abortSignal: signal,
    ...(!custom && modelSupportsTemperature(deps.provider, modelId)
      ? { temperature: 0.1 }
      : {}),
    ...(providerOptions ? { providerOptions } : {}),
  });

  if (!text.trim() && finishReason === "length")
    throw new Error(
      "The model exhausted its completion budget without producing code. Select a faster code-completion model.",
    );
  return cleanCompletion(text.replace(/\r\n?/g, "\n"));
}

function cleanCompletion(raw: string): string {
  let t = raw;
  const fence = t.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```\s*$/);
  if (fence) t = fence[1];
  t = t.replace(/^<\|cursor\|>/, "");
  return t;
}
