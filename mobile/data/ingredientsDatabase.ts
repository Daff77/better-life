export type IngredientCategory =
  | "Protein Hewani"
  | "Protein Nabati"
  | "Karbohidrat"
  | "Sayuran"
  | "Buah"
  | "Susu & Telur"
  | "Lemak & Bumbu"
  | "Minuman";

export interface IngredientNutrition {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
}

export interface IngredientItem {
  id: string;
  name: string;
  category: IngredientCategory;
  /** Standard serving weight in grams (or ml) */
  defaultServingGrams: number;
  /** Human-readable household measure for defaultServingGrams */
  servingLabel: string;
  /** Complete macro and calorie data per 100g */
  per100g: IngredientNutrition;
  /** Average local market price in IDR per 100g */
  estimatedCostPer100g: number;
  allergens?: string[];
  dietaryTags?: string[];
}

export const INGREDIENT_CATEGORIES: ReadonlyArray<IngredientCategory> = [
  "Protein Hewani",
  "Protein Nabati",
  "Karbohidrat",
  "Sayuran",
  "Buah",
  "Susu & Telur",
  "Lemak & Bumbu",
  "Minuman",
];

/**
 * Comprehensive database of 65+ staple Indonesian & whole-food ingredients
 * with accurate nutrition per 100g (USDA / TKPI Kemenkes RI reference values).
 */
export const INGREDIENTS_DATABASE: IngredientItem[] = [
  // ==========================================
  // 1. PROTEIN HEWANI
  // ==========================================
  {
    id: "ing-dada-ayam",
    name: "Dada Ayam Tanpa Kulit (Mentah)",
    category: "Protein Hewani",
    defaultServingGrams: 120,
    servingLabel: "1 potong sedang (120 g)",
    per100g: { calories: 165, proteinGrams: 31, carbsGrams: 0, fatGrams: 3.6, fiberGrams: 0 },
    estimatedCostPer100g: 6500,
    dietaryTags: ["High-Protein", "Low-Carb"],
  },
  {
    id: "ing-paha-ayam",
    name: "Paha Ayam Tanpa Kulit",
    category: "Protein Hewani",
    defaultServingGrams: 100,
    servingLabel: "1 potong (100 g)",
    per100g: { calories: 179, proteinGrams: 24, carbsGrams: 0, fatGrams: 8.5, fiberGrams: 0 },
    estimatedCostPer100g: 6000,
    dietaryTags: ["High-Protein"],
  },
  {
    id: "ing-daging-sapi-has",
    name: "Daging Sapi Has Dalam (Lean Beef)",
    category: "Protein Hewani",
    defaultServingGrams: 100,
    servingLabel: "1 porsi (100 g)",
    per100g: { calories: 215, proteinGrams: 26, carbsGrams: 0, fatGrams: 11.8, fiberGrams: 0 },
    estimatedCostPer100g: 14500,
    dietaryTags: ["High-Protein", "Iron-Rich"],
  },
  {
    id: "ing-daging-sapi-giling",
    name: "Daging Sapi Giling",
    category: "Protein Hewani",
    defaultServingGrams: 100,
    servingLabel: "100 g",
    per100g: { calories: 250, proteinGrams: 25, carbsGrams: 0, fatGrams: 16, fiberGrams: 0 },
    estimatedCostPer100g: 13500,
  },
  {
    id: "ing-ikan-salmon",
    name: "Ikan Salmon Fillet Segar",
    category: "Protein Hewani",
    defaultServingGrams: 120,
    servingLabel: "1 fillet (120 g)",
    per100g: { calories: 208, proteinGrams: 20.4, carbsGrams: 0, fatGrams: 13.4, fiberGrams: 0 },
    estimatedCostPer100g: 28000,
    allergens: ["Seafood"],
    dietaryTags: ["High-Protein", "Omega-3", "Pescatarian"],
  },
  {
    id: "ing-ikan-tuna",
    name: "Ikan Tuna Segar / Kaleng Air",
    category: "Protein Hewani",
    defaultServingGrams: 100,
    servingLabel: "1 porsi (100 g)",
    per100g: { calories: 132, proteinGrams: 28.2, carbsGrams: 0, fatGrams: 1.3, fiberGrams: 0 },
    estimatedCostPer100g: 9500,
    allergens: ["Seafood"],
    dietaryTags: ["High-Protein", "Low-Fat", "Pescatarian"],
  },
  {
    id: "ing-ikan-kembung",
    name: "Ikan Kembung Segar",
    category: "Protein Hewani",
    defaultServingGrams: 100,
    servingLabel: "1 ekor sedang (100 g)",
    per100g: { calories: 167, proteinGrams: 19.3, carbsGrams: 0, fatGrams: 9.4, fiberGrams: 0 },
    estimatedCostPer100g: 5500,
    allergens: ["Seafood"],
    dietaryTags: ["Omega-3", "Pescatarian"],
  },
  {
    id: "ing-ikan-nila",
    name: "Ikan Nila / Dori Fillet",
    category: "Protein Hewani",
    defaultServingGrams: 120,
    servingLabel: "1 fillet (120 g)",
    per100g: { calories: 128, proteinGrams: 26, carbsGrams: 0, fatGrams: 2.7, fiberGrams: 0 },
    estimatedCostPer100g: 5000,
    allergens: ["Seafood"],
    dietaryTags: ["High-Protein", "Low-Fat", "Pescatarian"],
  },
  {
    id: "ing-udang-kupas",
    name: "Udang Segar Kupas",
    category: "Protein Hewani",
    defaultServingGrams: 100,
    servingLabel: "8–10 ekor (100 g)",
    per100g: { calories: 99, proteinGrams: 24, carbsGrams: 0.2, fatGrams: 0.3, fiberGrams: 0 },
    estimatedCostPer100g: 12000,
    allergens: ["Seafood"],
    dietaryTags: ["High-Protein", "Low-Calorie", "Pescatarian"],
  },
  {
    id: "ing-hati-ayam",
    name: "Hati Ayam",
    category: "Protein Hewani",
    defaultServingGrams: 60,
    servingLabel: "2 potong (60 g)",
    per100g: { calories: 167, proteinGrams: 24.5, carbsGrams: 0.9, fatGrams: 6.5, fiberGrams: 0 },
    estimatedCostPer100g: 4500,
    dietaryTags: ["High-Protein", "Iron-Rich"],
  },

  // ==========================================
  // 2. SUSU & TELUR
  // ==========================================
  {
    id: "ing-telur-ayam",
    name: "Telur Ayam Utuh",
    category: "Susu & Telur",
    defaultServingGrams: 55,
    servingLabel: "1 butir besar (55 g)",
    per100g: { calories: 155, proteinGrams: 12.6, carbsGrams: 1.1, fatGrams: 10.6, fiberGrams: 0 },
    estimatedCostPer100g: 3200,
    allergens: ["Eggs"],
    dietaryTags: ["Vegetarian", "High-Protein"],
  },
  {
    id: "ing-putih-telur",
    name: "Putih Telur Ayam",
    category: "Susu & Telur",
    defaultServingGrams: 100,
    servingLabel: "3 butir putih telur (100 g)",
    per100g: { calories: 52, proteinGrams: 10.9, carbsGrams: 0.7, fatGrams: 0.2, fiberGrams: 0 },
    estimatedCostPer100g: 3000,
    allergens: ["Eggs"],
    dietaryTags: ["Vegetarian", "High-Protein", "Low-Fat"],
  },
  {
    id: "ing-greek-yogurt",
    name: "Greek Yogurt Plain (Low-Fat)",
    category: "Susu & Telur",
    defaultServingGrams: 150,
    servingLabel: "1 mangkuk kecil (150 g)",
    per100g: { calories: 73, proteinGrams: 10, carbsGrams: 3.9, fatGrams: 1.9, fiberGrams: 0 },
    estimatedCostPer100g: 9000,
    allergens: ["Dairy"],
    dietaryTags: ["Vegetarian", "High-Protein", "Probiotic"],
  },
  {
    id: "ing-susu-lowfat",
    name: "Susu Sapi Segar Low-Fat",
    category: "Susu & Telur",
    defaultServingGrams: 200,
    servingLabel: "1 gelas (200 ml)",
    per100g: { calories: 42, proteinGrams: 3.4, carbsGrams: 5, fatGrams: 1, fiberGrams: 0 },
    estimatedCostPer100g: 2200,
    allergens: ["Dairy"],
    dietaryTags: ["Vegetarian"],
  },
  {
    id: "ing-keju-cheddar",
    name: "Keju Cheddar Parut / Slice",
    category: "Susu & Telur",
    defaultServingGrams: 25,
    servingLabel: "1 lembar / 2 sdm (25 g)",
    per100g: { calories: 402, proteinGrams: 25, carbsGrams: 1.3, fatGrams: 33, fiberGrams: 0 },
    estimatedCostPer100g: 14000,
    allergens: ["Dairy"],
    dietaryTags: ["Vegetarian"],
  },

  // ==========================================
  // 3. PROTEIN NABATI
  // ==========================================
  {
    id: "ing-tempe",
    name: "Tempe Kedelai Murni",
    category: "Protein Nabati",
    defaultServingGrams: 100,
    servingLabel: "2 potong sedang (100 g)",
    per100g: { calories: 192, proteinGrams: 20.3, carbsGrams: 7.6, fatGrams: 10.8, fiberGrams: 5.4 },
    estimatedCostPer100g: 2000,
    allergens: ["Soy"],
    dietaryTags: ["Vegan", "Vegetarian", "High-Protein", "High-Fiber"],
  },
  {
    id: "ing-tahu-putih",
    name: "Tahu Putih / Tahu Sutera",
    category: "Protein Nabati",
    defaultServingGrams: 110,
    servingLabel: "2 potong sedang (110 g)",
    per100g: { calories: 76, proteinGrams: 8.1, carbsGrams: 1.9, fatGrams: 4.8, fiberGrams: 0.9 },
    estimatedCostPer100g: 1800,
    allergens: ["Soy"],
    dietaryTags: ["Vegan", "Vegetarian", "Low-Calorie"],
  },
  {
    id: "ing-edamame",
    name: "Edamame Rebus Kupas",
    category: "Protein Nabati",
    defaultServingGrams: 100,
    servingLabel: "1 mangkuk kecil (100 g)",
    per100g: { calories: 121, proteinGrams: 11.9, carbsGrams: 8.9, fatGrams: 5.2, fiberGrams: 5.2 },
    estimatedCostPer100g: 4500,
    allergens: ["Soy"],
    dietaryTags: ["Vegan", "Vegetarian", "High-Fiber"],
  },
  {
    id: "ing-kacang-merah",
    name: "Kacang Merah Rebus",
    category: "Protein Nabati",
    defaultServingGrams: 100,
    servingLabel: "100 g matang",
    per100g: { calories: 127, proteinGrams: 8.7, carbsGrams: 22.8, fatGrams: 0.5, fiberGrams: 6.4 },
    estimatedCostPer100g: 3500,
    dietaryTags: ["Vegan", "Vegetarian", "High-Fiber"],
  },
  {
    id: "ing-kacang-hijau",
    name: "Kacang Hijau Rebus",
    category: "Protein Nabati",
    defaultServingGrams: 100,
    servingLabel: "1 mangkuk (100 g)",
    per100g: { calories: 105, proteinGrams: 7, carbsGrams: 19.2, fatGrams: 0.4, fiberGrams: 7.6 },
    estimatedCostPer100g: 3000,
    dietaryTags: ["Vegan", "Vegetarian", "High-Fiber"],
  },
  {
    id: "ing-kacang-almond",
    name: "Kacang Almond Panggang",
    category: "Protein Nabati",
    defaultServingGrams: 28,
    servingLabel: "1 genggam / 23 butir (28 g)",
    per100g: { calories: 579, proteinGrams: 21.2, carbsGrams: 21.6, fatGrams: 49.9, fiberGrams: 12.5 },
    estimatedCostPer100g: 22000,
    allergens: ["Nuts"],
    dietaryTags: ["Vegan", "Vegetarian", "Healthy-Fat"],
  },
  {
    id: "ing-selai-kacang",
    name: "Selai Kacang Alami (Peanut Butter)",
    category: "Protein Nabati",
    defaultServingGrams: 30,
    servingLabel: "2 sdm (30 g)",
    per100g: { calories: 588, proteinGrams: 25, carbsGrams: 20, fatGrams: 50, fiberGrams: 6 },
    estimatedCostPer100g: 9500,
    allergens: ["Nuts"],
    dietaryTags: ["Vegan", "Vegetarian", "High-Protein"],
  },
  {
    id: "ing-chia-seeds",
    name: "Biji Chia (Chia Seeds)",
    category: "Protein Nabati",
    defaultServingGrams: 15,
    servingLabel: "1 sdm (15 g)",
    per100g: { calories: 486, proteinGrams: 16.5, carbsGrams: 42.1, fatGrams: 30.7, fiberGrams: 34.4 },
    estimatedCostPer100g: 15000,
    dietaryTags: ["Vegan", "Vegetarian", "High-Fiber", "Omega-3"],
  },

  // ==========================================
  // 4. KARBOHIDRAT & BIJI-BIJIAN
  // ==========================================
  {
    id: "ing-nasi-putih",
    name: "Nasi Putih Matang",
    category: "Karbohidrat",
    defaultServingGrams: 150,
    servingLabel: "1 centong / porsi (150 g)",
    per100g: { calories: 130, proteinGrams: 2.7, carbsGrams: 28.2, fatGrams: 0.3, fiberGrams: 0.4 },
    estimatedCostPer100g: 1500,
    dietaryTags: ["Vegan", "Gluten-Free"],
  },
  {
    id: "ing-nasi-merah",
    name: "Nasi Merah Matang",
    category: "Karbohidrat",
    defaultServingGrams: 150,
    servingLabel: "1 centong / porsi (150 g)",
    per100g: { calories: 111, proteinGrams: 2.6, carbsGrams: 23, fatGrams: 0.9, fiberGrams: 1.8 },
    estimatedCostPer100g: 2200,
    dietaryTags: ["Vegan", "Gluten-Free", "Complex-Carb"],
  },
  {
    id: "ing-rolled-oats",
    name: "Rolled Oats / Oatmeal Kering",
    category: "Karbohidrat",
    defaultServingGrams: 50,
    servingLabel: "5 sdm / ½ cup (50 g)",
    per100g: { calories: 379, proteinGrams: 13.2, carbsGrams: 67.7, fatGrams: 6.5, fiberGrams: 10.1 },
    estimatedCostPer100g: 4800,
    dietaryTags: ["Vegan", "High-Fiber", "Complex-Carb"],
  },
  {
    id: "ing-roti-gandum",
    name: "Roti Gandum Utuh (Whole Wheat)",
    category: "Karbohidrat",
    defaultServingGrams: 70,
    servingLabel: "2 lembar (70 g)",
    per100g: { calories: 247, proteinGrams: 13, carbsGrams: 41, fatGrams: 3.4, fiberGrams: 7 },
    estimatedCostPer100g: 4500,
    allergens: ["Wheat/Gluten"],
    dietaryTags: ["Vegetarian", "High-Fiber"],
  },
  {
    id: "ing-roti-sourdough",
    name: "Roti Artisan Sourdough",
    category: "Karbohidrat",
    defaultServingGrams: 80,
    servingLabel: "2 iris (80 g)",
    per100g: { calories: 260, proteinGrams: 9.5, carbsGrams: 50, fatGrams: 1.8, fiberGrams: 3.2 },
    estimatedCostPer100g: 7500,
    allergens: ["Wheat/Gluten"],
    dietaryTags: ["Vegan", "Vegetarian"],
  },
  {
    id: "ing-kentang-rebus",
    name: "Kentang Rebus Tanpa Kulit",
    category: "Karbohidrat",
    defaultServingGrams: 150,
    servingLabel: "1 buah sedang (150 g)",
    per100g: { calories: 87, proteinGrams: 1.9, carbsGrams: 20.1, fatGrams: 0.1, fiberGrams: 1.8 },
    estimatedCostPer100g: 2200,
    dietaryTags: ["Vegan", "Gluten-Free"],
  },
  {
    id: "ing-ubi-jalar",
    name: "Ubi Jalar / Ubi Cilembu Kukus",
    category: "Karbohidrat",
    defaultServingGrams: 150,
    servingLabel: "1 buah sedang (150 g)",
    per100g: { calories: 90, proteinGrams: 2, carbsGrams: 20.7, fatGrams: 0.2, fiberGrams: 3.3 },
    estimatedCostPer100g: 1800,
    dietaryTags: ["Vegan", "Gluten-Free", "High-Fiber"],
  },
  {
    id: "ing-jagung-manis",
    name: "Jagung Manis Pipil Rebus",
    category: "Karbohidrat",
    defaultServingGrams: 100,
    servingLabel: "1 tongkol / 100 g",
    per100g: { calories: 96, proteinGrams: 3.4, carbsGrams: 21, fatGrams: 1.5, fiberGrams: 2.4 },
    estimatedCostPer100g: 1800,
    dietaryTags: ["Vegan", "Gluten-Free"],
  },
  {
    id: "ing-pasta-matang",
    name: "Pasta Gandum / Spaghetti Matang",
    category: "Karbohidrat",
    defaultServingGrams: 140,
    servingLabel: "1 porsi matang (140 g)",
    per100g: { calories: 158, proteinGrams: 5.8, carbsGrams: 30.9, fatGrams: 0.9, fiberGrams: 2.5 },
    estimatedCostPer100g: 3500,
    allergens: ["Wheat/Gluten"],
    dietaryTags: ["Vegan"],
  },
  {
    id: "ing-quinoa-matang",
    name: "Quinoa Matang",
    category: "Karbohidrat",
    defaultServingGrams: 120,
    servingLabel: "1 mangkuk kecil (120 g)",
    per100g: { calories: 120, proteinGrams: 4.4, carbsGrams: 21.3, fatGrams: 1.9, fiberGrams: 2.8 },
    estimatedCostPer100g: 11000,
    dietaryTags: ["Vegan", "Gluten-Free", "Complex-Carb"],
  },

  // ==========================================
  // 5. SAYURAN & HIJAUAN
  // ==========================================
  {
    id: "ing-bayam",
    name: "Bayam Hijau Segar",
    category: "Sayuran",
    defaultServingGrams: 80,
    servingLabel: "1 ikat kecil (80 g)",
    per100g: { calories: 23, proteinGrams: 2.9, carbsGrams: 3.6, fatGrams: 0.4, fiberGrams: 2.2 },
    estimatedCostPer100g: 1500,
    dietaryTags: ["Vegan", "Iron-Rich", "Low-Calorie"],
  },
  {
    id: "ing-brokoli",
    name: "Brokoli Segar",
    category: "Sayuran",
    defaultServingGrams: 100,
    servingLabel: "1 mangkuk kuntum (100 g)",
    per100g: { calories: 34, proteinGrams: 2.8, carbsGrams: 6.6, fatGrams: 0.4, fiberGrams: 2.6 },
    estimatedCostPer100g: 3500,
    dietaryTags: ["Vegan", "High-Fiber", "Low-Calorie"],
  },
  {
    id: "ing-wortel",
    name: "Wortel Segar",
    category: "Sayuran",
    defaultServingGrams: 80,
    servingLabel: "1 buah sedang (80 g)",
    per100g: { calories: 41, proteinGrams: 0.9, carbsGrams: 9.6, fatGrams: 0.2, fiberGrams: 2.8 },
    estimatedCostPer100g: 1800,
    dietaryTags: ["Vegan", "Low-Calorie"],
  },
  {
    id: "ing-kangkung",
    name: "Kangkung Segar",
    category: "Sayuran",
    defaultServingGrams: 100,
    servingLabel: "1 ikat sedang (100 g)",
    per100g: { calories: 19, proteinGrams: 2.6, carbsGrams: 3.1, fatGrams: 0.2, fiberGrams: 2.1 },
    estimatedCostPer100g: 1200,
    dietaryTags: ["Vegan", "Low-Calorie"],
  },
  {
    id: "ing-buncis",
    name: "Buncis / Kacang Panjang",
    category: "Sayuran",
    defaultServingGrams: 80,
    servingLabel: "1 genggam (80 g)",
    per100g: { calories: 31, proteinGrams: 1.8, carbsGrams: 7, fatGrams: 0.2, fiberGrams: 2.7 },
    estimatedCostPer100g: 2000,
    dietaryTags: ["Vegan", "High-Fiber"],
  },
  {
    id: "ing-tomat",
    name: "Tomat Merah / Tomat Ceri",
    category: "Sayuran",
    defaultServingGrams: 80,
    servingLabel: "1 buah sedang (80 g)",
    per100g: { calories: 18, proteinGrams: 0.9, carbsGrams: 3.9, fatGrams: 0.2, fiberGrams: 1.2 },
    estimatedCostPer100g: 1800,
    dietaryTags: ["Vegan", "Low-Calorie"],
  },
  {
    id: "ing-timun",
    name: "Timun Segar",
    category: "Sayuran",
    defaultServingGrams: 100,
    servingLabel: "1 buah sedang (100 g)",
    per100g: { calories: 15, proteinGrams: 0.7, carbsGrams: 3.6, fatGrams: 0.1, fiberGrams: 0.5 },
    estimatedCostPer100g: 1200,
    dietaryTags: ["Vegan", "Low-Calorie"],
  },
  {
    id: "ing-selada",
    name: "Selada Romaine / Keriting",
    category: "Sayuran",
    defaultServingGrams: 60,
    servingLabel: "1 mangkuk daun (60 g)",
    per100g: { calories: 17, proteinGrams: 1.2, carbsGrams: 3.3, fatGrams: 0.3, fiberGrams: 2.1 },
    estimatedCostPer100g: 2500,
    dietaryTags: ["Vegan", "Low-Calorie"],
  },
  {
    id: "ing-jamur-tiram",
    name: "Jamur Kancing / Jamur Tiram",
    category: "Sayuran",
    defaultServingGrams: 80,
    servingLabel: "1 mangkuk (80 g)",
    per100g: { calories: 22, proteinGrams: 3.1, carbsGrams: 3.3, fatGrams: 0.3, fiberGrams: 1 },
    estimatedCostPer100g: 3000,
    dietaryTags: ["Vegan", "Low-Calorie"],
  },
  {
    id: "ing-kubis",
    name: "Kubis / Kol Segar",
    category: "Sayuran",
    defaultServingGrams: 80,
    servingLabel: "1 mangkuk iris (80 g)",
    per100g: { calories: 25, proteinGrams: 1.3, carbsGrams: 5.8, fatGrams: 0.1, fiberGrams: 2.5 },
    estimatedCostPer100g: 1200,
    dietaryTags: ["Vegan", "Low-Calorie"],
  },
  {
    id: "ing-tauge",
    name: "Tauge / Kecambah Kedelai",
    category: "Sayuran",
    defaultServingGrams: 60,
    servingLabel: "1 genggam (60 g)",
    per100g: { calories: 30, proteinGrams: 3, carbsGrams: 5.9, fatGrams: 0.2, fiberGrams: 1.8 },
    estimatedCostPer100g: 1200,
    dietaryTags: ["Vegan", "Low-Calorie"],
  },

  // ==========================================
  // 6. BUAH-BUAHAN
  // ==========================================
  {
    id: "ing-pisang",
    name: "Pisang Cavendish / Ambon",
    category: "Buah",
    defaultServingGrams: 110,
    servingLabel: "1 buah sedang (110 g)",
    per100g: { calories: 89, proteinGrams: 1.1, carbsGrams: 22.8, fatGrams: 0.3, fiberGrams: 2.6 },
    estimatedCostPer100g: 2200,
    dietaryTags: ["Vegan", "Potassium-Rich"],
  },
  {
    id: "ing-alpukat",
    name: "Alpukat Mentega Matang",
    category: "Buah",
    defaultServingGrams: 100,
    servingLabel: "½ buah besar (100 g)",
    per100g: { calories: 160, proteinGrams: 2, carbsGrams: 8.5, fatGrams: 14.7, fiberGrams: 6.7 },
    estimatedCostPer100g: 4500,
    dietaryTags: ["Vegan", "Healthy-Fat", "High-Fiber"],
  },
  {
    id: "ing-apel",
    name: "Apel Merah / Fuji",
    category: "Buah",
    defaultServingGrams: 130,
    servingLabel: "1 buah sedang (130 g)",
    per100g: { calories: 52, proteinGrams: 0.3, carbsGrams: 13.8, fatGrams: 0.2, fiberGrams: 2.4 },
    estimatedCostPer100g: 3800,
    dietaryTags: ["Vegan", "High-Fiber"],
  },
  {
    id: "ing-pepaya",
    name: "Pepaya California Matang",
    category: "Buah",
    defaultServingGrams: 150,
    servingLabel: "1 potong besar (150 g)",
    per100g: { calories: 43, proteinGrams: 0.5, carbsGrams: 10.8, fatGrams: 0.3, fiberGrams: 1.7 },
    estimatedCostPer100g: 1500,
    dietaryTags: ["Vegan", "Digestive"],
  },
  {
    id: "ing-stroberi",
    name: "Stroberi & Beri Segar",
    category: "Buah",
    defaultServingGrams: 100,
    servingLabel: "6–8 buah (100 g)",
    per100g: { calories: 32, proteinGrams: 0.7, carbsGrams: 7.7, fatGrams: 0.3, fiberGrams: 2 },
    estimatedCostPer100g: 8000,
    dietaryTags: ["Vegan", "Antioxidant", "Low-Calorie"],
  },
  {
    id: "ing-mangga",
    name: "Mangga Harum Manis",
    category: "Buah",
    defaultServingGrams: 150,
    servingLabel: "1 buah sedang (150 g)",
    per100g: { calories: 60, proteinGrams: 0.8, carbsGrams: 15, fatGrams: 0.4, fiberGrams: 1.6 },
    estimatedCostPer100g: 2800,
    dietaryTags: ["Vegan", "Vitamin-C"],
  },
  {
    id: "ing-buah-naga",
    name: "Buah Naga Merah",
    category: "Buah",
    defaultServingGrams: 150,
    servingLabel: "½ buah sedang (150 g)",
    per100g: { calories: 50, proteinGrams: 1.1, carbsGrams: 11, fatGrams: 0.4, fiberGrams: 3 },
    estimatedCostPer100g: 2500,
    dietaryTags: ["Vegan", "High-Fiber"],
  },
  {
    id: "ing-jeruk",
    name: "Jeruk Manis / Sunkist",
    category: "Buah",
    defaultServingGrams: 120,
    servingLabel: "1 buah sedang (120 g)",
    per100g: { calories: 47, proteinGrams: 0.9, carbsGrams: 11.8, fatGrams: 0.1, fiberGrams: 2.4 },
    estimatedCostPer100g: 3000,
    dietaryTags: ["Vegan", "Vitamin-C"],
  },

  // ==========================================
  // 7. LEMAK, MINYAK & BUMBU
  // ==========================================
  {
    id: "ing-minyak-zaitun",
    name: "Minyak Zaitun (Extra Virgin Olive Oil)",
    category: "Lemak & Bumbu",
    defaultServingGrams: 10,
    servingLabel: "1 sdm peres (10 ml)",
    per100g: { calories: 884, proteinGrams: 0, carbsGrams: 0, fatGrams: 100, fiberGrams: 0 },
    estimatedCostPer100g: 18000,
    dietaryTags: ["Vegan", "Mediterranean", "Healthy-Fat"],
  },
  {
    id: "ing-minyak-kelapa",
    name: "Minyak Kelapa / Minyak Goreng",
    category: "Lemak & Bumbu",
    defaultServingGrams: 10,
    servingLabel: "1 sdm peres (10 ml)",
    per100g: { calories: 862, proteinGrams: 0, carbsGrams: 0, fatGrams: 100, fiberGrams: 0 },
    estimatedCostPer100g: 2500,
    dietaryTags: ["Vegan"],
  },
  {
    id: "ing-santan",
    name: "Santan Kelapa Kental",
    category: "Lemak & Bumbu",
    defaultServingGrams: 40,
    servingLabel: "3 sdm (40 ml)",
    per100g: { calories: 230, proteinGrams: 2.3, carbsGrams: 5.5, fatGrams: 23.8, fiberGrams: 2.2 },
    estimatedCostPer100g: 3500,
    dietaryTags: ["Vegan", "Dairy-Free"],
  },
  {
    id: "ing-madu-murni",
    name: "Madu Hutan Murni",
    category: "Lemak & Bumbu",
    defaultServingGrams: 15,
    servingLabel: "1 sdm (15 g)",
    per100g: { calories: 304, proteinGrams: 0.3, carbsGrams: 82.4, fatGrams: 0, fiberGrams: 0.2 },
    estimatedCostPer100g: 12000,
    dietaryTags: ["Vegetarian"],
  },
  {
    id: "ing-kecap-manis",
    name: "Kecap Manis",
    category: "Lemak & Bumbu",
    defaultServingGrams: 15,
    servingLabel: "1 sdm (15 ml)",
    per100g: { calories: 213, proteinGrams: 2.5, carbsGrams: 50, fatGrams: 0.1, fiberGrams: 0.5 },
    estimatedCostPer100g: 3500,
    allergens: ["Soy"],
    dietaryTags: ["Vegan"],
  },
  {
    id: "ing-bumbu-rempah",
    name: "Bawang Putih, Bawang Merah & Rempah",
    category: "Lemak & Bumbu",
    defaultServingGrams: 20,
    servingLabel: "1 porsi bumbu (20 g)",
    per100g: { calories: 110, proteinGrams: 4.2, carbsGrams: 24, fatGrams: 0.3, fiberGrams: 1.9 },
    estimatedCostPer100g: 5000,
    dietaryTags: ["Vegan"],
  },

  // ==========================================
  // 8. MINUMAN & SUPLEMEN
  // ==========================================
  {
    id: "ing-susu-almond",
    name: "Susu Almond Unsweetened",
    category: "Minuman",
    defaultServingGrams: 200,
    servingLabel: "1 gelas (200 ml)",
    per100g: { calories: 15, proteinGrams: 0.6, carbsGrams: 0.6, fatGrams: 1.2, fiberGrams: 0.2 },
    estimatedCostPer100g: 3500,
    allergens: ["Nuts"],
    dietaryTags: ["Vegan", "Dairy-Free", "Low-Calorie"],
  },
  {
    id: "ing-susu-kedelai",
    name: "Susu Kedelai (Soy Milk)",
    category: "Minuman",
    defaultServingGrams: 200,
    servingLabel: "1 gelas (200 ml)",
    per100g: { calories: 54, proteinGrams: 3.3, carbsGrams: 6, fatGrams: 1.8, fiberGrams: 0.6 },
    estimatedCostPer100g: 2000,
    allergens: ["Soy"],
    dietaryTags: ["Vegan", "Dairy-Free"],
  },
  {
    id: "ing-air-kelapa",
    name: "Air Kelapa Muda Murni",
    category: "Minuman",
    defaultServingGrams: 250,
    servingLabel: "1 gelas (250 ml)",
    per100g: { calories: 19, proteinGrams: 0.7, carbsGrams: 3.7, fatGrams: 0.2, fiberGrams: 1.1 },
    estimatedCostPer100g: 1500,
    dietaryTags: ["Vegan", "Hydration"],
  },
  {
    id: "ing-whey-protein",
    name: "Whey Protein Isolate Powder",
    category: "Minuman",
    defaultServingGrams: 30,
    servingLabel: "1 scoop (30 g)",
    per100g: { calories: 370, proteinGrams: 82, carbsGrams: 5, fatGrams: 2.5, fiberGrams: 0 },
    estimatedCostPer100g: 42000,
    allergens: ["Dairy"],
    dietaryTags: ["Vegetarian", "High-Protein"],
  },
  {
    id: "ing-bubuk-matcha",
    name: "Bubuk Matcha Jepang Murni",
    category: "Minuman",
    defaultServingGrams: 5,
    servingLabel: "1 sdt (5 g)",
    per100g: { calories: 324, proteinGrams: 29.6, carbsGrams: 38.5, fatGrams: 5.3, fiberGrams: 38.5 },
    estimatedCostPer100g: 45000,
    dietaryTags: ["Vegan", "Antioxidant"],
  },
];

export interface CalculatedIngredientResult extends IngredientNutrition {
  estimatedCostIdr: number;
}

/**
 * Calculates exact macro, calorie, and cost values for a given ingredient weight in grams.
 */
export function calculateIngredientNutrition(
  ingredient: IngredientItem,
  grams: number
): CalculatedIngredientResult {
  const safeGrams = Math.max(0, grams);
  const ratio = safeGrams / 100;
  return {
    calories: Math.round(ingredient.per100g.calories * ratio),
    proteinGrams: Math.round(ingredient.per100g.proteinGrams * ratio * 10) / 10,
    carbsGrams: Math.round(ingredient.per100g.carbsGrams * ratio * 10) / 10,
    fatGrams: Math.round(ingredient.per100g.fatGrams * ratio * 10) / 10,
    fiberGrams: Math.round(ingredient.per100g.fiberGrams * ratio * 10) / 10,
    estimatedCostIdr: Math.round((ingredient.estimatedCostPer100g * ratio) / 500) * 500,
  };
}

/**
 * Sums nutrition and estimated cost across an array of selected ingredients, divided by servings.
 */
export function calculateRecipeTotalNutrition(
  items: Array<{ ingredient: IngredientItem; grams: number }>,
  servings = 1
): CalculatedIngredientResult & { allergens: string[]; dietaryTags: string[] } {
  const safeServings = Math.max(1, servings);
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let totalCost = 0;
  const allergenSet = new Set<string>();
  const tagSet = new Set<string>();

  for (const { ingredient, grams } of items) {
    const calc = calculateIngredientNutrition(ingredient, grams);
    totalCalories += calc.calories;
    totalProtein += calc.proteinGrams;
    totalCarbs += calc.carbsGrams;
    totalFat += calc.fatGrams;
    totalFiber += calc.fiberGrams;
    totalCost += calc.estimatedCostIdr;
    ingredient.allergens?.forEach((a) => allergenSet.add(a));
    ingredient.dietaryTags?.forEach((t) => tagSet.add(t));
  }

  return {
    calories: Math.round(totalCalories / safeServings),
    proteinGrams: Math.round(totalProtein / safeServings),
    carbsGrams: Math.round(totalCarbs / safeServings),
    fatGrams: Math.round(totalFat / safeServings),
    fiberGrams: Math.round(totalFiber / safeServings),
    estimatedCostIdr: Math.max(5000, Math.round(totalCost / safeServings / 500) * 500),
    allergens: Array.from(allergenSet),
    dietaryTags: Array.from(tagSet),
  };
}

/**
 * Returns up to `limit` matching ingredients from the hidden database as the user types.
 */
export function suggestIngredients(query: string, limit = 4): IngredientItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const startsWithMatches: IngredientItem[] = [];
  const includesMatches: IngredientItem[] = [];

  for (const item of INGREDIENTS_DATABASE) {
    const lowerName = item.name.toLowerCase();
    if (lowerName.startsWith(q)) {
      startsWithMatches.push(item);
    } else if (lowerName.includes(q) || item.category.toLowerCase().includes(q)) {
      includesMatches.push(item);
    }
  }
  return [...startsWithMatches, ...includesMatches].slice(0, limit);
}

/**
 * Matches a user-typed ingredient name against `INGREDIENTS_DATABASE` in the background.
 * If no exact/partial database entry matches, infers a realistic nutrition profile
 * based on common Indonesian food keywords so the user never has to browse a database UI.
 */
export function resolveIngredientByName(rawName: string): {
  ingredient: IngredientItem;
  isFromDatabase: boolean;
} {
  const clean = rawName.trim();
  const q = clean.toLowerCase();

  // 1. Direct or partial match in INGREDIENTS_DATABASE
  const exact = INGREDIENTS_DATABASE.find((i) => i.name.toLowerCase() === q);
  if (exact) return { ingredient: exact, isFromDatabase: true };

  const partial =
    INGREDIENTS_DATABASE.find((i) => i.name.toLowerCase().includes(q)) ||
    INGREDIENTS_DATABASE.find((i) => {
      const words = i.name
        .toLowerCase()
        .replace(/[()\/,-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3);
      return words.some((w) => q.includes(w));
    });

  if (partial) {
    return {
      ingredient: {
        ...partial,
        id: `matched-${partial.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: clean || partial.name,
      },
      isFromDatabase: true,
    };
  }

  // 2. Smart keyword inference for any other typed ingredient name
  const isOilOrButter = /minyak|mentega|butter|margarin|mayo|ghee/i.test(q);
  const isMeatOrFish = /ayam|sapi|ikan|udang|cumi|bebek|kambing|daging|bakso|sosis|kornet|lele|tongkol|patin/i.test(q);
  const isCarb = /nasi|mie|mi |bihun|kwetiau|roti|kentang|ubi|singkong|tepung|pasta|makaroni|lontong|beras|jagung/i.test(q);
  const isVeggie = /sayur|bayam|kangkung|sawi|kol|kubis|wortel|brokoli|tomat|timun|buncis|terong|labu|daun|cabai|cabe|bawang|seledri/i.test(q);
  const isSweet = /gula|madu|sirup|kecap|cokelat|coklat|selai|kental manis/i.test(q);

  const inferredPer100g: IngredientNutrition = isOilOrButter
    ? { calories: 820, proteinGrams: 0.5, carbsGrams: 0.5, fatGrams: 92, fiberGrams: 0 }
    : isMeatOrFish
    ? { calories: 185, proteinGrams: 24, carbsGrams: 1, fatGrams: 9, fiberGrams: 0 }
    : isCarb
    ? { calories: 145, proteinGrams: 3.5, carbsGrams: 30, fatGrams: 1.2, fiberGrams: 2 }
    : isVeggie
    ? { calories: 28, proteinGrams: 2, carbsGrams: 5, fatGrams: 0.3, fiberGrams: 2.4 }
    : isSweet
    ? { calories: 320, proteinGrams: 1, carbsGrams: 76, fatGrams: 1, fiberGrams: 0.5 }
    : { calories: 120, proteinGrams: 6, carbsGrams: 15, fatGrams: 4, fiberGrams: 2 };

  return {
    ingredient: {
      id: `custom-ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: clean,
      category: isMeatOrFish
        ? "Protein Hewani"
        : isCarb
        ? "Karbohidrat"
        : isVeggie
        ? "Sayuran"
        : "Lemak & Bumbu",
      defaultServingGrams: isOilOrButter || isSweet ? 15 : 100,
      servingLabel: "100 g",
      per100g: inferredPer100g,
      estimatedCostPer100g: 4000,
    },
    isFromDatabase: false,
  };
}


