import { create } from "zustand";
import { formatLocalDateKey } from "@better-life/shared";
import { DailyJournal, JournalCategory, JournalEntry, JournalEntrySchema } from "@/lib/schemas";
import { journalStorage } from "@/lib/journalStorage";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { accountRevision } from "@/lib/accountScope";
import { syncJournal, pullServerMealsIntoJournal } from "@/lib/journalSync";
import { calculateNutrientsForServing } from "@/lib/nutritionDomain";

export function getTodayDateKey(date?: Date): string {
  return formatLocalDateKey(date ?? new Date());
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
  id?: string;
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
  estimatedCostIdr?: number;
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

export interface JournalUndoSnapshot {
  id: string;
  kind: "remove_entry" | "clear_day";
  date: string;
  entries: JournalEntry[];
  label: string;
  createdAt: number;
}

interface JournalState {
  journals: Record<string, DailyJournal>;
  activeDate: string;
  isHydrated: boolean;
  lastUndoAction: JournalUndoSnapshot | null;

  initialize: () => Promise<void>;
  setActiveDate: (date: string) => void;

  initializeDay: (date?: string, customTarget?: number) => Promise<DailyJournal>;
  addEntry: (entry: AddJournalEntryInput, date?: string) => Promise<JournalEntry>;
  removeEntry: (entryId: string, date?: string) => Promise<boolean>;
  updateEntry: (entryId: string, updates: UpdateJournalEntryInput, date?: string) => Promise<boolean>;
  clearDay: (date?: string) => Promise<void>;
  undoLastAction: () => Promise<boolean>;
  dismissUndo: () => void;
  setTargetCalories: (target: number, date?: string) => Promise<void>;
  syncTargetFromProfile: (date?: string) => Promise<void>;

  getJournal: (date?: string) => DailyJournal;
  getTodayJournal: () => DailyJournal;
  getRecentLoggedMeals: (limit?: number) => JournalEntry[];
  getAggregates: (date?: string) => JournalAggregates;
}

export function computeJournalAggregates(
  journal?: DailyJournal,
  fallbackTarget?: number
): JournalAggregates {
  const target = journal?.targetCalories ?? fallbackTarget ?? 1950;
  const entries = journal?.entries ?? [];
  const totalConsumed = Math.round(
    entries.reduce((sum, entry) => sum + (entry.calories || 0), 0)
  );
  // Signed difference so negative values accurately indicate over-target intake
  const remainingCalories = target - totalConsumed;
  const progressRatio = target > 0 ? Math.min(1.0, totalConsumed / target) : 0;

  const totalProteinGrams =
    Math.round(entries.reduce((sum, entry) => sum + (entry.proteinGrams || 0), 0) * 10) / 10;
  const totalCarbsGrams =
    Math.round(entries.reduce((sum, entry) => sum + (entry.carbsGrams || 0), 0) * 10) / 10;
  const totalFatGrams =
    Math.round(entries.reduce((sum, entry) => sum + (entry.fatGrams || 0), 0) * 10) / 10;
  const totalFiberGrams =
    Math.round(entries.reduce((sum, entry) => sum + (entry.fiberGrams || 0), 0) * 10) / 10;

  let targetProteinGrams = Math.round((target * 0.25) / 4);
  let targetCarbsGrams = Math.round((target * 0.5) / 4);
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

function buildSyncBody(entry: JournalEntry, dateKey: string): Record<string, unknown> {
  return {
    id: entry.id,
    name: entry.title,
    type: entry.category,
    calories: entry.calories,
    proteinGrams: entry.proteinGrams,
    carbsGrams: entry.carbsGrams,
    fatGrams: entry.fatGrams,
    fiberGrams: entry.fiberGrams,
    estimatedCostIdr: entry.estimatedCostIdr ?? 0,
    quantity: entry.quantity,
    dateKey,
    loggedAt: entry.loggedAt,
    updatedAt: entry.updatedAt || entry.loggedAt,
  };
}

export const useJournalStore = create<JournalState>((set, get) => ({
  journals: {},
  activeDate: getTodayDateKey(),
  isHydrated: false,
  lastUndoAction: null,

  initialize: async () => {
    const revision = accountRevision();
    try {
      const persisted = await journalStorage.getJournals();
      if (revision !== accountRevision()) return;
      const today = getTodayDateKey();
      const target = resolveDefaultTarget();

      if (!persisted[today]) {
        persisted[today] = {
          date: today,
          targetCalories: target,
          entries: [],
        };
        await journalStorage.saveDailyJournal(persisted[today]);
      }

      if (revision !== accountRevision()) return;

      set({
        journals: persisted,
        activeDate: today,
        isHydrated: true,
        lastUndoAction: null,
      });

      void (async () => {
        await syncJournal();
        if (revision === accountRevision()) {
          await pullServerMealsIntoJournal(revision);
        }
      })();
    } catch {
      if (revision !== accountRevision()) return;
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
        lastUndoAction: null,
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
    const revision = accountRevision();
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

    if (
      entryInput.quantity !== undefined &&
      (!Number.isFinite(entryInput.quantity) || entryInput.quantity <= 0)
    ) {
      throw new Error("Invalid quantity: quantity must be greater than 0.");
    }

    const quantity = entryInput.quantity ?? 1;
    let baseCalories = entryInput.baseCalories;
    let totalCalories = entryInput.calories;

    if (totalCalories !== undefined && baseCalories === undefined) {
      baseCalories = Math.round((totalCalories / quantity) * 100) / 100;
    } else if (baseCalories !== undefined && totalCalories === undefined) {
      totalCalories = Math.round(baseCalories * quantity);
    } else if (baseCalories !== undefined && totalCalories !== undefined) {
      totalCalories = Math.max(0, Math.round(totalCalories));
    } else {
      totalCalories = 0;
      baseCalories = 0;
    }

    const proteinGrams = Math.round((entryInput.proteinGrams ?? 0) * 10) / 10;
    const carbsGrams = Math.round((entryInput.carbsGrams ?? 0) * 10) / 10;
    const fatGrams = Math.round((entryInput.fatGrams ?? 0) * 10) / 10;
    const fiberGrams = Math.round((entryInput.fiberGrams ?? 0) * 10) / 10;

    // Store per-1-serving base macro values to eliminate rounding drift across repeated portion edits
    const baseProteinGrams = Math.round((proteinGrams / quantity) * 100) / 100;
    const baseCarbsGrams = Math.round((carbsGrams / quantity) * 100) / 100;
    const baseFatGrams = Math.round((fatGrams / quantity) * 100) / 100;
    const baseFiberGrams = Math.round((fiberGrams / quantity) * 100) / 100;

    const nowIso = new Date().toISOString();
    const newEntry: JournalEntry = JournalEntrySchema.parse({
      id:
        entryInput.id ||
        `entry-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      mealId: entryInput.mealId,
      title: entryInput.title?.trim() || "Logged Meal",
      category: entryInput.category,
      calories: Math.max(0, totalCalories || 0),
      baseCalories: Math.max(0, baseCalories || 0),
      baseProteinGrams,
      baseCarbsGrams,
      baseFatGrams,
      baseFiberGrams,
      quantity,
      proteinGrams,
      carbsGrams,
      fatGrams,
      fiberGrams,
      estimatedCostIdr: entryInput.estimatedCostIdr ?? 0,
      loggedAt: nowIso,
      updatedAt: nowIso,
    });

    const filteredExisting = dayJournal.entries.filter((e) => e.id !== newEntry.id);
    const updatedDay: DailyJournal = {
      ...dayJournal,
      entries: [...filteredExisting, newEntry],
    };

    journals[targetDate] = updatedDay;
    set({ journals });
    await journalStorage.saveDailyJournal(updatedDay);

    if (revision !== accountRevision()) return newEntry;

    await syncJournal({
      path: "/meals",
      method: "POST",
      body: buildSyncBody(newEntry, targetDate),
    });

    return newEntry;
  },

  removeEntry: async (entryId: string, date?: string) => {
    const revision = accountRevision();
    const targetDate = date || get().activeDate;
    const journals = { ...get().journals };
    const dayJournal = journals[targetDate];

    if (!dayJournal) return false;

    const targetEntry = dayJournal.entries.find((e) => e.id === entryId);
    if (!targetEntry) return false;

    const filteredEntries = dayJournal.entries.filter((e) => e.id !== entryId);
    const updatedDay: DailyJournal = {
      ...dayJournal,
      entries: filteredEntries,
    };

    journals[targetDate] = updatedDay;
    set({
      journals,
      lastUndoAction: {
        id: `undo-${Date.now()}`,
        kind: "remove_entry",
        date: targetDate,
        entries: [targetEntry],
        label: targetEntry.title,
        createdAt: Date.now(),
      },
    });
    await journalStorage.saveDailyJournal(updatedDay);

    if (revision !== accountRevision()) return true;

    await syncJournal({
      path: `/meals/${encodeURIComponent(entryId)}`,
      method: "DELETE",
      body: { dateKey: targetDate },
    });

    return true;
  },

  updateEntry: async (entryId: string, updates: UpdateJournalEntryInput, date?: string) => {
    const revision = accountRevision();
    const targetDate = date || get().activeDate;
    const journals = { ...get().journals };
    const dayJournal = journals[targetDate];

    if (!dayJournal) return false;

    const entryIndex = dayJournal.entries.findIndex((e) => e.id === entryId);
    if (entryIndex === -1) return false;

    const currentEntry = dayJournal.entries[entryIndex];
    const quantityChanged =
      updates.quantity !== undefined && updates.quantity !== currentEntry.quantity;
    const newQuantity = updates.quantity ?? currentEntry.quantity;

    if (!Number.isFinite(newQuantity) || newQuantity <= 0) {
      throw new Error("Quantity must be greater than 0.");
    }

    const resolvedBaseCalories =
      updates.baseCalories !== undefined
        ? updates.baseCalories
        : currentEntry.baseCalories !== undefined
        ? currentEntry.baseCalories
        : currentEntry.calories / currentEntry.quantity;

    const resolvedBaseProtein =
      currentEntry.baseProteinGrams !== undefined
        ? currentEntry.baseProteinGrams
        : currentEntry.proteinGrams / currentEntry.quantity;
    const resolvedBaseCarbs =
      currentEntry.baseCarbsGrams !== undefined
        ? currentEntry.baseCarbsGrams
        : currentEntry.carbsGrams / currentEntry.quantity;
    const resolvedBaseFat =
      currentEntry.baseFatGrams !== undefined
        ? currentEntry.baseFatGrams
        : currentEntry.fatGrams / currentEntry.quantity;
    const resolvedBaseFiber =
      currentEntry.baseFiberGrams !== undefined
        ? currentEntry.baseFiberGrams
        : currentEntry.fiberGrams / currentEntry.quantity;

    let newTotalCalories = currentEntry.calories;
    let nextProtein = currentEntry.proteinGrams;
    let nextCarbs = currentEntry.carbsGrams;
    let nextFat = currentEntry.fatGrams;
    let nextFiber = currentEntry.fiberGrams;

    if (updates.calories !== undefined) {
      newTotalCalories = Math.max(0, Math.round(updates.calories));
    } else if (quantityChanged || updates.baseCalories !== undefined) {
      const scaled = calculateNutrientsForServing(
        {
          calories: resolvedBaseCalories,
          proteinGrams: resolvedBaseProtein,
          carbsGrams: resolvedBaseCarbs,
          fatGrams: resolvedBaseFat,
          fiberGrams: resolvedBaseFiber,
        },
        newQuantity
      );
      newTotalCalories = scaled.calories;
      nextProtein = scaled.proteinGrams;
      nextCarbs = scaled.carbsGrams;
      nextFat = scaled.fatGrams;
      nextFiber = scaled.fiberGrams ?? 0;
    }

    if (updates.proteinGrams !== undefined) {
      nextProtein = Math.round(updates.proteinGrams * 10) / 10;
    }
    if (updates.carbsGrams !== undefined) {
      nextCarbs = Math.round(updates.carbsGrams * 10) / 10;
    }
    if (updates.fatGrams !== undefined) {
      nextFat = Math.round(updates.fatGrams * 10) / 10;
    }
    if (updates.fiberGrams !== undefined) {
      nextFiber = Math.round(updates.fiberGrams * 10) / 10;
    }

    const nowIso = new Date().toISOString();
    const updatedEntry: JournalEntry = {
      ...currentEntry,
      title:
        updates.title !== undefined && updates.title.trim()
          ? updates.title.trim()
          : currentEntry.title,
      category: updates.category !== undefined ? updates.category : currentEntry.category,
      quantity: newQuantity,
      baseCalories: resolvedBaseCalories,
      baseProteinGrams:
        updates.proteinGrams !== undefined
          ? Math.round((nextProtein / newQuantity) * 100) / 100
          : resolvedBaseProtein,
      baseCarbsGrams:
        updates.carbsGrams !== undefined
          ? Math.round((nextCarbs / newQuantity) * 100) / 100
          : resolvedBaseCarbs,
      baseFatGrams:
        updates.fatGrams !== undefined
          ? Math.round((nextFat / newQuantity) * 100) / 100
          : resolvedBaseFat,
      baseFiberGrams:
        updates.fiberGrams !== undefined
          ? Math.round((nextFiber / newQuantity) * 100) / 100
          : resolvedBaseFiber,
      calories: Math.max(0, newTotalCalories),
      proteinGrams: nextProtein,
      carbsGrams: nextCarbs,
      fatGrams: nextFat,
      fiberGrams: nextFiber,
      updatedAt: nowIso,
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

    if (revision === accountRevision()) {
      await syncJournal({
        path: "/meals",
        method: "POST",
        body: buildSyncBody(updatedEntry, targetDate),
      });
    }
    return true;
  },

  clearDay: async (date?: string) => {
    const revision = accountRevision();
    const targetDate = date || get().activeDate;
    const journals = { ...get().journals };
    const dayJournal = journals[targetDate];

    if (!dayJournal) return;

    const previousEntries = [...dayJournal.entries];
    const clearedDay: DailyJournal = {
      ...dayJournal,
      entries: [],
    };

    journals[targetDate] = clearedDay;
    set({
      journals,
      lastUndoAction:
        previousEntries.length > 0
          ? {
              id: `undo-clear-${Date.now()}`,
              kind: "clear_day",
              date: targetDate,
              entries: previousEntries,
              label: `${previousEntries.length} menu pada ${targetDate}`,
              createdAt: Date.now(),
            }
          : get().lastUndoAction,
    });
    await journalStorage.saveDailyJournal(clearedDay);

    if (revision === accountRevision()) {
      await syncJournal({
        path: "/meals/reset",
        method: "POST",
        body: { dateKey: targetDate },
      });
    }
  },

  undoLastAction: async () => {
    const revision = accountRevision();
    const undo = get().lastUndoAction;
    if (!undo || undo.entries.length === 0) return false;

    const journals = { ...get().journals };
    const targetDate = undo.date;
    const dayJournal = journals[targetDate] || {
      date: targetDate,
      targetCalories: resolveDefaultTarget(),
      entries: [],
    };

    const nowIso = new Date().toISOString();
    const restoredEntries = undo.entries.map((entry) => ({
      ...entry,
      updatedAt: nowIso,
    }));

    const restoredIds = new Set(restoredEntries.map((e) => e.id));
    const mergedEntries = [
      ...dayJournal.entries.filter((e) => !restoredIds.has(e.id)),
      ...restoredEntries,
    ];

    const updatedDay: DailyJournal = {
      ...dayJournal,
      entries: mergedEntries,
    };

    journals[targetDate] = updatedDay;
    set({ journals, lastUndoAction: null });
    await journalStorage.saveDailyJournal(updatedDay);

    if (revision === accountRevision()) {
      for (const restored of restoredEntries) {
        if (revision !== accountRevision()) break;
        await syncJournal({
          path: "/meals",
          method: "POST",
          body: buildSyncBody(restored, targetDate),
        });
      }
    }

    return true;
  },

  dismissUndo: () => {
    set({ lastUndoAction: null });
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

  getRecentLoggedMeals: (limit = 6): JournalEntry[] => {
    const allDays = Object.values(get().journals);
    const allEntries = allDays.flatMap((d) => d.entries);
    allEntries.sort((a, b) => {
      const ta = Date.parse(a.loggedAt) || 0;
      const tb = Date.parse(b.loggedAt) || 0;
      return tb - ta;
    });

    const seenTitles = new Set<string>();
    const uniqueRecent: JournalEntry[] = [];
    for (const entry of allEntries) {
      const key = `${entry.title.trim().toLowerCase()}::${entry.category}`;
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        uniqueRecent.push(entry);
        if (uniqueRecent.length >= limit) break;
      }
    }
    return uniqueRecent;
  },

  getAggregates: (date?: string): JournalAggregates => {
    const journal = get().getJournal(date);
    return computeJournalAggregates(journal, resolveDefaultTarget());
  },
}));
