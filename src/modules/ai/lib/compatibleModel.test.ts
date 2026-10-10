import { generateText } from "ai";
import { describe, expect, it } from "vitest";
import { compatibleModel } from "@/modules/ai/lib/compatibleModel";

describe("custom endpoint assistant history", () => {
  it("uses Responses after a rejected Chat Completions history, preserving roles", async () => {
    const requests: { url: string; body: Record<string, unknown> }[] = [];
    const fetcher: typeof fetch = async (url, init) => {
      requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      if (String(url).endsWith("/chat/completions")) return new Response(JSON.stringify({ error: { message: "Invalid value: 'input_text'. Supported values are: 'output_text' and 'refusal'." } }), { status: 400, headers: { "content-type": "application/json" } });
      return new Response(JSON.stringify({ id: "resp_test", created_at: 1, model: "custom", status: "completed", output: [{ type: "message", id: "msg_test", role: "assistant", status: "completed", content: [{ type: "output_text", text: "Ready", annotations: [] }] }], usage: { input_tokens: 4, output_tokens: 1, total_tokens: 5 } }), { headers: { "content-type": "application/json" } });
    };
    const model = await compatibleModel({ modelId: "custom", baseURL: "https://example.test/v1", fetch: fetcher });
    const messages = [{ role: "user" as const, content: "Hi" }, { role: "assistant" as const, content: "Hello" }, { role: "user" as const, content: "Storage?" }];
    const result = await generateText({ model, messages, maxRetries: 0 });
    expect(result.text).toBe("Ready");
    expect(requests.map((request) => request.url)).toEqual(["https://example.test/v1/chat/completions", "https://example.test/v1/responses"]);
    expect(requests[1].body.input).toContainEqual({ role: "assistant", content: [{ type: "output_text", text: "Hello" }] });
    await generateText({ model, messages, maxRetries: 0 });
    expect(requests[2].url).toBe("https://example.test/v1/responses");
  });
});
