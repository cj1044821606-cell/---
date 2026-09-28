import { Download, ExternalLink, Eye, FileText, Palette } from 'lucide-react';
import type { DeliverableFile } from '@shared/files';
import { triggerDownload } from '@client/src/utils/download';

const TIERS = ['M', 'L', 'S'] as const;
const COPY = {
  zh: {
    M: [
      '可直接使用',
      'M · 导出文件，用于阅读、交付或印刷；外发以物料权限为准。',
    ],
    L: [
      '可编辑源文件',
      'L · 供设计师修改，通常需要 Illustrator、Photoshop 等设计软件。',
    ],
    S: ['预览图', 'S · 用于快速辨认内容，不替代正式交付文件。'],
    rgb: 'RGB · 屏幕展示',
    cmyk: 'CMYK · 印刷输出',
    file: '文件',
    cloud: '同名云盘副本',
    open: '打开云盘文件',
    preview: '查看预览',
    download: '下载',
  },
  en: {
    M: [
      'Ready-to-use files',
      'M · For reading, delivery or printing. External use follows material permissions.',
    ],
    L: [
      'Editable source files',
      'L · For design edits; may require Illustrator, Photoshop or other design software.',
    ],
    S: [
      'Preview images',
      'S · For quick identification, not a substitute for delivery files.',
    ],
    rgb: 'RGB · Digital screens',
    cmyk: 'CMYK · Print output',
    file: 'File',
    cloud: 'Same-name cloud copy',
    open: 'Open cloud file',
    preview: 'View preview',
    download: 'Download',
  },
};

export default function MaterialFileList({
  files,
  language,
}: {
  files: DeliverableFile[];
  language: 'zh' | 'en';
}) {
  const copy = COPY[language];
  return (
    <div className="divide-y divide-border">
      {TIERS.map((tier) => {
        const group = files.filter((file) => file.kind === tier);
        if (!group.length) return null;
        const Icon = tier === 'L' ? Palette : tier === 'S' ? Eye : FileText;
        return (
          <section key={tier} className="py-4 first:pt-0 last:pb-0">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="size-4 text-primary" />
              {copy[tier][0]}
              <span className="text-xs font-normal tabular-nums text-muted-foreground">
                {group.length}
              </span>
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {copy[tier][1]}
            </p>
            <ul className="mt-2 divide-y divide-border/60">
              {group.map((file) => {
                const variant = /(^|[-_\s.])CMYK(?=[-_\s.]|$)/i.test(
                  file.fileName,
                )
                  ? copy.cmyk
                  : /(^|[-_\s.])RGB(?=[-_\s.]|$)/i.test(file.fileName)
                    ? copy.rgb
                    : null;
                const extension = file.fileName.includes('.')
                  ? file.fileName.split('.').pop()?.toUpperCase()
                  : copy.file;
                const preview =
                  tier === 'S' && file.delivery === 'direct' && file.previewUrl;
                const label =
                  file.delivery === 'external'
                    ? copy.open
                    : preview
                      ? copy.preview
                      : copy.download;
                const ActionIcon =
                  file.delivery === 'external'
                    ? ExternalLink
                    : preview
                      ? Eye
                      : Download;
                return (
                  <li
                    key={`${file.kind}-${file.url}`}
                    className="flex items-start gap-2 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium leading-snug">
                        {file.fileName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[extension, variant].filter(Boolean).join(' · ')}
                      </p>
                      {file.cloudCopyUrl ? (
                        <a
                          href={file.cloudCopyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex min-h-8 items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          {copy.cloud}
                        </a>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      title={`${label} ${file.fileName}`}
                      aria-label={`${label} ${file.fileName}`}
                      className="grid size-10 shrink-0 place-items-center rounded-md text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        if (file.delivery === 'external' || preview)
                          window.open(
                            preview || file.url,
                            '_blank',
                            'noopener,noreferrer',
                          );
                        else triggerDownload(file.url, file.fileName);
                      }}
                    >
                      <ActionIcon className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
