import { apiRequest } from "./apiClient";

export async function runDatasetAnalysis(token, query) {
  return apiRequest("/api/v1/dataset-analysis", { token, method: "POST", body: { query } }); // DatasetAnalysisResponse
}
