import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createWriteStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const MAX_BYTES = 80 * 1024 * 1024;
const TEMP_NAME = /^pdf-preview-[0-9a-f-]{36}\.pdf$/;

@Injectable()
export class PdfPreviewService {
  async cleanupInterrupted(directory: string): Promise<void> {
    for (const name of await fs.readdir(directory)) {
      // Only this service's exact temporary filenames; never touch uploaded originals.
      if (TEMP_NAME.test(name)) await fs.unlink(path.join(directory, name));
    }
  }

  async render(
    response: Response,
    width: number,
    directory: string,
  ): Promise<Buffer> {
    const input = path.join(directory, `pdf-preview-${randomUUID()}.pdf`);
    try {
      if (!response.body) throw new Error('PDF response has no body');
      let bytes = 0;
      const limit = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          bytes += chunk.length;
          callback(
            bytes > MAX_BYTES
              ? new Error('PDF exceeds preview size limit')
              : null,
            chunk,
          );
        },
      });
      await pipeline(
        Readable.fromWeb(
          response.body as Parameters<typeof Readable.fromWeb>[0],
        ),
        limit,
        createWriteStream(input, { flags: 'wx', mode: 0o600 }),
      );
      const { stdout } = await execFileAsync(
        'pdftoppm',
        [
          '-f',
          '1',
          '-l',
          '1',
          '-singlefile',
          '-scale-to',
          String(width),
          '-png',
          input,
        ],
        { encoding: 'buffer', timeout: 30_000, maxBuffer: 16 * 1024 * 1024 },
      );
      return stdout;
    } finally {
      await fs.unlink(input).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  }
}
