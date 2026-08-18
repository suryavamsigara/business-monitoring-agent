import { apiRequest } from "./client";

export const agentApi = {
  runNow: () => apiRequest("/api/agent/run", { method: "POST" }),
  getStatus: () => apiRequest("/api/agent/status"),
  getRuns: (limit = 50) => apiRequest(`/api/agent/runs?limit=${limit}`),
  getRunDetail: (runId) => apiRequest(`/api/agent/runs/${runId}`),
};
