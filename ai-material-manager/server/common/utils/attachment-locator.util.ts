export interface AttachmentLocator {
  fileToken: string;
  fileName: string;
}

const PREFIX = "feishu-media:";

export function encodeAttachmentLocator(value: AttachmentLocator): string {
  return `${PREFIX}${Buffer.from(JSON.stringify(value)).toString("base64url")}`;
}

export function decodeAttachmentLocator(
  value: string,
): AttachmentLocator | null {
  if (!value.startsWith(PREFIX)) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(value.slice(PREFIX.length), "base64url").toString("utf8"),
    ) as Partial<AttachmentLocator>;
    if (!decoded.fileToken || !decoded.fileName) return null;
    return { fileToken: decoded.fileToken, fileName: decoded.fileName };
  } catch {
    return null;
  }
}
