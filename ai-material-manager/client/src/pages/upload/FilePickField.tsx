import React, { useRef, useState } from "react";
import { FileText, Loader, Plus, UploadCloud, X } from "lucide-react";

import { Button } from "@client/src/components/ui/button";
import { useI18n } from "@client/src/hooks/use-i18n";
import { UPLOAD_I18N } from "./upload-i18n";

export interface FileItem {
  fileToken: string;
  fileName: string;
  fileSize: number;
  isLargeFile: boolean;
}

export interface FileSlotState {
  files: FileItem[];
  uploading: boolean;
  uploadProgress?: { uploadedBlocks: number; totalBlocks: number };
}

interface FilePickFieldProps {
  labelKey: string;
  hintKey: string;
  required?: boolean;
  accept?: string;
  slot: FileSlotState;
  onPick: (file: File) => Promise<FileItem | null>;
  onRemove: (index: number) => void;
}

const LARGE_FILE_THRESHOLD = 20 * 1024 * 1024;

const formatSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const UploadProgressBar: React.FC<{
  progress: { uploadedBlocks: number; totalBlocks: number };
  label: string;
}> = ({ progress, label }) => {
  const percent = Math.round(
    (progress.uploadedBlocks / progress.totalBlocks) * 100,
  );
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {label} {progress.uploadedBlocks} / {progress.totalBlocks}
        </span>
        <span className="font-mono text-primary">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-accent">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

const FilePickField: React.FC<FilePickFieldProps> = ({
  labelKey,
  hintKey,
  required = false,
  accept,
  slot,
  onPick,
  onRemove,
}) => {
  const { language } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const pt = (key: string): string => UPLOAD_I18N[key]?.[language] ?? key;
  const hasFiles: boolean = slot.files.length > 0;

  const processFiles = async (files: File[]): Promise<void> => {
    for (const file of files) {
      await onPick(file);
    }
  };

  const handlePick = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const files: FileList | null = event.target.files;
    if (files) {
      await processFiles(Array.from(files));
    }
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (slot.uploading) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) void processFiles(files);
  };

  const dropHandlers = {
    onDragEnter: (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (!slot.uploading) setDragging(true);
    },
    onDragOver: (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
    },
    onDragLeave: (event: React.DragEvent<HTMLButtonElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setDragging(false);
      }
    },
    onDrop: handleDrop,
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">
          {pt(labelKey)}
          {required ? (
            <span className="ml-0.5 text-destructive">*</span>
          ) : null}
        </span>
        <span className="text-xs text-muted-foreground">{pt(hintKey)}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          void handlePick(event);
        }}
      />
      {hasFiles ? (
        <div className="space-y-1.5">
          {slot.files.map((item: FileItem, index: number) => (
            <div
              key={`${item.fileToken}-${index}`}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
            >
              <FileText className="size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">
                  {item.fileName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatSize(item.fileSize)}
                  {item.isLargeFile ? (
                    <span className="ml-2 inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                      {pt("upload.field.largeFile")}
                    </span>
                  ) : null}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={slot.uploading}
                onClick={() => onRemove(index)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
          {slot.uploading && slot.uploadProgress ? (
            <UploadProgressBar
              progress={slot.uploadProgress}
              label={pt("upload.field.chunking")}
            />
          ) : null}
          <button
            type="button"
            disabled={slot.uploading}
            onClick={() => inputRef.current?.click()}
            {...dropHandlers}
            className={`flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-xs transition-colors duration-fast disabled:opacity-60 ${
              dragging
                ? "border-primary bg-primary/5 text-primary"
                : "border-border-strong bg-accent/50 text-accent-foreground hover:bg-accent"
            }`}
          >
            <Plus className="size-3.5" />
            {pt("upload.field.addMore")}
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={slot.uploading}
            onClick={() => inputRef.current?.click()}
            {...dropHandlers}
            className={`flex w-full items-center justify-center gap-2 rounded-md border border-dashed px-3 py-5 text-sm transition-colors duration-fast disabled:opacity-60 ${
              dragging
                ? "border-primary bg-primary/5 text-primary"
                : "border-border-strong bg-accent/50 text-accent-foreground hover:bg-accent"
            }`}
          >
            {slot.uploading ? (
              <>
                <Loader className="size-4 animate-spin" />
                {pt("upload.field.uploading")}
              </>
            ) : (
              <>
                <UploadCloud className="size-4" />
                {pt("upload.field.pick")}
              </>
            )}
          </button>
          {slot.uploading && slot.uploadProgress ? (
            <UploadProgressBar
              progress={slot.uploadProgress}
              label={pt("upload.field.chunking")}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};

export default FilePickField;
export { LARGE_FILE_THRESHOLD };
