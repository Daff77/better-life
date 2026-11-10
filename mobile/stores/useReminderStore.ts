import { create } from "zustand";

export type WaterIntervalHours = 1 | 2 | 3;

export interface MealReminderSlot {
  id: "breakfast" | "lunch" | "snack" | "dinner";
  label: string;
  subtitle: string;
  time: string;
  enabled: boolean;
}

export type CustomTimeTarget =
  | { kind: "meal"; id: MealReminderSlot["id"]; label: string; time: string }
  | {
      kind: "other";
      key: "morningWaterTime" | "eveningJournalTime" | "weeklyWeightTime";
      label: string;
      time: string;
    };

interface ReminderState {
  masterEnabled: boolean;
  waterReminderEnabled: boolean;
  morningWaterEnabled: boolean;
  morningWaterTime: string;
  waterIntervalHours: WaterIntervalHours;
  waterStartHour: string;
  waterEndHour: string;
  mealSlots: MealReminderSlot[];
  eveningJournalEnabled: boolean;
  eveningJournalTime: string;
  weeklyWeightEnabled: boolean;
  weeklyWeightTime: string;

  setMasterEnabled: (enabled: boolean) => void;
  setWaterReminderEnabled: (enabled: boolean) => void;
  setMorningWaterEnabled: (enabled: boolean) => void;
  setWaterIntervalHours: (hours: WaterIntervalHours) => void;
  toggleMealSlot: (id: MealReminderSlot["id"]) => void;
  setMealSlotTime: (id: MealReminderSlot["id"], time: string) => void;
  setOtherReminderTime: (
    key: "morningWaterTime" | "eveningJournalTime" | "weeklyWeightTime",
    time: string
  ) => void;
  setEveningJournalEnabled: (enabled: boolean) => void;
  setWeeklyWeightEnabled: (enabled: boolean) => void;
}

export const useReminderStore = create<ReminderState>((set) => ({
  masterEnabled: true,
  waterReminderEnabled: true,
  morningWaterEnabled: true,
  morningWaterTime: "07:00",
  waterIntervalHours: 2,
  waterStartHour: "07:00",
  waterEndHour: "21:00",
  mealSlots: [
    {
      id: "breakfast",
      label: "Sarapan Pagi",
      subtitle: "Jaga energi awal hari & catat menu sarapan",
      time: "07:00",
      enabled: true,
    },
    {
      id: "lunch",
      label: "Makan Siang",
      subtitle: "Penuhi kebutuhan protein & karbohidrat siang",
      time: "12:30",
      enabled: true,
    },
    {
      id: "snack",
      label: "Camilan Sore",
      subtitle: "Opsi sehat buah atau camilan tinggi serat",
      time: "16:00",
      enabled: false,
    },
    {
      id: "dinner",
      label: "Makan Malam",
      subtitle: "Makan malam seimbang 2–3 jam sebelum tidur",
      time: "19:00",
      enabled: true,
    },
  ],
  eveningJournalEnabled: true,
  eveningJournalTime: "21:00",
  weeklyWeightEnabled: true,
  weeklyWeightTime: "07:00",

  setMasterEnabled: (enabled) => set({ masterEnabled: enabled }),
  setWaterReminderEnabled: (enabled) => set({ waterReminderEnabled: enabled }),
  setMorningWaterEnabled: (enabled) => set({ morningWaterEnabled: enabled }),
  setWaterIntervalHours: (hours) => set({ waterIntervalHours: hours }),
  toggleMealSlot: (id) =>
    set((state) => ({
      mealSlots: state.mealSlots.map((slot) =>
        slot.id === id ? { ...slot, enabled: !slot.enabled } : slot
      ),
    })),
  setMealSlotTime: (id, time) =>
    set((state) => ({
      mealSlots: state.mealSlots.map((slot) =>
        slot.id === id ? { ...slot, time, enabled: true } : slot
      ),
    })),
  setOtherReminderTime: (key, time) =>
    set(() => {
      if (key === "morningWaterTime") {
        return { morningWaterTime: time, morningWaterEnabled: true };
      }
      if (key === "eveningJournalTime") {
        return { eveningJournalTime: time, eveningJournalEnabled: true };
      }
      return { weeklyWeightTime: time, weeklyWeightEnabled: true };
    }),
  setEveningJournalEnabled: (enabled) => set({ eveningJournalEnabled: enabled }),
  setWeeklyWeightEnabled: (enabled) => set({ weeklyWeightEnabled: enabled }),
}));
