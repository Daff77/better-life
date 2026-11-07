import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  ScrollView,
  Alert,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  Avatar,
  Badge,
  PressableScale,
  FadeInView,
  SectionHeader,
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
import {
  EditIconSvg,
  SettingsIconSvg,
  CloseIconSvg,
  CheckIconSvg,
  LogoutIconSvg,
  TrashIconSvg,
  ChevronRightIconSvg,
  CrownIconSvg,
  BrandImages,
} from "@/constants/Assets";
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

export default function ProfileScreen() {
  const router = useRouter();
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

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#faf9f5]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: Platform.OS === "web" ? 64 : 112 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <FadeInView index={0} className="flex-row items-center justify-between mb-5">
          <View className="flex-1 min-w-0 mr-3">
            <AppText weight="black" className="text-[26px] text-neutral-dark" style={{ letterSpacing: -0.6 }}>
              Profil & target
            </AppText>
            <AppText weight="medium" className="text-[13px] text-neutral-muted mt-0.5">
              Kalibrasi kebutuhan energi dan preferensi makan
            </AppText>
          </View>

          <View className="flex-row items-center gap-2">
            <PressableScale
              onPress={handleOpenEdit}
              className="w-11 h-11 rounded-full bg-white border border-[#e3e1da] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Ubah data diri dan target"
            >
              <EditIconSvg size={16} color="#153e28" />
            </PressableScale>

            <PressableScale
              onPress={() => setSettingsVisible(true)}
              className="w-11 h-11 rounded-full bg-white border border-[#e3e1da] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Pengaturan akun"
            >
              <SettingsIconSvg size={16} color="#153e28" />
            </PressableScale>
          </View>
        </FadeInView>

        <View className="flex-col lg:flex-row lg:gap-8">
          {/* Left Column: Identity + Biometrics */}
          <View className="w-full lg:w-5/12">
            {/* 1. Identity Card */}
            <FadeInView index={1} className="bg-white p-5 rounded-[22px] border border-[#ebe9e2] mb-5">
              <View className="flex-row items-center">
                <View className="mr-3.5">
                  <Avatar name={user?.name || "Pengguna"} size={56} showBadge />
                </View>
                <View className="flex-1 min-w-0">
                  <AppText weight="black" numberOfLines={1} className="text-xl text-neutral-dark" style={{ letterSpacing: -0.3 }}>
                    {user?.name || "Pengguna Better Life"}
                  </AppText>
                  <AppText weight="medium" numberOfLines={1} className="text-xs text-neutral-muted mt-0.5">
                    {user?.email || "Akun tersimpan di perangkat"}
                  </AppText>
                </View>
              </View>

              <View className="h-px bg-[#f0eee8] my-4" />

              <View className="flex-row items-center justify-between">
                <View>
                  <AppText weight="medium" className="text-xs text-neutral-muted">
                    Target harian
                  </AppText>
                  <AppText
                    weight="black"
                    className="text-xl text-primary mt-0.5"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {(personalization.targetCalories || 2253).toLocaleString("id-ID")} kcal
                  </AppText>
                </View>
                <View className="items-end">
                  <AppText weight="medium" className="text-xs text-neutral-muted">
                    Fokus
                  </AppText>
                  <AppText weight="bold" className="text-sm text-neutral-dark mt-0.5">
                    {GOAL_LABELS[personalization.goal] ?? personalization.goal}
                  </AppText>
                </View>
              </View>
            </FadeInView>

            {/* 2. Biometric & Metabolic Summary (flat ruled rows inside a single card) */}
            <FadeInView index={2} className="mb-5">
              <SectionHeader
                title="Biometrik & metabolisme"
                actionLabel="Ubah data"
                onAction={handleOpenEdit}
              />
              <View className="bg-white rounded-[22px] border border-[#ebe9e2] px-4 py-1">
                {[
                  { label: "Berat badan", value: `${personalization.weight} kg` },
                  { label: "Tinggi badan", value: `${personalization.height} cm` },
                  {
                    label: "Usia & jenis kelamin",
                    value: `${userAge} thn · ${GENDER_LABELS[personalization.gender] ?? personalization.gender}`,
                  },
                  {
                    label: "BMR / TDEE",
                    value: `${personalization.bmr || "-"} / ${personalization.tdee || "-"} kcal`,
                  },
                ].map((row, i) => (
                  <View
                    key={row.label}
                    className={`flex-row items-center justify-between py-3 ${
                      i > 0 ? "border-t border-[#f0eee8]" : ""
                    }`}
                  >
                    <AppText weight="medium" className="text-[13px] text-neutral-muted">
                      {row.label}
                    </AppText>
                    <AppText
                      weight="bold"
                      className="text-[14px] text-neutral-dark"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {row.value}
                    </AppText>
                  </View>
                ))}
              </View>
            </FadeInView>

            {/* 3. Membership row (flat on canvas) */}
            <FadeInView index={3} className="mb-6">
              <PressableScale
                onPress={() => router.push("/(app)/upgrade")}
                pressedScale={0.985}
                className="flex-row items-center py-3.5 border-y border-[#ebe9e2]"
                accessibilityRole="button"
                accessibilityLabel={isPremium ? "Kelola langganan Premium" : "Lihat paket Premium"}
              >
                <View className="w-10 h-10 rounded-xl bg-primary-light items-center justify-center">
                  <CrownIconSvg size={17} color="#b45309" />
                </View>
                <View className="flex-1 min-w-0 ml-3 mr-2">
                  <View className="flex-row items-center gap-2">
                    <AppText weight="bold" className="text-[15px] text-neutral-dark">
                      {isPremium ? "Better Life Premium" : "Paket Gratis"}
                    </AppText>
                    <Badge
                      label={isPremium ? "Aktif" : "Upgrade"}
                      variant={isPremium ? "primary" : "accent"}
                      size="sm"
                    />
                  </View>
                  <AppText weight="medium" numberOfLines={1} className="text-xs text-neutral-muted mt-0.5">
                    {isPremium
                      ? currentPeriodEnd
                        ? `Aktif hingga ${new Date(currentPeriodEnd).toLocaleDateString("id-ID")}`
                        : "Semua fitur analitik dan rencana makan terbuka"
                      : "Buka rencana makan 7 hari dan analitik 30 hari"}
                  </AppText>
                </View>
                <ChevronRightIconSvg size={16} color="#8b938c" />
              </PressableScale>
            </FadeInView>
          </View>

          {/* Right Column: Collections & Saved Recipes */}
          <FadeInView index={3} className="w-full lg:w-7/12">
            <View className="flex-row border-b border-[#ebe9e2] mb-4">
              <PressableScale
                onPress={() => setActiveTab("list")}
                className={`pb-2.5 mr-6 ${
                  activeTab === "list" ? "border-b-2 border-primary" : ""
                }`}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === "list" }}
              >
                <AppText
                  weight={activeTab === "list" ? "black" : "bold"}
                  className={`text-base ${
                    activeTab === "list" ? "text-neutral-dark" : "text-neutral-muted"
                  }`}
                >
                  Koleksi Saya
                </AppText>
              </PressableScale>

              <PressableScale
                onPress={() => setActiveTab("recipes")}
                className={`pb-2.5 ${
                  activeTab === "recipes" ? "border-b-2 border-primary" : ""
                }`}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === "recipes" }}
              >
                <AppText
                  weight={activeTab === "recipes" ? "black" : "bold"}
                  className={`text-base ${
                    activeTab === "recipes" ? "text-neutral-dark" : "text-neutral-muted"
                  }`}
                >
                  Resep Tersimpan
                </AppText>
              </PressableScale>
            </View>

            {activeTab === "list" && (
              <View className="gap-2.5">
                <PressableScale
                  onPress={handleCreateNewList}
                  pressedScale={0.985}
                  className="h-12 rounded-2xl border border-dashed border-[#c5d4c9] bg-primary-light/50 flex-row items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Buat koleksi menu baru"
                >
                  <AppText weight="bold" className="text-sm text-primary">
                    + Buat koleksi baru
                  </AppText>
                </PressableScale>

                {userLists.map((item) => (
                  <PressableScale
                    key={item.id}
                    pressedScale={0.985}
                    onPress={() => router.push("/(app)/(tabs)/meals")}
                    className="bg-white p-4 rounded-2xl border border-[#ebe9e2] flex-row items-center justify-between"
                  >
                    <View className="flex-1 min-w-0 mr-3">
                      <AppText weight="bold" className="text-[15px] text-neutral-dark">
                        {item.title}
                      </AppText>
                      <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                        {item.count}
                      </AppText>
                    </View>
                    <Badge label={item.tag} variant="secondary" size="sm" />
                  </PressableScale>
                ))}
              </View>
            )}

            {activeTab === "recipes" && (
              <View className="gap-2.5">
                {MOCK_RECIPES.slice(0, 3).map((recipe) => (
                  <PressableScale
                    key={recipe.id}
                    pressedScale={0.985}
                    onPress={() => router.push(`/(app)/recipe-detail?id=${recipe.id}`)}
                    className="bg-white p-3 rounded-2xl border border-[#ebe9e2] flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center flex-1 pr-3 min-w-0">
                      {recipe.imageUrl ? (
                        <Image
                          source={{ uri: recipe.imageUrl }}
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 12,
                            marginRight: 12,
                          }}
                          resizeMode="cover"
                        />
                      ) : null}
                      <View className="flex-1 min-w-0">
                        <AppText weight="bold" numberOfLines={1} className="text-[15px] text-neutral-dark">
                          {recipe.title}
                        </AppText>
                        <AppText
                          weight="medium"
                          className="text-xs text-neutral-muted mt-0.5"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {recipe.calories} kcal · {recipe.prepTimeMinutes} mnt
                        </AppText>
                      </View>
                    </View>
                    <Badge label={mealLabel(recipe.category)} variant="secondary" size="sm" />
                  </PressableScale>
                ))}
              </View>
            )}
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View className="flex-1 justify-end sm:justify-center items-center p-0 sm:p-6">
            <Pressable
              style={StyleSheet.absoluteFill}
              className="bg-black/45"
              onPress={() => !isSaving && setEditModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Tutup jendela edit"
            />
            <View className="w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] p-6 border-t sm:border border-[#ebe9e2] max-h-[90%] z-10">
              <View className="flex-row justify-between items-center pb-3.5 border-b border-[#f0eee8] mb-4">
                <View className="flex-1 pr-2">
                  <AppText weight="black" className="text-xl text-neutral-dark" style={{ letterSpacing: -0.4 }}>
                    Ubah data & target
                  </AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                    Target kalori dan makro dihitung ulang otomatis
                  </AppText>
                </View>
                <PressableScale
                  onPress={() => !isSaving && setEditModalVisible(false)}
                  disabled={isSaving}
                  className="w-10 h-10 rounded-full bg-[#f4f3ee] items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Tutup"
                >
                  <CloseIconSvg size={16} color="#5a625b" />
                </PressableScale>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {formError && (
                  <View className="p-3 mb-4 bg-status-error/10 border border-status-error/20 rounded-xl">
                    <AppText weight="semibold" className="text-xs text-status-error text-center">
                      {formError}
                    </AppText>
                  </View>
                )}

                {saveSuccess && (
                  <View className="p-3 mb-4 bg-primary-light rounded-xl items-center flex-row justify-center gap-x-2">
                    <CheckIconSvg size={16} color="#153e28" strokeWidth={2.6} />
                    <AppText weight="bold" className="text-xs text-primary">
                      Profil dan target kalori berhasil diperbarui
                    </AppText>
                  </View>
                )}

                {/* Goal Selector */}
                <View className="mb-4">
                  <AppText weight="bold" className="text-xs text-neutral-muted mb-2">
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
                          className={`flex-1 min-h-[44px] py-2 px-2 rounded-xl items-center justify-center border ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "bg-white border-[#e3e1da]"
                          }`}
                          accessibilityRole="button"
                        >
                          <AppText
                            weight={isSelected ? "bold" : "medium"}
                            className={`text-xs text-center ${isSelected ? "text-white" : "text-neutral-dark"}`}
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
                  <AppText weight="bold" className="text-xs text-neutral-muted mb-2">
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
                          className={`flex-1 min-h-[44px] py-2 rounded-xl items-center justify-center border ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "bg-white border-[#e3e1da]"
                          }`}
                          accessibilityRole="button"
                        >
                          <AppText
                            weight={isSelected ? "bold" : "medium"}
                            className={`text-xs ${isSelected ? "text-white" : "text-neutral-dark"}`}
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
                    <AppText weight="bold" className="text-xs text-neutral-muted mb-1.5">
                      Berat (kg)
                    </AppText>
                    <TextInput
                      value={editWeight}
                      onChangeText={setEditWeight}
                      keyboardType="numeric"
                      placeholder="65"
                      editable={!isSaving}
                      className="w-full h-12 bg-white border border-[#e3e1da] rounded-xl px-3 text-neutral-dark text-base"
                      style={{ fontFamily: "Akatab-Bold", fontSize: 16, includeFontPadding: false }}
                    />
                  </View>

                  <View className="flex-1">
                    <AppText weight="bold" className="text-xs text-neutral-muted mb-1.5">
                      Tinggi (cm)
                    </AppText>
                    <TextInput
                      value={editHeight}
                      onChangeText={setEditHeight}
                      keyboardType="numeric"
                      placeholder="170"
                      editable={!isSaving}
                      className="w-full h-12 bg-white border border-[#e3e1da] rounded-xl px-3 text-neutral-dark text-base"
                      style={{ fontFamily: "Akatab-Bold", fontSize: 16, includeFontPadding: false }}
                    />
                  </View>

                  <View className="flex-1">
                    <AppText weight="bold" className="text-xs text-neutral-muted mb-1.5">
                      Usia (thn)
                    </AppText>
                    <TextInput
                      value={editAge}
                      onChangeText={setEditAge}
                      keyboardType="numeric"
                      placeholder="25"
                      editable={!isSaving}
                      className="w-full h-12 bg-white border border-[#e3e1da] rounded-xl px-3 text-neutral-dark text-base"
                      style={{ fontFamily: "Akatab-Bold", fontSize: 16, includeFontPadding: false }}
                    />
                  </View>
                </View>

                {/* Live Preview */}
                <View className="p-4 bg-[#f7f6f1] rounded-2xl mb-5">
                  <AppText weight="medium" className="text-xs text-neutral-muted mb-1">
                    Estimasi target harian baru
                  </AppText>
                  <View className="flex-row justify-between items-baseline">
                    <View>
                      <AppText
                        weight="black"
                        className="text-2xl text-primary"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {previewPlan.targetCalories.toLocaleString("id-ID")} kcal
                      </AppText>
                      <AppText
                        weight="medium"
                        className="text-[11px] text-neutral-muted mt-0.5"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        BMR {previewPlan.bmr} · TDEE {previewPlan.tdee}
                      </AppText>
                    </View>
                    <AppText
                      weight="bold"
                      className="text-xs text-neutral-dark"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      P {previewPlan.targetProteinGrams}g · K {previewPlan.targetCarbGrams}g · L {previewPlan.targetFatGrams}g
                    </AppText>
                  </View>
                </View>

                <View className="flex-row gap-3 pt-1 pb-2">
                  <PressableScale
                    onPress={() => setEditModalVisible(false)}
                    disabled={isSaving}
                    className="flex-1 h-12 rounded-full border border-[#e3e1da] items-center justify-center"
                    accessibilityRole="button"
                  >
                    <AppText weight="bold" className="text-sm text-neutral-dark">
                      Batal
                    </AppText>
                  </PressableScale>

                  <PressableScale
                    onPress={handleSaveProfile}
                    disabled={isSaving}
                    className="flex-1 h-12 rounded-full bg-primary items-center justify-center"
                    accessibilityRole="button"
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <AppText weight="bold" className="text-sm text-white">
                        Simpan perubahan
                      </AppText>
                    )}
                  </PressableScale>
                </View>
              </ScrollView>
            </View>
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
            style={StyleSheet.absoluteFill}
            className="bg-black/45"
            onPress={() => setSettingsVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Tutup pengaturan"
          />
          <View className="w-full max-w-[360px] bg-white rounded-[28px] p-6 border border-[#ebe9e2] z-10">
            <View className="flex-row justify-between items-center pb-3.5 border-b border-[#f0eee8] mb-4">
              <AppText weight="black" className="text-xl text-neutral-dark" style={{ letterSpacing: -0.3 }}>
                Pengaturan akun
              </AppText>
              <PressableScale
                onPress={() => setSettingsVisible(false)}
                className="w-10 h-10 items-center justify-center rounded-full bg-[#f4f3ee]"
                accessibilityRole="button"
                accessibilityLabel="Tutup"
              >
                <CloseIconSvg size={16} color="#5a625b" />
              </PressableScale>
            </View>

            <View className="gap-y-2">
              <PressableScale
                onPress={() => {
                  setSettingsVisible(false);
                  setEditModalVisible(true);
                }}
                className="p-3.5 min-h-[48px] bg-[#faf9f5] rounded-2xl flex-row justify-between items-center"
                accessibilityRole="button"
              >
                <AppText weight="bold" className="text-sm text-neutral-dark">
                  Ubah data diri & target
                </AppText>
                <ChevronRightIconSvg size={16} color="#8b938c" />
              </PressableScale>

              <PressableScale
                onPress={() => {
                  setSettingsVisible(false);
                  router.push("/(onboarding)");
                }}
                className="p-3.5 min-h-[48px] bg-[#faf9f5] rounded-2xl flex-row justify-between items-center"
                accessibilityRole="button"
              >
                <AppText weight="bold" className="text-sm text-neutral-dark">
                  Ulangi kalibrasi awal
                </AppText>
                <ChevronRightIconSvg size={16} color="#8b938c" />
              </PressableScale>

              <PressableScale
                onPress={() => {
                  setSettingsVisible(false);
                  router.push("/(app)/upgrade");
                }}
                className="p-3.5 min-h-[48px] bg-[#faf9f5] rounded-2xl flex-row justify-between items-center"
                accessibilityRole="button"
              >
                <View className="flex-row items-center gap-2">
                  <CrownIconSvg size={16} color="#b45309" />
                  <AppText weight="bold" className="text-sm text-neutral-dark">
                    Langganan & paket
                  </AppText>
                </View>
                <ChevronRightIconSvg size={16} color="#8b938c" />
              </PressableScale>

              <View className="h-px bg-[#f0eee8] my-1.5" />

              <PressableScale
                onPress={async () => {
                  setSettingsVisible(false);
                  await logout();
                  router.replace("/(auth)/get-started");
                }}
                className="p-3.5 min-h-[48px] bg-[#faf9f5] rounded-2xl flex-row justify-between items-center"
                accessibilityRole="button"
              >
                <AppText weight="bold" className="text-sm text-neutral-dark">
                  Keluar akun
                </AppText>
                <LogoutIconSvg size={16} color="#5a625b" />
              </PressableScale>

              <PressableScale
                onPress={handleResetData}
                className="p-3.5 min-h-[48px] bg-status-error/10 rounded-2xl flex-row justify-between items-center"
                accessibilityRole="button"
              >
                <AppText weight="bold" className="text-sm text-status-error">
                  Reset semua data
                </AppText>
                <TrashIconSvg size={16} color="#b91c1c" />
              </PressableScale>

              <View className="items-center justify-center pt-4 pb-1">
                <Image
                  source={BrandImages.logoPng}
                  style={{ width: 36, height: 36 }}
                  resizeMode="contain"
                  accessibilityLabel="Better Life Logo"
                />
                <AppText weight="bold" className="text-xs text-neutral-dark mt-1.5">
                  Better Life v1.0.0
                </AppText>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
