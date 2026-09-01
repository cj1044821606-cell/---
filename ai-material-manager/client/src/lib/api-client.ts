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
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/api/auth/login?next=${encodeURIComponent(next)}`);
    }
    return Promise.reject(error);
  },
);
