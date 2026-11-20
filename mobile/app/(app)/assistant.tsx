import React, { useEffect, useRef, useState } from "react";
import { Colors as AssistantColors } from "@/constants/DesignTokens";
import { Image, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, Input } from "@/components/ui";
import { AssistantChat } from "@/components/AssistantChat";
import { LineIcon } from "@/components/ui/LineIcon";
import { Pressable } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { API_BASE_URL } from "@/lib/api/config";
import { sessionStorage } from "@/lib/sessionStorage";
import { accountRevision } from "@/lib/accountScope";
import { useJournalStore, getTodayDateKey } from "@/stores/useJournalStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { JournalCategory } from "@/lib/schemas";

type Estimate = { title: string; portion: string; calories: number; calorieMin: number; calorieMax: number; proteinGrams: number; carbsGrams: number; fatGrams: number; notes: string };
const categories: JournalCategory[] = ["Breakfast", "Lunch", "Dinner", "Snack"];
const labels = ["Sarapan", "Makan siang", "Makan malam", "Camilan"];

export default function AssistantScreen() {
  const router = useRouter();
  const isPremium = useSubscriptionStore(state => state.isPremium);
  const [mode, setMode] = useState<"chat" | "photo">("chat");
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [portion, setPortion] = useState("1");
  const [category, setCategory] = useState<JournalCategory>("Lunch");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);

  async function run(task: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try { await task(); } catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi."); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }
  async function request(path: string, body: unknown) {
    const revision = accountRevision();
    const session = await sessionStorage.getSession();
    if (!session?.token) throw new Error("Silakan masuk kembali.");
    const abort = new AbortController(); controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 55000);
    try {
      const response = await fetch(`${API_BASE_URL}/assistant/${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(body), signal: abort.signal });
      if (revision !== accountRevision() || !mounted.current) throw new Error("Sesi telah berubah.");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Permintaan gagal. Coba lagi.");
      return data;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw new Error("Waktu permintaan habis. Coba lagi.");
      throw err;
    } finally { clearTimeout(timer); }
  }
  const pick = (camera: boolean) => run(async () => {
    if (!isPremium) return;
    if (camera && Platform.OS !== "web") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error("Izinkan kamera di pengaturan perangkat untuk mengambil foto.");
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.65, base64: true };
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64 || asset.base64.length > 5500000) throw new Error("Foto terlalu besar. Gunakan foto di bawah 4 MB.");
    const mime = asset.mimeType || "image/jpeg";
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) throw new Error("Gunakan foto JPEG, PNG, atau WebP.");
    setImage(`data:${mime};base64,${asset.base64}`); setEstimate(null); setSaved(false);
  });
  const analyze = () => run(async () => {
    if (!isPremium) return;
    const data = await request("photo", { image, description });
    setEstimate(data.estimate); setPortion("1"); setSaved(false);
  });
  const save = () => run(async () => {
    const multiplier = Number(portion.replace(",", "."));
    if (!estimate || saved) return;
    if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 20) throw new Error("Jumlah porsi harus lebih dari 0 dan maksimal 20.");
    await useJournalStore.getState().addEntry({ title: estimate.title, category, baseCalories: estimate.calories, quantity: multiplier, proteinGrams: estimate.proteinGrams * multiplier, carbsGrams: estimate.carbsGrams * multiplier, fatGrams: estimate.fatGrams * multiplier }, getTodayDateKey());
    setSaved(true);
  });

  if (mode === "chat") return <ScreenWrapper maxWidth="narrow" edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: "#edf1ee" }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#d5dbd7" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}><LineIcon name="arrowLeft" size={23} /></Pressable>
        <View style={{ flex: 1 }}><AppText weight="bold" style={{ fontSize: 21 }}>Asisten AI</AppText><AppText style={{ fontSize: 12, color: "#56605a" }}>Nutrisi & kebiasaan sehat</AppText></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Foto makanan Premium" onPress={() => setMode("photo")} style={{ minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }}><LineIcon name="camera" size={22} color={AssistantColors.primary.DEFAULT} /><AppText style={{ fontSize: 12, color: AssistantColors.primary.DEFAULT }}>Premium</AppText></Pressable>
      </View>
      <AssistantChat request={request} />
    </KeyboardAvoidingView>
  </ScreenWrapper>;

  return <ScreenWrapper maxWidth="narrow" style={{ backgroundColor: "#edf1ee" }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 20, gap: 18, paddingBottom: 40 }}>
        <AppButton title="Kembali" variant="outline" onPress={() => router.back()} />
        <View><AppText weight="bold" style={{ fontSize: 30, color: "#121a16" }}>Asisten AI</AppText><AppText style={{ color: "#56605a", marginTop: 6 }}>Pahami makanan Anda, satu pertanyaan setiap kali.</AppText></View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <AppButton style={{ flex: 1 }} title="Tanya nutrisi" variant="outline" onPress={() => { setMode("chat"); setError(""); }} />
          <AppButton style={{ flex: 1 }} title="Foto · Premium" variant={mode === "photo" ? "primary" : "outline"} onPress={() => { setMode("photo"); setError(""); }} />
        </View>
        <AppText style={{ color: "#56605a", fontSize: 13 }}>Pesan atau foto dikirim ke penyedia AI saat Anda menekan Kirim atau Estimasi kalori. Hindari informasi pribadi. Riwayat chat tersimpan per akun di perangkat ini.</AppText>
        {!isPremium ? <View style={{ padding: 20, backgroundColor: "#fbfdfc", borderRadius: 22, gap: 14 }}><AppText weight="bold" style={{ fontSize: 22 }}>Estimasi foto untuk Premium</AppText><AppText>Kenali makanan dari foto, koreksi porsi, lalu simpan estimasi kalori dan makro ke jurnal.</AppText><AppButton title="Lihat paket Premium" onPress={() => router.push("/(app)/upgrade")} /></View> : <>
          <View style={{ padding: 20, backgroundColor: "#fbfdfc", borderRadius: 22, gap: 14 }}>
            <AppText weight="bold">Apa yang ada di piring Anda?</AppText><AppText>Foto seluruh hidangan dengan pencahayaan yang cukup. Tambahkan ukuran porsi agar perkiraan lebih membantu.</AppText>
            {image && <Image source={{ uri: image }} accessibilityLabel="Foto makanan yang dipilih" style={{ width: "100%", height: 210, borderRadius: 16 }} resizeMode="contain" />}
            <AppButton title="Pilih dari galeri" variant="outline" disabled={busy} onPress={() => pick(false)} />
            <AppButton title="Ambil foto" variant="outline" disabled={busy} onPress={() => pick(true)} />
            <Input label="Keterangan porsi (opsional)" value={description} onChangeText={setDescription} maxLength={1000} editable={!busy} placeholder="Contoh: nasi 150 g, ayam goreng satu potong" />
            <AppButton title="Estimasi kalori" loading={busy} disabled={!image} onPress={analyze} />
          </View>
          {estimate && <View style={{ padding: 20, backgroundColor: "#fbfdfc", borderRadius: 22, gap: 14 }}>
            <AppText weight="bold" style={{ fontSize: 22 }}>Periksa hasil estimasi</AppText>
            <AppText style={{ color: AssistantColors.primary.DEFAULT, fontSize: 28 }}>{estimate.calorieMin}â€“{estimate.calorieMax} kkal</AppText>
            <AppText>{estimate.portion}</AppText><AppText>{estimate.notes}</AppText>
            <AppText style={{ fontSize: 13, color: "#56605a" }}>Nilai berikut untuk satu porsi foto. Minyak, gula, dan bahan tersembunyi dapat mengubah hasil. Foto tidak memastikan keamanan alergi.</AppText>
            <Input label="Nama makanan" value={estimate.title} editable={!saved && !busy} onChangeText={title => setEstimate({ ...estimate, title })} maxLength={150} />
            {(["calories", "proteinGrams", "carbsGrams", "fatGrams"] as const).map((field, i) => <Input key={field} label={["Kalori per porsi (kkal)", "Protein (g)", "Karbohidrat (g)", "Lemak (g)"][i]} keyboardType="decimal-pad" value={String(estimate[field])} editable={!saved && !busy} onChangeText={text => { const value = Number(text.replace(",", ".")); if (Number.isFinite(value) && value >= 0 && value <= 10000) setEstimate({ ...estimate, [field]: value }); }} />)}
            <Input label="Jumlah porsi dari foto" value={portion} onChangeText={setPortion} keyboardType="decimal-pad" editable={!saved && !busy} />
            <AppText weight="bold">Waktu makan</AppText>
            <View style={{ gap: 8 }}>{categories.map((value, i) => <AppButton key={value} title={labels[i]} variant={category === value ? "primary" : "outline"} disabled={saved || busy} onPress={() => setCategory(value)} />)}</View>
            <AppButton title={saved ? "Sudah ditambahkan ke jurnal hari ini" : "Tambahkan ke jurnal hari ini"} disabled={saved || !estimate.title.trim() || estimate.calories <= 0} loading={busy} onPress={save} />
            {saved && <AppButton title="Lihat jurnal" variant="outline" onPress={() => router.push("/(app)/(tabs)/meals")} />}
          </View>}
        </>}
        {!!error && <View accessibilityRole="alert"><AppText style={{ color: "#b3301b" }}>{error}</AppText></View>}
      </ScrollView>
    </KeyboardAvoidingView>
  </ScreenWrapper>;
}
