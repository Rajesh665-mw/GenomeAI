import { apiRequest } from "./apiClient";

export async function listMyAnalyses(token) {
  return apiRequest("/api/v1/analyze", { token }); // AnalysisStatusResponse[]
}

export async function getAnalysis(token, analysisId) {
  return apiRequest(`/api/v1/analyze/${analysisId}`, { token }); // AnalysisStatusResponse
}
