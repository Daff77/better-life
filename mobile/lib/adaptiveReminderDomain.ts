import { formatLocalDateKey } from "@better-life/shared";
import { DailyJournal, JournalCategory } from "@/lib/schemas";
import { MealReminderSlot } from "@/stores/useReminderStore";

export interface AdaptiveReminderInsight {
  kind: "due_slot" | "habit_shift" | "evening_catchup" | "on_track";
  title: string;
  message: string;
  slotId?: MealReminderSlot["id"];
  journalCategory?: JournalCategory;
  suggestedTime?: string;
  actionLabel?: string;
}

const SLOT_TO_CATEGORY: Record<MealReminderSlot["id"], JournalCategory> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

function parseMinutesSinceMidnight(hhmm: string): number {
  const [h, m] = (hhmm || "07:00").split(":");
  return (parseInt(h || "7", 10) || 0) * 60 + (parseInt(m || "0", 10) || 0);
}

function formatMinutesAsHHMM(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes / 15) * 15));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Computes an adaptive reminder insight strictly from real user meal-logging activity
 * and current local time.
 */
export function computeAdaptiveReminderInsight(params: {
  journals: Record<string, DailyJournal>;
  mealSlots: MealReminderSlot[];
  masterEnabled: boolean;
  now?: Date;
}): AdaptiveReminderInsight | null {
  const { journals, mealSlots, masterEnabled } = params;
  const now = params.now ?? new Date();
  const todayKey = formatLocalDateKey(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayEntries = journals[todayKey]?.entries ?? [];
  const loggedCategoriesToday = new Set(todayEntries.map((e) => e.category));

  // 1. Check if an enabled meal slot's scheduled window has arrived/passed without any entry today
  if (masterEnabled) {
    const enabledDueSlots = mealSlots
      .filter((slot) => slot.enabled)
      .map((slot) => ({
        slot,
        category: SLOT_TO_CATEGORY[slot.id],
        scheduledMin: parseMinutesSinceMidnight(slot.time),
      }))
      .filter(
        ({ category, scheduledMin }) =>
          !loggedCategoriesToday.has(category) &&
          currentMinutes >= scheduledMin + 20 &&
          currentMinutes <= scheduledMin + 210
      )
      .sort((a, b) => b.scheduledMin - a.scheduledMin);

    if (enabledDueSlots.length > 0) {
      const due = enabledDueSlots[0];
      return {
        kind: "due_slot",
        title: `${due.slot.label} belum tercatat`,
        message: `Jadwal ${due.slot.label.toLowerCase()} Anda pukul ${due.slot.time} WIB. Catat sekarang agar ringkasan kalori hari ini tetap akurat.`,
        slotId: due.slot.id,
        journalCategory: due.category,
        actionLabel: `Catat ${due.slot.label}`,
      };
    }
  }

  // 2. Evening catch-up if it's >= 19:30 and user has logged 0 or 1 meal all day
  if (currentMinutes >= 19 * 60 + 30 && todayEntries.length <= 1) {
    return {
      kind: "evening_catchup",
      title: "Lengkapi jurnal sebelum istirahat",
      message:
        todayEntries.length === 0
          ? "Belum ada catatan makanan hari ini. Catat menu utama Anda agar tren mingguan tidak kosong."
          : "Baru 1 waktu makan tercatat hari ini. Tambahkan menu siang atau malam Anda.",
      journalCategory: todayEntries.length === 0 ? "Lunch" : "Dinner",
      actionLabel: "Lengkapi Jurnal",
    };
  }

  // 3. Analyze historical logging times across the past 14 days to detect habitual time drift
  const slotLoggedMinutes: Record<MealReminderSlot["id"], number[]> = {
    breakfast: [],
    lunch: [],
    snack: [],
    dinner: [],
  };

  const sortedDates = Object.keys(journals)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 14);

  for (const dateKey of sortedDates) {
    const dayEntries = journals[dateKey]?.entries ?? [];
    for (const entry of dayEntries) {
      if (!entry.loggedAt) continue;
      const dt = new Date(entry.loggedAt);
      if (Number.isNaN(dt.getTime())) continue;
      const mins = dt.getHours() * 60 + dt.getMinutes();
      if (entry.category === "Breakfast") slotLoggedMinutes.breakfast.push(mins);
      else if (entry.category === "Lunch") slotLoggedMinutes.lunch.push(mins);
      else if (entry.category === "Snack") slotLoggedMinutes.snack.push(mins);
      else if (entry.category === "Dinner") slotLoggedMinutes.dinner.push(mins);
    }
  }

  for (const slot of mealSlots) {
    const samples = slotLoggedMinutes[slot.id];
    if (samples.length < 2) continue;
    const avgMin = samples.reduce((sum, v) => sum + v, 0) / samples.length;
    const scheduledMin = parseMinutesSinceMidnight(slot.time);
    const diff = Math.abs(avgMin - scheduledMin);
    if (diff >= 45) {
      const suggestedTime = formatMinutesAsHHMM(avgMin);
      if (suggestedTime !== slot.time) {
        return {
          kind: "habit_shift",
          title: `Saran waktu adaptif: ${slot.label}`,
          message: `Dari ${samples.length} pencatatan terakhir, Anda rata-rata mencatat ${slot.label.toLowerCase()} sekitar pukul ${suggestedTime} WIB (jadwal saat ini ${slot.time} WIB).`,
          slotId: slot.id,
          journalCategory: SLOT_TO_CATEGORY[slot.id],
          suggestedTime,
          actionLabel: `Ubah ke ${suggestedTime}`,
        };
      }
    }
  }

  // 4. Positive on-track acknowledgment when today's due slots are already logged
  const dueEnabledCount = mealSlots.filter(
    (s) => s.enabled && currentMinutes >= parseMinutesSinceMidnight(s.time)
  ).length;
  if (dueEnabledCount > 0 && todayEntries.length >= dueEnabledCount) {
    return {
      kind: "on_track",
      title: "Pencatatan hari ini tepat jadwal",
      message: `${todayEntries.length} catatan makan telah tersimpan sesuai jadwal pengingat aktif Anda.`,
    };
  }

  return null;
}
