import { apiRequest } from "./apiClient";

export async function listMyConsultations(token) {
  return apiRequest("/api/v1/consultations", { token }); // ConsultationOut[]
}

export async function createConsultation(token, payload) {
  // payload: { gene_symbol, disease_name?, patient_question, additional_notes? }
  return apiRequest("/api/v1/consultations", { token, method: "POST", body: payload });
}

export async function respondToConsultation(token, consultationId, payload) {
  // payload: { advice, appointment_recommended, observations? }
  return apiRequest(`/api/v1/consultations/${consultationId}/respond`, { token, method: "POST", body: payload });
}
