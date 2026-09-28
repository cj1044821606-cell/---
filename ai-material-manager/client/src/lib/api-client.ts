import axios from "axios";

export const axiosForBackend = axios.create({
  baseURL: "/",
  withCredentials: true,
  timeout: 60_000,
});

axiosForBackend.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/api/auth/")
    ) {
      // 会话失效后可能换人登录：先清掉本地缓存，避免下一位用户看到上一位的数据
      try {
        for (const key of Object.keys(window.localStorage)) {
          if (key.startsWith("amm.")) window.localStorage.removeItem(key);
        }
      } catch {
        // 存储不可用时忽略
      }
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/api/auth/login?next=${encodeURIComponent(next)}`);
    }
    return Promise.reject(error);
  },
);
