import React, { useState, useMemo } from "react";
import { View, Pressable, Modal } from "react-native";
import { useRouter } from "expo-router";
import {
  AppText,
  Button,
  FlowScreen,
  FlowTitle,
  TextField,
  ChoiceTile,
  FormAlert,
  LineIcon,
  Surface,
  StatusPill,
} from "@/components/ui";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import {
  IconRenderer,
  FemaleIconSvg,
  MaleIconSvg,
} from "@/constants/Assets";
import { Colors } from "@/constants/DesignTokens";

const MONTHS_LIST = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS_ID: Record<string, string> = {
  January: "Januari",
  February: "Februari",
  March: "Maret",
  April: "April",
  May: "Mei",
  June: "Juni",
  July: "Juli",
  August: "Agustus",
  September: "September",
  October: "Oktober",
  November: "November",
  December: "Desember",
};

const TOTAL_STEPS = 8;

export default function OnboardingScreen() {
  const router = useRouter();
  const personalization = useOnboardingStore((state) => state.personalization);
  const updatePersonalization = useOnboardingStore((state) => state.updatePersonalization);
  const savePersonalization = useOnboardingStore((state) => state.savePersonalization);
  const calculateCalories = useOnboardingStore((state) => state.calculateCalories);

  // Steps 1..7 are input steps; Step 8 is the Personalized Results screen (/(onboarding)/plan)
  const [currentStep, setCurrentStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1: Main Goal
  const [goal, setGoal] = useState<"Eat balanced" | "Lose weight" | "Gain muscle">(
    personalization.goal
  );

  // Step 2: Weight & Height
  const [weight, setWeight] = useState(personalization.weight.toString());
  const [height, setHeight] = useState(personalization.height.toString());

  // Step 3: Gender
  const [gender, setGender] = useState<"Female" | "Male">(personalization.gender);

  // Step 4: Birth Date
  const [birthDay, setBirthDay] = useState(personalization.birthDate.day.toString());
  const [birthMonth, setBirthMonth] = useState(personalization.birthDate.month || "June");
  const [birthYear, setBirthYear] = useState(personalization.birthDate.year.toString());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Step 5: Cooking Skill Level
  const [cookingSkill, setCookingSkill] = useState<"Low" | "Middle" | "High">(
    personalization.cookingSkill
  );

  // Step 6: Diet Type
  const [dietType, setDietType] = useState(personalization.dietType || "Omnivore");

  // Step 7: Food Allergies & Intolerances
  const [allergies, setAllergies] = useState<string[]>(personalization.allergies || []);

  // Live BMI calculation for Step 2
  const bmiInfo = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (isNaN(w) || isNaN(h) || w < 30 || h < 100) return null;
    const bmi = w / Math.pow(h / 100, 2);
    const rounded = Math.round(bmi * 10) / 10;
    let label = "Ideal";
    let tone: "good" | "warn" | "info" = "good";
    if (bmi < 18.5) {
      label = "Di bawah ideal";
      tone = "info";
    } else if (bmi >= 25) {
      label = "Di atas ideal";
      tone = "warn";
    }
    return { value: rounded, label, tone };
  }, [weight, height]);

  // Live Age calculation for Step 4
  const calculatedAge = useMemo(() => {
    const y = parseInt(birthYear, 10);
    const currentYear = new Date().getFullYear();
    if (isNaN(y) || y < 1920 || y > currentYear) return null;
    return currentYear - y;
  }, [birthYear]);

  const validateCurrentStep = (): boolean => {
    setStepError(null);
    switch (currentStep) {
      case 1:
        if (!goal) {
          setStepError("Pilih tujuan kesehatan utama Anda.");
          return false;
        }
        return true;
      case 2: {
        const w = parseFloat(weight);
        const h = parseFloat(height);
        if (isNaN(w) || w < 30 || w > 250) {
          setStepError("Masukkan berat badan yang valid antara 30 hingga 250 kg.");
          return false;
        }
        if (isNaN(h) || h < 100 || h > 250) {
          setStepError("Masukkan tinggi badan yang valid antara 100 hingga 250 cm.");
          return false;
        }
        return true;
      }
      case 3:
        if (!gender) {
          setStepError("Pilih jenis kelamin biologis Anda.");
          return false;
        }
        return true;
      case 4: {
        const d = parseInt(birthDay, 10);
        const y = parseInt(birthYear, 10);
        const currentYear = new Date().getFullYear();
        const age = currentYear - y;
        if (isNaN(d) || d < 1 || d > 31) {
          setStepError("Masukkan tanggal lahir antara 1 hingga 31.");
          return false;
        }
        if (!birthMonth.trim()) {
          setStepError("Pilih bulan kelahiran Anda.");
          return false;
        }
        if (isNaN(y) || age < 14 || age > 100) {
          setStepError("Usia harus berada di antara 14 hingga 100 tahun.");
          return false;
        }
        return true;
      }
      case 5:
        if (!cookingSkill) {
          setStepError("Pilih tingkat keahlian memasak Anda.");
          return false;
        }
        return true;
      case 6:
        if (!dietType) {
          setStepError("Pilih preferensi pola makan Anda.");
          return false;
        }
        return true;
      case 7:
        return true;
      default:
        return true;
    }
  };

  const persistCurrentFields = () => {
    const payload = {
      goal,
      weight: parseFloat(weight) || 65,
      height: parseFloat(height) || 170,
      gender,
      birthDate: {
        day: parseInt(birthDay, 10) || 15,
        month: birthMonth || "June",
        year: parseInt(birthYear, 10) || 2000,
      },
      cookingSkill,
      dietType,
      allergies,
    };
    updatePersonalization(payload);
    return payload;
  };

  const handleNext = async () => {
    if (isSaving) return;
    if (!validateCurrentStep()) return;

    const payload = persistCurrentFields();

    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
      return;
    }

    // Step 7 completed -> Calculate & save personalized plan, then open Step 8 (Results)
    setIsSaving(true);
    try {
      calculateCalories();
      await savePersonalization(payload);
      setIsSaving(false);
      router.push("/(onboarding)/plan");
    } catch {
      setIsSaving(false);
      router.push("/(onboarding)/plan");
    }
  };

  const handleBack = () => {
    setStepError(null);
    persistCurrentFields();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/get-started");
    }
  };

  const toggleAllergy = (name: string) => {
    if (allergies.includes(name)) {
      setAllergies(allergies.filter((a) => a !== name));
    } else {
      setAllergies([...allergies, name]);
    }
  };

  const adjustMetric = (
    currentVal: string,
    delta: number,
    min: number,
    max: number,
    setter: (v: string) => void
  ) => {
    const parsed = parseFloat(currentVal) || min;
    const next = Math.max(min, Math.min(max, Math.round((parsed + delta) * 10) / 10));
    setter(String(next));
    if (stepError) setStepError(null);
  };

  return (
    <FlowScreen
      onBack={handleBack}
      step={{ current: currentStep, total: TOTAL_STEPS }}
      footer={
        <Button
          title={
            currentStep === 7
              ? isSaving
                ? "Menghitung Rencana..."
                : "Lihat Hasil Personalisasi"
              : "Lanjutkan"
          }
          size="lg"
          loading={isSaving}
          onPress={handleNext}
          accessibilityLabel={
            currentStep === 7 ? "Lihat hasil personalisasi" : "Langkah berikutnya"
          }
        />
      }
    >
      <FormAlert message={stepError} />

      {/* STEP 1: MAIN GOAL */}
      {currentStep === 1 && (
        <View key="onboard-step-1">
          <FlowTitle
            eyebrow="Langkah 1 dari 8 · Tujuan Utama"
            title="Apa tujuan kesehatan utama Anda?"
            caption="Pilihan ini menentukan target kalori harian dan proporsi protein, karbohidrat, serta lemak Anda."
          />

          <View className="gap-3">
            <ChoiceTile
              title="Makan seimbang (Eat balanced)"
              caption="Pertahankan berat badan ideal dengan energi stabil sepanjang hari"
              leading={
                <View className="w-11 h-11 rounded-2xl bg-primary-light items-center justify-center">
                  <LineIcon name="leaf" size={20} color="#0b6b47" />
                </View>
              }
              selected={goal === "Eat balanced"}
              onPress={() => setGoal("Eat balanced")}
            />

            <ChoiceTile
              title="Turunkan berat badan (Lose weight)"
              caption="Defisit kalori terukur (~18%) tinggi serat & protein agar tetap kenyang"
              leading={
                <View className="w-11 h-11 rounded-2xl bg-warn-soft items-center justify-center">
                  <LineIcon name="flame" size={20} color="#8f4e00" />
                </View>
              }
              selected={goal === "Lose weight"}
              onPress={() => setGoal("Lose weight")}
            />

            <ChoiceTile
              title="Bentuk otot (Gain muscle)"
              caption="Surplus kalori bersih (~15%) dengan fokus sintesis protein otot"
              leading={
                <View className="w-11 h-11 rounded-2xl bg-info-soft items-center justify-center">
                  <LineIcon name="target" size={20} color="#285c9c" />
                </View>
              }
              selected={goal === "Gain muscle"}
              onPress={() => setGoal("Gain muscle")}
            />
          </View>
        </View>
      )}

      {/* STEP 2: WEIGHT AND HEIGHT */}
      {currentStep === 2 && (
        <View key="onboard-step-2">
          <FlowTitle
            eyebrow="Langkah 2 dari 8 · Metrik Tubuh"
            title="Berapa berat dan tinggi badan Anda?"
            caption="Digunakan dalam rumus metabolisme basal Mifflin-St Jeor untuk menghitung kebutuhan energi Anda."
          />

          <View className="gap-4">
            {/* Weight Card */}
            <Surface>
              <View className="flex-row items-center justify-between mb-2.5">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-primary-light items-center justify-center">
                    <LineIcon name="scale" size={16} color="#0b6b47" />
                  </View>
                  <AppText weight="semibold" className="text-[15px] text-ink">
                    Berat Badan
                  </AppText>
                </View>
                <AppText weight="medium" className="text-[12px] text-muted">
                  Rentang 30 – 250 kg
                </AppText>
              </View>

              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => adjustMetric(weight, -1, 30, 250, setWeight)}
                  className="w-12 h-12 rounded-2xl bg-card-2 border border-line items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Kurangi berat 1 kilogram"
                >
                  <LineIcon name="minus" size={18} color="#121a16" />
                </Pressable>

                <View className="flex-1">
                  <TextField
                    label=""
                    big
                    suffix="kg"
                    value={weight}
                    onChangeText={(val) => {
                      setWeight(val.replace(/[^0-9.]/g, ""));
                      if (stepError) setStepError(null);
                    }}
                    keyboardType="numeric"
                    placeholder="65"
                    accessibilityLabel="Berat badan dalam kilogram"
                  />
                </View>

                <Pressable
                  onPress={() => adjustMetric(weight, 1, 30, 250, setWeight)}
                  className="w-12 h-12 rounded-2xl bg-card-2 border border-line items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Tambah berat 1 kilogram"
                >
                  <LineIcon name="plus" size={18} color="#121a16" />
                </Pressable>
              </View>
            </Surface>

            {/* Height Card */}
            <Surface>
              <View className="flex-row items-center justify-between mb-2.5">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-primary-light items-center justify-center">
                    <LineIcon name="ruler" size={16} color="#0b6b47" />
                  </View>
                  <AppText weight="semibold" className="text-[15px] text-ink">
                    Tinggi Badan
                  </AppText>
                </View>
                <AppText weight="medium" className="text-[12px] text-muted">
                  Rentang 100 – 250 cm
                </AppText>
              </View>

              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => adjustMetric(height, -1, 100, 250, setHeight)}
                  className="w-12 h-12 rounded-2xl bg-card-2 border border-line items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Kurangi tinggi 1 sentimeter"
                >
                  <LineIcon name="minus" size={18} color="#121a16" />
                </Pressable>

                <View className="flex-1">
                  <TextField
                    label=""
                    big
                    suffix="cm"
                    value={height}
                    onChangeText={(val) => {
                      setHeight(val.replace(/[^0-9.]/g, ""));
                      if (stepError) setStepError(null);
                    }}
                    keyboardType="numeric"
                    placeholder="170"
                    accessibilityLabel="Tinggi badan dalam sentimeter"
                  />
                </View>

                <Pressable
                  onPress={() => adjustMetric(height, 1, 100, 250, setHeight)}
                  className="w-12 h-12 rounded-2xl bg-card-2 border border-line items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Tambah tinggi 1 sentimeter"
                >
                  <LineIcon name="plus" size={18} color="#121a16" />
                </Pressable>
              </View>
            </Surface>

            {bmiInfo && (
              <View className="flex-row items-center justify-between px-4 py-3 rounded-[16px] bg-card border border-line">
                <View>
                  <AppText weight="semibold" className="text-[13px] text-ink">
                    Indeks Massa Tubuh (BMI)
                  </AppText>
                  <AppText weight="medium" className="text-[12px] text-muted">
                    Estimasi proporsi berat & tinggi saat ini
                  </AppText>
                </View>
                <View className="flex-row items-center gap-2">
                  <AppText
                    weight="bold"
                    className="text-[18px] text-ink"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {bmiInfo.value}
                  </AppText>
                  <StatusPill label={bmiInfo.label} tone={bmiInfo.tone} dot={false} />
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* STEP 3: GENDER */}
      {currentStep === 3 && (
        <View key="onboard-step-3">
          <FlowTitle
            eyebrow="Langkah 3 dari 8 · Profil Biologis"
            title="Apa jenis kelamin biologis Anda?"
            caption="Koefisien metabolisme basal antara perempuan dan laki-laki berbeda pada rumus Mifflin-St Jeor."
          />

          <View className="gap-3.5">
            <ChoiceTile
              title="Perempuan (Female)"
              caption="Kalibrasi laju metabolisme basal biologis perempuan"
              leading={
                <View className="w-11 h-11 rounded-2xl bg-primary-light items-center justify-center">
                  <FemaleIconSvg size={22} color="#0b6b47" strokeWidth={2.3} />
                </View>
              }
              selected={gender === "Female"}
              onPress={() => setGender("Female")}
            />

            <ChoiceTile
              title="Laki-laki (Male)"
              caption="Kalibrasi laju metabolisme basal biologis laki-laki"
              leading={
                <View className="w-11 h-11 rounded-2xl bg-primary-light items-center justify-center">
                  <MaleIconSvg size={22} color="#0b6b47" strokeWidth={2.3} />
                </View>
              }
              selected={gender === "Male"}
              onPress={() => setGender("Male")}
            />
          </View>
        </View>
      )}

      {/* STEP 4: BIRTH DATE */}
      {currentStep === 4 && (
        <View key="onboard-step-4">
          <FlowTitle
            eyebrow="Langkah 4 dari 8 · Tanggal Lahir"
            title="Kapan Anda lahir?"
            caption="Usia memengaruhi kebutuhan energi harian dan anjuran asupan protein."
          />

          <View className="flex-row gap-2.5">
            <View className="flex-1 min-w-0">
              <TextField
                label="Tanggal"
                placeholder="15"
                value={birthDay}
                onChangeText={(val) => {
                  setBirthDay(val.replace(/[^0-9]/g, "").slice(0, 2));
                  if (stepError) setStepError(null);
                }}
                keyboardType="number-pad"
                maxLength={2}
                accessibilityLabel="Tanggal lahir"
              />
            </View>

            <View className="flex-[1.5] min-w-0">
              <AppText weight="semibold" className="text-[13.5px] text-ink-2 mb-2">
                Bulan
              </AppText>
              <Pressable
                onPress={() => setShowMonthPicker(true)}
                className="h-[54px] px-4 rounded-[16px] bg-card border border-line-2 flex-row items-center justify-between"
                accessibilityRole="button"
                accessibilityLabel={`Pilih bulan lahir, saat ini ${birthMonth}`}
              >
                <AppText weight="semibold" className="text-[15.5px] text-ink" numberOfLines={1}>
                  {MONTHS_ID[birthMonth] || birthMonth}
                </AppText>
                <LineIcon name="chevronDown" size={18} color="#56605a" />
              </Pressable>
            </View>

            <View className="flex-[1.1] min-w-0">
              <TextField
                label="Tahun"
                placeholder="2000"
                value={birthYear}
                onChangeText={(val) => {
                  setBirthYear(val.replace(/[^0-9]/g, "").slice(0, 4));
                  if (stepError) setStepError(null);
                }}
                keyboardType="number-pad"
                maxLength={4}
                accessibilityLabel="Tahun lahir"
              />
            </View>
          </View>

          {calculatedAge !== null && (
            <View className="mt-4 px-4 py-3 rounded-[16px] bg-primary-light flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <LineIcon name="calendar" size={17} color="#0b6b47" />
                <AppText weight="semibold" className="text-[13.5px] text-primary-text">
                  Usia terhitung
                </AppText>
              </View>
              <AppText
                weight="bold"
                className="text-[15px] text-primary-text"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {calculatedAge} tahun
              </AppText>
            </View>
          )}
        </View>
      )}

      {/* STEP 5: COOKING SKILL LEVEL */}
      {currentStep === 5 && (
        <View key="onboard-step-5">
          <FlowTitle
            eyebrow="Langkah 5 dari 8 · Keahlian Memasak"
            title="Seberapa sering Anda memasak?"
            caption="Kami akan menyesuaikan tingkat kesulitan dan waktu persiapan resep yang direkomendasikan."
          />

          <View className="gap-3">
            <ChoiceTile
              title="Pemula (Low)"
              caption="Menu cepat di bawah 15 menit dengan bahan praktis"
              leading={<IconRenderer name="Clock" size={24} />}
              selected={cookingSkill === "Low"}
              onPress={() => setCookingSkill("Low")}
            />

            <ChoiceTile
              title="Menengah (Middle)"
              caption="Nyaman menumis, merebus, memanggang, dan persiapan harian"
              leading={<IconRenderer name="Cook" size={24} />}
              selected={cookingSkill === "Middle"}
              onPress={() => setCookingSkill("Middle")}
            />

            <ChoiceTile
              title="Mahir (High)"
              caption="Senang bereksperimen dengan resep lengkap dan bumbu segar"
              leading={<IconRenderer name="Fire" size={24} />}
              selected={cookingSkill === "High"}
              onPress={() => setCookingSkill("High")}
            />
          </View>
        </View>
      )}

      {/* STEP 6: DIET TYPE */}
      {currentStep === 6 && (
        <View key="onboard-step-6">
          <FlowTitle
            eyebrow="Langkah 6 dari 8 · Pola Makan"
            title="Apa preferensi diet Anda?"
            caption="Katalog resep dan rencana makan 7 hari akan disesuaikan dengan pola makan pilihan Anda."
          />

          <View className="gap-2.5">
            {[
              {
                id: "Omnivore",
                title: "Omnivora",
                caption: "Semua bahan segar: ayam, daging, ikan, telur, sayur",
              },
              {
                id: "Mediterranean",
                title: "Mediterania",
                caption: "Kaya sayuran, ikan, minyak zaitun, dan biji-bijian utuh",
              },
              {
                id: "Pescatarian",
                title: "Pescatarian",
                caption: "Ikan, boga bahari, telur, dan sumber pangan nabati",
              },
              {
                id: "Vegetarian",
                title: "Vegetarian",
                caption: "Pangan nabati, telur, dan susu tanpa daging atau ikan",
              },
              {
                id: "Vegan",
                title: "Vegan",
                caption: "100% pangan nabati murni tanpa produk hewani",
              },
            ].map((item) => (
              <ChoiceTile
                key={item.id}
                title={item.title}
                caption={item.caption}
                selected={dietType === item.id}
                onPress={() => setDietType(item.id)}
              />
            ))}
          </View>
        </View>
      )}

      {/* STEP 7: FOOD ALLERGIES & INTOLERANCES */}
      {currentStep === 7 && (
        <View key="onboard-step-7">
          <FlowTitle
            eyebrow="Langkah 7 dari 8 · Alergi & Intoleransi"
            title="Apakah Anda memiliki alergi makanan?"
            caption="Pilih semua bahan yang perlu kami kecualikan dari rekomendasi menu Anda (opsional)."
          />

          <View className="gap-2.5">
            <ChoiceTile
              title="Tidak ada alergi makanan"
              caption="Saya dapat mengonsumsi semua bahan makanan dengan aman"
              selected={allergies.length === 0}
              onPress={() => setAllergies([])}
            />

            <ChoiceTile
              title="Intoleransi Laktosa (Lactose)"
              caption="Kecualikan susu sapi, krim, dan keju lembut"
              leading={<IconRenderer name="Lactose" size={24} />}
              multi
              selected={allergies.includes("Lactose")}
              onPress={() => toggleAllergy("Lactose")}
            />

            <ChoiceTile
              title="Sensitif Gluten (Gluten)"
              caption="Kecualikan terigu, gandum, roti, dan mie gandum"
              leading={<IconRenderer name="Gluten" size={24} />}
              multi
              selected={allergies.includes("Gluten")}
              onPress={() => toggleAllergy("Gluten")}
            />

            <ChoiceTile
              title="Kacang-kacangan (Nuts)"
              caption="Kecualikan kacang tanah, almond, mete, dan kenari"
              leading={<IconRenderer name="Nuts" size={24} />}
              multi
              selected={allergies.includes("Nuts")}
              onPress={() => toggleAllergy("Nuts")}
            />

            <ChoiceTile
              title="Seafood & Kerang (Seafood)"
              caption="Kecualikan udang, kepiting, kerang, dan boga bahari"
              leading={<IconRenderer name="Seafood" size={24} />}
              multi
              selected={allergies.includes("Seafood")}
              onPress={() => toggleAllergy("Seafood")}
            />

            <ChoiceTile
              title="Telur (Eggs)"
              caption="Kecualikan telur ayam, bebek, dan olahan albumin"
              leading={<IconRenderer name="Egg" size={24} />}
              multi
              selected={allergies.includes("Eggs")}
              onPress={() => toggleAllergy("Eggs")}
            />
          </View>
        </View>
      )}

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/45 justify-center items-center p-5"
          onPress={() => setShowMonthPicker(false)}
        >
          <Pressable
            className="bg-card rounded-[24px] p-5 w-full max-w-sm border border-line"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between mb-4">
              <AppText weight="bold" className="text-[17px] text-ink">
                Pilih Bulan Lahir
              </AppText>
              <Pressable
                onPress={() => setShowMonthPicker(false)}
                hitSlop={8}
                className="w-8 h-8 rounded-full bg-card-2 items-center justify-center"
                accessibilityLabel="Tutup"
              >
                <LineIcon name="close" size={16} color="#56605a" />
              </Pressable>
            </View>

            <View className="flex-row flex-wrap gap-2 justify-between">
              {MONTHS_LIST.map((m) => {
                const isSelected = birthMonth.trim().toLowerCase() === m.toLowerCase();
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setBirthMonth(m);
                      setShowMonthPicker(false);
                    }}
                    style={{
                      width: "31%",
                      backgroundColor: isSelected ? Colors.primary.DEFAULT : "#f0f4f1",
                      borderColor: isSelected ? Colors.primary.DEFAULT : "#e6eae7",
                      borderWidth: 1,
                    }}
                    className="py-3 px-2 rounded-[12px] items-center justify-center"
                  >
                    <AppText
                      weight="semibold"
                      className={`text-[13px] ${isSelected ? "text-white" : "text-ink"}`}
                    >
                      {(MONTHS_ID[m] || m).slice(0, 3)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </FlowScreen>
  );
}
