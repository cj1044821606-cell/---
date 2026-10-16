import { Inject, Injectable, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { FeishuBaseGateway } from "@server/modules/feishu/feishu-base.gateway";
import { FeishuService } from "@server/modules/feishu/feishu.service";

export const ACCESS_DEPARTMENT_KEY = "access_department_ids";
export const UPLOAD_DEPARTMENT_KEY = "upload_department_ids";

const USER_DEPARTMENTS_TTL_MS = 30 * 60 * 1000;
const DEPARTMENT_PARENTS_TTL_MS = 6 * 60 * 60 * 1000;

export type DepartmentCheck =
  | { state: "ok"; inDivision: boolean; inMarketing: boolean }
  | { state: "unconfigured" }
  | { state: "failed"; reason: string };

interface ConfigRow extends Record<string, unknown> {
  key: string | null;
  textValue: string | null;
  enabled: boolean;
}

/** 运维在配置里可能用中英文逗号、空格或换行分隔，统一切分去重 */
export function parseDepartmentIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(/[,，\s]+/u).map((id) => id.trim()).filter(Boolean))];
}

/**
 * 按飞书通讯录判断用户是否属于储能事业部 / 市场部（含所有下级部门）。
 * 部门 ID 来自系统配置表，改部门不需要重新部署；失败结果一律不缓存。
 */
@Injectable()
export class DepartmentService {
  private readonly logger = new Logger(DepartmentService.name);

  constructor(
    private readonly base: FeishuBaseGateway,
    private readonly feishu: FeishuService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async configStatus(): Promise<{ accessIds: string[]; uploadIds: string[] }> {
    const rows = await this.base.rows<ConfigRow>("config");
    const value = (key: string): string | null =>
      rows.find((row) => row.key === key && row.enabled === true)?.textValue ?? null;
    return {
      accessIds: parseDepartmentIds(value(ACCESS_DEPARTMENT_KEY)),
      uploadIds: parseDepartmentIds(value(UPLOAD_DEPARTMENT_KEY)),
    };
  }

  async check(openId: string): Promise<DepartmentCheck> {
    const { accessIds, uploadIds } = await this.configStatus();
    if (accessIds.length === 0) return { state: "unconfigured" };

    let lineage: Set<string>;
    try {
      lineage = await this.lineage(openId);
    } catch (first) {
      try {
        lineage = await this.lineage(openId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Department check failed: user=${openId} first=${String(first)} reason=${reason}`,
        );
        return { state: "failed", reason };
      }
    }
    return {
      state: "ok",
      inDivision: accessIds.some((id) => lineage.has(id)),
      inMarketing: uploadIds.some((id) => lineage.has(id)),
    };
  }

  /** 用户所属部门及其全部上级部门 */
  private async lineage(openId: string): Promise<Set<string>> {
    const key = `dept:user:v1:${openId}`;
    const cached = await this.cache.get<string[]>(key);
    if (cached) return new Set(cached);

    const departments = await this.userDepartments(openId);
    const all = new Set(departments);
    for (const departmentId of departments) {
      for (const parentId of await this.parents(departmentId)) all.add(parentId);
    }
    await this.cache.set(key, [...all], USER_DEPARTMENTS_TTL_MS);
    return all;
  }

  private async userDepartments(openId: string): Promise<string[]> {
    const response = await this.feishu.client.contact.v3.user.get({
      path: { user_id: openId },
      params: { user_id_type: "open_id", department_id_type: "open_department_id" },
    });
    if (response.code !== 0) {
      throw new Error(`contact.user.get code=${response.code} ${response.msg ?? ""}`.trim());
    }
    return response.data?.user?.department_ids ?? [];
  }

  private async parents(departmentId: string): Promise<string[]> {
    const key = `dept:parents:v1:${departmentId}`;
    const cached = await this.cache.get<string[]>(key);
    if (cached) return cached;

    const ids: string[] = [];
    let pageToken: string | undefined;
    do {
      const response = await this.feishu.client.contact.v3.department.parent({
        params: {
          department_id: departmentId,
          department_id_type: "open_department_id",
          page_size: 50,
          ...(pageToken ? { page_token: pageToken } : {}),
        },
      });
      if (response.code !== 0) {
        throw new Error(
          `contact.department.parent code=${response.code} ${response.msg ?? ""}`.trim(),
        );
      }
      for (const item of response.data?.items ?? []) {
        if (item.open_department_id) ids.push(item.open_department_id);
      }
      pageToken = response.data?.has_more ? response.data.page_token : undefined;
    } while (pageToken);

    await this.cache.set(key, ids, DEPARTMENT_PARENTS_TTL_MS);
    return ids;
  }
}
