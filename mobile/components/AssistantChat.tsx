import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from "react-native";
import { AppText } from "./ui/AppText";
import { LineIcon } from "./ui/LineIcon";
import { ModalSheet } from "./ui/ModalSheet";
import { StatusPill } from "./ui/Surface";
import {
  ChatMessage,
  ChatThread,
  chatHistoryKey,
  loadChatHistory,
  saveLocalChatHistory,
  syncChatHistoryToCloud,
} from "@/lib/chatHistory";
import { accountRevision } from "@/lib/accountScope";
import { Colors } from "@/constants/DesignTokens";

const green = Colors.primary.DEFAULT;

function formatAssistantReply(reply: string) {
  const content = reply
    .replace(/^ {0,3}#{1,6}[ \t]+(.+)$/gm, "**$1**")
    .replace(/^([ \t]*)[-+*][ \t]+(?=\S)/gm, "$1• ");

  return content.split(/(\*{1,2}[^*\r\n]+\*{1,2})/g).map((part, index) => {
    const emphasis = /^(\*{1,2})([^*\r\n]+)\1$/.exec(part);
    if (!emphasis) return part;

    return (
      <AppText key={index} style={{ fontFamily: "Urbanist-Bold" }}>
        {emphasis[2]}
      </AppText>
    );
  });
}

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

type Props = { request: (path: string, body: unknown) => Promise<{ reply: string }> };

export function AssistantChat({ request }: Props) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState<"synced" | "unsynced" | "syncing">("synced");
  const [syncError, setSyncError] = useState("");

  const list = useRef<FlatList<ChatMessage>>(null);
  const followLatest = useRef(true);
  const scope = useRef({ key: chatHistoryKey(), revision: accountRevision() });
  const alive = useRef(true);
  const locked = useRef(false);
  const threadsRef = useRef<ChatThread[]>([]);
  threadsRef.current = threads;

  const current = threads.find((t) => t.id === active);
  const messages = current?.messages || [];

  useEffect(() => {
    alive.current = true;
    loadChatHistory(scope.current.key)
      .then((saved) => {
        if (!alive.current || scope.current.revision !== accountRevision()) return;
        setThreads(saved);
        setActive(saved[0]?.id || null);
        setReady(true);
        const hasPending = saved.some((t) => t.pendingSync);
        if (hasPending) {
          setSyncStatus("unsynced");
          setSyncError("Sebagian riwayat belum tersinkron ke server.");
        } else {
          setSyncStatus("synced");
          setSyncError("");
        }
      })
      .catch(() => {
        if (alive.current) {
          setReady(true);
          setSyncStatus("unsynced");
          setSyncError("Riwayat belum tersinkron. Anda tetap dapat mengirim pesan.");
        }
      });
    return () => {
      alive.current = false;
    };
  }, []);

  async function runCloudSync() {
    if (scope.current.revision !== accountRevision()) return;
    setSyncStatus("syncing");
    const result = await syncChatHistoryToCloud(scope.current.key);
    if (!alive.current || scope.current.revision !== accountRevision()) return;
    if (result.synced) {
      setSyncStatus("synced");
      setSyncError("");
      setThreads((prev) => prev.map((t) => ({ ...t, pendingSync: undefined })));
    } else {
      setSyncStatus("unsynced");
      setSyncError(result.error || "Riwayat belum tersinkron. Tersimpan di perangkat.");
    }
  }

  async function commitLocalThreads(next: ChatThread[], removedIds: string[] = []) {
    if (scope.current.revision !== accountRevision()) throw new Error("Sesi telah berubah.");
    await saveLocalChatHistory(scope.current.key, next, removedIds);
    if (alive.current) {
      setThreads(next);
    }
  }

  async function send(retry = false) {
    if (locked.current || !ready || (!retry && !draft.trim())) return;
    locked.current = true;
    setBusy(true);
    setError("");

    const id = current?.id || makeId();
    const now = new Date().toISOString();
    const trimmedDraft = draft.trim();
    const nextMessages: ChatMessage[] = retry
      ? messages
      : [...messages, { id: makeId(), role: "user", content: trimmedDraft, time: now }];

    if (nextMessages.length === 0) {
      locked.current = false;
      setBusy(false);
      return;
    }

    const userThread: ChatThread = {
      id,
      title: current?.title || trimmedDraft.slice(0, 70) || "Percakapan",
      updatedAt: now,
      messages: nextMessages,
      pendingSync: true,
    };

    const withUserMessage = [userThread, ...threadsRef.current.filter((t) => t.id !== id)];

    try {
      await commitLocalThreads(withUserMessage);
      if (id !== active) followLatest.current = true;
      setActive(id);
      if (!retry) setDraft("");
    } catch (err) {
      if (alive.current) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan pesan di perangkat.");
        setBusy(false);
      }
      locked.current = false;
      return;
    }

    try {
      const result = await request("chat", {
        messages: nextMessages.slice(-15).map(({ role, content }) => ({ role, content })),
      });
      if (!alive.current || scope.current.revision !== accountRevision()) return;

      const replyTime = new Date().toISOString();
      const updatedMessages: ChatMessage[] = [
        ...nextMessages,
        { id: makeId(), role: "assistant", content: result.reply, time: replyTime },
      ];
      const withReplyThread: ChatThread = {
        ...userThread,
        updatedAt: replyTime,
        messages: updatedMessages,
        pendingSync: true,
      };
      const nextWithReply = [
        withReplyThread,
        ...threadsRef.current.filter((t) => t.id !== id),
      ];

      await commitLocalThreads(nextWithReply);
      void runCloudSync();
    } catch (err) {
      if (alive.current) {
        setError(err instanceof Error ? err.message : "Pesan gagal dikirim.");
      }
      void runCloudSync();
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }

  async function handleDeleteThread(threadId: string) {
    const next = threadsRef.current.filter((t) => t.id !== threadId);
    try {
      await commitLocalThreads(next, [threadId]);
      if (active === threadId) setActive(null);
      void runCloudSync();
    } catch {
      if (alive.current) {
        setSyncStatus("unsynced");
        setSyncError("Gagal menghapus riwayat di perangkat.");
      }
    }
  }

  const actionStyle = {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 12,
    justifyContent: "center" as const,
    borderRadius: 12,
  };

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingVertical: 8,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka riwayat chat"
            disabled={!ready || busy}
            onPress={() => setHistory(true)}
            style={actionStyle}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <LineIcon name="clock" size={18} color={green} />
              <AppText weight="semibold" style={{ color: green }}>
                Riwayat
              </AppText>
            </View>
          </Pressable>
          {syncStatus === "unsynced" && (
            <StatusPill label="Belum tersinkron" tone="warn" dot />
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mulai chat baru"
          disabled={!ready || busy}
          onPress={() => {
            setActive(null);
            setDraft("");
            setError("");
          }}
          style={actionStyle}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <LineIcon name="plus" size={18} color={green} />
            <AppText weight="semibold" style={{ color: green }}>
              Chat baru
            </AppText>
          </View>
        </Pressable>
      </View>

      {syncStatus === "unsynced" && (
        <View
          accessibilityRole="alert"
          style={{
            backgroundColor: "#fbebd0",
            borderColor: "#f3d5a0",
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <AppText weight="semibold" style={{ color: "#8f4e00", fontSize: 12, flex: 1, minWidth: 150 }}>
            {syncError || "Riwayat belum tersinkron ke server."}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Coba lagi sinkronisasi riwayat chat"
            onPress={() => void runCloudSync()}
            style={{
              minHeight: 40,
              paddingHorizontal: 14,
              borderRadius: 999,
              backgroundColor: green,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <AppText weight="bold" style={{ color: "#ffffff", fontSize: 12 }}>
              Coba lagi
            </AppText>
          </Pressable>
        </View>
      )}

      <FlatList
        key={active ?? "new"}
        ref={list}
        data={messages}
        keyExtractor={(message) => message.id}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={({ nativeEvent: { contentSize, contentOffset, layoutMeasurement } }) => {
          followLatest.current =
            contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
        }}
        onContentSizeChange={() => {
          if (followLatest.current) list.current?.scrollToEnd({ animated: false });
        }}
        contentContainerStyle={{ paddingVertical: 16, gap: 18, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center" }}>
            {!ready && !error && <ActivityIndicator color={green} />}
            {ready && !messages.length && (
              <View style={{ flex: 1, justifyContent: "center", padding: 16, gap: 14 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    backgroundColor: Colors.primary.light,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LineIcon name="leaf" size={28} color={green} />
                </View>
                <AppText weight="bold" style={{ fontSize: 26, color: Colors.neutral.dark }}>
                  Mau makan lebih baik hari ini?
                </AppText>
                <AppText style={{ color: Colors.neutral.muted, lineHeight: 22 }}>
                  Tanya soal menu, kandungan gizi, atau kebiasaan sehat Anda.
                </AppText>
                {["Ide sarapan tinggi protein", "Menu sehat dengan budget Rp 20.000"].map(
                  (text) => (
                    <Pressable
                      key={text}
                      accessibilityRole="button"
                      onPress={() => setDraft(text)}
                      style={{
                        minHeight: 48,
                        justifyContent: "center",
                        padding: 14,
                        borderWidth: 1,
                        borderColor: Colors.neutral.border,
                        borderRadius: 16,
                      }}
                    >
                      <AppText>{text}</AppText>
                    </Pressable>
                  )
                )}
              </View>
            )}
          </View>
        }
        renderItem={({ item: message }) => (
          <View
            style={{
              alignSelf: message.role === "user" ? "flex-end" : "flex-start",
              maxWidth: message.role === "user" ? "88%" : "100%",
              gap: 5,
            }}
          >
            <AppText style={{ fontSize: 12, color: Colors.neutral.muted, marginHorizontal: 5 }}>
              {message.role === "user" ? "Anda" : "Better Life"}
            </AppText>
            <View
              style={{
                backgroundColor: message.role === "user" ? green : Colors.neutral.bgCard,
                padding: 16,
                borderRadius: 20,
                borderBottomRightRadius: message.role === "user" ? 4 : 20,
                borderBottomLeftRadius: message.role === "assistant" ? 4 : 20,
              }}
            >
              <AppText
                selectable
                style={{
                  color: message.role === "user" ? Colors.neutral.white : Colors.neutral.dark,
                  lineHeight: 24,
                }}
              >
                {message.role === "assistant"
                  ? formatAssistantReply(message.content)
                  : message.content}
              </AppText>
            </View>
            <AppText style={{ fontSize: 12, color: Colors.neutral.muted, marginHorizontal: 5 }}>
              {new Date(message.time).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </AppText>
          </View>
        )}
        ListFooterComponent={
          busy ? (
            <View
              accessibilityLiveRegion="polite"
              style={{ flexDirection: "row", gap: 10, alignItems: "center", padding: 12 }}
            >
              <ActivityIndicator size="small" color={green} />
              <AppText style={{ color: Colors.neutral.muted }}>
                Asisten sedang menjawab...
              </AppText>
            </View>
          ) : undefined
        }
      />

      {!error && messages.at(-1)?.role === "user" && !busy && (
        <Pressable accessibilityRole="button" onPress={() => void send(true)} style={actionStyle}>
          <AppText style={{ color: green }}>Lanjutkan jawaban</AppText>
        </Pressable>
      )}

      {!!error && (
        <View accessibilityRole="alert" style={{ padding: 10, gap: 6 }}>
          <AppText style={{ color: Colors.status.error }}>{error}</AppText>
          {messages.at(-1)?.role === "user" && !busy && (
            <Pressable
              accessibilityRole="button"
              onPress={() => void send(true)}
              style={actionStyle}
            >
              <AppText weight="bold" style={{ color: green }}>
                Coba kirim lagi
              </AppText>
            </Pressable>
          )}
        </View>
      )}

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: Colors.neutral.border,
          paddingTop: 12,
          paddingBottom: 8,
          gap: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            backgroundColor: Colors.neutral.bgCard,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: Colors.neutral.border,
            padding: 6,
            gap: 6,
          }}
        >
          <TextInput
            accessibilityLabel="Pesan untuk Asisten AI"
            placeholder="Tanya tentang makanan..."
            placeholderTextColor={Colors.neutral.muted}
            value={draft}
            onChangeText={setDraft}
            editable={ready && !busy}
            multiline
            maxLength={4000}
            style={{
              flex: 1,
              padding: 12,
              maxHeight: 120,
              minHeight: 44,
              fontSize: 16,
              fontFamily: "Urbanist-Medium",
              color: Colors.neutral.dark,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kirim pesan"
            accessibilityState={{ disabled: !ready || busy || !draft.trim() }}
            disabled={!ready || busy || !draft.trim()}
            onPress={() => void send()}
            style={{
              width: 48,
              height: 48,
              borderRadius: 22,
              backgroundColor: green,
              opacity: !draft.trim() || busy ? 0.45 : 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LineIcon name="arrowUpRight" size={23} color={Colors.neutral.white} />
          </Pressable>
        </View>
        <AppText style={{ color: Colors.neutral.muted, fontSize: 12, textAlign: "center" }}>
          Pesan dikirim ke penyedia AI saat Anda menekan Kirim. AI bisa keliru; informasi umum, bukan diagnosis.
        </AppText>
      </View>

      <ModalSheet
        visible={history}
        onClose={() => setHistory(false)}
        variant="dialog"
        showHandle={false}
        accessibilityLabel="Riwayat chat"
        contentClassName="w-full max-w-[520px] max-h-[80%] bg-card rounded-[24px] p-5"
        contentStyle={{ gap: 12 }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <AppText weight="bold" style={{ fontSize: 22 }}>
            Riwayat chat
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup riwayat"
            onPress={() => setHistory(false)}
            style={actionStyle}
          >
            <LineIcon name="close" size={22} />
          </Pressable>
        </View>
        <AppText style={{ color: Colors.neutral.muted, fontSize: 13 }}>
          Tersimpan di perangkat dan disinkronkan ke akun Anda.
        </AppText>
        <FlatList
          data={threads}
          keyExtractor={(thread) => thread.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <AppText>Belum ada percakapan. Mulai chat pertama Anda.</AppText>
          }
          renderItem={({ item: thread }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderBottomWidth: 1,
                borderBottomColor: "#e6eae7",
                gap: 8,
              }}
            >
              <Pressable
                accessibilityRole="button"
                style={{ flex: 1, minHeight: 48, paddingVertical: 14, gap: 4 }}
                onPress={() => {
                  setActive(thread.id);
                  setDraft("");
                  setError("");
                  setHistory(false);
                }}
              >
                <AppText weight="semibold" numberOfLines={2}>
                  {thread.title}
                </AppText>
                <AppText style={{ fontSize: 12, color: Colors.neutral.muted }}>
                  {new Date(thread.updatedAt).toLocaleDateString("id-ID")} · {thread.messages.length} pesan
                  {thread.pendingSync ? " · Belum tersinkron" : ""}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Hapus chat ${thread.title}`}
                onPress={() => void handleDeleteThread(thread.id)}
                style={actionStyle}
              >
                <LineIcon name="trash" size={20} color="#b3301b" />
              </Pressable>
            </View>
          )}
        />
      </ModalSheet>
    </View>
  );
}
