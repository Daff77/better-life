import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  Button,
  Header,
  ProgressBar,
  OptionCard,
  Input,
} from "@/components/ui";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import {
  IconRenderer,
  FemaleIconSvg,
  MaleIconSvg,
  ChevronDownIconSvg,
  CloseIconSvg,
} from "@/constants/Assets";

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

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const personalization = useOnboardingStore((state) => state.personalization);
  const updatePersonalization = useOnboardingStore(
    (state) => state.updatePersonalization
  );
  const calculateCalories = useOnboardingStore((state) => state.calculateCalories);

  // Step state (1 to 8)
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const totalSteps = 8;

  // Form selections & values
  const [goal, setGoal] = useState<"Eat balanced" | "Lose weight" | "Gain muscle">(
    personalization.goal
  );
  const [weight, setWeight] = useState(personalization.weight.toString());
  const [height, setHeight] = useState(personalization.height.toString());
  const [gender, setGender] = useState<"Female" | "Male">(
    personalization.gender
  );
  const [birthDay, setBirthDay] = useState(personalization.birthDate.day.toString());
  const [birthMonth, setBirthMonth] = useState(personalization.birthDate.month);
  const [birthYear, setBirthYear] = useState(personalization.birthDate.year.toString());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [cookingSkill, setCookingSkill] = useState<"Low" | "Middle" | "High">(
    personalization.cookingSkill
  );
  const [dietType, setDietType] = useState(personalization.dietType);
  const [allergies, setAllergies] = useState<string[]>(personalization.allergies);

  const handleMonthChange = (val: string) => {
    const trimmed = val.trim();
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      setBirthMonth(MONTHS_LIST[num - 1]);
    } else {
      setBirthMonth(val);
    }
  };

  // Validation per step
  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return !!goal;
      case 2: {
        const w = parseFloat(weight);
        return !isNaN(w) && w >= 30 && w <= 250;
      }
      case 3: {
        const h = parseFloat(height);
        return !isNaN(h) && h >= 100 && h <= 250;
      }
      case 4:
        return !!gender;
      case 5: {
        const d = parseInt(birthDay, 10);
        const y = parseInt(birthYear, 10);
        const currentYear = new Date().getFullYear();
        return (
          !isNaN(d) &&
          d >= 1 &&
          d <= 31 &&
          !isNaN(y) &&
          y >= 1920 &&
          y <= currentYear &&
          !!birthMonth.trim()
        );
      }
      case 6:
        return !!cookingSkill;
      case 7:
        return !!dietType;
      case 8:
        return true; // Allergies are optional
      default:
        return true;
    }
  };

  const toggleAllergy = (name: string) => {
    if (allergies.includes(name)) {
      setAllergies(allergies.filter((a) => a !== name));
    } else {
      setAllergies([...allergies, name]);
    }
  };

  const handleNext = () => {
    if (!isStepValid()) return;

    // Persist ongoing progress to store
    updatePersonalization({
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
    });

    if (currentStep < totalSteps) {
      setDirection("forward");
      setCurrentStep(currentStep + 1);
    } else {
      // Step 8 completed: calculate targets and navigate to personalized plan payoff
      calculateCalories();
      router.push("/(onboarding)/plan");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection("backward");
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  return (
    <ScreenWrapper maxWidth="narrow" className="flex-1 bg-white">
      {/* Header with Step Indicator */}
      <Header
        onBack={handleBack}
        step={{ current: Math.min(currentStep, 8), total: 8 }}
      />

      {/* Progress Bar */}
      <View className="px-6 pt-1 pb-3">
        <ProgressBar progress={Math.min(currentStep, 8) / 8} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6 pt-2 pb-6"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full my-auto md:bg-white md:p-8 md:rounded-3xl md:border md:border-neutral-border-light md:shadow-md">
            {/* Step 1: Main Goal (person1.html) */}
            {currentStep === 1 && (
              <View key="step1">
                <AppText weight="black" className="text-2xl text-neutral-dark mb-1">
                  What is your main goal?
                </AppText>
                <AppText weight="medium" className="text-sm text-neutral-muted mb-6">
                  Let's customize your calorie and macronutrient breakdown.
                </AppText>

              <View className="gap-y-3">
                <OptionCard
                  title="Eat balanced"
                  subtitle="Nutritious routine for sustained vitality & health"
                  selected={goal === "Eat balanced"}
                  onPress={() => setGoal("Eat balanced")}
                />
                <OptionCard
                  title="Lose weight"
                  subtitle="Moderate caloric deficit with high fiber foods"
                  selected={goal === "Lose weight"}
                  onPress={() => setGoal("Lose weight")}
                />
                <OptionCard
                  title="Gain muscle"
                  subtitle="Lean caloric surplus focused on protein intake"
                  selected={goal === "Gain muscle"}
                  onPress={() => setGoal("Gain muscle")}
                />
              </View>
            </View>
          )}

          {/* Step 2: Weight (person2.html) */}
          {currentStep === 2 && (
            <View key="step2">
              <AppText weight="black" className="text-2xl text-neutral-dark mb-1">
                What is your current weight?
              </AppText>
              <AppText weight="medium" className="text-sm text-neutral-muted mb-6">
                This forms the foundation of your basal metabolism calculation.
              </AppText>

              <View className="bg-secondary-soft/50 p-6 rounded-2xl border border-secondary items-center my-4">
                <View className="flex-row items-baseline justify-center">
                  <Input
                    placeholder="65"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    className="w-36 text-center"
                    style={{ fontSize: 32, textAlign: "center", height: 60 }}
                  />
                  <AppText weight="black" className="text-xl text-primary ml-2">
                    kg
                  </AppText>
                </View>
                <AppText weight="medium" className="text-xs text-neutral-muted mt-3 text-center">
                  Target healthy range: 30 - 250 kg
                </AppText>
              </View>
            </View>
          )}

          {/* Step 3: Height (person2/3 concept) */}
          {currentStep === 3 && (
            <View key="step3">
              <AppText weight="black" className="text-2xl text-neutral-dark mb-1">
                How tall are you?
              </AppText>
              <AppText weight="medium" className="text-sm text-neutral-muted mb-6">
                Required for accurate body surface area & calorie index.
              </AppText>

              <View className="bg-secondary-soft/50 p-6 rounded-2xl border border-secondary items-center my-4">
                <View className="flex-row items-baseline justify-center">
                  <Input
                    placeholder="170"
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                    className="w-36 text-center"
                    style={{ fontSize: 32, textAlign: "center", height: 60 }}
                  />
                  <AppText weight="black" className="text-xl text-primary ml-2">
                    cm
                  </AppText>
                </View>
                <AppText weight="medium" className="text-xs text-neutral-muted mt-3 text-center">
                  Standard range: 100 - 250 cm
                </AppText>
              </View>
            </View>
          )}

          {/* Step 4: Gender (person3.html) */}
          {currentStep === 4 && (
            <View key="step4">
              <AppText weight="black" className="text-2xl text-neutral-dark mb-1">
                Which biological sex are you?
              </AppText>
              <AppText weight="medium" className="text-sm text-neutral-muted mb-6">
                To calculate basal metabolic rate (Mifflin formula coefficient).
              </AppText>

              <View className="gap-y-4">
                <OptionCard
                  title="Female"
                  subtitle="Biological female metabolic baseline adjustment"
                  leftElement={
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                      <FemaleIconSvg size={22} color="#047857" strokeWidth={2.4} />
                    </View>
                  }
                  selected={gender === "Female"}
                  onPress={() => setGender("Female")}
                />
                <OptionCard
                  title="Male"
                  subtitle="Biological male metabolic baseline adjustment"
                  leftElement={
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                      <MaleIconSvg size={22} color="#047857" strokeWidth={2.4} />
                    </View>
                  }
                  selected={gender === "Male"}
                  onPress={() => setGender("Male")}
                />
              </View>
            </View>
          )}

          {/* Step 5: Birth Date (person4.html) */}
          {currentStep === 5 && (
            <View key="step5">
              <AppText weight="black" className="text-2xl text-neutral-dark mb-1">
                When were you born?
              </AppText>
              <AppText weight="medium" className="text-sm text-neutral-muted mb-6">
                Your age affects metabolic expenditure and nutrient absorption.
              </AppText>

              <View className="flex-row gap-x-2 w-full">
                <View className="flex-1 min-w-0">
                  <Input
                    label="DAY"
                    placeholder="15"
                    value={birthDay}
                    onChangeText={(val) => setBirthDay(val.replace(/[^0-9]/g, "").slice(0, 2))}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                <View className="flex-[1.5] min-w-0">
                  <Input
                    label="MONTH"
                    placeholder="June"
                    value={birthMonth}
                    onChangeText={handleMonthChange}
                    rightAccessory={
                      <TouchableOpacity
                        onPress={() => setShowMonthPicker(true)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        className="p-1 items-center justify-center"
                        accessibilityLabel="Select month"
                      >
                        <ChevronDownIconSvg size={14} color="#047857" />
                      </TouchableOpacity>
                    }
                  />
                </View>
                <View className="flex-1 min-w-0">
                  <Input
                    label="YEAR"
                    placeholder="2000"
                    value={birthYear}
                    onChangeText={(val) => setBirthYear(val.replace(/[^0-9]/g, "").slice(0, 4))}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Step 6: Cooking Skill (person5.html) */}
          {currentStep === 6 && (
            <View key="step6">
              <AppText weight="black" className="text-2xl text-neutral-dark mb-1">
                What is your cooking skill?
              </AppText>
              <AppText weight="medium" className="text-sm text-neutral-muted mb-6">
                We'll match meal recipes that fit your preparation experience.
              </AppText>

              <View className="gap-y-3">
                <OptionCard
                  title="Low"
                  subtitle="I prefer fast meals under 15 mins with minimal preparation"
                  leftElement={<IconRenderer name="Clock" size={24} />}
                  selected={cookingSkill === "Low"}
                  onPress={() => setCookingSkill("Low")}
                />
                <OptionCard
                  title="Middle"
                  subtitle="I'm comfortable frying, boiling, baking, and basic prep"
                  leftElement={<IconRenderer name="Cook" size={24} />}
                  selected={cookingSkill === "Middle"}
                  onPress={() => setCookingSkill("Middle")}
                />
                <OptionCard
                  title="High"
                  subtitle="I enjoy cooking complex recipes and creative dishes"
                  leftElement={<IconRenderer name="Fire" size={24} />}
                  selected={cookingSkill === "High"}
                  onPress={() => setCookingSkill("High")}
                />
              </View>
            </View>
          )}

          {/* Step 7: Diet Preference (person6.html) */}
          {currentStep === 7 && (
            <View key="step7">
              <AppText weight="black" className="text-2xl text-neutral-dark mb-1">
                What is your diet preference?
              </AppText>
              <AppText weight="medium" className="text-sm text-neutral-muted mb-6">
                Choose the nutritional philosophy that fits your lifestyle.
              </AppText>

              <View className="gap-y-3">
                <OptionCard
                  title="Omnivore"
                  subtitle="I eat everything: poultry, beef, seafood, veggies"
                  selected={dietType === "Omnivore"}
                  onPress={() => setDietType("Omnivore")}
                />
                <OptionCard
                  title="Vegetarian"
                  subtitle="Plant foods, eggs, and dairy without meat or fish"
                  selected={dietType === "Vegetarian"}
                  onPress={() => setDietType("Vegetarian")}
                />
                <OptionCard
                  title="Vegan"
                  subtitle="Strictly 100% plant-derived food sources"
                  selected={dietType === "Vegan"}
                  onPress={() => setDietType("Vegan")}
                />
                <OptionCard
                  title="Pescatarian"
                  subtitle="Fish, seafood, grains, and plant-based nutrition"
                  selected={dietType === "Pescatarian"}
                  onPress={() => setDietType("Pescatarian")}
                />
              </View>
            </View>
          )}

          {/* Step 8: Allergies & Intolerances (person7.html) */}
          {currentStep === 8 && (
            <View key="step8">
              <AppText weight="black" className="text-2xl text-neutral-dark mb-1">
                Do you have any food allergies?
              </AppText>
              <AppText weight="medium" className="text-sm text-neutral-muted mb-6">
                Select all ingredients we must exclude from your suggested recipes.
              </AppText>

              <View className="gap-y-3">
                <OptionCard
                  title="Lactose Intolerance"
                  subtitle="Exclude milk, dairy cream, and soft cheeses"
                  leftElement={<IconRenderer name="Lactose" size={24} />}
                  multiSelect
                  selected={allergies.includes("Lactose")}
                  onPress={() => toggleAllergy("Lactose")}
                />
                <OptionCard
                  title="Gluten Sensitive"
                  subtitle="Exclude wheat, barley, rye, and malt ingredients"
                  leftElement={<IconRenderer name="Gluten" size={24} />}
                  multiSelect
                  selected={allergies.includes("Gluten")}
                  onPress={() => toggleAllergy("Gluten")}
                />
                <OptionCard
                  title="Peanuts & Tree Nuts"
                  subtitle="Exclude almonds, walnuts, cashews, and peanuts"
                  leftElement={<IconRenderer name="Nuts" size={24} />}
                  multiSelect
                  selected={allergies.includes("Nuts")}
                  onPress={() => toggleAllergy("Nuts")}
                />
                <OptionCard
                  title="Seafood & Shellfish"
                  subtitle="Exclude crustaceans, shrimp, crab, and fish"
                  leftElement={<IconRenderer name="Seafood" size={24} />}
                  multiSelect
                  selected={allergies.includes("Seafood")}
                  onPress={() => toggleAllergy("Seafood")}
                />
                <OptionCard
                  title="Eggs"
                  subtitle="Exclude chicken eggs and egg albumin derivatives"
                  leftElement={<IconRenderer name="Egg" size={24} />}
                  multiSelect
                  selected={allergies.includes("Eggs")}
                  onPress={() => toggleAllergy("Eggs")}
                />
              </View>
            </View>
          )}

          {/* Action Button */}
          <View className="mt-auto pt-6 pb-4">
            <Button
              title={currentStep === totalSteps ? "Generate My Plan" : "Continue"}
              variant="primary"
              disabled={!isStepValid()}
              onPress={handleNext}
              accessibilityLabel={currentStep === totalSteps ? "Generate my plan" : "Next step"}
            />
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Month Selector Modal */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center p-4"
          onPress={() => setShowMonthPicker(false)}
        >
          <Pressable
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between mb-4">
              <AppText weight="black" className="text-lg text-neutral-dark">
                Select Month
              </AppText>
              <TouchableOpacity
                onPress={() => setShowMonthPicker(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="p-1"
                accessibilityLabel="Close"
              >
                <CloseIconSvg size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap gap-2 justify-between">
              {MONTHS_LIST.map((m) => {
                const isSelected =
                  birthMonth.trim().toLowerCase() === m.toLowerCase();
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => {
                      setBirthMonth(m);
                      setShowMonthPicker(false);
                    }}
                    className={`w-[30%] py-3 px-2 rounded-xl items-center justify-center border ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "bg-neutral-surface border-neutral-border"
                    }`}
                    activeOpacity={0.7}
                  >
                    <AppText
                      weight={isSelected ? "black" : "semibold"}
                      className={`text-sm ${
                        isSelected ? "text-white" : "text-neutral-dark"
                      }`}
                    >
                      {m.slice(0, 3)}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}
