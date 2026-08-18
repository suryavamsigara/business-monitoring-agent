import { apiRequest } from "./client";

export const assistantApi = {
  chat: ({ message, alert_id = null, run_id = null, history = [] }) =>
    apiRequest("/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        alert_id,
        run_id,
        history,
      }),
    }),
};
