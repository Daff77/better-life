"use strict";

/**
 * Shared single source of truth for Better Life:
 * 1. Local calendar date utilities (consistent across midnight in UTC+7 / any timezone)
 * 2. Allergy & dietary restriction rules (never relaxed when no safe candidate exists)
 * 3. Transparent menu selection explanations & ingredient verification warnings
 */

function formatLocalDateKey(date) {
  const d = date instanceof Date ? date : date ? new Date(date) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function shiftCalendarDateKey(dateKey, deltaDays) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  const ry = utcNoon.getUTCFullYear();
  const rm = String(utcNoon.getUTCMonth() + 1).padStart(2, "0");
  const rd = String(utcNoon.getUTCDate()).padStart(2, "0");
  return `${ry}-${rm}-${rd}`;
}

function buildLocalDateWindow(range, customStart, customEnd, referenceDate) {
  if (range === "custom") {
    if (!isValidDateKey(customStart) || !isValidDateKey(customEnd)) {
      throw new Error("Rentang tanggal khusus memerlukan tanggal mulai dan selesai yang valid (YYYY-MM-DD).");
    }
    if (customStart > customEnd) {
      throw new Error("Tanggal mulai tidak boleh melebihi tanggal selesai.");
    }
    const keys = [];
    let cursor = customStart;
    let guard = 0;
    while (cursor <= customEnd && guard < 731) {
      keys.push(cursor);
      cursor = shiftCalendarDateKey(cursor, 1);
      guard++;
    }
    return keys;
  }

  const daysCount = range === "30d" ? 30 : 7;
  const endKey = isValidDateKey(referenceDate)
    ? referenceDate
    : formatLocalDateKey(referenceDate || new Date());

  const keys = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    keys.push(shiftCalendarDateKey(endKey, -i));
  }
  return keys;
}

// Comprehensive bilingual (English + Indonesian) allergen keyword map
const ALLERGEN_KEYWORD_MAP = {
  lactose: [
    "milk",
    "susu",
    "cheese",
    "keju",
    "yogurt",
    "yoghurt",
    "butter",
    "mentega",
    "cream",
    "krim",
    "dairy",
    "lactose",
    "laktosa",
    "whey",
    "mozzarella",
    "parmesan",
    "feta",
  ],
  dairy: [
    "dairy",
    "lactose",
    "laktosa",
    "milk",
    "susu",
    "yogurt",
    "yoghurt",
    "cheese",
    "keju",
    "butter",
    "mentega",
    "cream",
    "krim",
    "whey",
    "mozzarella",
    "parmesan",
    "feta",
  ],
  nuts: [
    "almond",
    "walnut",
    "cashew",
    "mede",
    "mete",
    "pecan",
    "pistachio",
    "hazelnut",
    "macadamia",
    "peanut",
    "peanuts",
    "kacang tanah",
    "selai kacang",
    "nuts",
    "tree nuts",
  ],
  "tree nuts": [
    "tree nuts",
    "almond",
    "walnut",
    "cashew",
    "mede",
    "mete",
    "pecan",
    "pistachio",
    "hazelnut",
    "macadamia",
  ],
  peanuts: ["peanut", "peanuts", "kacang tanah", "selai kacang"],
  seafood: [
    "fish",
    "ikan",
    "salmon",
    "tuna",
    "cod",
    "dori",
    "kakap",
    "snapper",
    "sea bass",
    "tongkol",
    "cakalang",
    "shrimp",
    "prawn",
    "udang",
    "crab",
    "kepiting",
    "lobster",
    "shellfish",
    "kerang",
    "squid",
    "cumi",
    "seafood",
  ],
  fish: [
    "fish",
    "ikan",
    "salmon",
    "cod",
    "tuna",
    "snapper",
    "sea bass",
    "dori",
    "kakap",
    "tongkol",
    "cakalang",
  ],
  shellfish: [
    "shellfish",
    "shrimp",
    "prawn",
    "udang",
    "crab",
    "kepiting",
    "lobster",
    "kerang",
    "cumi",
    "squid",
  ],
  eggs: ["egg", "eggs", "telur", "mayonnaise", "mayones"],
  egg: ["egg", "eggs", "telur", "mayonnaise", "mayones"],
  "wheat/gluten": [
    "wheat",
    "gandum",
    "gluten",
    "sourdough",
    "bread",
    "roti",
    "flour",
    "terigu",
    "pasta",
    "noodle",
    "mie",
    "couscous",
    "barley",
  ],
  gluten: [
    "wheat",
    "gandum",
    "gluten",
    "sourdough",
    "bread",
    "roti",
    "flour",
    "terigu",
    "pasta",
    "noodle",
    "mie",
    "couscous",
    "barley",
  ],
  soy: [
    "soy",
    "kedelai",
    "tempeh",
    "tempe",
    "tofu",
    "tahu",
    "edamame",
    "tamari",
    "soy sauce",
    "kecap",
    "miso",
  ],
};

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsKeyword(haystack, keyword) {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return false;
  // Avoid matching plant milks ("almond milk", "oat milk", "coconut milk", "santan") as cow dairy milk
  if (kw === "milk" || kw === "susu") {
    const scrubbed = haystack.replace(
      /\b(almond|oat|soy|coconut|cashew|rice)\s+(milk|susu)\b|\b(susu)\s+(almond|oat|kedelai)\b/gi,
      ""
    );
    return new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i").test(scrubbed);
  }
  if (kw === "butter" || kw === "mentega") {
    const scrubbed = haystack.replace(/\b(peanut|almond|cashew)\s+butter\b/gi, "");
    return new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i").test(scrubbed);
  }
  return new RegExp(`\\b${escapeRegExp(kw)}(s|es)?\\b`, "i").test(haystack);
}

function checkRecipeAllergies(recipe, allergies) {
  if (!Array.isArray(allergies) || allergies.length === 0) {
    return { safe: true };
  }

  const normAllergies = allergies
    .map((a) => String(a || "").toLowerCase().trim())
    .filter(Boolean);
  if (normAllergies.length === 0) return { safe: true };

  const recipeTags = Array.isArray(recipe.allergens) ? recipe.allergens : [];
  for (const ra of recipeTags) {
    const normRa = String(ra).toLowerCase().trim();
    for (const ua of normAllergies) {
      const mappedForUser = ALLERGEN_KEYWORD_MAP[ua] || [ua];
      if (
        normRa === ua ||
        normRa.includes(ua) ||
        ua.includes(normRa) ||
        mappedForUser.some((k) => normRa.includes(k))
      ) {
        return { safe: false, violatedAllergen: ra };
      }
    }
  }

  const ingredientsText = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
    .map((i) => String(i.name || "").toLowerCase())
    .join(" | ");
  const fullText = `${String(recipe.title || "").toLowerCase()} | ${ingredientsText}`;

  for (const ua of normAllergies) {
    const keywords = ALLERGEN_KEYWORD_MAP[ua] || [ua];
    for (const kw of keywords) {
      if (containsKeyword(fullText, kw)) {
        return { safe: false, violatedAllergen: ua };
      }
    }
    // Direct substring check for custom multi-word ingredient names passed as exclusions
    if (ua.length >= 3 && ingredientsText.includes(ua)) {
      return { safe: false, violatedAllergen: ua };
    }
  }

  return { safe: true };
}

function checkRecipeDietaryRestrictions(recipe, restrictions) {
  if (!Array.isArray(restrictions) || restrictions.length === 0) {
    return { compliant: true };
  }

  const normRestrictions = restrictions
    .map((r) => String(r || "").toLowerCase().trim())
    .filter(Boolean);
  if (normRestrictions.length === 0) return { compliant: true };

  const tags = (Array.isArray(recipe.dietaryTags) ? recipe.dietaryTags : []).map((t) =>
    String(t).toLowerCase()
  );
  const ingredientsText = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
    .map((i) => String(i.name || "").toLowerCase())
    .join(" | ");
  const combined = `${String(recipe.title || "").toLowerCase()} | ${ingredientsText}`;

  for (const r of normRestrictions) {
    if (r === "vegetarian") {
      const hasMeatOrFish =
        /\b(chicken|ayam|beef|sapi|steak|sirloin|tenderloin|wagyu|salmon|fish|ikan|cod|tuna|dori|pork|babi|lamb|kambing|shrimp|prawn|udang|crab|kepiting)\b/i.test(
          combined
        );
      if (hasMeatOrFish) {
        return { compliant: false, violatedRestriction: "Vegetarian" };
      }
    }

    if (r === "vegan") {
      const hasAnimalProduct =
        /\b(chicken|ayam|beef|sapi|steak|sirloin|tenderloin|wagyu|salmon|fish|ikan|cod|tuna|dori|pork|babi|lamb|kambing|shrimp|prawn|udang|egg|eggs|telur|yogurt|yoghurt|cheese|keju|honey|madu|whey)\b/i.test(
          combined
        ) ||
        containsKeyword(combined, "milk") ||
        containsKeyword(combined, "susu") ||
        containsKeyword(combined, "butter") ||
        containsKeyword(combined, "mentega");
      if (hasAnimalProduct) {
        return { compliant: false, violatedRestriction: "Vegan" };
      }
    }

    if (r === "pescatarian") {
      const hasLandMeat =
        /\b(chicken|ayam|beef|sapi|steak|sirloin|tenderloin|wagyu|pork|babi|lamb|kambing|bebek|duck)\b/i.test(
          combined
        );
      if (hasLandMeat) {
        return { compliant: false, violatedRestriction: "Pescatarian" };
      }
    }

    if (r === "halal") {
      const hasNonHalal =
        /\b(pork|babi|bacon|ham|lard|mirin|sake|wine|alcohol|rum|beer)\b/i.test(combined);
      if (hasNonHalal) {
        return { compliant: false, violatedRestriction: "Halal" };
      }
    }

    if (r === "gluten-free") {
      const checkGluten = checkRecipeAllergies(recipe, ["wheat/gluten"]);
      if (!checkGluten.safe && !tags.includes("gluten-free")) {
        return { compliant: false, violatedRestriction: "Gluten-Free" };
      }
    }

    if (r === "dairy-free") {
      const checkDairy = checkRecipeAllergies(recipe, ["dairy"]);
      if (!checkDairy.safe && !tags.includes("dairy-free")) {
        return { compliant: false, violatedRestriction: "Dairy-Free" };
      }
    }

    if (r === "keto") {
      const carbs = Number(recipe.nutrition?.carbsGrams ?? 0);
      if (carbs > 25) {
        return { compliant: false, violatedRestriction: "Keto" };
      }
    }
  }

  return { compliant: true };
}

function isRecipeEligible(recipe, preferences) {
  const allergies = preferences?.allergies || [];
  const restrictions = preferences?.dietaryRestrictions || [];

  const allergyRes = checkRecipeAllergies(recipe, allergies);
  if (!allergyRes.safe) return false;

  const dietRes = checkRecipeDietaryRestrictions(recipe, restrictions);
  if (!dietRes.compliant) return false;

  return true;
}

function filterEligibleRecipes(recipes, preferences) {
  return (Array.isArray(recipes) ? recipes : []).filter((r) =>
    isRecipeEligible(r, preferences)
  );
}

/**
 * Inspects recipe ingredients and highlights items whose packaging/preparation
 * should be double-checked by the user (e.g. sauces, condiments, cross-contact items).
 */
function inspectIngredientsToVerify(recipe, userAllergies) {
  const cautions = [];
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const normUserAllergies = (Array.isArray(userAllergies) ? userAllergies : []).map((a) =>
    String(a).toLowerCase().trim()
  );

  const packagedRules = [
    {
      pattern: /\b(soy sauce|kecap|teriyaki|tamari|miso|oyster sauce|saus tiram)\b/i,
      reason: "Saus fermentasi/kemasan: periksa kandungan kedelai, gandum (gluten), dan kadar natrium pada label.",
    },
    {
      pattern: /\b(bread|roti|sourdough|tortilla|wrap|pasta|oats|oatmeal)\b/i,
      reason: "Produk serealia/roti: pastikan label bebas gluten atau susu bila Anda sensitif.",
    },
    {
      pattern: /\b(yogurt|yoghurt|cheese|keju|milk|susu)\b/i,
      reason: "Produk olahan susu: pilih varian tanpa gula tambahan dan periksa toleransi laktosa.",
    },
    {
      pattern: /\b(broth|kaldu|stock|dressing|mayo|mayonnaise|saus)\b/i,
      reason: "Bumbu/kaldu siap pakai: periksa komposisi alergen tersembunyi (telur, susu, MSG, atau pengawet).",
    },
    {
      pattern: /\b(chia|sesame|wijen|peanut|almond|walnut|cashew|kacang)\b/i,
      reason: "Biji-bijian/kacang: periksa potensi kontaminasi silang kacang pohon pada fasilitas produksi.",
    },
  ];

  for (const ing of ingredients) {
    const name = String(ing.name || "").trim();
    if (!name) continue;
    for (const rule of packagedRules) {
      if (rule.pattern.test(name)) {
        cautions.push({
          ingredient: name,
          amount: ing.amount || "",
          note: rule.reason,
        });
        break;
      }
    }
  }

  if (normUserAllergies.length > 0 && cautions.length === 0 && ingredients.length > 0) {
    cautions.push({
      ingredient: ingredients[0].name,
      amount: ingredients[0].amount || "",
      note: `Pastikan seluruh bahan segar bebas kontaminasi silang terhadap alergi Anda (${userAllergies.join(", ")}).`,
    });
  }

  return cautions;
}

/**
 * Generates concise, factual Indonesian reasons why a recipe fits the user's slot & profile.
 */
function explainRecipeSelection(recipe, context) {
  const reasons = [];
  const kcal = Number(recipe.calories || 0);
  const slotTarget = Number(context?.slotCalorieTarget || 0);
  const protein = Number(recipe.nutrition?.proteinGrams || 0);
  const fiber = Number(recipe.nutrition?.fiberGrams || 0);
  const cost = Number(recipe.estimatedCostIdr || 0);
  const dailyBudget = Number(context?.dailyBudgetIdr || 0);
  const allergies = Array.isArray(context?.allergies) ? context.allergies : [];
  const restrictions = Array.isArray(context?.dietaryRestrictions)
    ? context.dietaryRestrictions
    : [];

  if (slotTarget > 0) {
    const diff = Math.abs(kcal - slotTarget);
    if (diff <= 120) {
      reasons.push(`Kalori pas dengan target waktu makan (${kcal} dari ~${slotTarget} kcal)`);
    } else {
      reasons.push(`Menyumbang ${kcal} kcal terukur untuk keseimbangan harian`);
    }
  } else {
    reasons.push(`${kcal} kcal per porsi terukur`);
  }

  if (protein >= 20) {
    reasons.push(`Tinggi protein (${protein}g) untuk menjaga rasa kenyang & otot`);
  } else if (fiber >= 6) {
    reasons.push(`Kaya serat pangan (${fiber}g) untuk pencernaan stabil`);
  }

  if (cost > 0) {
    if (dailyBudget > 0 && cost <= Math.round(dailyBudget * 0.4)) {
      reasons.push(`Estimasi Rp ${cost.toLocaleString("id-ID")} sesuai anggaran harian`);
    } else {
      reasons.push(`Estimasi biaya bahan Rp ${cost.toLocaleString("id-ID")}`);
    }
  }

  if (allergies.length > 0 || restrictions.length > 0) {
    const labels = [...restrictions, ...allergies.map((a) => `bebas ${a}`)];
    reasons.push(`Memenuhi filter ${labels.slice(0, 3).join(", ")}`);
  }

  return reasons;
}

module.exports = {
  ALLERGEN_KEYWORD_MAP,
  formatLocalDateKey,
  isValidDateKey,
  shiftCalendarDateKey,
  buildLocalDateWindow,
  checkRecipeAllergies,
  checkRecipeDietaryRestrictions,
  isRecipeEligible,
  filterEligibleRecipes,
  inspectIngredientsToVerify,
  explainRecipeSelection,
};
