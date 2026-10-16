import React, { useState } from "react";
import { toast } from "sonner";
import { Link2 } from "lucide-react";

import { buildMaterialShareUrl, copyText } from "@shared/share";
import { Button } from "@client/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@client/src/components/ui/dialog";
import { Input } from "@client/src/components/ui/input";
import { useI18n } from "@client/src/hooks/use-i18n";

const COPY = {
  zh: {
    label: "复制分享链接",
    copied: "已复制，储能事业部同事打开即可查看",
    external: "对外请先确认允许外发",
    fallbackTitle: "复制分享链接",
    fallbackDesc: "当前环境无法自动复制，请长按或手动复制下面的链接。",
  },
  en: {
    label: "Copy link",
    copied: "Link copied. Energy Storage Division colleagues can open it",
    external: "Check external-sharing permission before sending outside",
    fallbackTitle: "Copy link",
    fallbackDesc: "Copying isn't available here. Long-press or copy the link below.",
  },
} as const;

interface ShareLinkButtonProps {
  materialId: string;
  variant: "button" | "icon";
  className?: string;
}

/** 复制站内物料详情页链接；剪贴板不可用时弹出可手动复制的输入框 */
const ShareLinkButton: React.FC<ShareLinkButtonProps> = ({ materialId, variant, className }) => {
  const { language } = useI18n();
  const copy = COPY[language];
  const [fallbackOpen, setFallbackOpen] = useState<boolean>(false);
  const url = buildMaterialShareUrl(window.location.origin, materialId);

  const handleClick = async (event: React.MouseEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();
    if (await copyText(url, navigator.clipboard)) {
      toast.success(copy.copied, { description: copy.external });
    } else {
      setFallbackOpen(true);
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          aria-label={copy.label}
          title={copy.label}
          onClick={(event) => void handleClick(event)}
          className={`grid size-8 place-items-center rounded-md border border-black/[0.07] bg-white/[0.86] text-foreground shadow-sm backdrop-blur-md transition-colors duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className ?? ""}`}
        >
          <Link2 className="size-4" />
        </button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className={`h-9 ${className ?? ""}`}
          onClick={(event) => void handleClick(event)}
        >
          <Link2 size={14} />
          {copy.label}
        </Button>
      )}
      <Dialog open={fallbackOpen} onOpenChange={setFallbackOpen}>
        <DialogContent className="sm:max-w-[420px]" onClick={(event) => event.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{copy.fallbackTitle}</DialogTitle>
            <DialogDescription>{copy.fallbackDesc}</DialogDescription>
          </DialogHeader>
          <Input
            readOnly
            value={url}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-xs"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShareLinkButton;
