import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "@/store/auth";

// ── Base URL ──────────────────────────────────────────────────────────
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ── Axios instance ────────────────────────────────────────────────────
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,       // send httpOnly refresh_token cookie automatically
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000,
});
// ── Access-token injection ────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Access token lives in memory (Zustand).
    if (typeof window !== "undefined") {
      const { getAccessToken } = useAuthStore.getState();
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Silent refresh on 401 ─────────────────────────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(token: string | null, error: unknown = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh on 401, and only once per original request
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Skip refresh for the refresh endpoint itself (avoids infinite loop)
    if (original.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      // Queue requests while a refresh is already in-flight
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const { data } = await apiClient.post<{ access_token: string }>(
        "/auth/refresh"
      );
      const newToken = data.access_token;

      // Persist new token in Zustand
      if (typeof window !== "undefined") {
        const { setAccessToken } = useAuthStore.getState();
        setAccessToken(newToken);
      }

      original.headers.Authorization = `Bearer ${newToken}`;
      flushQueue(newToken);
      return apiClient(original);
    } catch (refreshError) {
      flushQueue(null, refreshError);

      // Refresh failed → log out and redirect
      if (typeof window !== "undefined") {
        const { clearAuth } = useAuthStore.getState();
        clearAuth();
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/auth/login?next=${next}`;
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
