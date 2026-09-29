import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { encodeAttachmentLocator } from "@server/common/utils/attachment-locator.util";
import { FeishuService } from "./feishu.service";
import { parseCloudFiles } from "@server/modules/files/cloud-files.util";
import {
  BASE_FIELD_CONTRACTS,
  BASE_TABLE_IDS,
  type BaseTableKey,
  type FieldKind,
} from "./feishu-base.contracts";

export type FeishuFieldValue =
  | string
  | number
  | boolean
  | { text?: string; link?: string }
  | Array<string>
  | Array<{ id?: string; name?: string; avatar_url?: string }>
  | Array<{ file_token?: string; name?: string; type?: string; size?: number }>;

type RawFields = Record<string, unknown>;

interface RawRecord {
  record_id?: string;
  fields: RawFields;
  created_time?: number;
  last_modified_time?: number;
}

interface CacheEntry {
  expiresAt: number;
  rows: Record<string, unknown>[];
}

const CACHE_TTL_MS = 4_000;
const RETRY_DELAYS_MS = [250, 750, 1_500];

@Injectable()
export class FeishuBaseGateway {
  private readonly logger = new Logger(FeishuBaseGateway.name);
  private readonly appToken: string;
  private readonly cache = new Map<BaseTableKey, CacheEntry>();
  private readonly inFlight = new Map<
    BaseTableKey,
    Promise<Record<string, unknown>[]>
  >();
  private readonly writeQueues = new Map<BaseTableKey, Promise<void>>();

  constructor(
    private readonly feishu: FeishuService,
    config: ConfigService,
  ) {
    this.appToken = config.get<string>("FEISHU_BASE_APP_TOKEN") ?? "";
    if (!this.appToken) throw new Error("FEISHU_BASE_APP_TOKEN is required");
  }

  /**
   * 读取整表。`maxStaleMs` 允许在缓存过期后的一段时间内先返回旧快照、
   * 同时在后台刷新（stale-while-revalidate），适合对秒级新鲜度不敏感的浏览类页面。
   */
  async rows<T extends Record<string, unknown>>(
    table: BaseTableKey,
    options: { force?: boolean; maxStaleMs?: number } = {},
  ): Promise<T[]> {
    const cached = this.cache.get(table);
    const now = Date.now();
    if (!options.force && cached && cached.expiresAt > now) {
      return cached.rows as T[];
    }
    if (
      !options.force &&
      cached &&
      options.maxStaleMs !== undefined &&
      now - cached.expiresAt < options.maxStaleMs
    ) {
      void this.refresh(table).catch((error: unknown) => {
        this.logger.warn(`Background refresh failed (${table}): ${String(error)}`);
      });
      return cached.rows as T[];
    }
    return this.refresh(table, options.force === true) as Promise<T[]>;
  }

  /** 合并同表并发读取；force 时总是发起新请求，保持原有语义 */
  private refresh(
    table: BaseTableKey,
    force: boolean = false,
  ): Promise<Record<string, unknown>[]> {
    const pending = this.inFlight.get(table);
    if (!force && pending) return pending;
    const request = this.fetchRows(table).finally(() => {
      this.inFlight.delete(table);
    });
    this.inFlight.set(table, request);
    return request;
  }

  async rowById<T extends Record<string, unknown>>(
    table: BaseTableKey,
    recordId: string,
    options: { force?: boolean } = {},
  ): Promise<T> {
    const rows = await this.rows<T>(table, options);
    const row = rows.find((item) => item.baseRecordId === recordId);
    if (!row) throw new NotFoundException(`Base record not found: ${recordId}`);
    return row;
  }

  async createRecord(
    table: BaseTableKey,
    fields: Record<string, FeishuFieldValue>,
  ): Promise<string> {
    return this.enqueueWrite(table, async () => {
      const response = await this.callWithRetry(() =>
        this.feishu.client.bitable.appTableRecord.batchCreate({
          path: { app_token: this.appToken, table_id: BASE_TABLE_IDS[table] },
          params: { user_id_type: "open_id" },
          data: { records: [{ fields }] },
        }),
      );
      this.assertResponse(response.code, response.msg, "batchCreate", table);
      const recordId = response.data?.records?.[0]?.record_id;
      if (!recordId) throw new Error(`Base batchCreate returned no record_id (${table})`);
      this.invalidate(table);
      return recordId;
    });
  }

  async updateRecord(
    table: BaseTableKey,
    recordId: string,
    fields: Record<string, FeishuFieldValue>,
  ): Promise<string> {
    return this.enqueueWrite(table, async () => {
      const response = await this.callWithRetry(() =>
        this.feishu.client.bitable.appTableRecord.update({
          path: {
            app_token: this.appToken,
            table_id: BASE_TABLE_IDS[table],
            record_id: recordId,
          },
          params: { user_id_type: "open_id" },
          data: { fields },
        }),
      );
      this.assertResponse(response.code, response.msg, "update", table);
      this.invalidate(table);
      return response.data?.record?.record_id ?? recordId;
    });
  }

  invalidate(table: BaseTableKey): void {
    this.cache.delete(table);
  }

  userField(openIds: string[]): Array<{ id: string }> {
    return [...new Set(openIds.filter(Boolean))].map((id) => ({ id }));
  }

  private async fetchRows(
    table: BaseTableKey,
  ): Promise<Record<string, unknown>[]> {
    const records: RawRecord[] = [];
    let pageToken: string | undefined;
    do {
      const response = await this.callWithRetry(() =>
        this.feishu.client.bitable.appTableRecord.search({
          path: { app_token: this.appToken, table_id: BASE_TABLE_IDS[table] },
          params: {
            user_id_type: "open_id",
            page_size: 500,
            ...(pageToken ? { page_token: pageToken } : {}),
          },
          data: { automatic_fields: true },
        }),
      );
      this.assertResponse(response.code, response.msg, "search", table);
      records.push(...((response.data?.items ?? []) as RawRecord[]));
      pageToken = response.data?.has_more ? response.data.page_token : undefined;
    } while (pageToken);

    const rows = records.map((record) => this.mapRecord(table, record));
    this.cache.set(table, { expiresAt: Date.now() + CACHE_TTL_MS, rows });
    return rows;
  }

  private mapRecord(
    table: BaseTableKey,
    record: RawRecord,
  ): Record<string, unknown> {
    const createdAt = this.toDate(record.created_time) ?? new Date(0);
    const updatedAt = this.toDate(record.last_modified_time) ?? createdAt;
    const row: Record<string, unknown> = {
      id: record.record_id ?? "",
      baseRecordId: record.record_id ?? "",
      createdAt,
      updatedAt,
    };
    for (const field of BASE_FIELD_CONTRACTS[table]) {
      row[field.target] = this.parseValue(record.fields[field.source], field.kind);
    }
    return row;
  }

  private parseValue(value: unknown, kind: FieldKind): unknown {
    switch (kind) {
      case "text":
        return this.toText(value);
      case "stringArray":
        return this.toStringArray(value);
      case "boolean":
        return value === true;
      case "number":
        return typeof value === "number" ? value : null;
      case "date":
        return this.toDate(value);
      case "user":
        return this.toUserIds(value)[0] ?? null;
      case "users":
        return this.toUserIds(value);
      case "userProfiles":
        return this.toUserProfiles(value);
      case "link":
        return { link_record_ids: this.toLinkIds(value) };
      case "attachment":
        return this.toAttachments(value);
      case "mentionLinks":
        return this.toMentionLinks(value);
      case "mentionFiles":
        return parseCloudFiles(value);
    }
  }

  private toText(value: unknown): string | null {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      if (typeof record.text === "string") return record.text;
      if (typeof record.name === "string") return record.name;
    }
    if (Array.isArray(value)) {
      const parts = value
        .map((item) => this.toText(item))
        .filter((item): item is string => Boolean(item));
      return parts.length > 0 ? parts.join("") : null;
    }
    return null;
  }

  private toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      const text = this.toText(value);
      return text ? [text] : [];
    }
    return value
      .map((item) => this.toText(item))
      .filter((item): item is string => Boolean(item));
  }

  private toDate(value: unknown): Date | null {
    if (value instanceof Date) return value;
    if (typeof value === "number") {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === "string" && value) {
      const numeric = Number(value);
      const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  private toUserIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        for (const key of ["id", "open_id", "openId"]) {
          if (typeof record[key] === "string") return record[key] as string;
        }
        return null;
      })
      .filter((id): id is string => Boolean(id));
  }

  private toUserProfiles(
    value: unknown,
  ): Array<{ id: string; name: string; avatarUrl: string | null }> {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const id = [record.id, record.open_id, record.openId].find(
          (candidate): candidate is string => typeof candidate === "string",
        );
        if (!id) return null;
        return {
          id,
          name: typeof record.name === "string" ? record.name : id,
          avatarUrl:
            typeof record.avatar_url === "string" ? record.avatar_url : null,
        };
      })
      .filter(
        (item): item is { id: string; name: string; avatarUrl: string | null } =>
          item !== null,
      );
  }

  private toLinkIds(value: unknown): string[] {
    const items = Array.isArray(value) ? value : [value];
    const ids = items.flatMap((item): string[] => {
      if (typeof item === "string") return [item];
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      for (const key of ["record_ids", "link_record_ids"]) {
        const linkedIds = record[key];
        if (Array.isArray(linkedIds)) {
          return linkedIds.filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          );
        }
      }
      for (const key of ["record_id", "recordId", "id"]) {
        if (typeof record[key] === "string") return [record[key] as string];
      }
      return [];
    });
    return [...new Set(ids)];
  }

  private toAttachments(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const fileToken = record.file_token;
        if (typeof fileToken !== "string" || !fileToken) return null;
        const fileName =
          typeof record.name === "string" && record.name
            ? record.name
            : `file-${fileToken.slice(0, 8)}`;
        return encodeAttachmentLocator({ fileToken, fileName });
      })
      .filter((item): item is string => Boolean(item));
  }

  private toMentionLinks(value: unknown): string | null {
    const links: string[] = [];
    const visited = new WeakSet<object>();
    const visit = (item: unknown): void => {
      if (Array.isArray(item)) {
        item.forEach(visit);
        return;
      }
      if (!item || typeof item !== "object") return;
      if (visited.has(item)) return;
      visited.add(item);
      const record = item as Record<string, unknown>;
      const link = record.link ?? record.url;
      if (typeof link === "string" && link) links.push(link);
      Object.values(record).forEach(visit);
    };
    visit(value);
    if (links.length > 0) return [...new Set(links)].join("\n");
    const text = this.toText(value);
    return text && /^https?:\/\//u.test(text) ? text : null;
  }

  private async enqueueWrite<T>(
    table: BaseTableKey,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = this.writeQueues.get(table) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(operation);
    const marker = run.then(
      () => undefined,
      () => undefined,
    );
    this.writeQueues.set(table, marker);
    try {
      return await run;
    } finally {
      if (this.writeQueues.get(table) === marker) this.writeQueues.delete(table);
    }
  }

  private async callWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt >= RETRY_DELAYS_MS.length) break;
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAYS_MS[attempt]),
        );
      }
    }
    throw lastError;
  }

  private assertResponse(
    code: number | undefined,
    msg: string | undefined,
    action: string,
    table: BaseTableKey,
  ): void {
    if (code === undefined || code === 0) return;
    this.logger.error(
      `Base ${action} failed table=${table} code=${code} msg=${msg ?? ""}`,
    );
    throw new Error(`飞书多维表格 ${action} 失败: ${msg ?? code}`);
  }
}
