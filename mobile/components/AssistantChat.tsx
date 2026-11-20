import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native";
import { AppText } from "./ui/AppText";
import { LineIcon } from "./ui/LineIcon";
import { ModalSheet } from "./ui/ModalSheet";
import { ChatMessage, ChatThread, chatHistoryKey, loadChatHistory, saveChatHistory } from "@/lib/chatHistory";
import { accountRevision } from "@/lib/accountScope";

const green = "#0e7a52";

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
  const list = useRef<React.ElementRef<typeof ScrollView>>(null);
  const scope = useRef({ key: chatHistoryKey(), revision: accountRevision() });
  const alive = useRef(true);
  const locked = useRef(false);
  const current = threads.find(t => t.id === active);
  const messages = current?.messages || [];
  useEffect(() => {
    alive.current = true;
    loadChatHistory(scope.current.key).then(saved => {
      if (!alive.current || scope.current.revision !== accountRevision()) return;
      setThreads(saved); setActive(saved[0]?.id || null); setReady(true);
    }).catch(() => { if (alive.current) setError("Riwayat belum dapat dimuat. Tutup dan buka halaman untuk mencoba lagi."); });
    return () => { alive.current = false; };
  }, []);
  async function persist(next: ChatThread[]) {
    if (scope.current.revision !== accountRevision()) throw new Error("Sesi telah berubah.");
    await saveChatHistory(scope.current.key, next);
    if (alive.current) setThreads(next);
  }
  async function send(retry = false) {
    if (locked.current || !ready || (!retry && !draft.trim())) return;
    locked.current = true; setBusy(true); setError("");
    const id = current?.id || makeId();
    const now = new Date().toISOString();
    const nextMessages: ChatMessage[] = retry ? messages : [...messages, { id: makeId(), role: "user", content: draft.trim(), time: now }];
    const thread: ChatThread = { id, title: current?.title || draft.trim().slice(0, 70), updatedAt: now, messages: nextMessages };
    const next = [thread, ...threads.filter(t => t.id !== id)];
    try {
      await persist(next); setActive(id); if (!retry) setDraft("");
      const result = await request("chat", { messages: nextMessages.slice(-15).map(({ role, content }) => ({ role, content })) });
      if (!alive.current || scope.current.revision !== accountRevision()) return;
      await persist([{ ...thread, updatedAt: new Date().toISOString(), messages: [...nextMessages, { id: makeId(), role: "assistant", content: result.reply, time: new Date().toISOString() }] }, ...next.filter(t => t.id !== id)]);
    } catch (err) { if (alive.current) setError(err instanceof Error ? err.message : "Pesan gagal dikirim."); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  const actionStyle = { minHeight: 44, paddingHorizontal: 12, justifyContent: "center" as const, borderRadius: 12 };
  return <View style={{ flex: 1 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Buka riwayat chat" disabled={!ready || busy} onPress={() => setHistory(true)} style={actionStyle}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><LineIcon name="clock" size={18} color={green} /><AppText weight="semibold" style={{ color: green }}>Riwayat</AppText></View></Pressable>
      <Pressable accessibilityRole="button" disabled={!ready || busy} onPress={() => { setActive(null); setDraft(""); setError(""); }} style={actionStyle}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><LineIcon name="plus" size={18} color={green} /><AppText weight="semibold" style={{ color: green }}>Chat baru</AppText></View></Pressable>
    </View>
    <ScrollView ref={list} keyboardShouldPersistTaps="handled" onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })} contentContainerStyle={{ paddingVertical: 16, gap: 18, flexGrow: 1 }}>
      {!ready && !error && <ActivityIndicator color={green} />}
      {ready && !messages.length && <View style={{ flex: 1, justifyContent: "center", padding: 20, gap: 16 }}><View style={{ width: 56, height: 56, backgroundColor: "#e0ede6", borderRadius: 18, alignItems: "center", justifyContent: "center" }}><LineIcon name="leaf" size={28} color={green} /></View><AppText weight="bold" style={{ fontSize: 28, color: "#121a16" }}>Mau makan lebih baik hari ini?</AppText><AppText style={{ color: "#56605a", lineHeight: 23 }}>Tanya soal menu, kandungan gizi, atau kebiasaan sehat Anda.</AppText>{["Ide sarapan tinggi protein", "Menu sehat dengan budget Rp 20.000"].map(text => <Pressable key={text} accessibilityRole="button" onPress={() => setDraft(text)} style={{ padding: 16, borderWidth: 1, borderColor: "#d5dbd7", borderRadius: 16 }}><AppText>{text}</AppText></Pressable>)}</View>}
      {messages.map(message => <View key={message.id} style={{ alignSelf: message.role === "user" ? "flex-end" : "flex-start", maxWidth: "90%", gap: 5 }}>
        <AppText style={{ fontSize: 11, color: "#56605a", marginHorizontal: 5 }}>{message.role === "user" ? "Anda" : "Better Life"}</AppText>
        <View style={{ backgroundColor: message.role === "user" ? green : "#fbfdfc", padding: 16, borderRadius: 20, borderBottomRightRadius: message.role === "user" ? 4 : 20, borderBottomLeftRadius: message.role === "assistant" ? 4 : 20 }}><AppText selectable style={{ color: message.role === "user" ? "#fff" : "#121a16", lineHeight: 24 }}>{message.role === "assistant" ? formatAssistantReply(message.content) : message.content}</AppText></View>
        <AppText style={{ fontSize: 11, color: "#56605a", marginHorizontal: 5 }}>{new Date(message.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</AppText>
      </View>)}
      {busy && <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", gap: 10, alignItems: "center", padding: 12 }}><ActivityIndicator size="small" color={green} /><AppText style={{ color: "#56605a" }}>Asisten sedang menjawab...</AppText></View>}
    </ScrollView>
    {!error && messages.at(-1)?.role === "user" && !busy && <Pressable accessibilityRole="button" onPress={() => send(true)} style={actionStyle}><AppText style={{ color: green }}>Lanjutkan jawaban</AppText></Pressable>}
    {!!error && <View accessibilityRole="alert" style={{ padding: 10, gap: 6 }}><AppText style={{ color: "#b3301b" }}>{error}</AppText>{messages.at(-1)?.role === "user" && !busy && <Pressable accessibilityRole="button" onPress={() => send(true)} style={actionStyle}><AppText weight="bold" style={{ color: green }}>Coba kirim lagi</AppText></Pressable>}</View>}
    <View style={{ borderTopWidth: 1, borderTopColor: "#d5dbd7", paddingTop: 12, paddingBottom: 8, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", backgroundColor: "#fbfdfc", borderRadius: 24, borderWidth: 1, borderColor: "#d5dbd7", padding: 6, gap: 6 }}>
        <TextInput accessibilityLabel="Pesan untuk Asisten AI" placeholder="Tanya tentang makanan..." placeholderTextColor="#56605a" value={draft} onChangeText={setDraft} editable={ready && !busy} multiline maxLength={4000} style={{ flex: 1, padding: 12, maxHeight: 120, minHeight: 44, fontSize: 16, fontFamily: "Urbanist-Medium", color: "#121a16" }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Kirim pesan" accessibilityState={{ disabled: !ready || busy || !draft.trim() }} disabled={!ready || busy || !draft.trim()} onPress={() => send()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: green, opacity: !draft.trim() || busy ? 0.45 : 1, alignItems: "center", justifyContent: "center" }}><LineIcon name="arrowUpRight" size={23} color="#fff" /></Pressable>
      </View>
      <AppText style={{ color: "#56605a", fontSize: 11, textAlign: "center" }}>AI bisa keliru. Informasi umum, bukan diagnosis. Riwayat tersinkron ke akun Anda.</AppText>
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
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><AppText weight="bold" style={{ fontSize: 24 }}>Riwayat chat</AppText><Pressable accessibilityRole="button" accessibilityLabel="Tutup riwayat" onPress={() => setHistory(false)} style={actionStyle}><LineIcon name="close" size={22} /></Pressable></View>
      <AppText style={{ color: "#56605a", fontSize: 13 }}>Tersimpan di akun Anda, dapat dibuka di perangkat lain.</AppText>
      <ScrollView keyboardShouldPersistTaps="handled"><View style={{ gap: 8 }}>{!threads.length && <AppText>Belum ada percakapan. Mulai chat pertama Anda.</AppText>}{threads.map(thread => <View key={thread.id} style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#e6eae7" }}><Pressable accessibilityRole="button" style={{ flex: 1, paddingVertical: 16, gap: 4 }} onPress={() => { setActive(thread.id); setDraft(""); setError(""); setHistory(false); }}><AppText weight="semibold" numberOfLines={2}>{thread.title}</AppText><AppText style={{ fontSize: 12, color: "#56605a" }}>{new Date(thread.updatedAt).toLocaleDateString("id-ID")} · {thread.messages.length} pesan</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Hapus chat ${thread.title}`} onPress={() => { const next = threads.filter(t => t.id !== thread.id); void persist(next).then(() => { if (active === thread.id) setActive(null); }).catch(() => setError("Riwayat gagal dihapus.")); }} style={actionStyle}><LineIcon name="trash" size={20} color="#b3301b" /></Pressable></View>)}</View></ScrollView>
    </ModalSheet>
  </View>;
}
