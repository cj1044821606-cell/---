import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const STORAGE_KEY = "amm.scroll-positions.v1";
const MAX_ENTRIES = 50;
/** 返回时内容可能还在渲染（缓存数据、懒加载图片），在这段时间内持续尝试恢复 */
const RESTORE_WINDOW_MS = 1_500;

function readPositions(): Record<string, number> {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writePosition(key: string, y: number): void {
  try {
    const positions = readPositions();
    delete positions[key];
    positions[key] = y;
    const keys = Object.keys(positions);
    for (const stale of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) {
      delete positions[stale];
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // 存储不可用时不恢复滚动位置
  }
}

/**
 * 页面滚动位置管理（BrowserRouter 没有内置）：
 * - 点击进入新页面 → 回到顶部；
 * - 浏览器后退/前进 → 回到离开时的位置（例如从物料详情返回物料库）。
 */
export function useScrollRestoration(): void {
  const location = useLocation();
  const navigationType = useNavigationType();
  const pathnameRef = useRef<string>(location.pathname);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // 记录离开页面前的位置
  useEffect(() => {
    let frame = 0;
    const onScroll = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => writePosition(location.key, window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [location.key]);

  useLayoutEffect(() => {
    const pathnameChanged = pathnameRef.current !== location.pathname;
    pathnameRef.current = location.pathname;
    if (navigationType !== "POP") {
      // 同一页面内只改查询参数（如切换筛选）时保持当前位置
      if (pathnameChanged) window.scrollTo(0, 0);
      return undefined;
    }
    const target = readPositions()[location.key];
    if (target === undefined || target <= 0) return undefined;

    const startedAt = performance.now();
    let frame = 0;
    const attempt = (): void => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.min(target, Math.max(0, maxScroll)));
      const reached = Math.abs(window.scrollY - target) < 2;
      if (!reached && performance.now() - startedAt < RESTORE_WINDOW_MS) {
        frame = requestAnimationFrame(attempt);
      }
    };
    attempt();
    // 用户主动滚动时停止恢复，避免“抢方向盘”
    const stop = (): void => cancelAnimationFrame(frame);
    window.addEventListener("wheel", stop, { passive: true, once: true });
    window.addEventListener("touchstart", stop, { passive: true, once: true });
    return () => {
      stop();
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, navigationType]);
}
