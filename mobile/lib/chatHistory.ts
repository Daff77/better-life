import { z } from "zod";
import { accountStorageKey } from "./accountScope";
import { getStorageItem, setStorageItem } from "./journalStorage";

export const ChatMessageSchema = z.object({ id: z.string(), role: z.enum(["user", "assistant"]), content: z.string().min(1).max(12000), time: z.string() });
const ThreadSchema = z.object({ id: z.string(), title: z.string(), updatedAt: z.string(), messages: z.array(ChatMessageSchema) });
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatThread = z.infer<typeof ThreadSchema>;
export function chatHistoryKey() { return accountStorageKey("assistant_chats_v1"); }
async function localHistory(key: string): Promise<ChatThread[]> {
  const raw = await getStorageItem(key);
  if (!raw) return [];
  const result = z.array(ThreadSchema).safeParse(JSON.parse(raw));
  if (!result.success) throw new Error("Riwayat chat tidak dapat dibaca.");
  return result.data;
}
async function cloud(path: string, method = "GET", body?: unknown, expectedKey?: string) {
 const { sessionStorage } = await import("./sessionStorage");
 const session = await sessionStorage.getSession();
 if (!session?.token) return null;
 if (expectedKey && expectedKey !== chatHistoryKey()) throw new Error("Sesi telah berubah.");
 const { API_BASE_URL } = await import("./api/config");
 const response = await fetch(`${API_BASE_URL}/assistant/history${path}`, { method, headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
 if (!response.ok) throw new Error("Riwayat belum tersinkron. Periksa koneksi lalu coba lagi.");
 return response.json();
}
export async function loadChatHistory(key: string): Promise<ChatThread[]> {
 const local = await localHistory(key);
 try {
  const result = await cloud("", "GET", undefined, key);
  if (!result) return local;
  if (!(await getStorageItem(key + "_cloud_migrated"))) {
   for (const thread of local) await cloud("/" + encodeURIComponent(thread.id), "PUT", thread, key);
   await setStorageItem(key + "_cloud_migrated", "1");
  }
  const fresh = await cloud("", "GET", undefined, key);
  const threads = z.array(ThreadSchema).parse(fresh.threads).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await setStorageItem(key, JSON.stringify(threads));
  return threads;
 } catch (err) { if (local.length) return local; throw err; }
}
let writes = Promise.resolve();
export function saveChatHistory(key: string, threads: ChatThread[]) {
  const snapshot = JSON.stringify(threads);
  const write = writes.then(async () => {
    if (key !== chatHistoryKey()) throw new Error("Sesi telah berubah.");
    const previous = await localHistory(key);
    for (const thread of threads) {
      if (JSON.stringify(previous.find(t => t.id === thread.id)) !== JSON.stringify(thread)) await cloud("/" + encodeURIComponent(thread.id), "PUT", thread, key);
    }
    for (const removed of previous.filter(t => !threads.some(n => n.id === t.id))) await cloud("/" + encodeURIComponent(removed.id), "DELETE", undefined, key);
    await setStorageItem(key, snapshot);
  });
  writes = write.catch(() => {});
  return write;
}
