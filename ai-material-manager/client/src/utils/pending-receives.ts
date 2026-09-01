export interface PendingReceive {
  materialId: string;
  materialName: string;
  versionNo: string | null;
  receivedAt: string;
}

const PENDING_RECEIVES_KEY = "app.pending-receives";

export function listPendingReceives(): PendingReceive[] {
  try {
    const raw: string | null =
      window.localStorage.getItem(PENDING_RECEIVES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PendingReceive =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as PendingReceive).materialId === "string",
    );
  } catch {
    return [];
  }
}

export function addPendingReceive(entry: PendingReceive): void {
  try {
    const list: PendingReceive[] = listPendingReceives().filter(
      (item) => item.materialId !== entry.materialId,
    );
    list.unshift(entry);
    window.localStorage.setItem(
      PENDING_RECEIVES_KEY,
      JSON.stringify(list.slice(0, 20)),
    );
  } catch {
    // localStorage 不可用时放弃本地占位
  }
}

export function clearPendingReceives(materialIds: string[]): void {
  if (materialIds.length === 0) return;
  try {
    const matched: Set<string> = new Set(materialIds);
    const rest: PendingReceive[] = listPendingReceives().filter(
      (item) => !matched.has(item.materialId),
    );
    window.localStorage.setItem(PENDING_RECEIVES_KEY, JSON.stringify(rest));
  } catch {
    // 忽略清理失败，等待下次同步
  }
}
