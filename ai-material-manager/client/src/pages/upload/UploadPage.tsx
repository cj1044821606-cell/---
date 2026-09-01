import React, { useState } from "react";
import { CheckCircle2, Lock, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { logger } from "@client/src/lib/logger";

import type { PoolUploadRequest } from "@shared/pool";
import { poolApi } from "@client/src/api";
import { Button } from "@client/src/components/ui/button";
import { Card, CardContent } from "@client/src/components/ui/card";
import { Skeleton } from "@client/src/components/ui/skeleton";
import { useI18n } from "@client/src/hooks/use-i18n";
import { useIdentity } from "@client/src/hooks/use-identity";
import UploadForm from "./UploadForm";
import { UPLOAD_I18N } from "./upload-i18n";

const UploadPage: React.FC = () => {
  const { language } = useI18n();
  const { identity } = useIdentity();
  const pt = (key: string): string => UPLOAD_I18N[key]?.[language] ?? key;

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [doneRecordId, setDoneRecordId] = useState<string | null>(null);

  if (identity === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!identity.isUploadRole) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Lock className="size-5" />
            </span>
            <h1 className="text-[15px] font-semibold text-foreground">
              {pt("upload.gate.title")}
            </h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              {pt("upload.gate.desc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (doneRecordId !== null) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-5" />
            </span>
            <h1 className="text-[15px] font-semibold text-foreground">
              {pt("upload.done.title")}
            </h1>
            <p className="max-w-md text-sm text-muted-foreground">
              {pt("upload.done.desc")}
              <span className="font-mono text-foreground">{doneRecordId}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Button
                data-ai-section-type="button"
                onClick={() => setDoneRecordId(null)}
              >
                <UploadCloud className="size-4" />
                {pt("upload.done.again")}
              </Button>
              <Button variant="outline" asChild>
                <Link to="/inbox">{pt("upload.done.toInbox")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (payload: PoolUploadRequest): Promise<void> => {
    setSubmitting(true);
    try {
      const resp = await poolApi.uploadPoolRecord(payload);
      setDoneRecordId(resp.recordId);
    } catch (error: unknown) {
      logger.error("上传写池失败", {
        file: payload.originalFileName,
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error(pt("upload.submit.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {pt("upload.page.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pt("upload.page.subtitle")}
        </p>
      </div>
      <div className="border-t border-border pt-6">
        <UploadForm submitting={submitting} onSubmit={handleSubmit} />
      </div>
    </div>
  );
};

export default UploadPage;
