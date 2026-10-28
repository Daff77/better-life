import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatIdr,
  formatGrams,
  getAdherenceBadge,
  buildAccessibleDayDescription,
  DailyAnalyticsPoint,
} from "../analyticsDomain";

describe("Mobile Analytics Domain Unit Tests", () => {
  describe("1. Currency & Tabular Number Formatting", () => {
    it("should format IDR prices cleanly with regional thousand separators", () => {
      assert.equal(formatIdr(65000), "Rp 65.000");
      assert.equal(formatIdr(1500000), "Rp 1.500.000");
      assert.equal(formatIdr(0), "Rp 0");
      assert.equal(formatIdr(-500), "Rp 0");
    });

    it("should format macro grams with tabular precision", () => {
      assert.equal(formatGrams(120), "120g");
      assert.equal(formatGrams(45.6), "46g");
      assert.equal(formatGrams(0), "0g");
      assert.equal(formatGrams(-10), "0g");
    });
  });

  describe("2. Adherence Status Badges", () => {
    it("should return correct labels and colors for adherence states", () => {
      const onTarget = getAdherenceBadge("on_target");
      assert.equal(onTarget.label, "On Target");
      assert.equal(onTarget.bgColor, "#eaf2ec");
      assert.equal(onTarget.textColor, "#153e28");

      const underTarget = getAdherenceBadge("under_target");
      assert.equal(underTarget.label, "Under Target");
      assert.equal(underTarget.textColor, "#1d4ed8");

      const overTarget = getAdherenceBadge("over_target");
      assert.equal(overTarget.label, "Above Target");
      assert.equal(overTarget.textColor, "#b45309");

      const noData = getAdherenceBadge("no_data");
      assert.equal(noData.label, "No Data Logged");
      assert.equal(noData.textColor, "#787670");
    });
  });

  describe("3. Accessible Narrative Generator", () => {
    it("should generate clear narrative for unlogged days", () => {
      const point: DailyAnalyticsPoint = {
        date: "2026-10-24",
        dayLabel: "Fri 24",
        hasData: false,
        calories: 0,
        proteinGrams: 0,
        carbsGrams: 0,
        fatGrams: 0,
        fiberGrams: 0,
        estimatedCostIdr: 0,
        targetCalories: 2000,
        calorieDelta: -2000,
        adherenceStatus: "no_data",
        mealCount: 0,
        meals: [],
      };

      const narrative = buildAccessibleDayDescription(point);
      assert.equal(narrative, "Fri 24: No meals were logged for this day.");
    });

    it("should generate detailed narrative for days with meals", () => {
      const point: DailyAnalyticsPoint = {
        date: "2026-10-25",
        dayLabel: "Sat 25",
        hasData: true,
        calories: 2050,
        proteinGrams: 140,
        carbsGrams: 210,
        fatGrams: 55,
        fiberGrams: 28,
        estimatedCostIdr: 85000,
        targetCalories: 2000,
        calorieDelta: 50,
        adherenceStatus: "on_target",
        mealCount: 3,
        meals: [],
      };

      const narrative = buildAccessibleDayDescription(point);
      assert.match(narrative, /Sat 25: 2050 calories logged from 3 meals/);
      assert.match(narrative, /Protein: 140 grams/);
      assert.match(narrative, /Carbohydrates: 210 grams/);
      assert.match(narrative, /50 calories above target/);
    });
  });
});
