import { apiRequest } from "./client";

export const dashboardApi = {
  getSummary: () => apiRequest("/api/pulse/summary"),
  getTrends: (days = 30) => apiRequest(`/api/pulse/trends?days=${days}`),
};
