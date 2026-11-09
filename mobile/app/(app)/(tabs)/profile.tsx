import React, { useState, useEffect } from "react";
import {
  View,
  Image,
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
  PageHead,
  Surface,
  CardHead,
  RingButton,
  ColorBlock,
  blockColors,
  ListRow,
  RowIcon,
  StatusPill,
  Segmented,
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
import { mealLabel } from "@/constants/MealLabels";
import { MOCK_RECIPES } from "@/data/mockRecipes";

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
  const currentPeriodEnd = useSubscriptionStore((state) => state.currentPeriodEnd);

  const currentYear = new Date().getFullYear();
  const userAge = Math.max(14, currentYear - (personalization.birthDate?.year || 2000));

  const [activeTab, setActiveTab] = useState<"list" | "recipes">("list");
  const [settingsVisible, setSettingsVisible] = useState(false);
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

  const [userLists, setUserLists] = useState([
    { id: "favs", title: "Favorit Saya", count: "2 menu tersimpan", tag: "Akses cepat" },
    { id: "protein", title: "Menu Tinggi Protein", count: "3 resep", tag: "Persiapan harian" },
  ]);

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

  const handleCreateNewList = () => {
    const newItem = {
      id: `list-${Date.now()}`,
      title: `Koleksi Menu #${userLists.length + 1}`,
      count: "0 menu",
      tag: "Kustom",
    };
    setUserLists([newItem, ...userLists]);
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
        setSettingsVisible(false);
        await logout();
        router.replace("/(auth)/get-started");
      }
    );
  };

  const greenColors = blockColors("green");
  const amberColors = blockColors("amber");

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: hasDesktopNav ? 8 : 16, paddingBottom: hasDesktopNav ? 56 : 120 }}
        showsVerticalScrollIndicator={false}
      >
        <FadeInView index={0}>
          <PageHead
            title="Profil & target"
            caption="Kalibrasi kebutuhan energi dan preferensi makan"
            right={
              <View className="flex-row items-center gap-2">
                <RingButton
                  icon="edit"
                  variant="solid"
                  size="md"
                  onPress={handleOpenEdit}
                  accessibilityLabel="Ubah data diri dan target"
                />
                <RingButton
                  icon="settings"
                  variant="solid"
                  size="md"
                  onPress={() => setSettingsVisible(true)}
                  accessibilityLabel="Pengaturan akun"
                />
              </View>
            }
          />
        </FadeInView>

        <View className="flex-col lg:flex-row gap-4">
          {/* Left Column: Identity + Biometrics + Membership */}
          <View className="w-full lg:w-5/12 gap-4">
            {/* 1. Identity & Target Blocks */}
            <FadeInView index={1}>
              <Surface>
                <View className="flex-row items-center">
                  <View className="mr-3.5 flex-shrink-0">
                    <Avatar name={user?.name || "Pengguna"} size={52} showBadge />
                  </View>
                  <View className="flex-1 min-w-0 mr-2">
                    <AppText weight="semibold" numberOfLines={1} className="text-[19px] text-ink" style={{ letterSpacing: -0.3 }}>
                      {user?.name || "Pengguna Better Life"}
                    </AppText>
                    <AppText weight="medium" numberOfLines={1} className="text-[13px] text-muted mt-0.5">
                      {user?.email || "Akun tersimpan di perangkat"}
                    </AppText>
                  </View>
                  <StatusPill label={isPremium ? "Premium" : "Gratis"} tone={isPremium ? "good" : "plain"} />
                </View>

                <View className="flex-row gap-3 mt-4">
                  <View className="flex-1 min-w-0">
                    <ColorBlock tone="green" style={{ minHeight: 96 }}>
                      <AppText weight="semibold" className="text-[12px]" style={{ color: greenColors.sub }}>
                        Target harian
                      </AppText>
                      <View className="flex-row items-baseline gap-1 mt-1">
                        <AppText
                          weight="semibold"
                          className="text-[22px] sm:text-[24px]"
                          style={[{ color: greenColors.fg, letterSpacing: -0.5 }, tnum]}
                        >
                          {(personalization.targetCalories || 2253).toLocaleString("id-ID")}
                        </AppText>
                        <AppText weight="semibold" className="text-[11.5px]" style={{ color: greenColors.sub }}>
                          kcal
                        </AppText>
                      </View>
                    </ColorBlock>
                  </View>

                  <View className="flex-1 min-w-0">
                    <ColorBlock tone="amber" style={{ minHeight: 96 }}>
                      <AppText weight="semibold" className="text-[12px]" style={{ color: amberColors.sub }}>
                        Fokus utama
                      </AppText>
                      <AppText
                        weight="semibold"
                        numberOfLines={1}
                        className="text-[15.5px] sm:text-[17px] mt-1.5"
                        style={{ color: amberColors.fg }}
                      >
                        {GOAL_LABELS[personalization.goal] ?? personalization.goal}
                      </AppText>
                      <AppText weight="medium" numberOfLines={1} className="text-[11px] mt-0.5" style={[{ color: amberColors.sub }, tnum]}>
                        P {personalization.targetProteinGrams || 141}g · K {personalization.targetCarbGrams || 282}g
                      </AppText>
                    </ColorBlock>
                  </View>
                </View>
              </Surface>
            </FadeInView>

            {/* 2. Biometric & Metabolic Summary */}
            <FadeInView index={2}>
              <Surface>
                <CardHead
                  title="Biometrik & metabolisme"
                  caption="Parameter perhitungan Mifflin-St Jeor"
                  right={
                    <RingButton
                      icon="edit"
                      accessibilityLabel="Ubah data biometrik"
                      onPress={handleOpenEdit}
                    />
                  }
                />
                <View>
                  {[
                    { label: "Berat badan", value: `${personalization.weight} kg`, icon: "scale" as const },
                    { label: "Tinggi badan", value: `${personalization.height} cm`, icon: "target" as const },
                    {
                      label: "Usia & jenis kelamin",
                      value: `${userAge} thn · ${GENDER_LABELS[personalization.gender] ?? personalization.gender}`,
                      icon: "user" as const,
                    },
                    {
                      label: "BMR / TDEE",
                      value: `${personalization.bmr || "-"} / ${personalization.tdee || "-"} kcal`,
                      icon: "flame" as const,
                    },
                  ].map((row, i) => (
                    <ListRow
                      key={row.label}
                      last={i === 3}
                      leading={<RowIcon icon={row.icon} tone="plain" />}
                      title={row.label}
                      trailing={
                        <AppText weight="bold" className="text-[14px] text-ink" style={tnum}>
                          {row.value}
                        </AppText>
                      }
                    />
                  ))}
                </View>
              </Surface>
            </FadeInView>

            {/* 3. Membership Surface */}
            <FadeInView index={3}>
              <Surface dense>
                <ListRow
                  last
                  onPress={() => router.push("/(app)/upgrade")}
                  accessibilityLabel={isPremium ? "Kelola langganan Premium" : "Lihat paket Premium"}
                  leading={<RowIcon icon="crown" tone="amber" />}
                  title={isPremium ? "Better Life Premium" : "Paket Gratis"}
                  caption={
                    isPremium
                      ? currentPeriodEnd
                        ? `Aktif hingga ${new Date(currentPeriodEnd).toLocaleDateString("id-ID")}`
                        : "Semua fitur analitik dan rencana makan terbuka"
                      : "Buka rencana makan 7 hari dan analitik 30 hari"
                  }
                  trailing={
                    <View className="flex-row items-center gap-2">
                      <StatusPill
                        label={isPremium ? "Aktif" : "Upgrade"}
                        tone={isPremium ? "good" : "warn"}
                        dot={false}
                      />
                      <LineIcon name="chevronRight" size={18} color="#7d8781" />
                    </View>
                  }
                />
              </Surface>
            </FadeInView>

            {/* 4. Direct Account & Personalization Actions */}
            <FadeInView index={4}>
              <Surface dense>
                <ListRow
                  onPress={() => router.push("/(onboarding)")}
                  accessibilityLabel="Ulangi kalibrasi personalisasi 8 langkah"
                  leading={<RowIcon icon="refresh" tone="accent" />}
                  title="Kalibrasi ulang personalisasi"
                  caption="Atur ulang tujuan, metrik tubuh, diet & alergi (8 langkah)"
                  trailing={<LineIcon name="chevronRight" size={18} color="#7d8781" />}
                />
                <ListRow
                  last
                  onPress={async () => {
                    await logout();
                    router.replace("/(auth)/get-started");
                  }}
                  accessibilityLabel="Keluar atau ganti akun"
                  leading={<RowIcon icon="logout" tone="ink" />}
                  title="Keluar / Ganti akun"
                  caption="Kembali ke halaman masuk & pendaftaran akun"
                  trailing={<LineIcon name="chevronRight" size={18} color="#7d8781" />}
                />
              </Surface>
            </FadeInView>
          </View>

          {/* Right Column: Collections & Saved Recipes */}
          <FadeInView index={3} className="w-full lg:w-7/12">
            <Surface>
              <CardHead
                title="Tersimpan"
                caption="Koleksi menu dan resep pilihan Anda"
              />

              <View className="mb-3">
                <Segmented
                  stretch
                  options={[
                    { value: "list", label: "Koleksi Saya" },
                    { value: "recipes", label: "Resep Tersimpan" },
                  ]}
                  value={activeTab}
                  onChange={setActiveTab}
                  accessibilityLabel="Pilih tampilan tersimpan"
                />
              </View>

              {activeTab === "list" && (
                <View>
                  {userLists.map((item, idx) => (
                    <ListRow
                      key={item.id}
                      last={idx === userLists.length - 1}
                      onPress={() => router.push("/(app)/(tabs)/meals")}
                      leading={<RowIcon icon="bookmark" tone="accent" />}
                      title={item.title}
                      caption={item.count}
                      trailing={
                        <View className="flex-row items-center gap-2">
                          <StatusPill label={item.tag} tone="plain" dot={false} />
                          <LineIcon name="chevronRight" size={17} color="#7d8781" />
                        </View>
                      }
                    />
                  ))}
                  <View className="mt-3 pt-1">
                    <PillButton
                      label="Buat koleksi baru"
                      icon="plus"
                      size="sm"
                      onPress={handleCreateNewList}
                      accessibilityLabel="Buat koleksi menu baru"
                    />
                  </View>
                </View>
              )}

              {activeTab === "recipes" && (
                <View>
                  {MOCK_RECIPES.slice(0, 4).map((recipe, idx) => (
                    <ListRow
                      key={recipe.id}
                      last={idx === 3}
                      onPress={() => router.push(`/(app)/recipe-detail?id=${recipe.id}`)}
                      leading={
                        <View className="w-11 h-11 rounded-[12px] bg-card-2 overflow-hidden items-center justify-center flex-shrink-0">
                          {recipe.imageUrl ? (
                            <Image
                              source={{ uri: recipe.imageUrl }}
                              style={{ width: "100%", height: "100%" }}
                              resizeMode="cover"
                            />
                          ) : (
                            <LineIcon name="book" size={18} color="#0e7a52" />
                          )}
                        </View>
                      }
                      title={recipe.title}
                      caption={`${recipe.calories} kcal · ${recipe.prepTimeMinutes} mnt`}
                      trailing={
                        <View className="flex-row items-center gap-2">
                          <StatusPill label={mealLabel(recipe.category)} tone="plain" dot={false} />
                          <LineIcon name="chevronRight" size={17} color="#7d8781" />
                        </View>
                      }
                    />
                  ))}
                </View>
              )}
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
            <Surface className="w-full max-w-lg rounded-t-[26px] sm:rounded-[26px] p-5 sm:p-6 max-h-[90%] z-10">
              <CardHead
                title="Ubah data & target"
                caption="Target kalori dan makro dihitung ulang otomatis"
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
                    <View>
                      <AppText weight="semibold" className="text-[24px] text-primary-text" style={tnum}>
                        {previewPlan.targetCalories.toLocaleString("id-ID")} kcal
                      </AppText>
                      <AppText weight="medium" className="text-[11.5px] text-muted mt-0.5" style={tnum}>
                        BMR {previewPlan.bmr} · TDEE {previewPlan.tdee}
                      </AppText>
                    </View>
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
                    label={isSaving ? "Menyimpan..." : "Simpan perubahan"}
                    variant="primary"
                    icon="check"
                    onPress={handleSaveProfile}
                    disabled={isSaving}
                    className="flex-1"
                  />
                </View>
              </ScrollView>
            </Surface>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Account Settings Modal */}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View className="flex-1 items-center justify-center px-5">
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(18, 24, 20, 0.45)" }]}
            onPress={() => setSettingsVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Tutup pengaturan"
          />
          <Surface className="w-full max-w-[380px] z-10">
            <CardHead
              title="Pengaturan akun"
              right={
                <RingButton
                  icon="close"
                  onPress={() => setSettingsVisible(false)}
                  accessibilityLabel="Tutup"
                />
              }
            />

            <View>
              <ListRow
                onPress={() => {
                  setSettingsVisible(false);
                  setEditModalVisible(true);
                }}
                leading={<RowIcon icon="edit" tone="plain" />}
                title="Ubah data diri & target"
                trailing={<LineIcon name="chevronRight" size={17} color="#7d8781" />}
              />
              <ListRow
                onPress={() => {
                  setSettingsVisible(false);
                  router.push("/(onboarding)");
                }}
                leading={<RowIcon icon="refresh" tone="plain" />}
                title="Ulangi kalibrasi awal"
                trailing={<LineIcon name="chevronRight" size={17} color="#7d8781" />}
              />
              <ListRow
                onPress={() => {
                  setSettingsVisible(false);
                  router.push("/(app)/upgrade");
                }}
                leading={<RowIcon icon="crown" tone="amber" />}
                title="Langganan & paket"
                trailing={<LineIcon name="chevronRight" size={17} color="#7d8781" />}
              />
              <ListRow
                onPress={handleResetData}
                leading={<RowIcon icon="trash" tone="plain" />}
                title="Reset semua data"
                caption="Hapus jurnal & kalibrasi"
              />
              <ListRow
                last
                onPress={async () => {
                  setSettingsVisible(false);
                  await logout();
                  router.replace("/(auth)/get-started");
                }}
                leading={<RowIcon icon="logout" tone="ink" />}
                title="Keluar akun"
              />
            </View>
          </Surface>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
