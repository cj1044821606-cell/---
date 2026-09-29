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
