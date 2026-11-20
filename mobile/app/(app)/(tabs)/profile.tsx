import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  Avatar,
  PressableScale,
  FadeInView,
  ModalSheet,
  Surface,
  CardHead,
  RingButton,
  ColorBlock,
  ListRow,
  RowIcon,
  StatusPill,
  PillButton,
  LineIcon,
} from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  useOnboardingStore,
  calculatePersonalizedPlan,
  DEFAULT_PERSONALIZATION,
} from "@/stores/useOnboardingStore";
import { useJournalStore } from "@/stores/useJournalStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { journalStorage } from "@/lib/journalStorage";
import { sessionStorage } from "@/lib/sessionStorage";
import { clearJournalSyncQueueForCurrentAccount } from "@/lib/journalSync";
import { mealsApi } from "@/lib/api/mealsApi";
import { useResetMealsMutation } from "@/hooks/useMealsQuery";
import { confirmDestructive } from "@/lib/confirm";
import {
  exportAccountBackupJson,
  restoreAccountBackupJson,
} from "@/lib/accountBackup";
import { NAV_DESKTOP_BREAKPOINT } from "@/components/layout/ResponsiveTabBar";

const GOALS = ["Eat balanced", "Lose weight", "Gain muscle"] as const;
const GOAL_LABELS: Record<(typeof GOALS)[number], string> = {
  "Eat balanced": "Gizi seimbang",
  "Lose weight": "Turun berat",
  "Gain muscle": "Tambah otot",
};

const GENDERS = ["Female", "Male"] as const;
const GENDER_LABELS: Record<(typeof GENDERS)[number], string> = {
  Female: "Perempuan",
  Male: "Laki-laki",
};

const tnum = { fontVariant: ["tabular-nums" as const] };

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const hasDesktopNav = width >= NAV_DESKTOP_BREAKPOINT;

  const user = useAuthStore((state) => state.user);
  const personalization = useOnboardingStore((state) => state.personalization);
  const savePersonalization = useOnboardingStore((state) => state.savePersonalization);
  const logout = useAuthStore((state) => state.logout);
  const resetMealsMutation = useResetMealsMutation();
  const isPremium = useSubscriptionStore((state) => state.isPremium);

  const currentYear = new Date().getFullYear();
  const userAge = Math.max(14, currentYear - (personalization.birthDate?.year || 2000));

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [infoModalType, setInfoModalType] = useState<"help" | "about" | null>(null);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [backupJsonText, setBackupJsonText] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupNotice, setBackupNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const [editGoal, setEditGoal] = useState<"Eat balanced" | "Lose weight" | "Gain muscle">(
    personalization.goal
  );
  const [editWeight, setEditWeight] = useState<string>(personalization.weight.toString());
  const [editTargetWeight, setEditTargetWeight] = useState<string>(
    (personalization.targetWeight ?? personalization.weight).toString()
  );
  const [editHeight, setEditHeight] = useState<string>(personalization.height.toString());
  const [editAge, setEditAge] = useState<string>(userAge.toString());
  const [editGender, setEditGender] = useState<"Female" | "Male">(personalization.gender);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (editModalVisible) {
      setEditGoal(personalization.goal);
      setEditWeight(personalization.weight.toString());
      setEditTargetWeight((personalization.targetWeight ?? personalization.weight).toString());
      setEditHeight(personalization.height.toString());
      setEditAge(userAge.toString());
      setEditGender(personalization.gender);
      setFormError(null);
      setIsSaving(false);
      setSaveSuccess(false);
    }
  }, [editModalVisible, personalization, userAge]);

  const parsedPreviewWeight = parseFloat(editWeight);
  const parsedPreviewHeight = parseFloat(editHeight);
  const parsedPreviewAge = parseInt(editAge, 10);
  const previewWeight =
    Number.isFinite(parsedPreviewWeight) && parsedPreviewWeight > 0
      ? parsedPreviewWeight
      : personalization.weight;
  const previewHeight =
    Number.isFinite(parsedPreviewHeight) && parsedPreviewHeight > 0
      ? parsedPreviewHeight
      : personalization.height;
  const previewAge =
    Number.isFinite(parsedPreviewAge) && parsedPreviewAge > 0 ? parsedPreviewAge : userAge;
  const previewPlan = calculatePersonalizedPlan({
    weight: previewWeight,
    height: previewHeight,
    gender: editGender,
    age: previewAge,
    goal: editGoal,
  });

  const handleOpenEdit = () => {
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (isSaving) return;

    const weightNum = parseFloat(editWeight);
    const targetWeightNum = parseFloat(editTargetWeight);
    const heightNum = parseFloat(editHeight);
    const ageNum = parseInt(editAge, 10);

    if (isNaN(ageNum) || ageNum < 14 || ageNum > 100) {
      setFormError("Usia harus di antara 14 hingga 100 tahun.");
      return;
    }

    if (isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      setFormError("Berat badan harus di antara 30 hingga 300 kg.");
      return;
    }

    if (isNaN(targetWeightNum) || targetWeightNum < 30 || targetWeightNum > 300) {
      setFormError("Target berat badan harus di antara 30 hingga 300 kg.");
      return;
    }

    if (isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      setFormError("Tinggi badan harus di antara 100 hingga 250 cm.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const birthYear = currentYear - ageNum;
    const updatedBirthDate = {
      day: personalization.birthDate?.day || 15,
      month: personalization.birthDate?.month || "June",
      year: birthYear,
    };

    const res = await savePersonalization({
      weight: weightNum,
      targetWeight: targetWeightNum,
      height: heightNum,
      gender: editGender,
      goal: editGoal,
      birthDate: updatedBirthDate,
    });

    if (!res.success) {
      setIsSaving(false);
      setFormError(res.error || "Gagal memperbarui profil. Periksa kembali isian Anda.");
      return;
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(false);
      setEditModalVisible(false);
    }, 650);
  };

  const handleResetData = () => {
    confirmDestructive(
      "Reset Semua Data",
      "Semua catatan jurnal harian dan target personalisasi akan dihapus.",
      "Reset",
      async () => {
        resetMealsMutation.mutate();
        await clearJournalSyncQueueForCurrentAccount();
        try {
          await mealsApi.resetMeals();
        } catch {
          // Offline reset still clears local journal and logs out cleanly
        }
        await journalStorage.clearAllJournals();
        await sessionStorage.clearPersonalization();
        useJournalStore.setState({ journals: {}, lastUndoAction: null });
        useOnboardingStore.setState({ personalization: DEFAULT_PERSONALIZATION });
        await logout();
        router.replace("/(auth)/get-started");
      }
    );
  };

  const handleExportBackup = async () => {
    setBackupBusy(true);
    setBackupNotice(null);
    try {
      const res = await exportAccountBackupJson();
      setBackupJsonText(res.json);
      setBackupNotice({
        tone: "ok",
        text: res.downloadedOnWeb
          ? `Cadangan berhasil diunduh (${res.filename}) dan siap disalin di bawah.`
          : "Data cadangan akun berhasil dibuat. Salin teks JSON di bawah untuk menyimpannya.",
      });
    } catch (err: any) {
      setBackupNotice({
        tone: "err",
        text: err?.message || "Gagal mengekspor data akun.",
      });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRestoreBackup = async () => {
    setBackupBusy(true);
    setBackupNotice(null);
    try {
      const summary = await restoreAccountBackupJson(backupJsonText);
      setBackupNotice({
        tone: "ok",
        text: `Pemulihan selesai: +${summary.addedMeals} catatan baru, ${summary.updatedMeals} diperbarui, ${summary.skippedDuplicateMeals} duplikat dilewati, +${summary.addedFavorites} favorit.`,
      });
    } catch (err: any) {
      setBackupNotice({
        tone: "err",
        text: err?.message || "Gagal memulihkan cadangan.",
      });
    } finally {
      setBackupBusy(false);
    }
  };

  const handlePickBackupFileWeb = () => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setBackupJsonText(reader.result);
          setBackupNotice({
            tone: "ok",
            text: `File "${file.name}" dimuat. Ketuk Pulihkan Data untuk memvalidasi dan mengimpor.`,
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const targetKcal = personalization.targetCalories || 2253;
  const targetP = personalization.targetProteinGrams || 141;
  const targetK = personalization.targetCarbGrams || 282;
  const targetL = personalization.targetFatGrams || 63;

  return (
    <ScreenWrapper maxWidth="narrow" className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: hasDesktopNav ? 12 : 20, paddingBottom: hasDesktopNav ? 56 : 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Minimalist Header */}
        <FadeInView index={0} className="flex-row items-center justify-between mb-4">
          <AppText
            weight="semibold"
            className="text-[26px] sm:text-[30px] text-ink"
            style={{ letterSpacing: -0.7, lineHeight: 32 }}
            accessibilityRole="header"
          >
            Profil
          </AppText>
          <RingButton
            icon="edit"
            variant="solid"
            onPress={handleOpenEdit}
            accessibilityLabel="Ubah target"
          />
        </FadeInView>

        <View className="gap-3.5">
          {/* 1. Minimalist Identity & Core Metrics Card */}
          <FadeInView index={1}>
            <Surface>
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-row items-center flex-1 min-w-0">
                  <View className="mr-3.5 flex-shrink-0">
                    <Avatar name={user?.name || "Pengguna"} size={54} showBadge />
                  </View>
                  <View className="flex-1 min-w-0">
                    <AppText
                      weight="semibold"
                      className="text-[18.5px] text-ink"
                      style={{ letterSpacing: -0.3 }}
                    >
                      {user?.name || "Pengguna Better Life"}
                    </AppText>
                    <AppText weight="medium" className="text-[13px] text-muted mt-0.5">
                      {user?.email || "Akun tersimpan di perangkat"}
                    </AppText>
                  </View>
                </View>
                <StatusPill label={isPremium ? "Premium" : "Gratis"} tone={isPremium ? "good" : "plain"} />
              </View>

              {/* Clean 2x2 Minimalist Personalization Grid (zero text truncation) */}
              <PressableScale
                onPress={handleOpenEdit}
                pressedScale={0.99}
                className="bg-card-2 border border-line rounded-[18px] p-3.5 mt-4"
                accessibilityRole="button"
                accessibilityLabel="Ringkasan target dan fisik, ketuk untuk mengubah"
              >
                <View className="flex-row items-center">
                  <View className="flex-1 min-w-0 pr-3">
                    <AppText weight="medium" className="text-[12px] text-muted">
                      Target energi
                    </AppText>
                    <AppText weight="bold" className="text-[16px] text-ink mt-0.5" style={tnum}>
                      {targetKcal.toLocaleString("id-ID")}{" "}
                      <AppText weight="semibold" className="text-[12px] text-muted">
                        kcal
                      </AppText>
                    </AppText>
                  </View>

                  <View className="w-px h-8 bg-line" />

                  <View className="flex-1 min-w-0 pl-3.5">
                    <AppText weight="medium" className="text-[12px] text-muted">
                      Fokus utama
                    </AppText>
                    <AppText weight="bold" className="text-[15px] text-ink mt-0.5">
                      {GOAL_LABELS[personalization.goal] ?? personalization.goal}
                    </AppText>
                  </View>
                </View>

                <View className="h-px bg-line my-3" />

                <View className="flex-row items-center">
                  <View className="flex-1 min-w-0 pr-3">
                    <AppText weight="medium" className="text-[12px] text-muted">
                      Berat & target BB
                    </AppText>
                    <AppText weight="bold" className="text-[15px] text-ink mt-0.5" style={tnum}>
                      {personalization.weight} → {personalization.targetWeight ?? personalization.weight} kg
                    </AppText>
                  </View>

                  <View className="w-px h-8 bg-line" />

                  <View className="flex-1 min-w-0 pl-3.5">
                    <AppText weight="medium" className="text-[12px] text-muted">
                      Profil fisik
                    </AppText>
                    <AppText weight="bold" className="text-[15px] text-ink mt-0.5" style={tnum}>
                      {personalization.height} cm · {userAge} thn
                    </AppText>
                  </View>
                </View>
              </PressableScale>

              {/* Clean 3-Column Macro Target Pills */}
              <View className="mt-3.5">
                <AppText weight="medium" className="text-[12px] text-muted mb-2 px-0.5">
                  Target makro harian
                </AppText>
                <View className="flex-row gap-2">
                  {[
                    { label: "Protein", val: `${targetP}g`, color: "#0e7a52" },
                    { label: "Karbo", val: `${targetK}g`, color: "#f3b23c" },
                    { label: "Lemak", val: `${targetL}g`, color: "#141c18" },
                  ].map((m) => (
                    <View
                      key={m.label}
                      className="flex-1 min-w-0 bg-card-2 border border-line rounded-[13px] px-2.5 py-2 flex-row items-center justify-between gap-1.5"
                    >
                      <View className="flex-row items-center gap-1.5 min-w-0 flex-shrink">
                        <View className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                        <AppText weight="medium" className="text-[12px] text-muted">
                          {m.label}
                        </AppText>
                      </View>
                      <AppText weight="bold" className="text-[12.5px] text-ink flex-shrink-0" style={tnum}>
                        {m.val}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            </Surface>
          </FadeInView>

          {/* 2. Single Clean Action & Settings Group */}
          <FadeInView index={2}>
            <Surface dense>
              <ListRow
                onPress={() => router.push("/(app)/upgrade")}
                accessibilityLabel={isPremium ? "Kelola langganan Premium" : "Lihat paket Premium"}
                leading={<RowIcon icon="crown" tone="amber" />}
                title={isPremium ? "Better Life Premium" : "Upgrade ke Premium"}
                subtitle={isPremium ? "Semua fitur & resep terbuka" : "Rencana makan 7 hari & analitik penuh"}
                trailing={
                  <View className="flex-row items-center gap-2">
                    <StatusPill
                      label={isPremium ? "Aktif" : "Coba"}
                      tone={isPremium ? "good" : "warn"}
                      dot={false}
                    />
                    <LineIcon name="chevronRight" size={18} color="#7d8781" />
                  </View>
                }
              />

              <ListRow
                onPress={() => router.push("/(app)/analytics")}
                accessibilityLabel="Lihat monitoring dan tren nutrisi"
                leading={<RowIcon icon="chart" tone="accent" />}
                title="Monitoring & analitik nutrisi"
                subtitle="Statistik berat badan, histori menu & progres kalori"
                trailing={<LineIcon name="chevronRight" size={18} color="#7d8781" />}
              />

              <ListRow
                onPress={() => router.push("/(app)/community" as any)}
                accessibilityLabel="Buka komunitas dan konsultasi ahli gizi"
                leading={<RowIcon icon="user" tone="accent" />}
                title="Komunitas & konsultasi gizi"
                subtitle="Postingan, tanya jawab ahli gizi & artikel kesehatan"
                trailing={<LineIcon name="chevronRight" size={18} color="#7d8781" />}
              />

              <ListRow
                onPress={() => router.push("/(app)/reminders" as any)}
                accessibilityLabel="Pengaturan notifikasi pengingat minum dan makan"
                leading={<RowIcon icon="bell" tone="plain" />}
                title="Pengingat minum & jam makan"
                subtitle="Notifikasi harian untuk target 8 gelas air & waktu makan"
                trailing={<LineIcon name="chevronRight" size={18} color="#7d8781" />}
              />

              <ListRow
                onPress={() => router.push("/(onboarding)")}
                accessibilityLabel="Kalibrasi ulang personalisasi"
                leading={<RowIcon icon="refresh" tone="plain" />}
                title="Kalibrasi ulang personalisasi"
                subtitle="Hitung ulang target berdasarkan tujuan baru"
                trailing={<LineIcon name="chevronRight" size={18} color="#7d8781" />}
              />

              <ListRow
                onPress={() => setInfoModalType("help")}
                accessibilityLabel="Panduan penggunaan dan dokumentasi"
                leading={<RowIcon icon="book" tone="plain" />}
                title="Panduan penggunaan (Help)"
                subtitle="Cara mencatat makanan, memantau kalori & memasak"
                trailing={<LineIcon name="chevronRight" size={18} color="#7d8781" />}
              />

              <ListRow
                onPress={() => setInfoModalType("about")}
                accessibilityLabel="Tentang Better Life dan kontak"
                leading={<RowIcon icon="shield" tone="plain" />}
                title="Tentang kami & kontak"
                subtitle="Informasi pengembang Better Life & layanan bantuan"
                trailing={<LineIcon name="chevronRight" size={18} color="#7d8781" />}
              />

              <ListRow
                onPress={() => {
                  setBackupNotice(null);
                  setBackupModalVisible(true);
                }}
                accessibilityLabel="Ekspor dan pulihkan data akun"
                leading={<RowIcon icon="download" tone="accent" />}
                title="Ekspor & pulihkan data akun"
                subtitle="Cadangan JSON tervalidasi, khusus akun ini & bebas duplikat"
                trailing={<LineIcon name="chevronRight" size={18} color="#7d8781" />}
              />

              <ListRow
                onPress={handleResetData}
                accessibilityLabel="Reset data jurnal"
                leading={<RowIcon icon="trash" tone="plain" />}
                title="Reset data jurnal"
                trailing={<LineIcon name="chevronRight" size={18} color="#7d8781" />}
              />

              <ListRow
                last
                onPress={async () => {
                  await logout();
                  router.replace("/(auth)/get-started");
                }}
                accessibilityLabel="Keluar akun"
                leading={<RowIcon icon="logout" tone="ink" />}
                title="Keluar akun"
                trailing={<LineIcon name="chevronRight" size={18} color="#7d8781" />}
              />
            </Surface>
          </FadeInView>
        </View>
      </ScrollView>

      {/* Edit Profile & Personalization Modal */}
      <ModalSheet
        visible={editModalVisible}
        onClose={() => !isSaving && setEditModalVisible(false)}
        dismissible={!isSaving}
        variant="sheet"
        accessibilityLabel="Ubah data dan target"
        contentClassName="w-full max-w-lg max-h-[90%] bg-card rounded-t-[26px] sm:rounded-[26px] border border-line overflow-hidden"
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="w-full max-h-full">
          <View className="w-full p-5 sm:p-6 pt-2">
            <CardHead
              title="Ubah data & target"
              caption="Target kalori dihitung ulang otomatis"
              right={
                <RingButton
                  icon="close"
                  disabled={isSaving}
                  onPress={() => !isSaving && setEditModalVisible(false)}
                  accessibilityLabel="Tutup"
                />
              }
            />

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {formError && (
                    <View className="p-3 mb-4 bg-bad-soft rounded-2xl">
                      <AppText weight="semibold" className="text-xs text-bad text-center">
                        {formError}
                      </AppText>
                    </View>
                  )}

                  {saveSuccess && (
                    <View className="p-3 mb-4 bg-primary-light rounded-2xl items-center flex-row justify-center gap-x-2">
                      <LineIcon name="check" size={16} color="#0e7a52" strokeWidth={2.4} />
                      <AppText weight="bold" className="text-xs text-primary-text">
                        Profil dan target kalori berhasil diperbarui
                      </AppText>
                    </View>
                  )}

                  {/* Goal Selector */}
                  <View className="mb-4">
                    <AppText weight="semibold" className="text-[13px] text-muted mb-2">
                      Tujuan utama
                    </AppText>
                    <View className="flex-row gap-2">
                      {GOALS.map((g) => {
                        const isSelected = editGoal === g;
                        return (
                          <PressableScale
                            key={g}
                            onPress={() => setEditGoal(g)}
                            disabled={isSaving}
                            pressedScale={0.96}
                            className={`flex-1 min-h-[42px] py-2 px-2 rounded-full items-center justify-center border ${
                              isSelected ? "bg-block-ink border-block-ink" : "bg-card border-line-2"
                            }`}
                            accessibilityRole="button"
                          >
                            <AppText
                              weight="semibold"
                              className={`text-xs text-center ${isSelected ? "text-block-on-ink" : "text-ink"}`}
                            >
                              {GOAL_LABELS[g]}
                            </AppText>
                          </PressableScale>
                        );
                      })}
                    </View>
                  </View>

                  {/* Gender Selector */}
                  <View className="mb-4">
                    <AppText weight="semibold" className="text-[13px] text-muted mb-2">
                      Jenis kelamin
                    </AppText>
                    <View className="flex-row gap-2">
                      {GENDERS.map((g) => {
                        const isSelected = editGender === g;
                        return (
                          <PressableScale
                            key={g}
                            onPress={() => setEditGender(g)}
                            disabled={isSaving}
                            pressedScale={0.96}
                            className={`flex-1 min-h-[42px] py-2 rounded-full items-center justify-center border ${
                              isSelected ? "bg-block-ink border-block-ink" : "bg-card border-line-2"
                            }`}
                            accessibilityRole="button"
                          >
                            <AppText
                              weight="semibold"
                              className={`text-xs ${isSelected ? "text-block-on-ink" : "text-ink"}`}
                            >
                              {GENDER_LABELS[g]}
                            </AppText>
                          </PressableScale>
                        );
                      })}
                    </View>
                  </View>

                  {/* Weight, Target Weight, Height, Age */}
                  <View className="flex-row gap-2.5 mb-3">
                    <View className="flex-1">
                      <AppText weight="semibold" className="text-[12.5px] text-muted mb-1.5">
                        Berat saat ini (kg)
                      </AppText>
                      <TextInput
                        value={editWeight}
                        onChangeText={setEditWeight}
                        keyboardType="numeric"
                        placeholder="65"
                        editable={!isSaving}
                        className="w-full h-12 bg-card-2 border border-line rounded-2xl px-3.5 text-ink text-base"
                        style={{ fontFamily: "Urbanist-Bold", fontSize: 16, includeFontPadding: false }}
                      />
                    </View>

                    <View className="flex-1">
                      <AppText weight="semibold" className="text-[12.5px] text-muted mb-1.5">
                        Target BB (kg)
                      </AppText>
                      <TextInput
                        value={editTargetWeight}
                        onChangeText={setEditTargetWeight}
                        keyboardType="numeric"
                        placeholder="60"
                        editable={!isSaving}
                        className="w-full h-12 bg-card-2 border border-line rounded-2xl px-3.5 text-ink text-base"
                        style={{ fontFamily: "Urbanist-Bold", fontSize: 16, includeFontPadding: false }}
                      />
                    </View>
                  </View>

                  <View className="flex-row gap-2.5 mb-4">
                    <View className="flex-1">
                      <AppText weight="semibold" className="text-[12.5px] text-muted mb-1.5">
                        Tinggi (cm)
                      </AppText>
                      <TextInput
                        value={editHeight}
                        onChangeText={setEditHeight}
                        keyboardType="numeric"
                        placeholder="170"
                        editable={!isSaving}
                        className="w-full h-12 bg-card-2 border border-line rounded-2xl px-3.5 text-ink text-base"
                        style={{ fontFamily: "Urbanist-Bold", fontSize: 16, includeFontPadding: false }}
                      />
                    </View>

                    <View className="flex-1">
                      <AppText weight="semibold" className="text-[12.5px] text-muted mb-1.5">
                        Usia (thn)
                      </AppText>
                      <TextInput
                        value={editAge}
                        onChangeText={setEditAge}
                        keyboardType="numeric"
                        placeholder="25"
                        editable={!isSaving}
                        className="w-full h-12 bg-card-2 border border-line rounded-2xl px-3.5 text-ink text-base"
                        style={{ fontFamily: "Urbanist-Bold", fontSize: 16, includeFontPadding: false }}
                      />
                    </View>
                  </View>

                  {/* Live Preview */}
                  <ColorBlock tone="mist" className="mb-5">
                    <AppText weight="medium" className="text-xs text-muted mb-1">
                      Estimasi target harian baru
                    </AppText>
                    <View className="flex-row justify-between items-baseline flex-wrap gap-2">
                      <AppText weight="semibold" className="text-[22px] text-primary-text" style={tnum}>
                        {previewPlan.targetCalories.toLocaleString("id-ID")} kcal
                      </AppText>
                      <AppText weight="bold" className="text-xs text-ink" style={tnum}>
                        P {previewPlan.targetProteinGrams}g · K {previewPlan.targetCarbGrams}g · L {previewPlan.targetFatGrams}g
                      </AppText>
                    </View>
                  </ColorBlock>

                  <View className="flex-row gap-2.5 pt-1 pb-2">
                    <PillButton
                      label="Batal"
                      onPress={() => setEditModalVisible(false)}
                      disabled={isSaving}
                      className="flex-1"
                    />
                    <PillButton
                      label={isSaving ? "Menyimpan..." : "Simpan"}
                      variant="primary"
                      icon="check"
                      onPress={handleSaveProfile}
                      disabled={isSaving}
                      className="flex-1"
                    />
                  </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </ModalSheet>

      {/* Help & Documentation / About Us & Contact Us Modal */}
      <ModalSheet
        visible={infoModalType !== null}
        onClose={() => setInfoModalType(null)}
        variant="sheet"
        accessibilityLabel={
          infoModalType === "help" ? "Panduan Penggunaan" : "Tentang Better Life & Kontak"
        }
        contentClassName="w-full max-w-lg max-h-[85%] bg-card rounded-t-[26px] sm:rounded-[26px] border border-line overflow-hidden"
      >
        <View className="w-full p-5 sm:p-6 pt-2">
          <CardHead
            title={
              infoModalType === "help"
                ? "Panduan Penggunaan"
                : "Tentang Better Life & Kontak"
            }
            caption={
              infoModalType === "help"
                ? "Dokumentasi alur aplikasi Better Life"
                : "Informasi pengembang & layanan dukungan"
            }
            right={
              <RingButton
                icon="close"
                onPress={() => setInfoModalType(null)}
                accessibilityLabel="Tutup"
              />
            }
          />

              <ScrollView showsVerticalScrollIndicator={false}>
                {infoModalType === "help" ? (
                  <View className="gap-3.5 pb-2">
                    <View className="bg-card-2 border border-line rounded-2xl p-3.5">
                      <AppText weight="bold" className="text-[14px] text-ink mb-1">
                        1. Beranda & Pencatatan Harian
                      </AppText>
                      <AppText weight="medium" className="text-[12.5px] text-muted leading-5">
                        Pantau ringkasan kalori, makronutrisi (Protein, Karbohidrat, Lemak), hidrasi air minum (target 8 gelas / 2L), serta aktivitas langkah kaki harian Anda langsung dari Beranda.
                      </AppText>
                    </View>
                    <View className="bg-card-2 border border-line rounded-2xl p-3.5">
                      <AppText weight="bold" className="text-[14px] text-ink mb-1">
                        2. Resep, Bahan Makanan & Timer Memasak
                      </AppText>
                      <AppText weight="medium" className="text-[12.5px] text-muted leading-5">
                        Cari resep sehat dan ekonomis yang disesuaikan dengan tingkat keahlian memasak, preferensi diet, dan alergi Anda. Gunakan fitur Timer Memasak interaktif pada setiap tahapan resep.
                      </AppText>
                    </View>
                    <View className="bg-card-2 border border-line rounded-2xl p-3.5">
                      <AppText weight="bold" className="text-[14px] text-ink mb-1">
                        3. Monitoring & Komunitas
                      </AppText>
                      <AppText weight="medium" className="text-[12.5px] text-muted leading-5">
                        Evaluasi progres berat badan menuju Target BB dan histori menu di halaman Monitoring, serta berdiskusi atau berkonsultasi langsung dengan ahli gizi di halaman Komunitas.
                      </AppText>
                    </View>
                  </View>
                ) : (
                  <View className="gap-3.5 pb-2">
                    <View className="bg-card-2 border border-line rounded-2xl p-3.5">
                      <AppText weight="bold" className="text-[14px] text-ink mb-1">
                        Tentang Better Life
                      </AppText>
                      <AppText weight="medium" className="text-[12.5px] text-muted leading-5">
                        Better Life adalah aplikasi perencanaan dan pemantauan gaya hidup sehat yang dirancang khusus untuk mahasiswa, anak kost, dan masyarakat produktif agar dapat mengatur pola makan bergizi secara praktis dan terjangkau.
                      </AppText>
                    </View>
                    <View className="bg-card-2 border border-line rounded-2xl p-3.5">
                      <AppText weight="bold" className="text-[14px] text-ink mb-1">
                        Tim Pengembang (Kelompok 4)
                      </AppText>
                      <AppText weight="medium" className="text-[12.5px] text-muted leading-5">
                        • Daffa Pratama{"\n"}
                        • Muhammad Nabil{"\n"}
                        • Muhammad Rifky{"\n"}
                        Program Studi S1 Sistem Informasi · Universitas Negeri Surabaya
                      </AppText>
                    </View>
                    <View className="bg-card-2 border border-line rounded-2xl p-3.5">
                      <AppText weight="bold" className="text-[14px] text-ink mb-1">
                        Hubungi Kami (Contact Us)
                      </AppText>
                      <AppText weight="medium" className="text-[12.5px] text-muted leading-5">
                        Email: support@betterlife.id{"\n"}
                        Layanan Konsultasi & Bantuan Pengguna: Senin–Jumat (08.00–17.00 WIB)
                      </AppText>
                    </View>
                  </View>
                )}

                <View className="pt-3">
                  <PillButton
                    label="Tutup"
                    variant="primary"
                    onPress={() => setInfoModalType(null)}
                  />
                </View>
          </ScrollView>
        </View>
      </ModalSheet>

      {/* Export & Restore Account Backup Modal */}
      <ModalSheet
        visible={backupModalVisible}
        onClose={() => !backupBusy && setBackupModalVisible(false)}
        dismissible={!backupBusy}
        variant="sheet"
        accessibilityLabel="Ekspor & pulihkan data"
        contentClassName="w-full max-w-lg max-h-[90%] bg-card rounded-t-[26px] sm:rounded-[26px] border border-line overflow-hidden"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="w-full max-h-full"
        >
          <View className="w-full p-5 sm:p-6 pt-2">
            <CardHead
              title="Ekspor & pulihkan data"
              caption={`Khusus akun ${user?.email || "aktif"} · menolak file akun lain`}
              right={
                <RingButton
                  icon="close"
                  onPress={() => !backupBusy && setBackupModalVisible(false)}
                  accessibilityLabel="Tutup"
                />
              }
            />

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View className="gap-3">
                  {backupNotice && (
                    <View
                      className={`p-3 rounded-2xl border ${
                        backupNotice.tone === "ok"
                          ? "bg-primary-light border-[#bfe0d2]"
                          : "bg-bad-soft border-[#f5c2be]"
                      }`}
                    >
                      <AppText
                        weight="semibold"
                        className={`text-xs leading-relaxed ${
                          backupNotice.tone === "ok" ? "text-primary-text" : "text-bad"
                        }`}
                      >
                        {backupNotice.text}
                      </AppText>
                    </View>
                  )}

                  <View className="flex-row flex-wrap gap-2">
                    <PillButton
                      label={backupBusy ? "Memproses..." : "Ekspor JSON"}
                      variant="primary"
                      icon="download"
                      onPress={() => void handleExportBackup()}
                      disabled={backupBusy}
                      className="flex-1"
                    />
                    {Platform.OS === "web" && (
                      <PillButton
                        label="Pilih File JSON"
                        variant="ghost"
                        onPress={handlePickBackupFileWeb}
                        disabled={backupBusy}
                      />
                    )}
                  </View>

                  <View>
                    <AppText weight="semibold" className="text-xs text-muted mb-1.5">
                      Isi dokumen JSON cadangan (tempel untuk memulihkan atau salin hasil ekspor)
                    </AppText>
                    <TextInput
                      value={backupJsonText}
                      onChangeText={setBackupJsonText}
                      multiline
                      numberOfLines={7}
                      placeholder='{"schemaVersion": 1, "account": {"email": "..."}, ...}'
                      placeholderTextColor="#8c9690"
                      textAlignVertical="top"
                      className="w-full min-h-[140px] max-h-[220px] p-3 rounded-[16px] bg-card-2 border border-line text-ink text-xs"
                      style={{ fontFamily: "Urbanist-Medium" }}
                    />
                  </View>

                  <View className="flex-row gap-2.5 pt-1">
                    <PillButton
                      label="Tutup"
                      onPress={() => setBackupModalVisible(false)}
                      disabled={backupBusy}
                      className="flex-1"
                    />
                    <PillButton
                      label={backupBusy ? "Memvalidasi..." : "Pulihkan Data"}
                      variant="dark"
                      icon="refresh"
                      onPress={() => void handleRestoreBackup()}
                      disabled={backupBusy || !backupJsonText.trim()}
                      className="flex-1"
                    />
                  </View>
                </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </ModalSheet>
    </ScreenWrapper>
  );
}
