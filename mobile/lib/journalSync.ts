import { accountRevision, accountStorageKey } from "./accountScope";
import { getStorageItem, setStorageItem } from "./journalStorage";
import { sessionStorage } from "./sessionStorage";
import { API_BASE_URL } from "./api/config";

type Operation = { path: string; method: string; body?: unknown };
let work: Promise<void> = Promise.resolve();
export function syncJournal(operation?: Operation): Promise<void> {
  const key = accountStorageKey("journal_pending_v1");
  const revision = accountRevision();
  work = work.catch(() => {}).then(async () => {
    let pending: Operation[] = JSON.parse(await getStorageItem(key) || "[]");
    if (operation) { pending.push(operation); await setStorageItem(key, JSON.stringify(pending)); }
    const session = await sessionStorage.getSession();
    if (!session?.token || revision !== accountRevision()) return;
    while (pending.length && revision === accountRevision()) {
      const item = pending[0];
      try {
        const response = await fetch(`${API_BASE_URL}${item.path}`, {
          method: item.method,
          headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" },
          ...(item.body ? { body: JSON.stringify(item.body) } : {}),
        });
        if (!response.ok && !(item.method === "DELETE" && response.status === 404)) return;
      } catch { return; }
      pending = pending.slice(1);
      await setStorageItem(key, JSON.stringify(pending));
    }
  });
  return work;
}
