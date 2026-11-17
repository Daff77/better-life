import { create } from "zustand";
import { formatLocalDateKey } from "@better-life/shared";
import { accountRevision, accountStorageKey } from "./accountScope";
import { getStorageItem, setStorageItem, journalStorage } from "./journalStorage";
import { sessionStorage } from "./sessionStorage";
import { API_BASE_URL } from "./api/config";
import { notifyUnauthorizedSession } from "./authToken";
import { DailyJournal, JournalCategory, JournalEntry, JournalEntrySchema } from "./schemas";

export type SyncStatusKind = "local_only" | "pending" | "failed" | "synced";

export interface JournalSyncOperationInput {
  path: string;
  method: "POST" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
}

export interface JournalSyncQueueItem {
  opId: string;
  kind: "upsert" | "delete" | "reset_day";
  dateKey: string;
  entryId?: string;
  path: string;
  method: "POST" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  nextRetryAt: number;
  status: "pending" | "syncing" | "failed";
  permanentFailure: boolean;
  lastError?: string;
  lastStatusCode?: number;
}

export interface JournalSyncConfig {
  requestTimeoutMs: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  maxImmediateRetries: number;
}

const DEFAULT_SYNC_CONFIG: JournalSyncConfig = {
  requestTimeoutMs: 8000,
  baseBackoffMs: 1000,
  maxBackoffMs: 30000,
  maxImmediateRetries: 2,
};

let syncConfig: JournalSyncConfig = { ...DEFAULT_SYNC_CONFIG };

export function configureJournalSync(overrides: Partial<JournalSyncConfig>): void {
  syncConfig = {
    ...DEFAULT_SYNC_CONFIG,
    ...overrides,
  };
}

export interface JournalSyncStoreState {
  status: SyncStatusKind;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  permanentFailedCount: number;
  lastError: string | null;
  lastSyncedAt: string | null;
}

const INITIAL_SYNC_STATE: JournalSyncStoreState = {
  status: "local_only",
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  permanentFailedCount: 0,
  lastError: null,
  lastSyncedAt: null,
};

export const useJournalSyncStore = create<JournalSyncStoreState>(() => ({
  ...INITIAL_SYNC_STATE,
}));

export function getSyncStatusDisplay(status: SyncStatusKind): {
  label: string;
  tone: "good" | "warn" | "bad" | "plain";
} {
  switch (status) {
    case "synced":
      return { label: "Tersinkron", tone: "good" };
    case "pending":
      return { label: "Menunggu sinkronisasi", tone: "warn" };
    case "failed":
      return { label: "Gagal sinkronisasi", tone: "bad" };
    case "local_only":
    default:
      return { label: "Tersimpan di perangkat", tone: "plain" };
  }
}

const QUEUE_BASE_KEY = "journal_sync_queue_v2";
const LEGACY_QUEUE_BASE_KEY = "journal_pending_v1";

let workChain: Promise<void> = Promise.resolve();
let activeAbortController: AbortController | null = null;
let scheduledRetryTimer: ReturnType<typeof setTimeout> | null = null;
let onlineListenerBound = false;

function clearScheduledRetryTimer(): void {
  if (scheduledRetryTimer) {
    clearTimeout(scheduledRetryTimer);
    scheduledRetryTimer = null;
  }
}

export function abortActiveJournalSync(): void {
  clearScheduledRetryTimer();
  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {
      // ignore abort error
    }
    activeAbortController = null;
  }
  useJournalSyncStore.setState({ ...INITIAL_SYNC_STATE });
}

function classifyOperation(op: JournalSyncOperationInput): {
  kind: JournalSyncQueueItem["kind"];
  dateKey: string;
  entryId?: string;
} {
  const body = op.body ?? {};
  if (op.path === "/meals/reset") {
    return {
      kind: "reset_day",
      dateKey: String(body.dateKey || formatLocalDateKey()),
    };
  }
  if (op.method === "DELETE" && op.path.startsWith("/meals/")) {
    return {
      kind: "delete",
      entryId: decodeURIComponent(op.path.slice("/meals/".length)),
      dateKey: String(body.dateKey || formatLocalDateKey()),
    };
  }
  const entryId =
    typeof body.id === "string"
      ? body.id
      : op.path.startsWith("/meals/")
      ? decodeURIComponent(op.path.slice("/meals/".length))
      : undefined;
  return {
    kind: "upsert",
    entryId,
    dateKey: String(body.dateKey || formatLocalDateKey()),
  };
}

async function readQueueForKey(
  queueKey: string,
  legacyKey: string
): Promise<JournalSyncQueueItem[]> {
  let items: JournalSyncQueueItem[] = [];
  const raw = await getStorageItem(queueKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        items = parsed;
      }
    } catch {
      items = [];
    }
  }

  // Migrate any leftover operations from v1 queue of the same account
  const legacyRaw = await getStorageItem(legacyKey);
  if (legacyRaw) {
    try {
      const legacyParsed = JSON.parse(legacyRaw);
      if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
        const nowIso = new Date().toISOString();
        for (const oldOp of legacyParsed) {
          if (oldOp && typeof oldOp.path === "string" && typeof oldOp.method === "string") {
            const meta = classifyOperation({
              path: oldOp.path,
              method: oldOp.method,
              body: oldOp.body,
            });
            items.push({
              opId: `migrated-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              kind: meta.kind,
              dateKey: meta.dateKey,
              entryId: meta.entryId,
              path: oldOp.path,
              method: oldOp.method,
              body: oldOp.body,
              createdAt: nowIso,
              updatedAt: nowIso,
              attempts: 0,
              nextRetryAt: 0,
              status: "pending",
              permanentFailure: false,
            });
          }
        }
      }
    } catch {
      // ignore malformed legacy queue
    }
    await setStorageItem(legacyKey, "[]");
  }

  return items;
}

async function writeQueueForKey(queueKey: string, items: JournalSyncQueueItem[]): Promise<void> {
  await setStorageItem(queueKey, JSON.stringify(items));
}

function enqueueCoalesced(
  queue: JournalSyncQueueItem[],
  op: JournalSyncOperationInput
): JournalSyncQueueItem[] {
  const next = [...queue];
  const meta = classifyOperation(op);
  const nowIso = new Date().toISOString();

  // Deduplicate exact identical consecutive pending operation while preserving distinct ordered mutations
  const serializedBody = op.body ? JSON.stringify(op.body) : "";
  const tail = next[next.length - 1];
  if (
    tail &&
    tail.status !== "syncing" &&
    tail.method === op.method &&
    tail.path === op.path &&
    (tail.body ? JSON.stringify(tail.body) : "") === serializedBody
  ) {
    return next;
  }

  next.push({
    opId: `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: meta.kind,
    dateKey: meta.dateKey,
    entryId: meta.entryId,
    path: op.path,
    method: op.method,
    body: op.body,
    createdAt: nowIso,
    updatedAt: nowIso,
    attempts: 0,
    nextRetryAt: 0,
    status: "pending",
    permanentFailure: false,
  });

  return next;
}

function updateStoreFromQueue(
  queue: JournalSyncQueueItem[],
  hasAuthToken: boolean,
  isSyncing: boolean,
  expectedRevision: number
): void {
  if (expectedRevision !== accountRevision()) return;

  const pendingCount = queue.filter((i) => i.status === "pending" || i.status === "syncing").length;
  const failedItems = queue.filter((i) => i.status === "failed");
  const failedCount = failedItems.length;
  const permanentFailedCount = failedItems.filter((i) => i.permanentFailure).length;
  const latestError = failedItems[failedItems.length - 1]?.lastError ?? null;

  let status: SyncStatusKind = "local_only";
  if (failedCount > 0 && pendingCount === 0 && !isSyncing) {
    status = "failed";
  } else if (pendingCount > 0 || isSyncing) {
    status = hasAuthToken ? "pending" : "local_only";
  } else if (hasAuthToken) {
    status = failedCount > 0 ? "failed" : "synced";
  } else {
    status = "local_only";
  }

  useJournalSyncStore.setState((prev) => ({
    status,
    isSyncing,
    pendingCount,
    failedCount,
    permanentFailedCount,
    lastError: latestError,
    lastSyncedAt: status === "synced" ? new Date().toISOString() : prev.lastSyncedAt,
  }));
}

function waitAbortable(ms: number, expectedRevision: number): Promise<boolean> {
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      resolve(expectedRevision === accountRevision());
    }, ms);
    if (typeof (t as any)?.unref === "function") {
      (t as any).unref();
    }
  });
}

function scheduleDeferredRetry(delayMs: number, expectedRevision: number): void {
  clearScheduledRetryTimer();
  scheduledRetryTimer = setTimeout(() => {
    scheduledRetryTimer = null;
    if (expectedRevision === accountRevision()) {
      void retryJournalSync({ includePermanent: false });
    }
  }, delayMs);
  if (typeof (scheduledRetryTimer as any)?.unref === "function") {
    (scheduledRetryTimer as any).unref();
  }
}

function bindOnlineRecoveryOnce(): void {
  if (onlineListenerBound) return;
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    onlineListenerBound = true;
    window.addEventListener("online", () => {
      void retryJournalSync({ includePermanent: false });
    });
  }
}

async function sendSingleOperation(
  item: JournalSyncQueueItem,
  token: string
): Promise<
  | { outcome: "ok"; payload?: any }
  | { outcome: "unauthorized" }
  | { outcome: "permanent_error"; statusCode: number; message: string }
  | { outcome: "transient_error"; statusCode?: number; message: string }
> {
  const controller = new AbortController();
  activeAbortController = controller;
  const timeoutId = setTimeout(() => controller.abort(), syncConfig.requestTimeoutMs);
  if (typeof (timeoutId as any)?.unref === "function") {
    (timeoutId as any).unref();
  }

  try {
    const response = await fetch(`${API_BASE_URL}${item.path}`, {
      method: item.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(item.body ? { body: JSON.stringify(item.body) } : {}),
      signal: controller.signal,
    });

    if (response.ok || (item.method === "DELETE" && response.status === 404)) {
      let data: any = undefined;
      if (typeof response.json === "function") {
        try {
          data = await response.json();
        } catch {
          data = undefined;
        }
      }
      return { outcome: "ok", payload: data };
    }

    if (response.status === 401) {
      return { outcome: "unauthorized" };
    }

    let errMessage = `HTTP ${response.status}`;
    if (typeof response.json === "function") {
      try {
        const errBody: any = await response.json();
        if (errBody?.message) errMessage = String(errBody.message);
        else if (errBody?.error) errMessage = String(errBody.error);
      } catch {
        // ignore json parse failure
      }
    }

    if (
      response.status === 400 ||
      response.status === 403 ||
      response.status === 404 ||
      response.status === 422
    ) {
      return {
        outcome: "permanent_error",
        statusCode: response.status,
        message: errMessage,
      };
    }

    return {
      outcome: "transient_error",
      statusCode: response.status,
      message: errMessage,
    };
  } catch (err: any) {
    const isAbort = err?.name === "AbortError" || /abort/i.test(String(err?.message || ""));
    return {
      outcome: "transient_error",
      message: isAbort
        ? "Permintaan sinkronisasi melewati batas waktu (timeout)."
        : "Koneksi ke server terputus.",
    };
  } finally {
    clearTimeout(timeoutId);
    if (activeAbortController === controller) {
      activeAbortController = null;
    }
  }
}

/**
 * Explicit multi-device conflict reconciliation rule:
 * 1. Local pending/failed queue operations for a dateKey (`reset_day`) or entryId (`delete` / `upsert`)
 *    take precedence over older server snapshots until the queue finishes syncing.
 * 2. For entries present on both server and device with no pending local mutation,
 *    Last-Write-Wins (`updatedAt` ISO timestamp comparison) determines the winning record.
 * 3. Entries present on the server from another device (and not pending local deletion)
 *    are merged into the matching `dateKey` without duplication.
 */
export function reconcileJournalsWithServer(
  localJournals: Record<string, DailyJournal>,
  serverMeals: any[],
  queue: JournalSyncQueueItem[],
  defaultTargetCalories = 2000
): { merged: Record<string, DailyJournal>; changed: boolean } {
  const merged: Record<string, DailyJournal> = {};
  for (const [dateKey, day] of Object.entries(localJournals)) {
    merged[dateKey] = {
      ...day,
      entries: [...day.entries],
    };
  }

  const resetDates = new Set<string>();
  const pendingDeletedIds = new Set<string>();
  const pendingUpsertedIds = new Set<string>();

  for (const op of queue) {
    if (op.kind === "reset_day") {
      resetDates.add(op.dateKey);
    } else if (op.kind === "delete" && op.entryId) {
      pendingDeletedIds.add(op.entryId);
      pendingUpsertedIds.delete(op.entryId);
    } else if (op.kind === "upsert" && op.entryId) {
      pendingUpsertedIds.add(op.entryId);
      pendingDeletedIds.delete(op.entryId);
    }
  }

  let changed = false;

  for (const raw of serverMeals) {
    if (!raw || typeof raw.id !== "string") continue;
    const entryId = raw.id;
    const dateKey =
      typeof raw.dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dateKey)
        ? raw.dateKey
        : raw.loggedAt
        ? formatLocalDateKey(new Date(raw.loggedAt))
        : formatLocalDateKey();

    if (resetDates.has(dateKey) || pendingDeletedIds.has(entryId) || pendingUpsertedIds.has(entryId)) {
      continue;
    }

    const rawCat = String(raw.type || raw.category || "Lunch");
    const category: JournalCategory =
      rawCat === "Breakfast" || rawCat === "Lunch" || rawCat === "Dinner" || rawCat === "Snack"
        ? rawCat
        : "Snack";

    const qty = Number(raw.quantity) > 0 ? Number(raw.quantity) : 1;
    const cals = Math.max(0, Number(raw.calories) || 0);
    const p = Math.max(0, Number(raw.proteinGrams) || 0);
    const c = Math.max(0, Number(raw.carbsGrams) || 0);
    const f = Math.max(0, Number(raw.fatGrams) || 0);
    const fib = Math.max(0, Number(raw.fiberGrams) || 0);

    const parsedCandidate = JournalEntrySchema.safeParse({
      id: entryId,
      title: String(raw.name || raw.title || "Logged Meal"),
      category,
      calories: cals,
      baseCalories: Math.round(cals / qty),
      baseProteinGrams: Math.round((p / qty) * 10) / 10,
      baseCarbsGrams: Math.round((c / qty) * 10) / 10,
      baseFatGrams: Math.round((f / qty) * 10) / 10,
      baseFiberGrams: Math.round((fib / qty) * 10) / 10,
      quantity: qty,
      proteinGrams: p,
      carbsGrams: c,
      fatGrams: f,
      fiberGrams: fib,
      estimatedCostIdr: Number(raw.estimatedCostIdr) || 0,
      loggedAt: raw.loggedAt ? new Date(raw.loggedAt).toISOString() : new Date().toISOString(),
      updatedAt: raw.updatedAt
        ? new Date(raw.updatedAt).toISOString()
        : raw.loggedAt
        ? new Date(raw.loggedAt).toISOString()
        : new Date().toISOString(),
    });

    if (!parsedCandidate.success) continue;
    const serverEntry = parsedCandidate.data;

    if (!merged[dateKey]) {
      merged[dateKey] = {
        date: dateKey,
        targetCalories: defaultTargetCalories,
        entries: [serverEntry],
      };
      changed = true;
      continue;
    }

    const existingIdx = merged[dateKey].entries.findIndex((e) => e.id === entryId);
    if (existingIdx === -1) {
      merged[dateKey].entries.push(serverEntry);
      changed = true;
    } else {
      const localEntry = merged[dateKey].entries[existingIdx];
      const serverTs = Date.parse(serverEntry.updatedAt || serverEntry.loggedAt) || 0;
      const localTs = Date.parse(localEntry.updatedAt || localEntry.loggedAt) || 0;
      if (serverTs > localTs) {
        merged[dateKey].entries[existingIdx] = serverEntry;
        changed = true;
      }
    }
  }

  return { merged, changed };
}

export async function pullServerMealsIntoJournal(expectedRevision = accountRevision()): Promise<void> {
  const session = await sessionStorage.getSession();
  if (!session?.token || expectedRevision !== accountRevision()) return;

  const queueKey = accountStorageKey(QUEUE_BASE_KEY);
  const legacyKey = accountStorageKey(LEGACY_QUEUE_BASE_KEY);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), syncConfig.requestTimeoutMs);
  if (typeof (timeoutId as any)?.unref === "function") {
    (timeoutId as any).unref();
  }

  try {
    const res = await fetch(`${API_BASE_URL}/meals`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    if (expectedRevision !== accountRevision()) return;

    if (res.status === 401) {
      await notifyUnauthorizedSession(expectedRevision);
      return;
    }

    if (!res.ok || typeof res.json !== "function") return;
    const serverMeals = await res.json();
    if (!Array.isArray(serverMeals) || expectedRevision !== accountRevision()) return;

    const queue = await readQueueForKey(queueKey, legacyKey);
    const { useJournalStore } = require("../stores/useJournalStore");
    const { useOnboardingStore } = require("../stores/useOnboardingStore");
    const targetCalories =
      useOnboardingStore.getState().personalization?.targetCalories || 1950;

    const currentJournals = useJournalStore.getState().journals;
    const { merged, changed } = reconcileJournalsWithServer(
      currentJournals,
      serverMeals,
      queue,
      targetCalories
    );

    if (changed && expectedRevision === accountRevision()) {
      await journalStorage.saveJournals(merged);
      if (expectedRevision === accountRevision()) {
        useJournalStore.setState({ journals: merged });
      }
    }
  } catch {
    // Offline or timeout during background pull is non-fatal
  } finally {
    clearTimeout(timeoutId);
  }
}

export function syncJournal(operation?: JournalSyncOperationInput): Promise<void> {
  bindOnlineRecoveryOnce();
  const queueKey = accountStorageKey(QUEUE_BASE_KEY);
  const legacyKey = accountStorageKey(LEGACY_QUEUE_BASE_KEY);
  const revision = accountRevision();

  workChain = workChain
    .catch(() => {})
    .then(async () => {
      if (revision !== accountRevision()) return;

      let queue = await readQueueForKey(queueKey, legacyKey);
      if (operation) {
        queue = enqueueCoalesced(queue, operation);
        await writeQueueForKey(queueKey, queue);
      }

      const session = await sessionStorage.getSession();
      const hasToken = Boolean(session?.token);
      updateStoreFromQueue(queue, hasToken, hasToken && queue.some((q) => q.status === "pending"), revision);

      if (!session?.token || revision !== accountRevision()) {
        return;
      }

      let idx = 0;
      while (idx < queue.length && revision === accountRevision()) {
        const item = queue[idx];

        // Skip already permanently or temporarily parked failed items so they DO NOT block subsequent valid operations!
        if (item.status === "failed") {
          idx++;
          continue;
        }

        item.status = "syncing";
        updateStoreFromQueue(queue, true, true, revision);

        let delivered = false;
        let stopWaveForNetwork = false;

        while (!delivered && !stopWaveForNetwork && revision === accountRevision()) {
          const result = await sendSingleOperation(item, session.token);

          if (revision !== accountRevision()) {
            // Account changed mid-flight: restore item as pending in original account's storage key
            item.status = "pending";
            await writeQueueForKey(queueKey, queue);
            return;
          }

          if (result.outcome === "ok") {
            queue.splice(idx, 1);
            await writeQueueForKey(queueKey, queue);
            delivered = true;
          } else if (result.outcome === "unauthorized") {
            item.status = "pending";
            await writeQueueForKey(queueKey, queue);
            updateStoreFromQueue(queue, false, false, revision);
            await notifyUnauthorizedSession(revision);
            return;
          } else if (result.outcome === "permanent_error") {
            // Mark THIS invalid operation as permanently failed, persist, and CONTINUE to the next item!
            item.status = "failed";
            item.permanentFailure = true;
            item.lastStatusCode = result.statusCode;
            item.lastError = result.message;
            item.updatedAt = new Date().toISOString();
            await writeQueueForKey(queueKey, queue);
            idx++;
            delivered = true;
          } else {
            // Transient network / timeout / 5xx error -> exponential backoff
            item.attempts += 1;
            item.lastStatusCode = result.statusCode;
            item.lastError = result.message;
            item.updatedAt = new Date().toISOString();

            const backoff = Math.min(
              syncConfig.maxBackoffMs,
              syncConfig.baseBackoffMs * Math.pow(2, Math.max(0, item.attempts - 1))
            );

            if (item.attempts <= syncConfig.maxImmediateRetries) {
              item.status = "pending";
              item.nextRetryAt = Date.now() + backoff;
              await writeQueueForKey(queueKey, queue);
              const stillSameAccount = await waitAbortable(backoff, revision);
              if (!stillSameAccount) return;
            } else {
              item.status = "failed";
              item.permanentFailure = false;
              item.nextRetryAt = Date.now() + backoff;
              await writeQueueForKey(queueKey, queue);
              scheduleDeferredRetry(backoff, revision);
              stopWaveForNetwork = true;
            }
          }
        }

        if (stopWaveForNetwork) {
          break;
        }
      }

      if (revision === accountRevision()) {
        updateStoreFromQueue(queue, true, false, revision);
      }
    });

  return workChain;
}

export async function retryJournalSync(options?: {
  includePermanent?: boolean;
}): Promise<void> {
  const includePermanent = options?.includePermanent ?? true;
  const queueKey = accountStorageKey(QUEUE_BASE_KEY);
  const legacyKey = accountStorageKey(LEGACY_QUEUE_BASE_KEY);
  const revision = accountRevision();

  const queue = await readQueueForKey(queueKey, legacyKey);
  let modified = false;
  for (const item of queue) {
    if (item.status === "failed" && (includePermanent || !item.permanentFailure)) {
      item.status = "pending";
      item.permanentFailure = false;
      item.attempts = 0;
      item.nextRetryAt = 0;
      modified = true;
    }
  }
  if (modified) {
    await writeQueueForKey(queueKey, queue);
  }
  await syncJournal();
  if (revision === accountRevision()) {
    await pullServerMealsIntoJournal(revision);
  }
}

export async function dismissFailedJournalSync(): Promise<void> {
  const queueKey = accountStorageKey(QUEUE_BASE_KEY);
  const legacyKey = accountStorageKey(LEGACY_QUEUE_BASE_KEY);
  const revision = accountRevision();

  const queue = await readQueueForKey(queueKey, legacyKey);
  const remaining = queue.filter((item) => item.status !== "failed");
  await writeQueueForKey(queueKey, remaining);

  const session = await sessionStorage.getSession();
  updateStoreFromQueue(remaining, Boolean(session?.token), false, revision);
}

export async function getJournalSyncQueueSnapshot(): Promise<JournalSyncQueueItem[]> {
  const queueKey = accountStorageKey(QUEUE_BASE_KEY);
  const legacyKey = accountStorageKey(LEGACY_QUEUE_BASE_KEY);
  return readQueueForKey(queueKey, legacyKey);
}
