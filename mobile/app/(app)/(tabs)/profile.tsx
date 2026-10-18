import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, Card, Avatar, Button, Badge } from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOnboardingStore, calculatePersonalizedPlan, DEFAULT_PERSONALIZATION } from "@/stores/useOnboardingStore";
import { useJournalStore } from "@/stores/useJournalStore";
import { journalStorage } from "@/lib/journalStorage";
import { sessionStorage } from "@/lib/sessionStorage";
import { useResetMealsMutation } from "@/hooks/useMealsQuery";
import { IconRenderer } from "@/constants/Assets";
import { MOCK_RECIPES } from "@/data/mockRecipes";

const GOALS = ["Eat balanced", "Lose weight", "Gain muscle"] as const;
const GENDERS = ["Female", "Male"] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const personalization = useOnboardingStore((state) => state.personalization);
  const savePersonalization = useOnboardingStore((state) => state.savePersonalization);
  const logout = useAuthStore((state) => state.logout);
  const resetMealsMutation = useResetMealsMutation();

  const currentYear = new Date().getFullYear();
  const userAge = Math.max(14, currentYear - (personalization.birthDate?.year || 2000));

  // Tabs: 'list' (My List) vs 'recipes' (My Recipes)
  const [activeTab, setActiveTab] = useState<"list" | "recipes">("list");

  // Modals state
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Edit form state
  const [editGoal, setEditGoal] = useState<"Eat balanced" | "Lose weight" | "Gain muscle">(personalization.goal);
  const [editWeight, setEditWeight] = useState<string>(personalization.weight.toString());
  const [editHeight, setEditHeight] = useState<string>(personalization.height.toString());
  const [editAge, setEditAge] = useState<string>(userAge.toString());
  const [editGender, setEditGender] = useState<"Female" | "Male">(personalization.gender);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync form with personalization whenever edit modal opens
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

  // Live calculation preview
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

  // Custom user lists matching profile1.html
  const [userLists, setUserLists] = useState([
    { id: "favs", title: "My Favorites", count: "2 saved items", tag: "Quick Access" },
    { id: "protein", title: "High Protein Meals", count: "3 recipes", tag: "Daily Prep" },
  ]);

  const handleOpenEdit = () => {
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (isSaving) return; // Prevent rapid double-tap

    const weightNum = parseFloat(editWeight);
    const heightNum = parseFloat(editHeight);
    const ageNum = parseInt(editAge, 10);

    // Validation
    if (isNaN(ageNum) || ageNum <= 0 || ageNum < 14 || ageNum > 100) {
      setFormError("Age must be between 14 and 100 years.");
      return;
    }

    if (isNaN(weightNum) || weightNum <= 0 || weightNum < 30 || weightNum > 300) {
      setFormError("Weight must be between 30 and 300 kg.");
      return;
    }

    if (isNaN(heightNum) || heightNum <= 0 || heightNum < 100 || heightNum > 250) {
      setFormError("Height must be between 100 and 250 cm.");
      return;
    }

    if (editGoal !== "Eat balanced" && editGoal !== "Lose weight" && editGoal !== "Gain muscle") {
      setFormError("Please select a valid fitness goal.");
      return;
    }

    if (editGender !== "Female" && editGender !== "Male") {
      setFormError("Please select either Female or Male.");
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
      setFormError(res.error || "Failed to update profile. Please check your inputs.");
      return;
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(false);
      setEditModalVisible(false);
    }, 700);
  };

  const handleCreateNewList = () => {
    Alert.prompt
      ? Alert.prompt(
          "Create New List",
          "Enter a name for your meal collection:",
          (name) => {
            if (name && name.trim()) {
              setUserLists([
                {
                  id: `list-${Date.now()}`,
                  title: name.trim(),
                  count: "0 items",
                  tag: "Custom",
                },
                ...userLists,
              ]);
            }
          }
        )
      : Alert.alert("Create List", "New meal list 'Quick Snacks' created.", [
          {
            text: "OK",
            onPress: () => {
              setUserLists([
                {
                  id: `list-${Date.now()}`,
                  title: "Quick Snacks",
                  count: "0 items",
                  tag: "Custom",
                },
                ...userLists,
              ]);
            },
          },
        ]);
  };

  const handleResetData = () => {
    Alert.alert(
      "Reset All App Data",
      "Are you sure you want to reset all onboarding and daily tracking data?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: async () => {
            resetMealsMutation.mutate();
            await journalStorage.clearAllJournals();
            await sessionStorage.clearPersonalization();
            useJournalStore.setState({ journals: {} });
            useOnboardingStore.setState({ personalization: DEFAULT_PERSONALIZATION });
            setSettingsVisible(false);
            await logout();
            router.replace("/(auth)/get-started");
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-white">
      {/* Top Header Bar */}
      <View className="px-6 pt-5 pb-3 flex-row justify-between items-center bg-white border-b border-neutral-border-light">
        <AppText weight="black" className="text-2xl text-neutral-dark">
          Profile
        </AppText>

        <View className="flex-row items-center gap-x-2">
          {/* Edit Profile & Goal Button */}
          <TouchableOpacity
            onPress={handleOpenEdit}
            className="w-11 h-11 rounded-full bg-secondary items-center justify-center transition-transform hover:scale-105 active:scale-95"
            accessibilityRole="button"
            accessibilityLabel="Edit personalization preferences"
          >
            <AppText weight="bold" className="text-base text-accent-teal">
              ✎
            </AppText>
          </TouchableOpacity>

          {/* Settings Cog Icon */}
          <TouchableOpacity
            onPress={() => setSettingsVisible(true)}
            className="w-11 h-11 rounded-full bg-secondary items-center justify-center transition-transform hover:scale-105 active:scale-95"
            accessibilityRole="button"
            accessibilityLabel="Account settings"
          >
            <AppText weight="bold" className="text-base text-accent-teal">
              ⚙
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 64 : 112 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-col lg:flex-row lg:gap-8">
          {/* Left Column: Identity Banner & Personal Information */}
          <View className="w-full lg:w-5/12">
            {/* 1. Double-Bezel Editorial Identity Banner */}
            <View className="mb-4">
              <View className="bg-[#f2f8f4] p-1.5 rounded-[26px] border border-[#e5ece7] shadow-xs">
                <View className="bg-white p-5 rounded-[20px] border border-black/[0.04]">
                  <View className="flex-row items-center mb-3.5">
                    <View className="w-16 h-16 rounded-full bg-white items-center justify-center mr-3.5 border-2 border-emerald-500/20 relative shadow-xs">
                      <Avatar name={user?.name || "User"} size={58} showBadge />
                    </View>
                    <View className="flex-1">
                      <AppText weight="black" className="text-xl text-neutral-dark tracking-tight">
                        {user?.name || "User"}
                      </AppText>
                      <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                        {user?.email || "user@betterlife.local"}
                      </AppText>
                    </View>
                  </View>

                  {/* Metric Chips Strip with Tabular Numbers */}
                  <View className="flex-row flex-wrap gap-2 pt-2.5 border-t border-[#f2f8f4]">
                    <View className="bg-[#f2f8f4] border border-[#cbe5d6] px-3 py-1 rounded-full flex-row items-center">
                      <AppText
                        weight="bold"
                        className="text-xs text-emerald-800"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        ⏱ {personalization.targetCalories || 1950} kcal/day
                      </AppText>
                    </View>
                    <View className="bg-[#f2f8f4] border border-[#cbe5d6] px-3 py-1 rounded-full flex-row items-center">
                      <AppText weight="bold" className="text-xs text-emerald-800">
                        🎯 {personalization.goal}
                      </AppText>
                    </View>
                    <View className="bg-[#f2f8f4] border border-[#cbe5d6] px-3 py-1 rounded-full flex-row items-center">
                      <AppText weight="bold" className="text-xs text-emerald-800">
                        🥗 {personalization.dietType}
                      </AppText>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* 2. Personal Information & Nutrition Plan Card */}
            <View>
              <View className="bg-white p-4 rounded-2xl border border-[#e5ece7] mb-4 shadow-sm">
                <View className="flex-row justify-between items-center mb-3 pb-2 border-b border-[#e5ece7]">
                  <View>
                    <AppText weight="black" className="text-base text-neutral-dark">
                      Personal Information
                    </AppText>
                    <AppText weight="medium" className="text-xs text-neutral-muted">
                      Used for daily calorie & nutrition estimates
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={handleOpenEdit}
                    className="px-3.5 py-1.5 bg-[#f2f8f4] rounded-full border border-[#cbe5d6] transition-all hover:bg-secondary active:scale-[0.96]"
                    accessibilityRole="button"
                    accessibilityLabel="Edit personal information"
                  >
                    <AppText weight="bold" className="text-xs text-primary">
                      Edit
                    </AppText>
                  </TouchableOpacity>
                </View>

                {/* Metrics Grid with Tabular Numbers */}
                <View className="flex-row flex-wrap gap-y-3">
                  <View className="w-1/2 pr-2">
                    <AppText weight="bold" className="text-[11px] text-neutral-muted uppercase">
                      Current Weight
                    </AppText>
                    <AppText
                      weight="black"
                      className="text-base text-neutral-dark"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {personalization.weight} kg
                    </AppText>
                  </View>

                  <View className="w-1/2 pl-2">
                    <AppText weight="bold" className="text-[11px] text-neutral-muted uppercase">
                      Height
                    </AppText>
                    <AppText
                      weight="black"
                      className="text-base text-neutral-dark"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {personalization.height} cm
                    </AppText>
                  </View>

                  <View className="w-1/2 pr-2">
                    <AppText weight="bold" className="text-[11px] text-neutral-muted uppercase">
                      Age / Gender
                    </AppText>
                    <AppText
                      weight="black"
                      className="text-base text-neutral-dark"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {userAge} yrs • {personalization.gender}
                    </AppText>
                  </View>

                  <View className="w-1/2 pl-2">
                    <AppText weight="bold" className="text-[11px] text-neutral-muted uppercase">
                      Daily Goal
                    </AppText>
                    <AppText weight="black" className="text-base text-primary">
                      {personalization.goal}
                    </AppText>
                  </View>
                </View>

                {/* Plan pay-off summary strip with Tabular Numbers */}
                <View className="mt-3 pt-3 border-t border-[#e5ece7] flex-row justify-between items-center bg-[#f2f8f4] p-3 rounded-xl border border-[#cbe5d6]/50">
                  <View>
                    <AppText weight="bold" className="text-xs text-neutral-dark">
                      Active Calorie Target:
                    </AppText>
                    <AppText
                      weight="medium"
                      className="text-[11px] text-neutral-muted"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      BMR: {personalization.bmr || "—"} kcal • TDEE: {personalization.tdee || "—"} kcal
                    </AppText>
                  </View>
                  <View className="bg-white border border-[#cbe5d6] px-3 py-1 rounded-lg shadow-2xs">
                    <AppText
                      weight="black"
                      className="text-sm text-primary"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {personalization.targetCalories} kcal
                    </AppText>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Right Column: Tab Bar & Lists/Recipes */}
          <View className="w-full lg:w-7/12">
            {/* 3. Tab Bar: My List vs My Recipes (profile-nav-tabs) */}
            <View>
              <View className="flex-row border-b border-neutral-border-light mb-4">
                <TouchableOpacity
                  onPress={() => setActiveTab("list")}
                  className={`pb-2.5 mr-6 ${
                    activeTab === "list" ? "border-b-2 border-primary" : ""
                  }`}
                  accessibilityRole="tab"
                >
                  <AppText
                    weight={activeTab === "list" ? "black" : "bold"}
                    className={`text-base ${
                      activeTab === "list" ? "text-neutral-dark" : "text-neutral-muted"
                    }`}
                  >
                    My List
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab("recipes")}
                  className={`pb-2.5 ${
                    activeTab === "recipes" ? "border-b-2 border-primary" : ""
                  }`}
                  accessibilityRole="tab"
                >
                  <AppText
                    weight={activeTab === "recipes" ? "black" : "bold"}
                    className={`text-base ${
                      activeTab === "recipes" ? "text-neutral-dark" : "text-neutral-muted"
                    }`}
                  >
                    My Recipes
                  </AppText>
                </TouchableOpacity>
              </View>

              {/* Tab Content: My List */}
              {activeTab === "list" && (
                <View>
                  {/* Create new list button (new-list-card) */}
                  <TouchableOpacity
                    onPress={handleCreateNewList}
                    activeOpacity={0.7}
                    className="p-3.5 mb-3 rounded-2xl border border-dashed border-primary/50 bg-secondary-soft/50 flex-row items-center justify-center shadow-none transition-all hover:bg-secondary-soft"
                    accessibilityRole="button"
                    accessibilityLabel="Create new list"
                  >
                    <AppText weight="bold" className="text-sm text-primary">
                      + Create new list
                    </AppText>
                  </TouchableOpacity>

                  {/* List Cards (recipe-card) */}
                  {userLists.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => Alert.alert(item.title, `Viewing ${item.count}`)}
                      className="bg-white p-3.5 rounded-xl border border-neutral-border-light/80 mb-3 flex-row items-center justify-between shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                    >
                      <View>
                        <AppText weight="black" className="text-base text-neutral-dark">
                          {item.title}
                        </AppText>
                        <AppText weight="semibold" className="text-xs text-neutral-muted mt-0.5">
                          {item.count}
                        </AppText>
                      </View>
                      <Badge label={item.tag} variant="secondary" size="sm" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Tab Content: My Recipes */}
              {activeTab === "recipes" && (
                <View>
                  {MOCK_RECIPES.slice(0, 3).map((recipe) => (
                    <TouchableOpacity
                      key={recipe.id}
                      activeOpacity={0.8}
                      onPress={() => router.push(`/(app)/recipe-detail?id=${recipe.id}`)}
                      className="bg-white p-3.5 rounded-xl border border-neutral-border-light/80 mb-3 flex-row items-center justify-between shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                    >
                      <View className="flex-row items-center flex-1 pr-3">
                        {recipe.imageUrl ? (
                          <Image
                            source={{ uri: recipe.imageUrl }}
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: 12,
                              marginRight: 12,
                              borderWidth: 1,
                              borderColor: "rgba(0,0,0,0.08)",
                            }}
                            resizeMode="cover"
                          />
                        ) : null}
                        <View className="flex-1">
                          <AppText weight="black" className="text-base text-neutral-dark">
                            {recipe.title}
                          </AppText>
                          <AppText
                            weight="semibold"
                            className="text-xs text-neutral-muted mt-0.5"
                            style={{ fontVariant: ["tabular-nums"] }}
                          >
                            {recipe.calories} kcal • {recipe.prepTimeMinutes} min prep
                          </AppText>
                        </View>
                      </View>
                      <Badge label={recipe.category} variant="primary" size="sm" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 4. Edit Profile & Personalization Modal */}
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
              className="bg-black/50"
              onPress={() => !isSaving && setEditModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss modal backdrop"
            />
            <View className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90%] z-10">
              {/* Header */}
              <View className="flex-row justify-between items-center pb-3 border-b border-neutral-border-light mb-4">
                <View className="flex-1 pr-2">
                  <AppText weight="black" className="text-xl text-neutral-dark">
                    Edit Personal Info & Goal
                  </AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted">
                    Updates your personalized calorie & nutrition targets
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={() => !isSaving && setEditModalVisible(false)}
                  disabled={isSaving}
                  className="w-11 h-11 rounded-full bg-neutral-surface items-center justify-center border border-neutral-border"
                  accessibilityRole="button"
                  accessibilityLabel="Close edit modal"
                >
                  <AppText weight="bold" className="text-base text-neutral-muted">
                    ✕
                  </AppText>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Error Message */}
              {formError && (
                <View className="p-3 mb-4 bg-status-error/10 border border-status-error/20 rounded-xl">
                  <AppText weight="semibold" className="text-xs text-status-error text-center">
                    {formError}
                  </AppText>
                </View>
              )}

              {/* Success Feedback Banner */}
              {saveSuccess && (
                <View
                  className="p-3 mb-4 bg-[#daf2e5] border border-primary/30 rounded-xl items-center"
                >
                  <AppText weight="bold" className="text-xs text-primary">
                    ✓ Profile and active calorie targets updated!
                  </AppText>
                </View>
              )}

              {/* Goal Selector */}
              <View className="mb-4">
                <AppText weight="extrabold" className="text-xs text-neutral-dark uppercase tracking-wider mb-2">
                  Health & Fitness Goal
                </AppText>
                <View className="flex-row gap-2">
                  {GOALS.map((g) => {
                    const isSelected = editGoal === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setEditGoal(g)}
                        disabled={isSaving}
                        className={`flex-1 min-h-[44px] py-2 px-1 rounded-xl items-center justify-center border ${
                          isSelected
                            ? "bg-primary border-primary shadow-xs"
                            : "bg-neutral-surface border-neutral-border"
                        }`}
                        accessibilityRole="button"
                      >
                        <AppText
                          weight={isSelected ? "black" : "bold"}
                          className={`text-xs text-center ${isSelected ? "text-white" : "text-neutral-dark"}`}
                        >
                          {g}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Gender Selector */}
              <View className="mb-4">
                <AppText weight="extrabold" className="text-xs text-neutral-dark uppercase tracking-wider mb-2">
                  Gender
                </AppText>
                <View className="flex-row gap-2">
                  {GENDERS.map((g) => {
                    const isSelected = editGender === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setEditGender(g)}
                        disabled={isSaving}
                        className={`flex-1 min-h-[44px] py-2 rounded-xl items-center justify-center border ${
                          isSelected
                            ? "bg-primary border-primary shadow-xs"
                            : "bg-neutral-surface border-neutral-border"
                        }`}
                        accessibilityRole="button"
                      >
                        <AppText
                          weight={isSelected ? "black" : "bold"}
                          className={`text-xs ${isSelected ? "text-white" : "text-neutral-dark"}`}
                        >
                          {g}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Numeric Inputs Row: Weight, Height, Age */}
              <View className="flex-row gap-2 sm:gap-3 mb-4">
                {/* Weight Input */}
                <View className="flex-1">
                  <AppText weight="extrabold" className="text-xs text-neutral-dark uppercase tracking-wider mb-1">
                    Weight (kg)
                  </AppText>
                  <TextInput
                    value={editWeight}
                    onChangeText={setEditWeight}
                    keyboardType="numeric"
                    placeholder="65"
                    editable={!isSaving}
                    className="w-full h-12 bg-neutral-surface border border-neutral-border rounded-xl px-3 text-neutral-dark text-base"
                    style={{ fontFamily: "Akatab-Bold", includeFontPadding: false }}
                  />
                </View>

                {/* Height Input */}
                <View className="flex-1">
                  <AppText weight="extrabold" className="text-xs text-neutral-dark uppercase tracking-wider mb-1">
                    Height (cm)
                  </AppText>
                  <TextInput
                    value={editHeight}
                    onChangeText={setEditHeight}
                    keyboardType="numeric"
                    placeholder="170"
                    editable={!isSaving}
                    className="w-full h-12 bg-neutral-surface border border-neutral-border rounded-xl px-3 text-neutral-dark text-base"
                    style={{ fontFamily: "Akatab-Bold", includeFontPadding: false }}
                  />
                </View>

                {/* Age Input */}
                <View className="flex-1">
                  <AppText weight="extrabold" className="text-xs text-neutral-dark uppercase tracking-wider mb-1">
                    Age (yrs)
                  </AppText>
                  <TextInput
                    value={editAge}
                    onChangeText={setEditAge}
                    keyboardType="numeric"
                    placeholder="25"
                    editable={!isSaving}
                    className="w-full h-12 bg-neutral-surface border border-neutral-border rounded-xl px-3 text-neutral-dark text-base"
                    style={{ fontFamily: "Akatab-Bold", includeFontPadding: false }}
                  />
                </View>
              </View>

              {/* Dynamic Recalculation Preview Banner */}
              <View className="p-3.5 bg-secondary-soft rounded-2xl border border-secondary mb-5">
                <AppText weight="bold" className="text-xs text-neutral-muted uppercase mb-1">
                  Estimated Plan Payoff
                </AppText>
                <View className="flex-row justify-between items-baseline">
                  <View>
                    <AppText weight="black" className="text-2xl text-primary">
                      {previewPlan.targetCalories} kcal
                    </AppText>
                    <AppText weight="medium" className="text-[11px] text-neutral-muted">
                      BMR: {previewPlan.bmr} • TDEE: {previewPlan.tdee}
                    </AppText>
                  </View>
                  <View className="items-end">
                    <AppText weight="bold" className="text-xs text-neutral-dark">
                      P: {previewPlan.targetProteinGrams}g • C: {previewPlan.targetCarbGrams}g • F: {previewPlan.targetFatGrams}g
                    </AppText>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3 pt-1 pb-2">
                <TouchableOpacity
                  onPress={() => setEditModalVisible(false)}
                  disabled={isSaving}
                  className="flex-1 h-12 rounded-xl bg-neutral-surface border border-neutral-border items-center justify-center"
                  accessibilityRole="button"
                >
                  <AppText weight="bold" className="text-sm text-neutral-dark">
                    Cancel
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                  className={`flex-1 h-12 rounded-xl bg-primary items-center justify-center ${
                    isSaving ? "opacity-75" : ""
                  }`}
                  accessibilityRole="button"
                >
                  {isSaving ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <AppText weight="black" className="text-sm text-white">
                      Save Changes
                    </AppText>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 5. Settings & Account Modal (settingsModal in profile1.html) */}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Pressable
            style={StyleSheet.absoluteFill}
            className="bg-black/50"
            onPress={() => setSettingsVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss settings backdrop"
          />
          <View className="w-full max-w-[360px] bg-white rounded-3xl p-6 shadow-xl z-10">
            <View className="flex-row justify-between items-center pb-3 border-b border-neutral-border-light mb-4">
              <AppText weight="black" className="text-xl text-neutral-dark">
                Account Settings
              </AppText>
              <TouchableOpacity
                onPress={() => setSettingsVisible(false)}
                className="w-11 h-11 items-center justify-center rounded-full bg-neutral-surface"
                accessibilityRole="button"
                accessibilityLabel="Close settings modal"
              >
                <AppText weight="bold" className="text-sm text-neutral-muted">
                  ✕
                </AppText>
              </TouchableOpacity>
            </View>

            <View className="gap-y-2">
              <View className="mb-1">
                <AppText weight="bold" className="text-[11px] text-neutral-muted uppercase tracking-wider mb-2">
                  Preferences
                </AppText>
                <TouchableOpacity
                  onPress={() => {
                    setSettingsVisible(false);
                    setEditModalVisible(true);
                  }}
                  className="p-3.5 min-h-[48px] bg-neutral-surface rounded-xl flex-row justify-between items-center mb-2 hover:bg-neutral-border-light transition-colors"
                  accessibilityRole="button"
                  accessibilityLabel="Edit Profile & Goals"
                >
                  <AppText weight="bold" className="text-sm text-neutral-dark">
                    Edit Personal Info & Goal
                  </AppText>
                  <AppText weight="bold" className="text-neutral-muted">›</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setSettingsVisible(false);
                    router.push("/(onboarding)");
                  }}
                  className="p-3.5 min-h-[48px] bg-neutral-surface rounded-xl flex-row justify-between items-center hover:bg-neutral-border-light transition-colors"
                  accessibilityRole="button"
                  accessibilityLabel="Recalculate Calorie Plan"
                >
                  <AppText weight="bold" className="text-sm text-neutral-dark">
                    Re-run Full Onboarding
                  </AppText>
                  <AppText weight="bold" className="text-neutral-muted">›</AppText>
                </TouchableOpacity>
              </View>

              <View className="pt-2 border-t border-neutral-border-light">
                <AppText weight="bold" className="text-[11px] text-neutral-muted uppercase tracking-wider mb-2">
                  Session & Data
                </AppText>
                <TouchableOpacity
                  onPress={async () => {
                    setSettingsVisible(false);
                    await logout();
                    router.replace("/(auth)/get-started");
                  }}
                  className="p-3.5 min-h-[48px] bg-neutral-surface rounded-xl flex-row justify-between items-center mb-2 hover:bg-neutral-border-light transition-colors"
                  accessibilityRole="button"
                  accessibilityLabel="Log out of account"
                >
                  <AppText weight="bold" className="text-sm text-neutral-dark">
                    Log Out
                  </AppText>
                  <AppText weight="bold" className="text-neutral-muted">🚪</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleResetData}
                  className="p-3.5 min-h-[48px] bg-status-error/10 border border-status-error/20 rounded-xl flex-row justify-between items-center hover:bg-status-error/20 transition-colors"
                  accessibilityRole="button"
                  accessibilityLabel="Reset All App Data"
                >
                  <AppText weight="bold" className="text-sm text-status-error">
                    Reset All App Data
                  </AppText>
                  <AppText weight="bold" className="text-status-error">🗑</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
