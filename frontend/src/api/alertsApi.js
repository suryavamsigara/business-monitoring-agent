import { apiRequest } from "./client";

export const alertsApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.severity) params.append("severity", filters.severity);
    if (filters.kpi_name) params.append("kpi_name", filters.kpi_name);
    if (filters.marketplace) params.append("marketplace", filters.marketplace);
    if (filters.status) params.append("status", filters.status);

    const queryString = params.toString();
    return apiRequest(`/api/alerts${queryString ? `?${queryString}` : ""}`);
  },

  get: (alertId) => apiRequest(`/api/alerts/${alertId}`),

  updateStatus: (alertId, status) =>
    apiRequest(`/api/alerts/${alertId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
