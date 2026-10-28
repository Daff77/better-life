import { create } from "zustand";
import {
  DateRangeOption,
  AdvancedAnalyticsResponse,
  DailyAnalyticsPoint,
} from "../lib/analyticsDomain";
import { analyticsApi } from "../lib/api/analyticsApi";

interface AnalyticsState {
  range: DateRangeOption;
  startDate?: string;
  endDate?: string;
  analyticsData: AdvancedAnalyticsResponse | null;
  selectedPoint: DailyAnalyticsPoint | null;
  isLoading: boolean;
  error: string | null;

  setRange: (range: DateRangeOption, start?: string, end?: string) => Promise<void>;
  setSelectedPoint: (point: DailyAnalyticsPoint | null) => void;
  fetchAnalytics: () => Promise<void>;
  exportReport: (format?: "csv" | "json") => Promise<string | object>;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  range: "7d",
  startDate: undefined,
  endDate: undefined,
  analyticsData: null,
  selectedPoint: null,
  isLoading: false,
  error: null,

  setRange: async (range: DateRangeOption, start?: string, end?: string) => {
    set({ range, startDate: start, endDate: end });
    await get().fetchAnalytics();
  },

  setSelectedPoint: (point: DailyAnalyticsPoint | null) => {
    set({ selectedPoint: point });
  },

  fetchAnalytics: async () => {
    set({ isLoading: true, error: null });
    try {
      const { range, startDate, endDate } = get();
      const data = await analyticsApi.getAdvancedAnalytics(range, startDate, endDate);
      
      // Auto-select latest day or first point with data if no point is currently selected
      let selectedPoint = get().selectedPoint;
      if (!selectedPoint && data.dailyTrends.length > 0) {
        selectedPoint = data.dailyTrends[data.dailyTrends.length - 1];
      } else if (selectedPoint) {
        // Refresh reference with updated data point
        const updated = data.dailyTrends.find((p) => p.date === selectedPoint!.date);
        selectedPoint = updated || data.dailyTrends[data.dailyTrends.length - 1];
      }

      set({
        analyticsData: data,
        selectedPoint,
        isLoading: false,
      });
    } catch (err: any) {
      console.warn("[useAnalyticsStore] fetchAnalytics error:", err);
      set({
        error: err.message || "Failed to load nutrition analytics.",
        isLoading: false,
      });
    }
  },

  exportReport: async (format: "csv" | "json" = "json") => {
    return await analyticsApi.exportNutritionData(format);
  },
}));
