import React, { useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  Cpu,
  ExternalLink,
  Loader,
  MessageCircleQuestion,
  PackageX,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";

import type { InboxCard, InboxCardField, InboxCardType } from "@shared/inbox";
import { Badge } from "@client/src/components/ui/badge";
import { Button } from "@client/src/components/ui/button";
import { useI18n } from "@client/src/hooks/use-i18n";
import ProgressTracker from "@client/src/components/ProgressTracker";
import InboxCardActions from "./InboxCardActions";
import { INBOX_I18N } from "./inbox-i18n";

const TYPE_ICONS: Record<InboxCardType, LucideIcon> = {
  recognizing: Cpu,
  aiAsk: MessageCircleQuestion,
  confirmRecognize: BadgeCheck,
  returned: RotateCcw,
  waitPublish: UploadCloud,
  regionAudit: ShieldCheck,
  versionReplaced: PackageX,
  problemHandle: AlertTriangle,
  stuck: Loader,
};

interface InboxCardItemProps {
  card: InboxCard;
  priority: boolean;
}

const InboxCardItem: React.FC<InboxCardItemProps> = ({ card, priority }) => {
  const { language, t } = useI18n();
  const [expanded, setExpanded] = useState<boolean>(false);

  const pt = (key: string): string => INBOX_I18N[key]?.[language] ?? t(key);
  const resolve = (key: string, fallback: string): string => {
    const text: string = pt(key);
    return text === key ? fallback : text;
  };

  const Icon: LucideIcon = TYPE_ICONS[card.type] ?? AlertTriangle;
  const title: string = resolve(card.titleKey, card.sourceTable);
  const subtitle: string = card.fields[0]?.value ?? card.sourceTable;
  const cta: string = pt(`inbox.${card.type}.cta`);
  const inlineAction: boolean =
    (card.type === "aiAsk" || card.type === "confirmRecognize") &&
    card.recordId !== "";

  const toggle = (): void => {
    setExpanded((prev: boolean) => !prev);
  };

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg ${
        priority ? "border-l-[3px] border-l-destructive border-border" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            priority ? "bg-danger-soft text-danger-text" : "bg-accent text-accent-foreground"
          }`}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-foreground">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant="outline">
            <span
              className={
                priority
                  ? "font-semibold text-destructive"
                  : "text-muted-foreground"
              }
            >
              <span className="font-mono tabular-nums">{card.waitingDays}</span>{" "}
              {pt("inbox.badge.daysNoProgress")}
            </span>
          </Badge>
          <span className="text-xs text-muted-foreground">
            {card.sourceTable}
          </span>
        </span>
        <ChevronDown
          className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-fast ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-normal ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
            {card.body !== "" ? (
              <div className="rounded-md border-l-[3px] border-l-primary bg-ai-quote px-3 py-2.5">
                <p className="text-xs font-medium text-ai-quote-foreground/70">
                  {pt("inbox.quote.label")}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ai-quote-foreground">
                  {card.body}
                </p>
              </div>
            ) : null}
            {card.progress ? (
              <ProgressTracker progress={card.progress} />
            ) : null}
            {inlineAction ? (
              <InboxCardActions type={card.type} recordId={card.recordId} />
            ) : null}
            {card.fields.length > 0 ? (
              <div className="space-y-1.5">
                {card.fields.map((field: InboxCardField) => (
                  <div
                    key={field.labelKey}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {resolve(field.labelKey, field.value)}
                    </span>
                    <span className="min-w-0 break-words text-right font-mono text-xs text-foreground">
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <a href={card.deepLink} target="_blank" rel="noreferrer">
              <Button size="sm" variant={inlineAction ? "ghost" : "default"}>
                {inlineAction ? pt("inbox.action.orInBase") : cta}
                <ExternalLink className="size-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxCardItem;
