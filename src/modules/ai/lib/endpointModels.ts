import {
  type CustomEndpoint,
  compatModelIdForEndpoint,
  getCompatModelInfo,
} from "@/modules/ai/config";

export function endpointModels(endpoints: readonly CustomEndpoint[]) {
  return endpoints
    .filter((endpoint) => endpoint.baseURL.trim() && endpoint.modelId.trim())
    .map((endpoint) =>
      getCompatModelInfo(compatModelIdForEndpoint(endpoint.id), endpoints),
    );
}

export function endpointModelId(
  selected: string,
  endpoints: readonly CustomEndpoint[],
): string {
  const models = endpointModels(endpoints);
  return (
    models.find((model) => model.id === selected)?.id ?? models[0]?.id ?? ""
  );
}
