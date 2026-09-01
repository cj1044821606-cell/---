import React, { useState } from "react";
import { Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@client/src/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@client/src/components/ui/tabs";
import GroupGuideDialog, {
  hasJoinedGroup,
} from "@client/src/components/GroupGuideDialog";
import { useI18n } from "@client/src/hooks/use-i18n";
import PageHeader from "@client/src/components/PageHeader";
import { useSystemSettings } from "@client/src/hooks/use-system-settings";
import HandedList from "./HandedList";
import { makePt } from "./mine-i18n";
import MineIdentityCard from "./MineIdentityCard";
import ReceivedList from "./ReceivedList";
import SubscribedList from "./SubscribedList";

const MinePage: React.FC = () => {
  const { language, t } = useI18n();
  const pt = makePt(language, t);
  const settings = useSystemSettings();
  const navigate = useNavigate();
  const [joined, setJoined] = useState<boolean>(() => hasJoinedGroup());
  const [guideOpen, setGuideOpen] = useState<boolean>(false);

  const handleGuideOpenChange = (open: boolean): void => {
    setGuideOpen(open);
    if (!open) {
      // 弹层内确认后 markGroupJoined，关闭时刷新进群状态
      setJoined(hasJoinedGroup());
    }
  };

  const handleUpload = (): void => {
    if (!joined) {
      setGuideOpen(true);
      return;
    }
    navigate("/upload");
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t("nav.mine")} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <MineIdentityCard joined={joined} onShowGroupGuide={() => setGuideOpen(true)} />

        <div
          className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-sm lg:w-72"
          data-ai-section-type="button"
        >
          <div>
            <p className="text-sm font-semibold">{pt("mine.upload")}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {pt("mine.uploadDesc")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Button
              className="w-full"
              onClick={handleUpload}
            >
              <Upload className="size-4" />
              {pt("mine.upload")}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="received">
        <TabsList className="w-full justify-start bg-card p-1">
          <TabsTrigger value="received">{pt("mine.tab.received")}</TabsTrigger>
          <TabsTrigger value="subscribed">{pt("mine.tab.subscribed")}</TabsTrigger>
          <TabsTrigger value="handled">{pt("mine.tab.handled")}</TabsTrigger>
        </TabsList>
        <TabsContent value="received" className="mt-2">
          <ReceivedList />
        </TabsContent>
        <TabsContent value="subscribed" className="mt-2">
          <SubscribedList />
        </TabsContent>
        <TabsContent value="handled" className="mt-2">
          <HandedList />
        </TabsContent>
      </Tabs>

      <GroupGuideDialog
        open={guideOpen}
        onOpenChange={handleGuideOpenChange}
        settings={settings}
      />
    </div>
  );
};

export default MinePage;
