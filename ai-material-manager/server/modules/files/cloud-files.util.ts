import type { CloudFileRef, DeliverableFile } from '@shared/files';

export function parseCloudFiles(value: unknown): CloudFileRef[] {
  const refs = new Map<string, CloudFileRef>();
  const seen = new WeakSet<object>();
  const add = (link: string, name?: unknown, token?: unknown): void => {
    try {
      const url = new URL(link);
      if (
        url.protocol !== 'https:' ||
        !/(^|\.)(feishu\.cn|larksuite\.com)$/.test(url.hostname)
      )
        return;
      if (!refs.has(link))
        refs.set(link, {
          link,
          fileName:
            typeof name === 'string' && name.trim() ? name.trim() : '云盘文件',
          fileToken: typeof token === 'string' ? token : '',
        });
    } catch {
      /* Plain text is not an external delivery link. */
    }
  };
  const visit = (item: unknown): void => {
    if (typeof item === 'string') {
      const lines = item.split('\n').map((line) => line.trim());
      lines.forEach((line, index) => {
        const markdown = /^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/.exec(
          line.trim(),
        );
        if (markdown) add(markdown[2], markdown[1]);
        else
          add(
            line,
            index > 0 && !/^https?:\/\//i.test(lines[index - 1])
              ? lines[index - 1]
              : undefined,
          );
      });
      return;
    }
    if (!item || typeof item !== 'object' || seen.has(item)) return;
    seen.add(item);
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    const segment = item as Record<string, unknown>;
    const link = segment.link ?? segment.url;
    if (typeof link === 'string')
      add(link, segment.text ?? segment.name, segment.token);
    else if (typeof segment.text === 'string') visit(segment.text);
    Object.values(segment)
      .filter((child) => typeof child === 'object')
      .forEach(visit);
  };
  visit(value);
  return [...refs.values()];
}

/** Bare URL lines remain readable by older deployed clients. */
export function serializeCloudFiles(refs: CloudFileRef[]): string {
  return refs
    .map((ref) => `${ref.fileName.replace(/[\r\n]/g, '_')}\n${ref.link}`)
    .join('\n');
}

/** A same-name cloud copy is an alternate channel, not proof of byte identity. */
export function mergeCloudChannels(
  files: DeliverableFile[],
  refs: CloudFileRef[],
): DeliverableFile[] {
  const result = files.map((file) => ({ ...file }));
  for (const ref of refs) {
    const matches = result.filter(
      (file) =>
        file.delivery === 'direct' &&
        file.fileName.normalize('NFC') === ref.fileName.normalize('NFC'),
    );
    if (
      matches.length === 1 &&
      refs.filter((other) => other.fileName === ref.fileName).length === 1
    ) {
      matches[0].cloudCopyUrl = ref.link;
    } else {
      result.push({
        kind: files[0]?.kind ?? 'M',
        fileName: ref.fileName,
        delivery: 'external',
        url: ref.link,
        previewUrl: null,
        sizeBytes: null,
        mimeType: null,
      });
    }
  }
  return result;
}
