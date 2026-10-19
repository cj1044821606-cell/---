import { extractLinkRecordIds } from '@server/common/utils/bitable-link.util';

export interface VersionHistoryLinks {
  baseRecordId: string;
  appInternalMaterialId: string | null;
  compareOldVersion?: unknown;
  replacementVersion?: unknown;
}

/** Includes the internal-ID group and every version explicitly linked to it. */
export function selectVersionHistory<T extends VersionHistoryLinks>(
  rows: T[],
  appInternalMaterialId: string | null,
  linkedVersionIds: string[],
): T[] {
  const selectedIds = new Set(linkedVersionIds);

  for (const row of rows) {
    if (
      appInternalMaterialId &&
      row.appInternalMaterialId === appInternalMaterialId
    ) {
      selectedIds.add(row.baseRecordId);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      const linkedIds = [
        ...extractLinkRecordIds(row.compareOldVersion),
        ...extractLinkRecordIds(row.replacementVersion),
      ];
      if (selectedIds.has(row.baseRecordId)) {
        for (const linkedId of linkedIds) {
          if (!selectedIds.has(linkedId)) {
            selectedIds.add(linkedId);
            changed = true;
          }
        }
      } else if (linkedIds.some((id) => selectedIds.has(id))) {
        selectedIds.add(row.baseRecordId);
        changed = true;
      }
    }
  }

  return rows.filter((row) => selectedIds.has(row.baseRecordId));
}

export interface VersionArchiveFields {
  currentVersionAttachment?: string[] | null;
  sourceFileL?: string[] | null;
  previewFileS?: string[] | null;
}

/** 版本表为该版本存档的附件，按 M/L/S 分层并去重。 */
export function versionArchiveTiers(row: VersionArchiveFields): {
  M: string[];
  L: string[];
  S: string[];
} {
  const unique = (values: string[] | null | undefined): string[] => [
    ...new Set((values ?? []).filter((value) => typeof value === 'string' && value.length > 0)),
  ];
  return {
    M: unique(row.currentVersionAttachment),
    L: unique(row.sourceFileL),
    S: unique(row.previewFileS),
  };
}

export function countVersionArchive(row: VersionArchiveFields): number {
  const tiers = versionArchiveTiers(row);
  return tiers.M.length + tiers.L.length + tiers.S.length;
}

/** 历史版本下载只对身份表里的“设计师”开放，其他角色只能查看版本迭代。 */
export function canDownloadVersionHistory(roles: readonly string[]): boolean {
  return roles.includes('设计师');
}
