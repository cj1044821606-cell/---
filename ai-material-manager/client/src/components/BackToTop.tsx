import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackToTopProps {
  label: string;
  /** 滚动超过该距离后出现 */
  threshold?: number;
}

/** 长列表的“回到顶部”：桌面端右下角，移动端避开底部导航栏 */
const BackToTop: React.FC<BackToTopProps> = ({ label, threshold = 1200 }) => {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setVisible(window.scrollY > threshold));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-[opacity,transform,color] duration-180 ease-out hover:text-primary md:bottom-8 md:right-8",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <ArrowUp className="size-4" />
    </button>
  );
};

export default BackToTop;
