import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { FadeInView } from "./FadeInView";
import { LineIcon } from "./LineIcon";
import { MixBar, RingButton, PillButton } from "./Surface";
import { Colors } from "@/constants/DesignTokens";
import { MealIllustrations, getMealIllustration } from "@/constants/Assets";
import {
  INGREDIENTS_DATABASE,
  IngredientItem,
  calculateIngredientNutrition,
  calculateRecipeTotalNutrition,
  resolveIngredientByName,
  suggestIngredients,
} from "@/data/ingredientsDatabase";
import { FoodItem } from "@/data/mockRecipes";
import { useCustomRecipesStore } from "@/stores/useCustomRecipesStore";

export interface CreateRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onRecipeCreated?: (recipe: FoodItem) => void;
}

const CATEGORIES: ReadonlyArray<{
  id: FoodItem["category"];
  label: string;
  svgIcon: FoodItem["svgIcon"];
  image: any;
}> = [
  { id: "Breakfast", label: "Sarapan", svgIcon: "Breakfast", image: MealIllustrations.Breakfast },
  { id: "Lunch", label: "Makan Siang", svgIcon: "Lunch", image: MealIllustrations.Lunch },
  { id: "Dinner", label: "Makan Malam", svgIcon: "Dinner", image: MealIllustrations.Dinner },
  { id: "Snack", label: "Camilan", svgIcon: "Snacks", image: MealIllustrations.Snacks },
  { id: "Drink", label: "Minuman", svgIcon: "Drinks", image: MealIllustrations.Drinks },
];

const DIFFICULTIES: ReadonlyArray<{ id: FoodItem["difficulty"]; label: string }> = [
  { id: "Easy", label: "Mudah" },
  { id: "Medium", label: "Sedang" },
  { id: "Hard", label: "Sulit" },
];

const MACRO = Colors.macros;
const tnum = { fontVariant: ["tabular-nums" as const] };

export const CreateRecipeModal: React.FC<CreateRecipeModalProps> = ({
  visible,
  onClose,
  onRecipeCreated,
}) => {
  const addCustomRecipe = useCustomRecipesStore((state) => state.addCustomRecipe);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<FoodItem["category"]>("Lunch");
  const [prepTime, setPrepTime] = useState("15");
  const [difficulty, setDifficulty] = useState<FoodItem["difficulty"]>("Easy");
  const [servings, setServings] = useState(1);

  // Ingredient input fields (user simply types ingredient name & grams)
  const [ingNameInput, setIngNameInput] = useState("");
  const [ingGramsInput, setIngGramsInput] = useState("100");

  const [selectedIngredients, setSelectedIngredients] = useState<
    Array<{ ingredient: IngredientItem; grams: number }>
  >([]);

  const [steps, setSteps] = useState<string[]>([
    "Siapkan dan cuci bersih seluruh bahan sesuai takaran.",
    "Masak bahan utama hingga matang merata dan sajikan hangat.",
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setErrorMsg(null);
      if (selectedIngredients.length === 0) {
        const chicken = INGREDIENTS_DATABASE.find((i) => i.id === "ing-dada-ayam");
        const rice = INGREDIENTS_DATABASE.find((i) => i.id === "ing-nasi-merah");
        const broccoli = INGREDIENTS_DATABASE.find((i) => i.id === "ing-brokoli");
        const starter: Array<{ ingredient: IngredientItem; grams: number }> = [];
        if (chicken) starter.push({ ingredient: chicken, grams: 120 });
        if (rice) starter.push({ ingredient: rice, grams: 120 });
        if (broccoli) starter.push({ ingredient: broccoli, grams: 80 });
        setSelectedIngredients(starter);
      }
    }
  }, [visible]);

  // Inline suggestions from the background database as user types an ingredient name
  const inlineSuggestions = useMemo(
    () => suggestIngredients(ingNameInput, 4),
    [ingNameInput]
  );

  // Live preview of the currently typed ingredient before adding
  const liveTypedPreview = useMemo(() => {
    const clean = ingNameInput.trim();
    if (!clean) return null;
    const { ingredient } = resolveIngredientByName(clean);
    const g = Math.max(1, parseInt(ingGramsInput, 10) || ingredient.defaultServingGrams);
    const calc = calculateIngredientNutrition(ingredient, g);
    return { ingredient, grams: g, calc };
  }, [ingNameInput, ingGramsInput]);

  const calculatedTotal = useMemo(
    () => calculateRecipeTotalNutrition(selectedIngredients, servings),
    [selectedIngredients, servings]
  );

  const handleAddTypedIngredient = (presetItem?: IngredientItem) => {
    setErrorMsg(null);
    if (presetItem) {
      const g = Math.max(5, parseInt(ingGramsInput, 10) || presetItem.defaultServingGrams);
      setSelectedIngredients((prev) => [
        ...prev,
        {
          ingredient: {
            ...presetItem,
            id: `${presetItem.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          },
          grams: g,
        },
      ]);
      setIngNameInput("");
      setIngGramsInput("100");
      return;
    }

    const clean = ingNameInput.trim();
    if (!clean) {
      setErrorMsg("Ketik nama bahan makanan terlebih dahulu.");
      return;
    }

    const { ingredient } = resolveIngredientByName(clean);
    const g = Math.max(5, parseInt(ingGramsInput, 10) || ingredient.defaultServingGrams);

    setSelectedIngredients((prev) => [...prev, { ingredient, grams: g }]);
    setIngNameInput("");
    setIngGramsInput("100");
  };

  const handleAdjustGrams = (id: string, delta: number) => {
    setSelectedIngredients((prev) =>
      prev
        .map((item) =>
          item.ingredient.id === id
            ? { ...item, grams: Math.max(0, item.grams + delta) }
            : item
        )
        .filter((item) => item.grams > 0)
    );
  };

  const handleSetGramsText = (id: string, text: string) => {
    const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
    setSelectedIngredients((prev) =>
      prev.map((item) =>
        item.ingredient.id === id
          ? { ...item, grams: isNaN(num) ? 0 : Math.min(2000, num) }
          : item
      )
    );
  };

  const handleRemoveIngredient = (id: string) => {
    setSelectedIngredients((prev) => prev.filter((item) => item.ingredient.id !== id));
  };

  const handleUpdateStep = (idx: number, text: string) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? text : s)));
  };

  const handleAddStep = () => {
    setSteps((prev) => [...prev, ""]);
  };

  const handleRemoveStep = (idx: number) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveRecipe = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMsg("Masukkan nama resep terlebih dahulu.");
      return;
    }
    const validIngredients = selectedIngredients.filter((i) => i.grams > 0);
    if (validIngredients.length === 0) {
      setErrorMsg("Tambahkan minimal 1 bahan makanan pada resep.");
      return;
    }

    const catMeta = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[1];
    const validSteps = steps.map((s) => s.trim()).filter(Boolean);
    const autoDescription = `Resep sehat berbahan ${validIngredients
      .slice(0, 3)
      .map((i) => i.ingredient.name.split("(")[0].trim())
      .join(", ")} dengan nutrisi terukur.`;

    const newRecipe: FoodItem = {
      id: `custom-recipe-${Date.now()}`,
      title: cleanTitle,
      category,
      calories: Math.max(10, calculatedTotal.calories),
      prepTimeMinutes: Math.max(1, parseInt(prepTime, 10) || 15),
      difficulty,
      description: autoDescription,
      svgIcon: catMeta.svgIcon,
      estimatedCostIdr: calculatedTotal.estimatedCostIdr,
      nutrition: {
        proteinGrams: calculatedTotal.proteinGrams,
        carbsGrams: calculatedTotal.carbsGrams,
        fatGrams: calculatedTotal.fatGrams,
        fiberGrams: calculatedTotal.fiberGrams,
      },
      ingredients: validIngredients.map(({ ingredient, grams }) => {
        const calc = calculateIngredientNutrition(ingredient, grams);
        return {
          name: `${ingredient.name} (${calc.calories} kcal · P ${calc.proteinGrams}g)`,
          amount: `${Math.round(grams / Math.max(1, servings))} g`,
        };
      }),
      instructions:
        validSteps.length > 0
          ? validSteps.map((text, idx) => ({ step: idx + 1, text }))
          : [{ step: 1, text: "Siapkan bahan dan masak sesuai selera." }],
      dietaryTags: ["Resep Saya", ...calculatedTotal.dietaryTags.slice(0, 3)],
      allergens: calculatedTotal.allergens,
    };

    await addCustomRecipe(newRecipe);
    setTitle("");
    onRecipeCreated?.(newRecipe);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end sm:justify-center items-center p-0 sm:p-4">
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(17, 24, 20, 0.52)" }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Tutup modal buat resep"
          />

          <FadeInView
            duration={240}
            translateY={18}
            className="w-full max-w-[540px] max-h-[90%] bg-card rounded-t-[28px] sm:rounded-[28px] border border-line overflow-hidden z-10"
          >
            {/* Mobile Grab Handle */}
            <View className="items-center pt-2.5 pb-1 sm:hidden">
              <View className="w-10 h-1 rounded-full bg-line-2" />
            </View>

            {/* Clean Header */}
            <View className="flex-row items-center justify-between px-5 pt-3 pb-3.5 border-b border-line">
              <View className="flex-1 min-w-0 pr-3">
                <AppText
                  weight="semibold"
                  className="text-[19px] text-ink"
                  style={{ letterSpacing: -0.4 }}
                >
                  Tambah Resep Baru
                </AppText>
                <AppText weight="medium" className="text-[12px] text-muted mt-0.5">
                  Ketik nama bahan, kalori & nutrisi dihitung otomatis
                </AppText>
              </View>
              <RingButton icon="close" onPress={onClose} accessibilityLabel="Tutup" />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 18, paddingBottom: 26 }}
            >
              {errorMsg && (
                <View className="p-3 mb-4 rounded-2xl bg-bad-soft border border-bad/20">
                  <AppText weight="semibold" className="text-[12.5px] text-bad text-center">
                    {errorMsg}
                  </AppText>
                </View>
              )}

              {/* Live Nutrition & Calorie Summary Card */}
              <View className="bg-card-2 rounded-[20px] p-3.5 border border-line mb-4">
                <View className="flex-row items-center justify-between mb-2.5">
                  <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                    <View className="w-9 h-9 rounded-[11px] overflow-hidden bg-card border border-line flex-shrink-0">
                      <Image
                        source={getMealIllustration(category)}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </View>
                    <View className="flex-1 min-w-0">
                      <AppText weight="semibold" className="text-[13.5px] text-ink">
                        Total Nutrisi per Porsi
                      </AppText>
                      <AppText weight="medium" className="text-[11.5px] text-muted" style={tnum}>
                        {selectedIngredients.length} bahan · {servings} porsi
                      </AppText>
                    </View>
                  </View>

                  <View className="items-end flex-shrink-0">
                    <AppText
                      weight="bold"
                      className="text-[22px] text-primary-text"
                      style={[tnum, { letterSpacing: -0.5, lineHeight: 24 }]}
                    >
                      {calculatedTotal.calories}
                    </AppText>
                    <AppText weight="semibold" className="text-[10.5px] text-muted">
                      kcal / porsi
                    </AppText>
                  </View>
                </View>

                <MixBar
                  height={7}
                  accessibilityLabel="Proporsi makronutrisi resep"
                  segments={[
                    { key: "p", value: Math.max(1, calculatedTotal.proteinGrams), color: MACRO.protein },
                    { key: "c", value: Math.max(1, calculatedTotal.carbsGrams), color: MACRO.carbs },
                    { key: "f", value: Math.max(1, calculatedTotal.fatGrams), color: MACRO.fat },
                    { key: "fib", value: Math.max(1, calculatedTotal.fiberGrams), color: MACRO.fiber },
                  ]}
                />

                <View className="flex-row items-center justify-between mt-2.5 pt-2 border-t border-line">
                  {[
                    { label: "Protein", val: `${calculatedTotal.proteinGrams}g`, color: MACRO.protein },
                    { label: "Karbo", val: `${calculatedTotal.carbsGrams}g`, color: MACRO.carbs },
                    { label: "Lemak", val: `${calculatedTotal.fatGrams}g`, color: MACRO.fat },
                    { label: "Serat", val: `${calculatedTotal.fiberGrams}g`, color: MACRO.fiber },
                  ].map((m) => (
                    <View key={m.label} className="flex-row items-center gap-1">
                      <View className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                      <AppText weight="medium" className="text-[11px] text-muted">
                        {m.label}{" "}
                        <AppText weight="bold" className="text-ink" style={tnum}>
                          {m.val}
                        </AppText>
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>

              {/* 1. Nama Resep */}
              <View className="mb-3.5">
                <AppText weight="semibold" className="text-[12.5px] text-muted mb-1.5">
                  Nama Resep
                </AppText>
                <TextInput
                  value={title}
                  onChangeText={(t) => {
                    setTitle(t);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Misal: Tumis Dada Ayam Brokoli"
                  placeholderTextColor="#8a948e"
                  className="w-full h-11 bg-card-2 border border-line rounded-[14px] px-3.5 text-ink text-[14px]"
                  style={{ fontFamily: "Urbanist-SemiBold", includeFontPadding: false }}
                />
              </View>

              {/* 2. Kategori & Parameter Resep */}
              <View className="mb-3.5">
                <AppText weight="semibold" className="text-[12.5px] text-muted mb-1.5">
                  Waktu Makan
                </AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 7 }}
                >
                  {CATEGORIES.map((cat) => {
                    const active = category === cat.id;
                    return (
                      <PressableScale
                        key={cat.id}
                        onPress={() => setCategory(cat.id)}
                        pressedScale={0.96}
                        className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                          active ? "bg-block-ink border-block-ink" : "bg-card-2 border-line"
                        }`}
                      >
                        <View className="w-5 h-5 rounded-full overflow-hidden bg-card">
                          <Image
                            source={cat.image}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />
                        </View>
                        <AppText
                          weight="semibold"
                          className={`text-[12px] ${active ? "text-white" : "text-ink"}`}
                        >
                          {cat.label}
                        </AppText>
                      </PressableScale>
                    );
                  })}
                </ScrollView>
              </View>

              <View className="flex-row gap-2 mb-4">
                <View className="flex-1">
                  <AppText weight="semibold" className="text-[11.5px] text-muted mb-1">
                    Waktu (mnt)
                  </AppText>
                  <TextInput
                    value={prepTime}
                    onChangeText={setPrepTime}
                    keyboardType="numeric"
                    placeholder="15"
                    className="h-10 bg-card-2 border border-line rounded-[12px] px-2.5 text-ink text-[13.5px] text-center"
                    style={{ fontFamily: "Urbanist-Bold", includeFontPadding: false }}
                  />
                </View>

                <View className="flex-1">
                  <AppText weight="semibold" className="text-[11.5px] text-muted mb-1">
                    Porsi
                  </AppText>
                  <View className="h-10 bg-card-2 border border-line rounded-[12px] flex-row items-center justify-between px-1.5">
                    <PressableScale
                      onPress={() => setServings((s) => Math.max(1, s - 1))}
                      pressedScale={0.9}
                      className="w-6 h-6 rounded-full bg-card items-center justify-center border border-line"
                    >
                      <LineIcon name="minus" size={11} color="#121a16" />
                    </PressableScale>
                    <AppText weight="bold" className="text-[13px] text-ink" style={tnum}>
                      {servings}x
                    </AppText>
                    <PressableScale
                      onPress={() => setServings((s) => Math.min(10, s + 1))}
                      pressedScale={0.9}
                      className="w-6 h-6 rounded-full bg-card items-center justify-center border border-line"
                    >
                      <LineIcon name="plus" size={11} color="#121a16" />
                    </PressableScale>
                  </View>
                </View>

                <View className="flex-[1.5]">
                  <AppText weight="semibold" className="text-[11.5px] text-muted mb-1">
                    Kesulitan
                  </AppText>
                  <View className="h-10 bg-card-2 border border-line rounded-[12px] flex-row p-1 gap-0.5">
                    {DIFFICULTIES.map((d) => {
                      const active = difficulty === d.id;
                      return (
                        <PressableScale
                          key={d.id}
                          onPress={() => setDifficulty(d.id)}
                          pressedScale={0.95}
                          className={`flex-1 rounded-[8px] items-center justify-center ${
                            active ? "bg-block-ink" : ""
                          }`}
                        >
                          <AppText
                            weight="semibold"
                            className={`text-[11px] ${active ? "text-white" : "text-muted"}`}
                          >
                            {d.label}
                          </AppText>
                        </PressableScale>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* 3. Tambah Bahan Makanan (Ketik Nama Bahan -> Kalori & Nutrisi Otomatis) */}
              <View className="mb-4">
                <AppText weight="semibold" className="text-[13px] text-ink mb-1.5">
                  Bahan Makanan ({selectedIngredients.length})
                </AppText>

                {/* Clean Single-Line Input: Nama Bahan + Gram + Tombol Tambah */}
                <View className="flex-row items-center gap-2">
                  <View className="flex-1 h-11 bg-card-2 border border-line rounded-[13px] px-3 justify-center">
                    <TextInput
                      value={ingNameInput}
                      onChangeText={(t) => {
                        setIngNameInput(t);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      onSubmitEditing={() => handleAddTypedIngredient()}
                      placeholder="Ketik bahan (mis. Dada ayam, Telur, Tempe)"
                      placeholderTextColor="#8a948e"
                      className="text-[13px] text-ink"
                      style={{ fontFamily: "Urbanist-Medium", includeFontPadding: false, padding: 0 }}
                    />
                  </View>

                  <View className="w-[74px] h-11 bg-card-2 border border-line rounded-[13px] px-2 flex-row items-center justify-center">
                    <TextInput
                      value={ingGramsInput}
                      onChangeText={(t) => setIngGramsInput(t.replace(/[^0-9]/g, ""))}
                      keyboardType="numeric"
                      placeholder="100"
                      placeholderTextColor="#8a948e"
                      className="flex-1 text-center text-[13px] text-ink"
                      style={{ fontFamily: "Urbanist-Bold", includeFontPadding: false, padding: 0 }}
                    />
                    <AppText weight="semibold" className="text-[11px] text-muted">
                      g
                    </AppText>
                  </View>

                  <PressableScale
                    onPress={() => handleAddTypedIngredient()}
                    pressedScale={0.95}
                    className="h-11 px-3.5 rounded-[13px] bg-primary flex-row items-center justify-center gap-1"
                    accessibilityRole="button"
                    accessibilityLabel="Tambah bahan"
                  >
                    <LineIcon name="plus" size={14} color="#ffffff" strokeWidth={2.3} />
                    <AppText weight="bold" className="text-[12.5px] text-white">
                      Tambah
                    </AppText>
                  </PressableScale>
                </View>

                {/* Live Auto-Detected Nutrition Preview & Inline Suggestions */}
                {liveTypedPreview && (
                  <View className="mt-2 bg-primary-light/60 border border-primary/20 rounded-[12px] px-3 py-2">
                    <View className="flex-row items-center justify-between flex-wrap gap-1">
                      <AppText weight="semibold" className="text-[11.5px] text-primary-text">
                        Otomatis ({liveTypedPreview.grams}g):{" "}
                        <AppText weight="bold" style={tnum}>
                          {liveTypedPreview.calc.calories} kcal
                        </AppText>
                      </AppText>
                      <AppText weight="medium" className="text-[11px] text-ink-2" style={tnum}>
                        P {liveTypedPreview.calc.proteinGrams}g · K {liveTypedPreview.calc.carbsGrams}g · L{" "}
                        {liveTypedPreview.calc.fatGrams}g · Serat {liveTypedPreview.calc.fiberGrams}g
                      </AppText>
                    </View>

                    {inlineSuggestions.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 6, marginTop: 6 }}
                        keyboardShouldPersistTaps="handled"
                      >
                        {inlineSuggestions.map((sug) => (
                          <PressableScale
                            key={sug.id}
                            onPress={() => handleAddTypedIngredient(sug)}
                            pressedScale={0.96}
                            className="px-2.5 py-1 rounded-full bg-card border border-line flex-row items-center gap-1"
                          >
                            <LineIcon name="plus" size={10} color="#0e7a52" />
                            <AppText weight="semibold" className="text-[11px] text-ink">
                              {sug.name.split("(")[0].trim()}
                            </AppText>
                            <AppText weight="medium" className="text-[10px] text-muted" style={tnum}>
                              ({sug.per100g.calories} kcal/100g)
                            </AppText>
                          </PressableScale>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}

                {/* Added Ingredients List */}
                <View className="gap-2 mt-2.5">
                  {selectedIngredients.map(({ ingredient, grams }) => {
                    const calc = calculateIngredientNutrition(ingredient, grams);
                    return (
                      <View
                        key={ingredient.id}
                        className="bg-card-2 border border-line rounded-[14px] px-3 py-2.5 flex-row items-center justify-between gap-2"
                      >
                        <View className="flex-1 min-w-0">
                          <AppText weight="semibold" numberOfLines={1} className="text-[13px] text-ink">
                            {ingredient.name}
                          </AppText>
                          <AppText
                            weight="medium"
                            className="text-[11px] text-muted mt-0.5"
                            style={tnum}
                          >
                            <AppText weight="bold" className="text-primary-text">
                              {calc.calories} kcal
                            </AppText>{" "}
                            · P {calc.proteinGrams}g · K {calc.carbsGrams}g · L {calc.fatGrams}g
                          </AppText>
                        </View>

                        <View className="flex-row items-center gap-1.5 flex-shrink-0">
                          <PressableScale
                            onPress={() => handleAdjustGrams(ingredient.id, -20)}
                            pressedScale={0.9}
                            className="w-6 h-6 rounded-full bg-card border border-line items-center justify-center"
                          >
                            <LineIcon name="minus" size={11} color="#121a16" />
                          </PressableScale>

                          <View className="flex-row items-center bg-card border border-line rounded-[9px] px-1.5 h-7">
                            <TextInput
                              value={String(grams)}
                              onChangeText={(t) => handleSetGramsText(ingredient.id, t)}
                              keyboardType="numeric"
                              className="w-10 text-center text-[12px] text-ink"
                              style={{ fontFamily: "Urbanist-Bold", includeFontPadding: false, padding: 0 }}
                            />
                            <AppText weight="semibold" className="text-[10.5px] text-muted">
                              g
                            </AppText>
                          </View>

                          <PressableScale
                            onPress={() => handleAdjustGrams(ingredient.id, 20)}
                            pressedScale={0.9}
                            className="w-6 h-6 rounded-full bg-card border border-line items-center justify-center"
                          >
                            <LineIcon name="plus" size={11} color="#121a16" />
                          </PressableScale>

                          <PressableScale
                            onPress={() => handleRemoveIngredient(ingredient.id)}
                            pressedScale={0.9}
                            className="w-6 h-6 rounded-full items-center justify-center"
                          >
                            <LineIcon name="close" size={13} color="#8a948e" />
                          </PressableScale>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* 4. Langkah Memasak */}
              <View className="mb-5">
                <View className="flex-row items-center justify-between mb-2">
                  <AppText weight="semibold" className="text-[13px] text-ink">
                    Langkah Memasak
                  </AppText>
                  <PressableScale
                    onPress={handleAddStep}
                    className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-card-2 border border-line"
                  >
                    <LineIcon name="plus" size={11} color="#0e7a52" />
                    <AppText weight="semibold" className="text-[11px] text-primary-text">
                      Tambah langkah
                    </AppText>
                  </PressableScale>
                </View>

                <View className="gap-2">
                  {steps.map((stepText, idx) => (
                    <View key={idx} className="flex-row items-center gap-2">
                      <View className="w-6 h-6 rounded-full bg-primary items-center justify-center flex-shrink-0">
                        <AppText weight="bold" className="text-[11px] text-white" style={tnum}>
                          {idx + 1}
                        </AppText>
                      </View>
                      <TextInput
                        value={stepText}
                        onChangeText={(t) => handleUpdateStep(idx, t)}
                        placeholder={`Langkah ke-${idx + 1}...`}
                        placeholderTextColor="#8a948e"
                        className="flex-1 min-h-[40px] bg-card-2 border border-line rounded-[12px] px-3 py-2 text-[12.5px] text-ink"
                        style={{ fontFamily: "Urbanist-Medium", includeFontPadding: false }}
                      />
                      {steps.length > 1 && (
                        <PressableScale
                          onPress={() => handleRemoveStep(idx)}
                          className="w-6 h-6 rounded-full items-center justify-center"
                        >
                          <LineIcon name="close" size={13} color="#8a948e" />
                        </PressableScale>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* Save Action */}
              <View className="flex-row gap-2.5">
                <PillButton label="Batal" onPress={onClose} className="flex-1" />
                <PillButton
                  label={`Simpan Resep · ${calculatedTotal.calories} kcal`}
                  variant="primary"
                  icon="check"
                  onPress={handleSaveRecipe}
                  className="flex-[1.8]"
                />
              </View>
            </ScrollView>
          </FadeInView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
