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
import { useResetMealsMutation } from "@/hooks/useMealsQuery";
import { confirmDestructive } from "@/lib/confirm";
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

  const [editGoal, setEditGoal] = useState<"Eat balanced" | "Lose weight" | "Gain muscle">(
    personalization.goal
  );
  const [editWeight, setEditWeight] = useState<string>(personalization.weight.toString());
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
      setEditHeight(personalization.height.toString());
      setEditAge(userAge.toString());
      setEditGender(personalization.gender);
      setFormError(null);
      setIsSaving(false);
      setSaveSuccess(false);
    }
  }, [editModalVisible, personalization, userAge]);

  const previewWeight = parseFloat(editWeight) || personalization.weight;
  const previewHeight = parseFloat(editHeight) || personalization.height;
  const previewAge = parseInt(editAge, 10) || userAge;
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
        await journalStorage.clearAllJournals();
        await sessionStorage.clearPersonalization();
        useJournalStore.setState({ journals: {} });
        useOnboardingStore.setState({ personalization: DEFAULT_PERSONALIZATION });
        await logout();
        router.replace("/(auth)/get-started");
      }
    );
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
              <View className="flex-row items-center">
                <View className="mr-3.5 flex-shrink-0">
                  <Avatar name={user?.name || "Pengguna"} size={56} showBadge />
                </View>
                <View className="flex-1 min-w-0 mr-2">
                  <AppText
                    weight="semibold"
                    numberOfLines={1}
                    className="text-[19px] text-ink"
                    style={{ letterSpacing: -0.3 }}
                  >
                    {user?.name || "Pengguna Better Life"}
                  </AppText>
                  <AppText weight="medium" numberOfLines={1} className="text-[13px] text-muted mt-0.5">
                    {user?.email || "Akun tersimpan di perangkat"}
                  </AppText>
                </View>
                <StatusPill label={isPremium ? "Premium" : "Gratis"} tone={isPremium ? "good" : "plain"} />
              </View>

              {/* Clean 3-Column Minimalist Summary Strip */}
              <PressableScale
                onPress={handleOpenEdit}
                pressedScale={0.99}
                className="flex-row items-center justify-between bg-card-2 border border-line rounded-[18px] px-4 py-3.5 mt-4"
                accessibilityRole="button"
                accessibilityLabel="Ringkasan target dan fisik, ketuk untuk mengubah"
              >
                <View className="flex-1 min-w-0">
                  <AppText weight="medium" className="text-[11.5px] text-muted">
                    Target energi
                  </AppText>
                  <AppText weight="bold" className="text-[17px] text-ink mt-0.5" style={tnum}>
                    {targetKcal.toLocaleString("id-ID")}{" "}
                    <AppText weight="semibold" className="text-[11.5px] text-muted">
                      kcal
                    </AppText>
                  </AppText>
                </View>

                <View className="w-px h-8 bg-line mx-3" />

                <View className="flex-1 min-w-0">
                  <AppText weight="medium" className="text-[11.5px] text-muted">
                    Fokus
                  </AppText>
                  <AppText weight="bold" numberOfLines={1} className="text-[14.5px] text-ink mt-0.5">
                    {GOAL_LABELS[personalization.goal] ?? personalization.goal}
                  </AppText>
                </View>

                <View className="w-px h-8 bg-line mx-3" />

                <View className="flex-1 min-w-0">
                  <AppText weight="medium" className="text-[11.5px] text-muted">
                    Fisik
                  </AppText>
                  <AppText weight="bold" numberOfLines={1} className="text-[14.5px] text-ink mt-0.5" style={tnum}>
                    {personalization.weight} kg · {personalization.height} cm
                  </AppText>
                </View>
              </PressableScale>

              {/* Concise Macro Target Line */}
              <View className="flex-row items-center justify-between mt-3 px-1">
                <AppText weight="medium" className="text-[12px] text-muted">
                  Target makro harian
                </AppText>
                <AppText weight="semibold" className="text-[12.5px] text-ink" style={tnum}>
                  Protein {targetP}g · Karbo {targetK}g · Lemak {targetL}g
                </AppText>
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
                accessibilityLabel="Lihat tren nutrisi"
                leading={<RowIcon icon="chart" tone="accent" />}
                title="Tren & analitik nutrisi"
                subtitle="Progres kalori & makro 7–30 hari"
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
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View className="flex-1 justify-end sm:justify-center items-center p-0 sm:p-6">
            <Pressable
              style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(18, 24, 20, 0.45)" }]}
              onPress={() => !isSaving && setEditModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Tutup jendela edit"
            />
            <FadeInView duration={220} translateY={16} className="w-full max-w-lg max-h-[90%] z-10">
              <Surface className="w-full rounded-t-[26px] sm:rounded-[26px] p-5 sm:p-6">
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

                  {/* Weight, Height, Age */}
                  <View className="flex-row gap-2.5 mb-4">
                    <View className="flex-1">
                      <AppText weight="semibold" className="text-[12.5px] text-muted mb-1.5">
                        Berat (kg)
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
              </Surface>
            </FadeInView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenWrapper>
  );
}
