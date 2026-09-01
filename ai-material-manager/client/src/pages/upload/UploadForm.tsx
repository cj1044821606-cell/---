import React, { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle2, Circle, Loader, Send } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@client/src/lib/logger";

import type { PoolOldVersionItem, PoolUploadRequest } from "@shared/pool";
import { uploadPoolFile, pollUploadProgress } from "@client/src/api/pool";
import { PeopleSelect } from "@client/src/components/PeopleSelect";
import { Button } from "@client/src/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@client/src/components/ui/form";
import { Input } from "@client/src/components/ui/input";
import { Switch } from "@client/src/components/ui/switch";
import { Textarea } from "@client/src/components/ui/textarea";
import { useI18n } from "@client/src/hooks/use-i18n";
import FilePickField, {
  type FileItem,
  type FileSlotState,
  LARGE_FILE_THRESHOLD,
} from "./FilePickField";
import OldVersionPicker from "./OldVersionPicker";
import { UPLOAD_I18N } from "./upload-i18n";

const EMPTY_SLOT: FileSlotState = { files: [], uploading: false };
const POLL_INTERVAL_MS = 500;

const textSchema = z.object({
  originalFileName: z.string().min(1).max(200),
  designBrief: z.string().max(2000),
  note: z.string().max(500),
});

type TextFormData = z.infer<typeof textSchema>;

interface UploadFormProps {
  submitting: boolean;
  onSubmit: (payload: PoolUploadRequest) => Promise<void>;
}

const UploadForm: React.FC<UploadFormProps> = ({ submitting, onSubmit }) => {
  const { language } = useI18n();
  const pt = (key: string): string => UPLOAD_I18N[key]?.[language] ?? key;

  const form = useForm<TextFormData>({
    resolver: zodResolver(textSchema),
    defaultValues: { originalFileName: "", designBrief: "", note: "" },
  });

  const [slotM, setSlotM] = useState<FileSlotState>(EMPTY_SLOT);
  const [slotL, setSlotL] = useState<FileSlotState>(EMPTY_SLOT);
  const [slotS, setSlotS] = useState<FileSlotState>(EMPTY_SLOT);
  const [plannerAuditorIds, setPlannerAuditorIds] = useState<string[]>([]);
  const [designerId, setDesignerId] = useState<string | null>(null);
  const [versionReplace, setVersionReplace] = useState<boolean>(false);
  const [oldVersion, setOldVersion] = useState<PoolOldVersionItem | null>(null);

  const pollTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    const timers = pollTimers.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const startPolling = (
    taskId: string,
    setSlot: React.Dispatch<React.SetStateAction<FileSlotState>>,
  ): void => {
    const poll = async (): Promise<void> => {
      let finished = false;
      try {
        const progress = await pollUploadProgress(taskId);
        if (progress.status === "done" && progress.fileToken) {
          finished = true;
          pollTimers.current.delete(taskId);
          setSlot((prev: FileSlotState) => ({
            ...prev,
            uploading: false,
            uploadProgress: undefined,
            files: [
              ...prev.files,
              {
                fileToken: progress.fileToken!,
                fileName: progress.fileName,
                fileSize: progress.totalSize,
                isLargeFile: progress.totalSize > LARGE_FILE_THRESHOLD,
              },
            ],
          }));
        } else if (progress.status === "failed") {
          finished = true;
          pollTimers.current.delete(taskId);
          setSlot((prev: FileSlotState) => ({
            ...prev,
            uploading: false,
            uploadProgress: undefined,
          }));
          toast.error(pt("upload.field.uploadFailed"));
          logger.error("文件上传失败", {
            taskId,
            error: progress.error ?? "unknown",
          });
        } else {
          setSlot((prev: FileSlotState) => ({
            ...prev,
            uploadProgress: {
              uploadedBlocks: progress.uploadedBlocks,
              totalBlocks: progress.totalBlocks,
            },
          }));
        }
      } catch {
        // poll failed silently, will retry
      } finally {
        if (!finished) {
          const timer = setTimeout(() => {
            void poll();
          }, POLL_INTERVAL_MS);
          pollTimers.current.set(taskId, timer);
        }
      }
    };
    void poll();
  };

  const pickFile = async (
    file: File,
    slot: FileSlotState,
    setSlot: React.Dispatch<React.SetStateAction<FileSlotState>>,
  ): Promise<FileItem | null> => {
    if (slot.uploading) {
      return null;
    }
    setSlot((prev: FileSlotState) => ({ ...prev, uploading: true }));
    try {
      const resp = await uploadPoolFile(file, (progress) => {
        setSlot((prev: FileSlotState) => ({
          ...prev,
          uploadProgress: {
            uploadedBlocks: progress.uploadedChunks,
            totalBlocks: progress.totalChunks,
          },
        }));
      });
      if (resp.fileToken) {
        const fileToken = resp.fileToken;
        setSlot((prev: FileSlotState) => ({
          ...prev,
          uploading: false,
          files: [
            ...prev.files,
            {
              fileToken,
              fileName: file.name,
              fileSize: file.size,
              isLargeFile: file.size > LARGE_FILE_THRESHOLD,
            },
          ],
        }));
        return null;
      }
      startPolling(resp.taskId, setSlot);
      return null;
    } catch (error: unknown) {
      logger.error("文件上传失败", {
        name: file.name,
        error: error instanceof Error ? error.message : String(error),
      });
      setSlot((prev: FileSlotState) => ({
        ...prev,
        uploading: false,
        uploadProgress: undefined,
      }));
      const message = error instanceof Error ? error.message : "";
      toast.error(
        message
          ? `${pt("upload.field.uploadFailed")}：${message}`
          : pt("upload.field.uploadFailed"),
      );
      return null;
    }
  };

  const removeFile = (
    index: number,
    slot: FileSlotState,
    setSlot: (next: FileSlotState) => void,
  ): void => {
    const next: FileItem[] = slot.files.filter(
      (_: FileItem, i: number) => i !== index,
    );
    setSlot({ ...slot, files: next });
  };

  const handleSubmit = async (data: TextFormData): Promise<void> => {
    if (slotM.uploading || slotL.uploading || slotS.uploading) {
      toast.error(pt("upload.submit.uploadingFile"));
      return;
    }
    if (slotM.files.length === 0) {
      toast.error(pt("upload.submit.needM"));
      return;
    }
    if (versionReplace && oldVersion === null) {
      toast.error(pt("upload.submit.needOldVersion"));
      return;
    }
    const uploadFileM: string[] = slotM.files.map(
      (item: FileItem) => item.fileToken,
    );
    const sourceFileL: string[] | undefined =
      slotL.files.length > 0
        ? slotL.files.map((item: FileItem) => item.fileToken)
        : undefined;
    const previewFileS: string[] | undefined =
      slotS.files.length > 0
        ? slotS.files.map((item: FileItem) => item.fileToken)
        : undefined;

    const hasLarge: boolean = [
      ...slotM.files,
      ...slotL.files,
      ...slotS.files,
    ].some((item: FileItem) => item.isLargeFile);

    const payload: PoolUploadRequest = {
      originalFileName: data.originalFileName.trim(),
      uploadFileM,
      sourceFileL,
      previewFileS,
      designBrief:
        data.designBrief.trim() !== "" ? data.designBrief.trim() : undefined,
      note: data.note.trim() !== "" ? data.note.trim() : undefined,
      plannerAuditorIds:
        plannerAuditorIds.length > 0 ? plannerAuditorIds : undefined,
      designerId: designerId ?? undefined,
      isVersionReplace: versionReplace,
      isLargeFile: hasLarge || undefined,
      associateOldVersionId:
        versionReplace && oldVersion !== null
          ? oldVersion.baseRecordId
          : undefined,
    };
    await onSubmit(payload);
  };

  const anyUploading: boolean =
    slotM.uploading || slotL.uploading || slotS.uploading;
  const originalFileName = form.watch("originalFileName").trim();
  const keyInfo = form.watch("note").trim();
  const remainingRequired =
    (slotM.files.length === 0 ? 1 : 0) +
    (originalFileName.length === 0 ? 1 : 0) +
    (versionReplace && oldVersion === null ? 1 : 0);
  const uploadedFileCount =
    slotM.files.length + slotL.files.length + slotS.files.length;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5"
        noValidate
      >
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
        <FilePickField
          labelKey="upload.field.fileM"
          hintKey="upload.field.fileM.hint"
          required
          slot={slotM}
          onPick={async (file: File) => {
            form.setValue("originalFileName", file.name, {
              shouldValidate: true,
            });
            return pickFile(file, slotM, setSlotM);
          }}
          onRemove={(index: number) => removeFile(index, slotM, setSlotM)}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FilePickField
            labelKey="upload.field.fileL"
            hintKey="upload.field.fileL.hint"
            slot={slotL}
            onPick={(file: File) => pickFile(file, slotL, setSlotL)}
            onRemove={(index: number) => removeFile(index, slotL, setSlotL)}
          />
          <FilePickField
            labelKey="upload.field.fileS"
            hintKey="upload.field.fileS.hint"
            accept="image/*"
            slot={slotS}
            onPick={(file: File) => pickFile(file, slotS, setSlotS)}
            onRemove={(index: number) => removeFile(index, slotS, setSlotS)}
          />
        </div>

        <FormField
          control={form.control}
          name="originalFileName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {pt("upload.field.originalFileName")}{" "}
                <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={pt("upload.field.originalFileName.placeholder")}
                  disabled={submitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {pt("upload.field.planner")}
            </span>
            <PeopleSelect
              multiple
              candidateType="plannerAuditor"
              value={plannerAuditorIds}
              onChange={setPlannerAuditorIds}
              disabled={submitting}
              placeholder={pt("upload.field.planner.placeholder")}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {pt("upload.field.designer")}
            </span>
            <PeopleSelect
              candidateType="designer"
              value={designerId}
              onChange={setDesignerId}
              disabled={submitting}
              placeholder={pt("upload.field.designer.placeholder")}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{pt("upload.field.note")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={pt("upload.field.note.placeholder")}
                  disabled={submitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="designBrief"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{pt("upload.field.brief")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={pt("upload.field.brief.placeholder")}
                  rows={3}
                  disabled={submitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2 rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {pt("upload.field.versionReplace")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {pt("upload.field.versionReplace.hint")}
              </p>
            </div>
            <Switch
              checked={versionReplace}
              disabled={submitting}
              onCheckedChange={(checked: boolean) => {
                setVersionReplace(checked);
                if (!checked) {
                  setOldVersion(null);
                }
              }}
            />
          </div>
          {versionReplace ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {pt("upload.field.oldVersion")}{" "}
                <span className="text-destructive">*</span>
              </p>
              <OldVersionPicker
                value={oldVersion}
                onChange={setOldVersion}
                disabled={submitting}
              />
            </div>
          ) : null}
        </div>

          </div>

          <aside className="space-y-5 border-t border-border pt-5 lg:sticky lg:top-20 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {pt("upload.review.title")}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {pt("upload.review.desc")}
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  done: slotM.files.length > 0,
                  label: pt("upload.review.materialReady"),
                },
                {
                  done: originalFileName.length > 0,
                  label: pt("upload.review.nameReady"),
                },
                {
                  done: !versionReplace || oldVersion !== null,
                  label: pt("upload.review.versionReady"),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-sm"
                >
                  {item.done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span
                    className={
                      item.done ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-xs font-medium text-foreground">
                {pt("upload.review.namingClues")}
              </p>
              <dl className="space-y-2 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">
                    {pt("upload.review.fileName")}
                  </dt>
                  <dd className="min-w-0 break-words text-right text-foreground">
                    {originalFileName || pt("upload.review.pending")}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">
                    {pt("upload.review.keyInfo")}
                  </dt>
                  <dd className="min-w-0 break-words text-right text-foreground">
                    {keyInfo || pt("upload.review.pending")}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">
                    {pt("upload.review.files")}
                  </dt>
                  <dd className="text-right text-foreground">
                    {uploadedFileCount}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">
                    {pt("upload.review.people")}
                  </dt>
                  <dd className="text-right text-foreground">
                    {plannerAuditorIds.length + (designerId ? 1 : 0)}
                  </dd>
                </div>
              </dl>
              <p className="text-xs leading-5 text-muted-foreground">
                {pt("upload.review.aiNotice")}
              </p>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Button
                type="submit"
                data-ai-section-type="button"
                className="w-full"
                disabled={submitting || anyUploading}
              >
                {submitting || anyUploading ? (
                  <Loader className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {pt("upload.submit")}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {remainingRequired === 0
                  ? pt("upload.review.ready")
                  : `${pt("upload.review.remaining")} ${remainingRequired}`}
              </p>
            </div>
          </aside>
        </div>
      </form>
    </Form>
  );
};

export default UploadForm;
