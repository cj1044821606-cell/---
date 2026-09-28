import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { getGroupQrStatus, type SystemSettings } from "@shared/settings";
import { FeishuBaseGateway } from "@server/modules/feishu/feishu-base.gateway";
import { FilesService } from "@server/modules/files/files.service";

export interface SystemConfigRecord {
  key: string;
  name: string | null;
  textValue: string | null;
  imageUrls: string[];
  expiryMs: number | null;
  enabled: boolean;
}

const SETTINGS_CACHE_KEY = "system-settings:global";
const SETTINGS_CACHE_TTL_MS: number = 60 * 1000;
const DEFAULT_SYNC_DELAY_HINT = "内容同步可能有几秒延迟，稍后刷新即可看到";

@Injectable()
export class SystemConfigService {
  constructor(
    private readonly base: FeishuBaseGateway,
    private readonly files: FilesService,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async getSettings(userId: string): Promise<SystemSettings> {
    const result: SystemSettings | undefined = await this.cache.wrap(
      `${SETTINGS_CACHE_KEY}:${userId}`,
      () => this.buildSettings(userId),
      SETTINGS_CACHE_TTL_MS,
    );
    if (!result) {
      return this.buildSettings(userId);
    }
    return result;
  }

  private async buildSettings(userId: string): Promise<SystemSettings> {
    const configs: SystemConfigRecord[] = await this.fetchAllConfigs();
    const byKey: Map<string, SystemConfigRecord> = new Map(
      configs.map((config) => [config.key, config]),
    );

    const qr: SystemConfigRecord | undefined = byKey.get("group_qr");
    const uploadForm: SystemConfigRecord | undefined =
      byKey.get("upload_form_url");
    const syncHint: SystemConfigRecord | undefined =
      byKey.get("sync_delay_hint");
    const qrExpiry: number | null = qr?.expiryMs ?? null;
    const groupQrStatus = getGroupQrStatus(
      qr?.enabled === true,
      Boolean(qr?.imageUrls[0]),
      qrExpiry,
    );

    return {
      groupQrUrl:
        qr?.imageUrls[0] &&
        (groupQrStatus === "available" || groupQrStatus === "expiring")
          ? this.files.makeMediaUrl(qr.imageUrls[0], userId)
          : null,
      groupQrExpiry:
        qrExpiry != null && Number.isFinite(qrExpiry)
          ? new Date(qrExpiry).toISOString()
          : null,
      groupQrStatus,
      uploadFormUrl: uploadForm?.textValue ?? null,
      syncDelayHint: syncHint?.textValue || DEFAULT_SYNC_DELAY_HINT,
    };
  }

  async fetchAllConfigs(): Promise<SystemConfigRecord[]> {
    const rows = await this.base.rows<{
      key: string | null;
      name: string | null;
      textValue: string | null;
      imageUrls: string[];
      expiryMs: number | null;
      enabled: boolean;
    } & Record<string, unknown>>("config");
    return rows
      .filter((row) => Boolean(row.key) && row.enabled === true)
      .map((row) => ({
        key: row.key as string,
        name: row.name,
        textValue: row.textValue,
        imageUrls: row.imageUrls,
        expiryMs: row.expiryMs,
        enabled: row.enabled,
      }));
  }
}
