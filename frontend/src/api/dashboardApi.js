import { apiRequest } from "./client";

export const dashboardApi = {
  getSummary: () => apiRequest("/api/pulse/summary"),
  getTrends: (days = 30) => apiRequest(`/api/pulse/trends?days=${days}`),
  simulateScenario: (scenarioType) =>
    apiRequest("/api/pulse/simulate-scenario", {
      method: "POST",
      body: JSON.stringify({ scenario_type: scenarioType }),
    }),
};
