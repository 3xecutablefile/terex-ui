import { requestCompletion } from "@/modules/editor/lib/autocomplete/provider";
import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  buildLanguageModel: vi.fn(async () => ({})),
}));
vi.mock("ai", () => ({ generateText: mocks.generateText }));
vi.mock("@/modules/ai/lib/agent", () => ({
  buildLanguageModel: mocks.buildLanguageModel,
}));
it("gives custom code models space to produce full blocks without unsupported sampling options", async () => {
  mocks.generateText.mockResolvedValue({
    text: "\n  <h1>Title</h1>\n",
    finishReason: "stop",
  });
  await requestCompletion(
    {
      prefix: "<main>",
      suffix: "</main>",
      language: "HTML",
      filename: "index.html",
      indentUnit: "  ",
    },
    {
      provider: "openai-compatible",
      modelId: "custom-model",
      apiKey: null,
      lmstudioBaseURL: "",
      openaiCompatibleBaseURL: "http://localhost:1234/v1",
    },
    new AbortController().signal,
  );
  const request = mocks.generateText.mock.lastCall?.[0];
  expect(request.maxOutputTokens).toBe(4096);
  expect(request.temperature).toBeUndefined();
  expect(request.prompt).toContain("Language: HTML");
  expect(request.prompt).toContain("</main>");
  mocks.generateText.mockResolvedValue({ text: "", finishReason: "length" });
  await expect(
    requestCompletion(
      {
        prefix: "def f():",
        suffix: "",
        language: "Python",
        filename: "a.py",
        indentUnit: "    ",
      },
      {
        provider: "openai-compatible",
        modelId: "custom-model",
        apiKey: null,
        lmstudioBaseURL: "",
        openaiCompatibleBaseURL: "http://localhost:1234/v1",
      },
      new AbortController().signal,
    ),
  ).rejects.toThrow("without producing code");
});
