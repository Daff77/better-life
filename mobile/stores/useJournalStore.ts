import { create } from "zustand";
import { DailyJournal, JournalCategory, JournalEntry, JournalEntrySchema } from "@/lib/schemas";
import { journalStorage } from "@/lib/journalStorage";
import { useOnboardingStore } from "@/stores/useOnboardingStore";

export function getTodayDateKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface JournalAggregates {
  totalConsumed: number;
  remainingCalories: number;
  progressRatio: number;
  targetCalories: number;
  entryCount: number;
  totalProteinGrams: number;
  totalCarbsGrams: number;
  totalFatGrams: number;
  totalFiberGrams: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
}

export interface AddJournalEntryInput {
  mealId?: string;
  title: string;
  category: JournalCategory;
  calories?: number;
  baseCalories?: number;
  quantity?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  fiberGrams?: number;
}

export interface UpdateJournalEntryInput {
  title?: string;
  category?: JournalCategory;
  calories?: number;
  baseCalories?: number;
  quantity?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  fiberGrams?: number;
}

interface JournalState {
  journals: Record<string, DailyJournal>;
  activeDate: string;
  isHydrated: boolean;

  // Lifecycle & Hydration
  initialize: () => Promise<void>;
  setActiveDate: (date: string) => void;

  // Core Journal Operations
  initializeDay: (date?: string, customTarget?: number) => Promise<DailyJournal>;
  addEntry: (entry: AddJournalEntryInput, date?: string) => Promise<JournalEntry>;
  removeEntry: (entryId: string, date?: string) => Promise<boolean>;
  updateEntry: (entryId: string, updates: UpdateJournalEntryInput, date?: string) => Promise<boolean>;
  clearDay: (date?: string) => Promise<void>;
  setTargetCalories: (target: number, date?: string) => Promise<void>;
  syncTargetFromProfile: (date?: string) => Promise<void>;

  // Synchronous State Queries & Pure Derivations
  getJournal: (date?: string) => DailyJournal;
  getTodayJournal: () => DailyJournal;
  getAggregates: (date?: string) => JournalAggregates;
}

export function computeJournalAggregates(
  journal?: DailyJournal,
  fallbackTarget?: number
): JournalAggregates {
  const target = journal?.targetCalories ?? fallbackTarget ?? 1950;
  const entries = journal?.entries ?? [];
  const totalConsumed = entries.reduce((sum, entry) => sum + (entry.calories || 0), 0);
  const remainingCalories = Math.max(0, target - totalConsumed);
  const progressRatio = target > 0 ? Math.min(1.0, totalConsumed / target) : 0;

  const totalProteinGrams = Math.round(entries.reduce((sum, entry) => sum + (entry.proteinGrams || 0), 0) * 10) / 10;
  const totalCarbsGrams = Math.round(entries.reduce((sum, entry) => sum + (entry.carbsGrams || 0), 0) * 10) / 10;
  const totalFatGrams = Math.round(entries.reduce((sum, entry) => sum + (entry.fatGrams || 0), 0) * 10) / 10;
  const totalFiberGrams = Math.round(entries.reduce((sum, entry) => sum + (entry.fiberGrams || 0), 0) * 10) / 10;

  let targetProteinGrams = Math.round((target * 0.25) / 4);
  let targetCarbsGrams = Math.round((target * 0.50) / 4);
  let targetFatGrams = Math.round((target * 0.25) / 9);

  try {
    const profile = useOnboardingStore.getState().personalization;
    if (profile?.targetProteinGrams) targetProteinGrams = profile.targetProteinGrams;
    if (profile?.targetCarbGrams) targetCarbsGrams = profile.targetCarbGrams;
    if (profile?.targetFatGrams) targetFatGrams = profile.targetFatGrams;
  } catch {
    // fallback defaults
  }

  return {
    totalConsumed,
    remainingCalories,
    progressRatio,
    targetCalories: target,
    entryCount: entries.length,
    totalProteinGrams,
    totalCarbsGrams,
    totalFatGrams,
    totalFiberGrams,
    targetProteinGrams,
    targetCarbsGrams,
    targetFatGrams,
  };
}

const FALLBACK_EMPTY_ENTRIES: JournalEntry[] = [];

function resolveDefaultTarget(): number {
  try {
    const profileTarget = useOnboardingStore.getState().personalization?.targetCalories;
    if (profileTarget && profileTarget > 0) {
      return profileTarget;
    }
  } catch {
    // fallback if store not yet initialized
  }
  return 1950;
}

export const useJournalStore = create<JournalState>((set, get) => ({
  journals: {},
  activeDate: getTodayDateKey(),
  isHydrated: false,

  initialize: async () => {
    try {
      const persisted = await journalStorage.getJournals();
      const today = getTodayDateKey();
      const target = resolveDefaultTarget();

      // Ensure today's journal exists
      if (!persisted[today]) {
        persisted[today] = {
          date: today,
          targetCalories: target,
          entries: [],
        };
        await journalStorage.saveDailyJournal(persisted[today]);
      }

      set({
        journals: persisted,
        activeDate: today,
        isHydrated: true,
      });
    } catch (err) {
      console.warn("[useJournalStore] Hydration failed:", err);
      const today = getTodayDateKey();
      set({
        journals: {
          [today]: {
            date: today,
            targetCalories: resolveDefaultTarget(),
            entries: [],
          },
        },
        activeDate: today,
        isHydrated: true,
      });
    }
  },

  setActiveDate: (date: string) => {
    set({ activeDate: date });
  },

  initializeDay: async (date?: string, customTarget?: number) => {
    const targetDate = date || get().activeDate;
    const targetCalories = customTarget !== undefined ? customTarget : resolveDefaultTarget();
    const existing = get().journals[targetDate];

    if (existing) {
      return existing;
    }

    const newJournal: DailyJournal = {
      date: targetDate,
      targetCalories,
      entries: [],
    };

    const updatedJournals = {
      ...get().journals,
      [targetDate]: newJournal,
    };

    set({ journals: updatedJournals });
    await journalStorage.saveDailyJournal(newJournal);
    return newJournal;
  },

  addEntry: async (entryInput: AddJournalEntryInput, date?: string) => {
    const targetDate = date || get().activeDate;
    const journals = { ...get().journals };
    let dayJournal = journals[targetDate];

    if (!dayJournal) {
      dayJournal = {
        date: targetDate,
        targetCalories: resolveDefaultTarget(),
        entries: [],
      };
    }

    if (entryInput.quantity !== undefined && (entryInput.quantity <= 0 || isNaN(entryInput.quantity))) {
      throw new Error("Invalid quantity: quantity must be at least 1.");
    }

    const quantity = Math.max(1, entryInput.quantity || 1);
    let baseCalories = entryInput.baseCalories;
    let totalCalories = entryInput.calories;

    if (totalCalories !== undefined && baseCalories === undefined) {
      baseCalories = Math.round(totalCalories / quantity);
    } else if (baseCalories !== undefined && totalCalories === undefined) {
      totalCalories = Math.round(baseCalories * quantity);
    } else if (baseCalories !== undefined && totalCalories !== undefined) {
      // If both provided, respect totalCalories as the primary entry calorie value
      totalCalories = Math.max(0, totalCalories);
    } else {
      totalCalories = 0;
      baseCalories = 0;
    }

    const proteinGrams = Math.round((entryInput.proteinGrams ?? 0) * 10) / 10;
    const carbsGrams = Math.round((entryInput.carbsGrams ?? 0) * 10) / 10;
    const fatGrams = Math.round((entryInput.fatGrams ?? 0) * 10) / 10;
    const fiberGrams = Math.round((entryInput.fiberGrams ?? 0) * 10) / 10;

    const newEntry: JournalEntry = JournalEntrySchema.parse({
      id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      mealId: entryInput.mealId,
      title: entryInput.title?.trim() || "Logged Meal",
      category: entryInput.category,
      calories: Math.max(0, totalCalories || 0),
      baseCalories: Math.max(0, baseCalories || 0),
      quantity,
      proteinGrams,
      carbsGrams,
      fatGrams,
      fiberGrams,
      loggedAt: new Date().toISOString(),
    });

    const updatedDay: DailyJournal = {
      ...dayJournal,
      entries: [...dayJournal.entries, newEntry],
    };

    journals[targetDate] = updatedDay;
    set({ journals });
    await journalStorage.saveDailyJournal(updatedDay);

    return newEntry;
  },

  removeEntry: async (entryId: string, date?: string) => {
    const targetDate = date || get().activeDate;
    const journals = { ...get().journals };
    const dayJournal = journals[targetDate];

    if (!dayJournal) return false;

    const initialLength = dayJournal.entries.length;
    const filteredEntries = dayJournal.entries.filter((e) => e.id !== entryId);

    if (filteredEntries.length === initialLength) {
      return false;
    }

    const updatedDay: DailyJournal = {
      ...dayJournal,
      entries: filteredEntries,
    };

    journals[targetDate] = updatedDay;
    set({ journals });
    await journalStorage.saveDailyJournal(updatedDay);
    return true;
  },

  updateEntry: async (entryId: string, updates: UpdateJournalEntryInput, date?: string) => {
    const targetDate = date || get().activeDate;
    const journals = { ...get().journals };
    const dayJournal = journals[targetDate];

    if (!dayJournal) return false;

    const entryIndex = dayJournal.entries.findIndex((e) => e.id === entryId);
    if (entryIndex === -1) return false;

    const currentEntry = dayJournal.entries[entryIndex];
    const newQuantity = updates.quantity !== undefined ? Math.max(1, updates.quantity) : currentEntry.quantity;

    let newBaseCalories = updates.baseCalories !== undefined ? updates.baseCalories : currentEntry.baseCalories;
    let newTotalCalories = updates.calories;

    if (newTotalCalories === undefined) {
      if (newBaseCalories !== undefined) {
        newTotalCalories = Math.round(newBaseCalories * newQuantity);
      } else {
        newTotalCalories = currentEntry.calories;
      }
    }

    const updatedEntry: JournalEntry = {
      ...currentEntry,
      title: updates.title !== undefined ? updates.title.trim() : currentEntry.title,
      category: updates.category !== undefined ? updates.category : currentEntry.category,
      quantity: newQuantity,
      baseCalories: newBaseCalories,
      calories: Math.max(0, newTotalCalories),
      proteinGrams: updates.proteinGrams !== undefined ? updates.proteinGrams : currentEntry.proteinGrams,
      carbsGrams: updates.carbsGrams !== undefined ? updates.carbsGrams : currentEntry.carbsGrams,
      fatGrams: updates.fatGrams !== undefined ? updates.fatGrams : currentEntry.fatGrams,
      fiberGrams: updates.fiberGrams !== undefined ? updates.fiberGrams : currentEntry.fiberGrams,
    };

    const newEntries = [...dayJournal.entries];
    newEntries[entryIndex] = updatedEntry;

    const updatedDay: DailyJournal = {
      ...dayJournal,
      entries: newEntries,
    };

    journals[targetDate] = updatedDay;
    set({ journals });
    await journalStorage.saveDailyJournal(updatedDay);
    return true;
  },

  clearDay: async (date?: string) => {
    const targetDate = date || get().activeDate;
    const journals = { ...get().journals };
    const dayJournal = journals[targetDate];

    if (!dayJournal) return;

    const clearedDay: DailyJournal = {
      ...dayJournal,
      entries: [],
    };

    journals[targetDate] = clearedDay;
    set({ journals });
    await journalStorage.saveDailyJournal(clearedDay);
  },

  setTargetCalories: async (target: number, date?: string) => {
    const targetDate = date || get().activeDate;
    const journals = { ...get().journals };
    const dayJournal = journals[targetDate] || {
      date: targetDate,
      targetCalories: target,
      entries: [],
    };

    const updatedDay: DailyJournal = {
      ...dayJournal,
      targetCalories: Math.max(0, target),
    };

    journals[targetDate] = updatedDay;
    set({ journals });
    await journalStorage.saveDailyJournal(updatedDay);
  },

  syncTargetFromProfile: async (date?: string) => {
    const profileTarget = resolveDefaultTarget();
    await get().setTargetCalories(profileTarget, date);
  },

  // Pure derived calculations
  getJournal: (date?: string): DailyJournal => {
    const targetDate = date || get().activeDate;
    const journal = get().journals[targetDate];
    if (journal) return journal;

    return {
      date: targetDate,
      targetCalories: resolveDefaultTarget(),
      entries: FALLBACK_EMPTY_ENTRIES,
    };
  },

  getTodayJournal: (): DailyJournal => {
    return get().getJournal(getTodayDateKey());
  },

  getAggregates: (date?: string): JournalAggregates => {
    const journal = get().getJournal(date);
    return computeJournalAggregates(journal, resolveDefaultTarget());
  },
}));
