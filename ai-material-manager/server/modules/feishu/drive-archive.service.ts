import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, promises as fs } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { decodeAttachmentLocator } from '@server/common/utils/attachment-locator.util';
import {
  parseCloudFiles,
  serializeCloudFiles,
} from '@server/modules/files/cloud-files.util';
import { FeishuBaseGateway } from './feishu-base.gateway';
import { FeishuService } from './feishu.service';
import {
  DriveArchiveRouter,
  type ArchiveDestination,
} from './drive-archive-router';
import type { CloudFileRef } from '@shared/files';

const TIERS = [
  ['currentValidAttachment', 'cloudFilesM', 'cloudDiskLinkM', '云盘链接M'],
  ['sourceFileL', 'cloudFilesL', 'cloudDiskLinkL', '云盘链接L'],
  ['previewFileS', 'cloudFilesS', 'cloudDiskLinkS', '云盘链接S'],
] as const;
interface ArchiveEntry {
  link?: string;
  fileName: string;
  error?: string;
  attempts: number;
  retryAt: number;
  destination?: ArchiveDestination;
}
export type ArchiveStatus =
  | 'complete'
  | 'pending'
  | 'retrying'
  | 'unconfigured';

/** Reconcile Base attachments, covering browser, MCP and automation-created records alike. */
@Injectable()
export class DriveArchiveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DriveArchiveService.name);
  private readonly folder: string;
  private readonly dir: string;
  private readonly origin: string;
  private running = false;
  private stopped = false;
  private timer?: ReturnType<typeof setInterval>;
  private entries: Record<string, ArchiveEntry> = {};
  private readonly autostart: boolean;

  constructor(
    private readonly base: FeishuBaseGateway,
    private readonly feishu: FeishuService,
    config: ConfigService,
    private readonly router: DriveArchiveRouter,
  ) {
    this.folder = config.get<string>('FEISHU_DRIVE_FOLDER_TOKEN') ?? '';
    this.autostart = config.get<string>('DRIVE_ARCHIVE_AUTOSTART') !== 'false';
    this.dir = path.join(
      config.get<string>('UPLOAD_DIR') ?? path.resolve('var/uploads'),
      'drive-archive',
    );
    this.origin = 'https://transsioner.feishu.cn';
  }
  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    try {
      this.entries = JSON.parse(
        await fs.readFile(path.join(this.dir, 'manifest.json'), 'utf8'),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if (!this.folder) {
      this.logger.warn('Drive archive needs FEISHU_DRIVE_FOLDER_TOKEN');
      return;
    }
    if (!this.autostart) return;
    this.timer = setInterval(() => {
      void this.reconcile();
    }, 30_000);
    this.timer.unref();
    void this.reconcile();
  }
  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
  }

  status(locator: string, cloudUrl?: string): ArchiveStatus {
    if (cloudUrl) return 'complete';
    if (!this.folder) return 'unconfigured';
    const token = decodeAttachmentLocator(locator)?.fileToken;
    return token && this.entries[token]?.error ? 'retrying' : 'pending';
  }
  location(locator: string): ArchiveDestination | undefined {
    const token = decodeAttachmentLocator(locator)?.fileToken;
    return token ? this.entries[token]?.destination : undefined;
  }
  copyLink(locator: string): string | undefined {
    const token = decodeAttachmentLocator(locator)?.fileToken;
    return token ? this.entries[token]?.link : undefined;
  }

  async reconcile(): Promise<void> {
    if (!this.folder || this.running || this.stopped) return;
    this.running = true;
    try {
      const rows = await this.base.rows<Record<string, unknown>>('main', {
        force: true,
      });
      for (const row of rows) {
        if (this.stopped) break;
        for (const [attachmentKey, refsKey, linkKey, field] of TIERS) {
          const attachments = (row[attachmentKey] ?? []) as string[];
          for (const locator of attachments) {
            if (this.stopped) break;
            const source = decodeAttachmentLocator(locator);
            if (!source) continue;
            const refs = (row[refsKey] ??
              parseCloudFiles(row[linkKey])) as CloudFileRef[];
            let entry = this.entries[source.fileToken];
            if (entry?.link && refs.some((ref) => ref.link === entry?.link))
              continue;
            const uniqueName =
              attachments.filter(
                (value) =>
                  decodeAttachmentLocator(value)?.fileName === source.fileName,
              ).length === 1;
            if (
              !entry &&
              uniqueName &&
              refs.filter((ref) => ref.fileName === source.fileName).length ===
                1
            )
              continue;
            if (entry?.retryAt > Date.now()) continue;
            try {
              entry ??= { fileName: source.fileName, attempts: 0, retryAt: 0 };
              this.entries[source.fileToken] = entry;
              if (!entry.link) {
                entry.destination = await this.router.resolve(
                  this.folder,
                  row,
                  source.fileName,
                );
                entry.link = await this.copy(
                  source.fileToken,
                  source.fileName,
                  source.sizeBytes,
                  entry.destination.token,
                );
                // Persist the uploaded token before Base write: retries must reuse the same copy.
                await this.persist();
              }
              const latest = await this.base.rowById<Record<string, unknown>>(
                'main',
                String(row.baseRecordId),
                { force: true },
              );
              if (
                !((latest[attachmentKey] as string[]) ?? []).some(
                  (value) =>
                    decodeAttachmentLocator(value)?.fileToken ===
                    source.fileToken,
                )
              )
                continue;
              const current = (latest[refsKey] ??
                parseCloudFiles(latest[linkKey])) as CloudFileRef[];
              const links = current.some((ref) => ref.link === entry.link)
                ? current
                : [
                    ...current,
                    {
                      fileName: source.fileName,
                      link: entry.link,
                      fileToken: '',
                    },
                  ];
              await this.base.updateRecord('main', String(row.baseRecordId), {
                [field]: serializeCloudFiles(links),
              });
              const readback = await this.base.rowById<Record<string, unknown>>(
                'main',
                String(row.baseRecordId),
                { force: true },
              );
              if (
                !(
                  (readback[refsKey] ??
                    parseCloudFiles(readback[linkKey])) as CloudFileRef[]
                ).some((ref) => ref.link === entry?.link)
              )
                throw new Error('Cloud link readback mismatch');
              delete entry.error;
              entry.retryAt = 0;
              await this.persist();
            } catch (error) {
              entry ??= { fileName: source.fileName, attempts: 0, retryAt: 0 };
              entry.attempts += 1;
              entry.error = String(error).slice(0, 300);
              entry.retryAt =
                Date.now() +
                Math.min(3_600_000, 30_000 * 2 ** Math.min(entry.attempts, 7));
              this.entries[source.fileToken] = entry;
              await this.persist();
              this.logger.warn(
                `Drive archive deferred: ${String(row.baseRecordId)} / ${source.fileName}: ${entry.error}`,
              );
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Drive archive scan failed: ${String(error)}`);
    } finally {
      this.running = false;
    }
  }

  private async persist(): Promise<void> {
    const target = path.join(this.dir, 'manifest.json');
    await fs.writeFile(`${target}.tmp`, JSON.stringify(this.entries), {
      mode: 0o600,
    });
    await fs.rename(`${target}.tmp`, target);
  }

  private async copy(
    token: string,
    name: string,
    expectedSize?: number,
    destination: string = this.folder,
  ): Promise<string> {
    const temp = path.join(
      this.dir,
      `${createHash('sha256').update(token).digest('hex')}.part`,
    );
    try {
      const tenant = await this.feishu.getTenantAccessToken();
      const response = await fetch(
        `https://open.feishu.cn/open-apis/drive/v1/medias/${encodeURIComponent(token)}/download`,
        {
          headers: { Authorization: `Bearer ${tenant}` },
          signal: AbortSignal.timeout(30 * 60_000),
        },
      );
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        throw new Error(`Download HTTP ${response.status}`);
      }
      // Bound temp usage to a single file and reserve disk before receiving large sources.
      const disk = await fs.statfs(this.dir);
      if (
        disk.bavail * disk.bsize <
        (expectedSize ?? 1024 ** 3) + 512 * 1024 ** 2
      ) {
        await response.body.cancel();
        throw new Error('Insufficient archive disk space');
      }
      await pipeline(
        Readable.fromWeb(response.body as never),
        createWriteStream(temp, { mode: 0o600 }),
      );
      const size = (await fs.stat(temp)).size;
      if (!size || (expectedSize !== undefined && size !== expectedSize))
        throw new Error('Archive byte count mismatch');
      const prepared = await this.feishu.client.drive.file.uploadPrepare({
        data: {
          file_name: name,
          parent_type: 'explorer',
          parent_node: destination,
          size,
        },
      });
      const plan = prepared.data;
      if (
        prepared.code !== 0 ||
        !plan?.upload_id ||
        !plan.block_size ||
        !plan.block_num
      )
        throw new Error(`Drive prepare: ${prepared.msg}`);
      const handle = await fs.open(temp, 'r');
      try {
        for (let seq = 0; seq < plan.block_num; seq++) {
          const length = Math.min(
            plan.block_size,
            size - seq * plan.block_size,
          );
          const buffer = Buffer.alloc(length);
          const { bytesRead } = await handle.read(
            buffer,
            0,
            length,
            seq * plan.block_size,
          );
          if (bytesRead !== length) throw new Error('Archive part truncated');
          // SDK returns null for a successful empty part response; transport failures throw.
          await this.feishu.client.drive.file.uploadPart({
            data: {
              upload_id: plan.upload_id,
              seq,
              size: length,
              file: buffer,
            },
          });
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } finally {
        await handle.close();
      }
      const finished = await this.feishu.client.drive.file.uploadFinish({
        data: { upload_id: plan.upload_id, block_num: plan.block_num },
      });
      if (finished.code !== 0 || !finished.data?.file_token)
        throw new Error(`Drive finish: ${finished.msg}`);
      return `${this.origin}/file/${encodeURIComponent(finished.data.file_token)}`;
    } finally {
      await fs.unlink(temp).catch(() => undefined);
    }
  }
}
