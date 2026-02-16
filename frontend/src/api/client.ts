import axios from "axios";

const client = axios.create({
  baseURL: "/api",
});

client.interceptors.request.use((config) => {
  const tokens = localStorage.getItem("tokens");
  if (tokens) {
    const { access_token } = JSON.parse(tokens);
    config.headers.Authorization = `Bearer ${access_token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token!);
    }
  });
  failedQueue = [];
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return client(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const tokens = localStorage.getItem("tokens");
    if (!tokens) {
      isRefreshing = false;
      window.location.href = "/login";
      return Promise.reject(error);
    }

    try {
      const { refresh_token } = JSON.parse(tokens);
      const response = await axios.post("/api/auth/refresh", { refresh_token });
      const newTokens = response.data;
      localStorage.setItem("tokens", JSON.stringify(newTokens));
      originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
      processQueue(null, newTokens.access_token);
      return client(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem("tokens");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default client;
