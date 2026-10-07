import type { CustomEndpoint } from "@/modules/ai/config";
import {
  endpointModelId,
  endpointModels,
} from "@/modules/ai/lib/endpointModels";
import { describe, expect, it } from "vitest";

describe("custom endpoint model selection", () => {
  const endpoints: CustomEndpoint[] = [
    {
      id: "local",
      name: "Local",
      baseURL: "http://localhost:8080/v1",
      modelId: "my-model",
      contextLimit: 32000,
    },
    {
      id: "other",
      name: "Other",
      baseURL: "https://example.com/v1",
      modelId: "other-model",
      contextLimit: 64000,
    },
    {
      id: "empty",
      name: "Incomplete",
      baseURL: "",
      modelId: "",
      contextLimit: 32000,
    },
  ];
  it("only offers configured endpoint models and replaces stale provider selections", () => {
    const models = endpointModels(endpoints);
    expect(models).toHaveLength(2);
    expect(
      models.every((model) => model.provider === "openai-compatible"),
    ).toBe(true);
    expect(endpointModelId("gpt-5.4-mini", endpoints)).toBe(models[0].id);
    expect(endpointModelId(models[1].id, endpoints)).toBe(models[1].id);
    expect(endpointModelId(models[1].id, [])).toBe("");
  });
});
