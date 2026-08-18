const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData?.detail) {
          errorMsg = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
        } else if (errorData?.message) {
          errorMsg = errorData.message;
        }
      } catch (e) {
        // ignore json parse error on non-json error responses
      }
      throw new Error(errorMsg);
    }
    return await response.json();
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  }
}
