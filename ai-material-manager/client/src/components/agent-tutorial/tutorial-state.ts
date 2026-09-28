const SEEN_KEY = 'app.agent-tutorial-seen';

/** 是否看过 Codex 接入教程：只影响首次自动弹出，浏览器存储不可用时每次都当作没看过 */
export function hasSeenAgentTutorial(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markAgentTutorialSeen(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // localStorage 不可用时仅本次会话生效
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/**
 * 关闭教程时的“收纳”动画：一张卡片从弹窗位置缩小飞进入口图标。
 * 用 Web Animations API 直接驱动一个临时元素，结束后移除，不影响页面布局。
 */
export function flyIntoLauncher(
  from: DOMRect | null,
  target: HTMLElement | null,
  onDone: () => void,
): void {
  const to = target?.getBoundingClientRect();
  if (!from || !to || to.width === 0 || prefersReducedMotion()) {
    onDone();
    return;
  }
  const ghost = document.createElement('div');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    zIndex: '60',
    pointerEvents: 'none',
    borderRadius: '12px',
    border: '1px solid var(--primary-line)',
    background: 'linear-gradient(160deg, var(--primary-soft), var(--card) 55%)',
    boxShadow: '0 20px 48px rgba(16, 24, 40, 0.18)',
  });
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  const animation = ghost.animate(
    [
      {
        transform: 'translate(0, 0) scale(1, 1)',
        opacity: 1,
        borderRadius: '12px',
      },
      {
        transform: `translate(${dx * 0.55}px, ${dy * 0.35}px) scale(${Math.max(sx, 0.28)}, ${Math.max(sy, 0.2)})`,
        opacity: 0.95,
        borderRadius: '24px',
        offset: 0.55,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        opacity: 0.25,
        borderRadius: '999px',
      },
    ],
    {
      duration: 620,
      easing: 'cubic-bezier(0.55, 0, 0.2, 1)',
      fill: 'forwards',
    },
  );
  const finish = (): void => {
    ghost.remove();
    onDone();
  };
  animation.onfinish = finish;
  animation.oncancel = finish;
}
