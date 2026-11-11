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
  ActivityIndicator,
} from "react-native";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { FadeInView } from "./FadeInView";
import { LineIcon } from "./LineIcon";
import { MixBar, RingButton, PillButton } from "./Surface";
import { Colors } from "@/constants/DesignTokens";
import { MealIllustrations, getMealIllustration } from "@/constants/Assets";
import {
  pickImageFromGallery,
  takePhotoWithCamera,
  isLocalUploadedUri,
} from "@/lib/imagePicker";
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

/** Curated food photography options for quick 1-tap selection on Web & Mobile */
const PHOTO_PRESETS: ReadonlyArray<{ id: string; label: string; url: string }> = [
  {
    id: "photo-chicken-bowl",
    label: "Ayam & Sayur",
    url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "photo-salmon",
    label: "Ikan & Grill",
    url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "photo-oat-berry",
    label: "Oat & Buah",
    url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "photo-avocado-egg",
    label: "Toast & Telur",
    url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "photo-soup",
    label: "Sup Hangat",
    url: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "photo-smoothie",
    label: "Minuman",
    url: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80",
  },
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

  // Image / Photo state
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageSourceKind, setImageSourceKind] = useState<
    "default" | "gallery" | "camera" | "preset" | "url"
  >("default");
  const [urlDraft, setUrlDraft] = useState<string>("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);

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

  const inlineSuggestions = useMemo(
    () => suggestIngredients(ingNameInput, 4),
    [ingNameInput]
  );

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

  const handlePickGalleryPhoto = async () => {
    if (isPickingPhoto) return;
    setErrorMsg(null);
    setIsPickingPhoto(true);
    try {
      const res = await pickImageFromGallery();
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
      if (!res.canceled && res.uri) {
        setImageUrl(res.uri);
        setImageSourceKind("gallery");
        setUrlDraft("");
        setShowUrlInput(false);
      }
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const handleTakeCameraPhoto = async () => {
    if (isPickingPhoto) return;
    setErrorMsg(null);
    setIsPickingPhoto(true);
    try {
      const res = await takePhotoWithCamera();
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
      if (!res.canceled && res.uri) {
        setImageUrl(res.uri);
        setImageSourceKind("camera");
        setUrlDraft("");
        setShowUrlInput(false);
      }
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const handleUrlDraftChange = (text: string) => {
    setUrlDraft(text);
    const trimmed = text.trim();
    if (trimmed) {
      setImageUrl(trimmed);
      setImageSourceKind("url");
    } else if (imageSourceKind === "url") {
      setImageUrl("");
      setImageSourceKind("default");
    }
  };

  const handleSelectPreset = (presetUrl: string) => {
    setImageUrl(presetUrl);
    setImageSourceKind("preset");
    setUrlDraft("");
    setShowUrlInput(false);
  };

  const handleResetPhoto = () => {
    setImageUrl("");
    setImageSourceKind("default");
    setUrlDraft("");
  };

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
      setErrorMsg("Tambahkan minimal 1 bahan makanan.");
      return;
    }

    const catMeta = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[1];
    const validSteps = steps.map((s) => s.trim()).filter(Boolean);
    const autoDescription = `Resep sehat berbahan ${validIngredients
      .slice(0, 3)
      .map((i) => i.ingredient.name.split("(")[0].trim())
      .join(", ")}.`;

    const newRecipe: FoodItem = {
      id: `custom-recipe-${Date.now()}`,
      title: cleanTitle,
      category,
      calories: Math.max(10, calculatedTotal.calories),
      prepTimeMinutes: Math.max(1, parseInt(prepTime, 10) || 15),
      difficulty,
      description: autoDescription,
      svgIcon: catMeta.svgIcon,
      imageUrl: imageUrl.trim() ? imageUrl.trim() : undefined,
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
    handleResetPhoto();
    setShowUrlInput(false);
    onRecipeCreated?.(newRecipe);
    onClose();
  };

  if (!visible) return null;

  const previewImageSource = imageUrl.trim()
    ? { uri: imageUrl.trim() }
    : getMealIllustration(category);

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
            accessibilityLabel="Tutup"
          />

          <FadeInView
            duration={240}
            translateY={18}
            className="w-full max-w-[520px] max-h-[90%] bg-card rounded-t-[28px] sm:rounded-[28px] border border-line overflow-hidden z-10"
          >
            {/* Mobile Grab Handle */}
            <View className="items-center pt-2.5 pb-1 sm:hidden">
              <View className="w-10 h-1 rounded-full bg-line-2" />
            </View>

            {/* Minimalist Header */}
            <View className="flex-row items-center justify-between px-5 pt-2.5 pb-3 border-b border-line">
              <AppText
                weight="semibold"
                className="text-[19px] text-ink"
                style={{ letterSpacing: -0.4 }}
              >
                Tambah Resep
              </AppText>
              <RingButton icon="close" onPress={onClose} accessibilityLabel="Tutup" />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 18, paddingBottom: 24 }}
            >
              {errorMsg && (
                <View className="p-3 mb-4 rounded-2xl bg-bad-soft border border-bad/20">
                  <AppText weight="semibold" className="text-[12.5px] text-bad text-center">
                    {errorMsg}
                  </AppText>
                </View>
              )}

              {/* 1. Foto / Gambar Resep + Ringkasan Nutrisi */}
              <View className="rounded-[20px] overflow-hidden border border-line bg-card-2 mb-4">
                <View className="w-full h-[148px] bg-card relative overflow-hidden">
                  <Image
                    source={previewImageSource}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />

                  {/* Calorie Badge on Image */}
                  <View
                    className="absolute top-3 left-3 px-3 py-1 rounded-full"
                    style={{ backgroundColor: "rgba(18, 26, 22, 0.82)" }}
                  >
                    <AppText weight="bold" className="text-[13px] text-white" style={tnum}>
                      {calculatedTotal.calories} kcal
                    </AppText>
                  </View>

                  {/* Active Photo Source Badge + Clear */}
                  {Boolean(imageUrl) && (
                    <View className="absolute top-3 right-3 flex-row items-center gap-1.5">
                      <View
                        className="px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: "rgba(14, 122, 82, 0.9)" }}
                      >
                        <AppText weight="semibold" className="text-[11px] text-white">
                          {imageSourceKind === "gallery"
                            ? "Dari Galeri"
                            : imageSourceKind === "camera"
                            ? "Foto Kamera"
                            : imageSourceKind === "url"
                            ? "Link URL"
                            : "Foto Pilihan"}
                        </AppText>
                      </View>
                      <PressableScale
                        onPress={handleResetPhoto}
                        pressedScale={0.94}
                        className="w-7 h-7 rounded-full items-center justify-center"
                        style={{ backgroundColor: "rgba(18, 26, 22, 0.78)" }}
                        accessibilityRole="button"
                        accessibilityLabel="Hapus foto resep"
                      >
                        <LineIcon name="close" size={13} color="#ffffff" />
                      </PressableScale>
                    </View>
                  )}

                  {/* Loading indicator while picking/processing photo */}
                  {isPickingPhoto && (
                    <View
                      className="absolute inset-0 items-center justify-center flex-row gap-2"
                      style={{ backgroundColor: "rgba(18, 26, 22, 0.52)" }}
                    >
                      <ActivityIndicator size="small" color="#ffffff" />
                      <AppText weight="semibold" className="text-[12.5px] text-white">
                        Memuat foto...
                      </AppText>
                    </View>
                  )}
                </View>

                {/* Photo Source Controls (Gallery, Camera, URL) + Thumbnail Strip */}
                <View className="px-3 pt-2.5 pb-2.5 border-b border-line bg-card">
                  <View className="flex-row items-center gap-2 mb-2.5">
                    <PressableScale
                      onPress={handlePickGalleryPhoto}
                      disabled={isPickingPhoto}
                      pressedScale={0.96}
                      className={`flex-1 h-9 px-3 rounded-full flex-row items-center justify-center gap-1.5 border ${
                        imageSourceKind === "gallery"
                          ? "bg-primary border-primary"
                          : "bg-primary-light border-primary/20"
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel="Unggah foto dari galeri"
                    >
                      <LineIcon
                        name="image"
                        size={14}
                        color={imageSourceKind === "gallery" ? "#ffffff" : "#0e7a52"}
                      />
                      <AppText
                        weight="bold"
                        numberOfLines={1}
                        className={`text-[12px] ${
                          imageSourceKind === "gallery" ? "text-white" : "text-primary-text"
                        }`}
                      >
                        Unggah Galeri
                      </AppText>
                    </PressableScale>

                    <PressableScale
                      onPress={handleTakeCameraPhoto}
                      disabled={isPickingPhoto}
                      pressedScale={0.96}
                      className={`h-9 px-3 rounded-full flex-row items-center justify-center gap-1.5 border ${
                        imageSourceKind === "camera"
                          ? "bg-block-ink border-block-ink"
                          : "bg-card-2 border-line"
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel="Ambil foto dengan kamera"
                    >
                      <LineIcon
                        name="camera"
                        size={14}
                        color={imageSourceKind === "camera" ? "#ffffff" : "#121a16"}
                      />
                      <AppText
                        weight="semibold"
                        className={`text-[12px] ${
                          imageSourceKind === "camera" ? "text-block-on-ink" : "text-ink"
                        }`}
                      >
                        Kamera
                      </AppText>
                    </PressableScale>

                    <PressableScale
                      onPress={() => setShowUrlInput((v) => !v)}
                      pressedScale={0.96}
                      className={`h-9 px-3 rounded-full flex-row items-center justify-center gap-1.5 border ${
                        showUrlInput || imageSourceKind === "url"
                          ? "bg-block-ink border-block-ink"
                          : "bg-card-2 border-line"
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel="Tambahkan lewat link URL gambar"
                    >
                      <LineIcon
                        name="edit"
                        size={13}
                        color={showUrlInput || imageSourceKind === "url" ? "#ffffff" : "#121a16"}
                      />
                      <AppText
                        weight="semibold"
                        className={`text-[12px] ${
                          showUrlInput || imageSourceKind === "url" ? "text-block-on-ink" : "text-ink"
                        }`}
                      >
                        URL
                      </AppText>
                    </PressableScale>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, alignItems: "center" }}
                  >
                    {isLocalUploadedUri(imageUrl) && (
                      <PressableScale
                        onPress={handlePickGalleryPhoto}
                        pressedScale={0.95}
                        className="w-12 h-10 rounded-[10px] overflow-hidden border-2 border-primary"
                        accessibilityRole="button"
                        accessibilityLabel="Foto yang diunggah"
                      >
                        <Image
                          source={{ uri: imageUrl }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      </PressableScale>
                    )}

                    <PressableScale
                      onPress={handleResetPhoto}
                      pressedScale={0.95}
                      className={`w-12 h-10 rounded-[10px] overflow-hidden border-2 ${
                        !imageUrl ? "border-primary" : "border-line"
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel="Gunakan ilustrasi bawaan kategori"
                    >
                      <Image
                        source={getMealIllustration(category)}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </PressableScale>

                    {PHOTO_PRESETS.map((p) => {
                      const selected = imageUrl === p.url;
                      return (
                        <PressableScale
                          key={p.id}
                          onPress={() => handleSelectPreset(p.url)}
                          pressedScale={0.95}
                          className={`w-12 h-10 rounded-[10px] overflow-hidden border-2 ${
                            selected ? "border-primary" : "border-line"
                          }`}
                        >
                          <Image
                            source={{ uri: p.url }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />
                        </PressableScale>
                      );
                    })}
                  </ScrollView>

                  {showUrlInput && (
                    <View className="mt-2.5 flex-row items-center gap-1.5">
                      <TextInput
                        value={urlDraft}
                        onChangeText={handleUrlDraftChange}
                        placeholder="Tempel link gambar (https://...)"
                        placeholderTextColor="#8a948e"
                        autoCapitalize="none"
                        autoCorrect={false}
                        className="flex-1 h-9 bg-card-2 border border-line rounded-[10px] px-3 text-[12.5px] text-ink"
                        style={{ fontFamily: "Urbanist-Medium", includeFontPadding: false }}
                      />
                      {Boolean(urlDraft) && (
                        <PressableScale
                          onPress={() => handleUrlDraftChange("")}
                          pressedScale={0.94}
                          className="w-9 h-9 rounded-[10px] bg-card-2 border border-line items-center justify-center"
                          accessibilityRole="button"
                          accessibilityLabel="Bersihkan link URL"
                        >
                          <LineIcon name="close" size={13} color="#6b746f" />
                        </PressableScale>
                      )}
                    </View>
                  )}
                </View>

                {/* Live Macro Bar */}
                <View className="p-3">
                  <MixBar
                    height={6}
                    accessibilityLabel="Proporsi makronutrisi resep"
                    segments={[
                      { key: "p", value: Math.max(1, calculatedTotal.proteinGrams), color: MACRO.protein },
                      { key: "c", value: Math.max(1, calculatedTotal.carbsGrams), color: MACRO.carbs },
                      { key: "f", value: Math.max(1, calculatedTotal.fatGrams), color: MACRO.fat },
                      { key: "fib", value: Math.max(1, calculatedTotal.fiberGrams), color: MACRO.fiber },
                    ]}
                  />
                  <View className="flex-row items-center justify-between mt-2">
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
              </View>

              {/* 2. Nama Resep */}
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

              {/* 3. Waktu Makan */}
              <View className="mb-3.5">
                <AppText weight="semibold" className="text-[12.5px] text-muted mb-1.5">
                  Kategori
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

              {/* 4. Waktu, Porsi & Kesulitan (Clean 2-row balanced layout) */}
              <View className="flex-row gap-2.5 mb-3">
                <View className="flex-1">
                  <AppText weight="semibold" className="text-[11.5px] text-muted mb-1">
                    Waktu (mnt)
                  </AppText>
                  <TextInput
                    value={prepTime}
                    onChangeText={setPrepTime}
                    keyboardType="numeric"
                    placeholder="15"
                    className="h-10 bg-card-2 border border-line rounded-[12px] px-3 text-ink text-[13.5px] text-center"
                    style={{ fontFamily: "Urbanist-Bold", includeFontPadding: false }}
                  />
                </View>

                <View className="flex-1">
                  <AppText weight="semibold" className="text-[11.5px] text-muted mb-1">
                    Porsi
                  </AppText>
                  <View className="h-10 bg-card-2 border border-line rounded-[12px] flex-row items-center justify-between px-2">
                    <PressableScale
                      onPress={() => setServings((s) => Math.max(1, s - 1))}
                      pressedScale={0.9}
                      className="w-6 h-6 rounded-full bg-card items-center justify-center border border-line"
                    >
                      <LineIcon name="minus" size={11} color="#121a16" />
                    </PressableScale>
                    <AppText weight="bold" className="text-[13.5px] text-ink" style={tnum}>
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
              </View>

              <View className="mb-4">
                <AppText weight="semibold" className="text-[11.5px] text-muted mb-1">
                  Kesulitan
                </AppText>
                <View className="h-10 bg-card-2 border border-line rounded-[12px] flex-row p-1 gap-1">
                  {DIFFICULTIES.map((d) => {
                    const active = difficulty === d.id;
                    return (
                      <PressableScale
                        key={d.id}
                        onPress={() => setDifficulty(d.id)}
                        pressedScale={0.96}
                        className={`flex-1 rounded-[9px] items-center justify-center ${
                          active ? "bg-block-ink" : ""
                        }`}
                      >
                        <AppText
                          weight="semibold"
                          className={`text-[12px] ${active ? "text-white" : "text-muted"}`}
                        >
                          {d.label}
                        </AppText>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              {/* 5. Bahan Makanan (Minimalist Icon-Only Add Button) */}
              <View className="mb-4">
                <AppText weight="semibold" className="text-[12.5px] text-muted mb-1.5">
                  Bahan ({selectedIngredients.length})
                </AppText>

                <View className="flex-row items-center gap-2">
                  <View className="flex-1 h-11 bg-card-2 border border-line rounded-[13px] px-3 justify-center">
                    <TextInput
                      value={ingNameInput}
                      onChangeText={(t) => {
                        setIngNameInput(t);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      onSubmitEditing={() => handleAddTypedIngredient()}
                      placeholder="Nama bahan (mis. Dada ayam, Telur)"
                      placeholderTextColor="#8a948e"
                      className="text-[13px] text-ink"
                      style={{ fontFamily: "Urbanist-Medium", includeFontPadding: false, padding: 0 }}
                    />
                  </View>

                  <View className="w-[70px] h-11 bg-card-2 border border-line rounded-[13px] px-2 flex-row items-center justify-center">
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
                    pressedScale={0.93}
                    className="w-11 h-11 rounded-[13px] bg-primary items-center justify-center flex-shrink-0"
                    accessibilityRole="button"
                    accessibilityLabel="Tambah bahan"
                  >
                    <LineIcon name="plus" size={18} color="#ffffff" strokeWidth={2.4} />
                  </PressableScale>
                </View>

                {/* Live Auto-Detected Nutrition Preview */}
                {liveTypedPreview && (
                  <View className="mt-2 bg-primary-light/60 border border-primary/20 rounded-[12px] px-3 py-2">
                    <View className="flex-row items-center justify-between">
                      <AppText weight="bold" className="text-[11.5px] text-primary-text" style={tnum}>
                        {liveTypedPreview.calc.calories} kcal ({liveTypedPreview.grams}g)
                      </AppText>
                      <AppText weight="medium" className="text-[11px] text-ink-2" style={tnum}>
                        P {liveTypedPreview.calc.proteinGrams}g · K {liveTypedPreview.calc.carbsGrams}g · L{" "}
                        {liveTypedPreview.calc.fatGrams}g
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

              {/* 6. Langkah Memasak (Minimalist Icon-Only Add Button) */}
              <View className="mb-5">
                <View className="flex-row items-center justify-between mb-2">
                  <AppText weight="semibold" className="text-[12.5px] text-muted">
                    Langkah Memasak
                  </AppText>
                  <RingButton
                    icon="plus"
                    size="sm"
                    onPress={handleAddStep}
                    accessibilityLabel="Tambah langkah"
                  />
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

              {/* Minimalist Save Action */}
              <View className="flex-row gap-2.5">
                <PillButton label="Batal" onPress={onClose} className="flex-1" />
                <PillButton
                  label="Simpan"
                  variant="primary"
                  icon="check"
                  onPress={handleSaveRecipe}
                  className="flex-1"
                />
              </View>
            </ScrollView>
          </FadeInView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
