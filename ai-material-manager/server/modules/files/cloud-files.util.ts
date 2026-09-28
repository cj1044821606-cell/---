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
      item.split('\n').forEach((line) => add(line.trim()));
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
    Object.values(segment)
      .filter((child) => typeof child === 'object')
      .forEach(visit);
  };
  visit(value);
  return [...refs.values()];
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
