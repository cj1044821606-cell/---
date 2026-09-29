import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@client/src/components/ui/button';
import { copyText } from '@client/src/lib/agent-config';
import { cn } from '@/lib/utils';

export interface CopyBlockLabels {
  copy: string;
  copied: string;
  failed: string;
}

/** 带“复制”按钮的代码块：按钮放在代码上方，窄屏也不会遮住内容 */
const CopyBlock: React.FC<{
  text: string;
  hint?: string;
  labels: CopyBlockLabels;
  className?: string;
}> = ({ text, hint, labels, className }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const onCopy = async (): Promise<void> => {
    if (await copyText(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error(labels.failed);
    }
  };
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-end justify-between gap-3">
        <p className="min-w-0 text-xs text-muted-foreground">{hint ?? ''}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={() => void onCopy()}
        >
          {copied ? (
            <Check className="size-3.5 text-success" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? labels.copied : labels.copy}
        </Button>
      </div>
      <pre className="max-h-56 overflow-auto rounded-md border border-border bg-accent/40 p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-foreground">
        {text}
      </pre>
    </div>
  );
};

export default CopyBlock;
