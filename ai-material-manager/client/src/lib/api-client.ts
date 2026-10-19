import axios from "axios";
import { queryClient } from "@client/src/lib/query-client";
import { accessErrorCode } from "@shared/access";

// 与 use-identity 的 IDENTITY_QUERY_KEY 一致；不直接引用以免 api-client ↔ use-identity 循环依赖
const IDENTITY_QUERY_KEY = ["identity"] as const;

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
    } else if (
      axios.isAxiosError(error) &&
      accessErrorCode(error.response?.status, error.response?.data) !== null
    ) {
      // 访问权限变化（离开事业部 / 部门暂时无法验证）：重取身份，由 Layout 渲染无权限页
      void queryClient.invalidateQueries({ queryKey: IDENTITY_QUERY_KEY });
    }
    return Promise.reject(error);
  },
);
