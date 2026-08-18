import { apiRequest } from "./client";

export const monitoringApi = {
  getKPIs: () => apiRequest("/api/monitoring/kpis"),
  getRules: () => apiRequest("/api/monitoring/rules"),
  updateRule: (ruleId, updates) =>
    apiRequest(`/api/monitoring/rules/${ruleId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),
  createRule: (rule) =>
    apiRequest("/api/monitoring/rules", {
      method: "POST",
      body: JSON.stringify(rule),
    }),
};
