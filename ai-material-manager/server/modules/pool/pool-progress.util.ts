import type { PoolProgress } from "@shared/pool";
import { RELEASE_STATUS } from "@server/common/constants/bitable.constants";
import { extractLinkRecordIds } from "@server/common/utils/bitable-link.util";
import { FeishuBaseGateway } from "@server/modules/feishu/feishu-base.gateway";

/** 池「处理状态」同步值（与 inbox.constants.AI_PROCESS_STATUS 同源语义） */
export const POOL_PROCESS_STATUS = {
  needSupplement: "待补充",
  needConfirm: "待确认",
  returned: "已退回",
  failed: "失败",
  stored: "已入库",
} as const;

/** 失败且重试次数达到该阈值视为「卡住」 */
export const POOL_STUCK_RETRY_THRESHOLD = 3;

export interface PoolProgressRowLike {
  baseRecordId: string | null;
  processStatus: string | null;
  retryCount: number | null;
  relatedMainTable: unknown;
  processLog: string | null;
}

/** 批量解析池记录关联主表中「已发布」的 baseRecordId 集合（进度 ⑥ 判据） */
export async function resolvePublishedMaterialIds(
  base: FeishuBaseGateway,
  rows: Array<{ relatedMainTable: unknown }>,
): Promise<Set<string>> {
  const linkIds: string[] = [];
  for (const row of rows) {
    linkIds.push(...extractLinkRecordIds(row.relatedMainTable));
  }
  const ids: Set<string> = new Set<string>();
  if (linkIds.length === 0) {
    return ids;
  }
  const linkSet = new Set(linkIds);
  const publishedRows = (await base.rows<{
    baseRecordId: string;
    releaseStatus: string | null;
  } & Record<string, unknown>>("main")).filter(
    (row) =>
      linkSet.has(row.baseRecordId) &&
      row.releaseStatus === RELEASE_STATUS.published,
  );
  for (const row of publishedRows) {
    if (row.baseRecordId) {
      ids.add(row.baseRecordId);
    }
  }
  return ids;
}

export interface PoolProgressInput {
  processStatus: string | null;
  retryCount: number | null;
  relatedMainTable: unknown;
  processLog: string | null;
  /** 已发布物料的 baseRecordId 集合（用于判断 ⑥已发布） */
  publishedMaterialIds: Set<string>;
}

/**
 * 池记录 → 进度阶段映射（B-5）：
 * 失败+重试≥3 → stuck；已退回 → rejected；待补充 → ③；待确认 → ④；
 * 关联主表已发布 → ⑥；关联主表或「已入库」→ ⑤；其余 → ②AI识别中。
 */
export function mapPoolProgress(input: PoolProgressInput): PoolProgress {
  if (
    input.processStatus === POOL_PROCESS_STATUS.failed &&
    (input.retryCount ?? 0) >= POOL_STUCK_RETRY_THRESHOLD
  ) {
    return { stage: "stuck", rejectReason: input.processLog };
  }
  if (input.processStatus === POOL_PROCESS_STATUS.returned) {
    return { stage: "rejected", rejectReason: input.processLog };
  }
  if (input.processStatus === POOL_PROCESS_STATUS.needSupplement) {
    return { stage: "needInfo", rejectReason: null };
  }
  if (input.processStatus === POOL_PROCESS_STATUS.needConfirm) {
    return { stage: "needConfirm", rejectReason: null };
  }
  const linkedIds: string[] = extractLinkRecordIds(input.relatedMainTable);
  if (linkedIds.some((id: string) => input.publishedMaterialIds.has(id))) {
    return { stage: "published", rejectReason: null };
  }
  if (
    linkedIds.length > 0 ||
    input.processStatus === POOL_PROCESS_STATUS.stored
  ) {
    return { stage: "stored", rejectReason: null };
  }
  return { stage: "recognizing", rejectReason: null };
}

/** 行数组 → recordId→进度 映射 */
export async function buildPoolProgressMap(
  base: FeishuBaseGateway,
  rows: PoolProgressRowLike[],
): Promise<Map<string, PoolProgress>> {
  const publishedIds: Set<string> = await resolvePublishedMaterialIds(base, rows);
  const map: Map<string, PoolProgress> = new Map<string, PoolProgress>();
  for (const row of rows) {
    if (!row.baseRecordId) {
      continue;
    }
    map.set(
      row.baseRecordId,
      mapPoolProgress({
        processStatus: row.processStatus,
        retryCount: row.retryCount,
        relatedMainTable: row.relatedMainTable,
        processLog: row.processLog,
        publishedMaterialIds: publishedIds,
      }),
    );
  }
  return map;
}
