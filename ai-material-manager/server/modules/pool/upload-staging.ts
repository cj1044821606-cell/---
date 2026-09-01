import {
  createReadStream,
  createWriteStream,
  existsSync,
} from "node:fs";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";

const UPLOAD_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/u;

export function normalizeUploadId(value: string): string | null {
  return UPLOAD_ID_PATTERN.test(value) ? value : null;
}

export function chunkPath(
  incomingDir: string,
  uploadId: string,
  chunkIndex: number,
): string {
  return path.join(incomingDir, `${uploadId}.${chunkIndex}.chunk`);
}

export async function assembleUploadChunks(params: {
  incomingDir: string;
  uploadId: string;
  chunkTotal: number;
  expectedSize: number;
}): Promise<{ filePath: string; fileSize: number }> {
  const { incomingDir, uploadId, chunkTotal, expectedSize } = params;
  const missing: number[] = [];

  for (let index = 0; index < chunkTotal; index += 1) {
    if (!existsSync(chunkPath(incomingDir, uploadId, index))) {
      missing.push(index);
    }
  }

  if (missing.length > 0) {
    throw new Error(`missing upload chunks: ${missing.join(",")}`);
  }

  const buildingPath = path.join(incomingDir, `${uploadId}.building`);
  const filePath = path.join(incomingDir, `${uploadId}.part`);
  await fs.writeFile(buildingPath, "");

  try {
    for (let index = 0; index < chunkTotal; index += 1) {
      await pipeline(
        createReadStream(chunkPath(incomingDir, uploadId, index)),
        createWriteStream(buildingPath, { flags: "a" }),
      );
    }

    const fileSize = (await fs.stat(buildingPath)).size;
    if (expectedSize > 0 && fileSize !== expectedSize) {
      throw new Error(
        `assembled upload size mismatch: expected=${expectedSize} actual=${fileSize}`,
      );
    }

    await fs.rename(buildingPath, filePath);
    for (let index = 0; index < chunkTotal; index += 1) {
      await fs.unlink(chunkPath(incomingDir, uploadId, index));
    }
    return { filePath, fileSize };
  } catch (error) {
    await fs.unlink(buildingPath).catch(() => undefined);
    throw error;
  }
}
