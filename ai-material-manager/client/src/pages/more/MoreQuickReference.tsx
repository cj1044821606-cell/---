import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Info,
  Languages,
  QrCode,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import dayjs from "dayjs";
import { Link } from "react-router-dom";

import { Badge } from "@client/src/components/ui/badge";
import { Button } from "@client/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@client/src/components/ui/card";
import GroupGuideDialog, {
  hasJoinedGroup,
} from "@client/src/components/GroupGuideDialog";
import { useI18n } from "@client/src/hooks/use-i18n";
import { useIdentity } from "@client/src/hooks/use-identity";
import { useSystemSettings } from "@client/src/hooks/use-system-settings";
import { STATUS_LABELS } from "@shared/api.interface";
import type { MaterialStatusLabel } from "@shared/api.interface";
import { MORE_I18N } from "./more-i18n";

interface NamingRule {
  labelKey: string;
  templateKey: string;
  exampleKey: string;
}

const NAMING_RULES: NamingRule[] = [
  {
    labelKey: "more.naming.product",
    templateKey: "more.naming.product.tpl",
    exampleKey: "more.naming.product.example",
  },
  {
    labelKey: "more.naming.brand",
    templateKey: "more.naming.brand.tpl",
    exampleKey: "more.naming.brand.example",
  },
  {
    labelKey: "more.naming.expo",
    templateKey: "more.naming.expo.tpl",
    exampleKey: "more.naming.expo.example",
  },
];

const STATUS_ORDER: MaterialStatusLabel[] = ["ok", "mute", "warn", "bad"];

const STATUS_DOT_CLASSES: Record<MaterialStatusLabel, string> = {
  ok: "bg-success",
  mute: "bg-muted-foreground",
  warn: "bg-warning",
  bad: "bg-destructive",
};

const STATUS_DESC_KEYS: Record<MaterialStatusLabel, string> = {
  ok: "more.status.ok.desc",
  mute: "more.status.mute.desc",
  warn: "more.status.warn.desc",
  bad: "more.status.bad.desc",
};

const headerClass = "p-4 pb-2";
const contentClass = "p-4 pt-0";

export const MoreQuickReference: React.FC = () => {
  const { language, t, setLanguage } = useI18n();
  const { identity } = useIdentity();
  const settings = useSystemSettings();
  const [guideOpen, setGuideOpen] = useState<boolean>(false);

  const pt = (key: string): string => MORE_I18N[key]?.[language] ?? t(key);
  const joined: boolean = hasJoinedGroup();

  const expiryText: string | null =
    settings?.groupQrExpiry && dayjs(settings.groupQrExpiry).isValid()
      ? dayjs(settings.groupQrExpiry).format("YYYY-MM-DD")
      : null;

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {/* 命名规则速查 */}
      <Card>
        <CardHeader className={headerClass}>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="size-4 text-primary" />
            {pt("more.naming.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className={`${contentClass} space-y-3`}>
          {NAMING_RULES.map((rule: NamingRule) => (
            <div key={rule.labelKey} className="space-y-0.5">
              <div className="text-sm font-medium text-foreground">
                {pt(rule.labelKey)}
              </div>
              <div className="font-mono text-xs leading-relaxed text-muted-foreground">
                {pt(rule.templateKey)}
              </div>
              <div className="font-mono text-xs text-foreground-subtle">
                {pt(rule.exampleKey)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {/* 状态标签说明 */}
        <Card>
          <CardHeader className={headerClass}>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="size-4 text-primary" />
              {pt("more.status.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className={`${contentClass} space-y-2`}>
            {STATUS_ORDER.map((label: MaterialStatusLabel) => (
              <div key={label} className="flex flex-wrap items-center gap-2">
                <span
                  className={`size-2 shrink-0 rounded-full ${STATUS_DOT_CLASSES[label]}`}
                />
                <span className="text-sm font-medium">
                  {STATUS_LABELS[label][language]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {pt(STATUS_DESC_KEYS[label])}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 语言切换 */}
        <Card>
          <CardHeader className={headerClass}>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Languages className="size-4 text-primary" />
              {pt("more.language.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className={contentClass}>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                data-ai-section-type="button"
                variant={language === "zh" ? "default" : "outline"}
                onClick={() => setLanguage("zh")}
              >
                中文
              </Button>
              <Button
                data-ai-section-type="button"
                variant={language === "en" ? "default" : "outline"}
                onClick={() => setLanguage("en")}
              >
                English
              </Button>
              <span className="text-xs text-muted-foreground">
                {pt("more.language.hint")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* B-1 上传入口（仅上传角色可见） */}
      {identity?.isUploadRole ? (
        <Card className="md:col-span-2">
          <CardHeader className={headerClass}>
            <CardTitle className="flex items-center gap-2 text-sm">
              <UploadCloud className="size-4 text-primary" />
              {pt("more.upload.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className={contentClass}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="max-w-md flex-1 text-xs leading-relaxed text-muted-foreground">
                {pt("more.upload.desc")}
              </span>
              <Button data-ai-section-type="button" asChild>
                <Link to="/upload">
                  <UploadCloud className="size-4" />
                  {pt("more.upload.cta")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 进群二维码常驻入口 */}
      <Card className="md:col-span-2">
        <CardHeader className={headerClass}>
          <CardTitle className="flex items-center gap-2 text-sm">
            <QrCode className="size-4 text-primary" />
            {pt("more.group.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className={contentClass}>
          <div className="flex flex-wrap items-center gap-3">
            {joined ? (
              <Badge className="bg-success-soft text-success-text">
                <CheckCircle2 className="size-3" />
                {pt("more.group.joined")}
              </Badge>
            ) : (
              <Badge className="border-transparent bg-warning-soft text-warning-text">
                <TriangleAlert className="size-3" />
                {pt("more.group.notJoined")}
              </Badge>
            )}
            <span className="max-w-md flex-1 text-xs leading-relaxed text-muted-foreground">
              {pt("more.group.desc")}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {expiryText ? (
                <span className="font-mono text-xs text-muted-foreground">
                  {pt("more.group.expiry")} {expiryText} ·{" "}
                  {pt("more.group.internal")}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {pt("more.group.internal")}
                </span>
              )}
              <Button
                data-ai-section-type="button"
                variant="secondary"
                onClick={() => setGuideOpen(true)}
              >
                <QrCode className="size-4" />
                {pt("more.group.view")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <GroupGuideDialog
        open={guideOpen}
        onOpenChange={setGuideOpen}
        settings={settings}
      />
    </section>
  );
};
