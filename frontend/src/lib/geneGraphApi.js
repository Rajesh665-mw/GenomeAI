import { apiRequest } from "./apiClient";

export async function getGeneRelationships(token, symbols) {
  const query = encodeURIComponent(symbols.join(","));
  return apiRequest(`/api/v1/genes/relationships?symbols=${query}`, { token }); // GeneRelationshipGraph
}
