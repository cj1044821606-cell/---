import React, { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle2, Circle, Loader, Send } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@client/src/lib/logger";

import type { PoolOldVersionItem, PoolUploadRequest } from "@shared/pool";
import {
  buildNamingPreview,
  MATERIAL_TYPE_OPTIONS,
  NAMING_LANGUAGE_OPTIONS,
  type GuidedNamingInput,
  type NamingCategory,
  type NamingMode,
} from "@shared/naming";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/src/components/ui/select";
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
  const [plannerAuditorId, setPlannerAuditorId] = useState<string | null>(null);
  const [designerId, setDesignerId] = useState<string | null>(null);
  const [versionReplace, setVersionReplace] = useState<boolean>(false);
  const [oldVersion, setOldVersion] = useState<PoolOldVersionItem | null>(null);
  const [namingMode, setNamingMode] = useState<NamingMode>("ai");
  const [namingInput, setNamingInput] = useState<GuidedNamingInput>({
    category: "product",
    version: "V1.0",
  });

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
    const namingPreview = buildNamingPreview(namingInput);
    if (namingMode === "guided" && !namingPreview.complete) {
      toast.error(pt("upload.naming.incomplete"));
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
      plannerAuditorId: plannerAuditorId ?? undefined,
      designerId: designerId ?? undefined,
      isVersionReplace: versionReplace,
      isLargeFile: hasLarge || undefined,
      associateOldVersionId:
        versionReplace && oldVersion !== null
          ? oldVersion.baseRecordId
          : undefined,
      namingMode,
      namingInput: namingMode === "guided" ? namingInput : undefined,
    };
    await onSubmit(payload);
  };

  const anyUploading: boolean =
    slotM.uploading || slotL.uploading || slotS.uploading;
  const originalFileName = form.watch("originalFileName").trim();
  const keyInfo = form.watch("note").trim();
  const namingPreview = useMemo(
    () => buildNamingPreview(namingInput),
    [namingInput],
  );
  const remainingRequired =
    (slotM.files.length === 0 ? 1 : 0) +
    (originalFileName.length === 0 ? 1 : 0) +
    (versionReplace && oldVersion === null ? 1 : 0) +
    (namingMode === "guided" ? namingPreview.missing.length : 0);
  const uploadedFileCount =
    slotM.files.length + slotL.files.length + slotS.files.length;
  const updateNaming = <K extends keyof GuidedNamingInput>(
    key: K,
    value: GuidedNamingInput[K],
  ): void => {
    setNamingInput((previous) => ({ ...previous, [key]: value }));
  };

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
                      placeholder={pt(
                        "upload.field.originalFileName.placeholder",
                      )}
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <section className="space-y-4 border-t border-border pt-5">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {pt("upload.naming.title")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pt("upload.naming.hint")}
                </p>
              </div>
              <div className="inline-grid w-full grid-cols-2 rounded-md border border-border bg-muted/40 p-1 sm:w-auto">
                {(["ai", "guided"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={namingMode === mode}
                    onClick={() => setNamingMode(mode)}
                    className={`h-9 rounded-sm px-4 text-sm transition-colors ${
                      namingMode === mode
                        ? "bg-background font-medium text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {pt(`upload.naming.mode.${mode}`)}
                  </button>
                ))}
              </div>

              {namingMode === "guided" ? (
                <div className="space-y-4 border-l-2 border-primary/30 pl-4">
                  <div className="grid grid-cols-3 gap-1 rounded-md bg-muted/40 p-1">
                    {(["product", "brand", "expo"] as NamingCategory[]).map(
                      (category) => (
                        <button
                          key={category}
                          type="button"
                          aria-pressed={namingInput.category === category}
                          onClick={() => updateNaming("category", category)}
                          className={`h-9 rounded-sm px-2 text-sm transition-colors ${
                            namingInput.category === category
                              ? "bg-background font-medium text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {pt(`upload.naming.category.${category}`)}
                        </button>
                      ),
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {namingInput.category === "product" ? (
                      <label className="space-y-1.5 text-sm font-medium">
                        {pt("upload.naming.productModel")}
                        <Input
                          value={namingInput.productModel ?? ""}
                          onChange={(event) =>
                            updateNaming("productModel", event.target.value)
                          }
                          placeholder="IPV-1K612U"
                        />
                      </label>
                    ) : null}
                    <label className="space-y-1.5 text-sm font-medium">
                      {pt("upload.naming.materialType")}
                      <Select
                        value={namingInput.materialType ?? ""}
                        onValueChange={(value) =>
                          updateNaming(
                            "materialType",
                            value as GuidedNamingInput["materialType"],
                          )
                        }
                      >
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue
                            placeholder={pt("upload.naming.select")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {MATERIAL_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                    {namingInput.category !== "expo" ? (
                      <label className="space-y-1.5 text-sm font-medium">
                        {pt("upload.naming.language")}
                        <Select
                          value={namingInput.language ?? ""}
                          onValueChange={(value) =>
                            updateNaming(
                              "language",
                              value as GuidedNamingInput["language"],
                            )
                          }
                        >
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue
                              placeholder={pt("upload.naming.select")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {NAMING_LANGUAGE_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                    ) : null}
                    {namingInput.category === "expo" ||
                    (namingInput.category === "brand" &&
                      namingInput.materialType?.startsWith("Logo")) ? (
                      <label className="space-y-1.5 text-sm font-medium">
                        {pt(
                          namingInput.category === "expo"
                            ? "upload.naming.expoName"
                            : "upload.naming.brandName",
                        )}
                        <Input
                          value={namingInput.brandOrExpoName ?? ""}
                          onChange={(event) =>
                            updateNaming("brandOrExpoName", event.target.value)
                          }
                          placeholder={
                            namingInput.category === "expo" ? "GITEX" : "itel"
                          }
                        />
                      </label>
                    ) : null}
                    {namingInput.category === "expo" ? (
                      <label className="space-y-1.5 text-sm font-medium">
                        {pt("upload.naming.eventYear")}
                        <Input
                          inputMode="numeric"
                          value={namingInput.eventYear ?? ""}
                          onChange={(event) =>
                            updateNaming("eventYear", event.target.value)
                          }
                          placeholder="2026"
                        />
                      </label>
                    ) : null}
                    <label className="space-y-1.5 text-sm font-medium">
                      {pt("upload.naming.region")}
                      <Input
                        value={namingInput.region ?? ""}
                        onChange={(event) =>
                          updateNaming("region", event.target.value)
                        }
                        placeholder={pt("upload.naming.region.placeholder")}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      {pt("upload.naming.version")}
                      <Input
                        value={namingInput.version ?? ""}
                        onChange={(event) =>
                          updateNaming("version", event.target.value)
                        }
                        placeholder="V1.0"
                      />
                    </label>
                  </div>
                </div>
              ) : null}
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">
                  {pt("upload.field.planner")}
                </span>
                <PeopleSelect
                  candidateType="plannerAuditor"
                  value={plannerAuditorId}
                  onChange={setPlannerAuditorId}
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
                {namingMode === "guided"
                  ? pt("upload.naming.previewTitle")
                  : pt("upload.review.namingClues")}
              </p>
              {namingMode === "guided" ? (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
                  <p className="break-all font-mono text-xs leading-5 text-foreground">
                    {namingPreview.preview}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {namingPreview.complete
                      ? pt("upload.naming.previewReady")
                      : `${pt("upload.naming.previewMissing")} ${namingPreview.missing.length}`}
                  </p>
                </div>
              ) : null}
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
                    {(plannerAuditorId ? 1 : 0) + (designerId ? 1 : 0)}
                  </dd>
                </div>
              </dl>
              <p className="text-xs leading-5 text-muted-foreground">
                {pt(
                  namingMode === "guided"
                    ? "upload.naming.guidedNotice"
                    : "upload.review.aiNotice",
                )}
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
