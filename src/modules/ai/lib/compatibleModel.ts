import { APICallError, wrapLanguageModel } from "ai";

export function rejectsAssistantInputText(error: unknown): boolean {
  return APICallError.isInstance(error) && error.statusCode === 400 &&
    /input_text/.test(error.message) && /output_text/.test(error.message);
}

export async function compatibleModel(options: {
  modelId: string; baseURL: string; apiKey?: string; fetch: typeof fetch;
}) {
  const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
  const chat = createOpenAICompatible({ name: "openai-compatible", baseURL: options.baseURL, apiKey: options.apiKey, fetch: options.fetch })(options.modelId);
  let useResponses = false;
  const responses = async () => {
    const { createOpenAI } = await import("@ai-sdk/openai");
    return createOpenAI({ baseURL: options.baseURL, apiKey: options.apiKey ?? "", fetch: options.fetch }).responses(options.modelId);
  };
  return wrapLanguageModel({
    model: chat,
    middleware: {
      specificationVersion: "v3",
      wrapGenerate: async ({ doGenerate, params }) => {
        if (useResponses) return (await responses()).doGenerate(params);
        try { return await doGenerate(); }
        catch (error) {
          if (!rejectsAssistantInputText(error)) throw error;
          const result = await (await responses()).doGenerate(params);
          useResponses = true;
          return result;
        }
      },
      wrapStream: async ({ doStream, params }) => {
        if (useResponses) return (await responses()).doStream(params);
        try { return await doStream(); }
        catch (error) {
          if (!rejectsAssistantInputText(error)) throw error;
          const result = await (await responses()).doStream(params);
          useResponses = true;
          return result;
        }
      },
    },
  });
}
