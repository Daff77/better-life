import React, { useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  FadeInView,
  Header,
  PressableScale,
  Surface,
  CardHead,
  StatusPill,
  RowIcon,
  PillButton,
  Segmented,
  ToggleSwitch,
} from "@/components/ui";
import {
  useReminderStore,
  WaterIntervalHours,
  CustomTimeTarget,
} from "@/stores/useReminderStore";

const tnum = { fontVariant: ["tabular-nums" as const] };

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const WHEEL_PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2);

const BLUE = "#1e6f9f";

/* ------------------------------------------------------------ WheelColumn */

interface WheelColumnProps {
  values: string[];
  initialIndex: number;
  onChange: (index: number) => void;
  accessibilityLabel: string;
}

/** Vertical drum wheel: drag to scroll, snaps to the centre row. */
const WheelColumn: React.FC<WheelColumnProps> = ({
  values,
  initialIndex,
  onChange,
  accessibilityLabel,
}) => {
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [liveIndex, setLiveIndex] = useState(initialIndex);
  const maxIndex = values.length - 1;

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: initialIndex * ITEM_HEIGHT, animated: false });
    }, 40);
    return () => {
      clearTimeout(t);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, []);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(maxIndex, Math.round(y / ITEM_HEIGHT)));
    setLiveIndex((prev) => (prev === idx ? prev : idx));

    // Settle after the user stops dragging (works on native and web)
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (Math.abs(y - idx * ITEM_HEIGHT) > 1) {
        scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
      }
      onChange(idx);
    }, 110);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, height: WHEEL_HEIGHT }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={handleScroll}
      contentContainerStyle={{ paddingVertical: WHEEL_PADDING }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
    >
      {values.map((v, idx) => {
        const distance = Math.abs(idx - liveIndex);
        const opacity = distance === 0 ? 1 : distance === 1 ? 0.45 : 0.18;
        return (
          <View key={v} style={{ height: ITEM_HEIGHT }} className="items-center justify-center">
            <AppText
              weight={distance === 0 ? "bold" : "medium"}
              className="text-ink"
              style={{
                ...tnum,
                opacity,
                fontSize: distance === 0 ? 28 : 22,
                letterSpacing: -0.5,
              }}
            >
              {v}
            </AppText>
          </View>
        );
      })}
    </ScrollView>
  );
};

/* --------------------------------------------------------------- AlarmRow */

interface AlarmRowProps {
  time: string;
  label: string;
  subtitle: string;
  enabled: boolean;
  disabled: boolean;
  first?: boolean;
  activeColor?: string;
  onPress: () => void;
  onToggle: (next: boolean) => void;
}

/** Alarm-style row: large time, label and caption on the left, switch on the right. */
const AlarmRow: React.FC<AlarmRowProps> = ({
  time,
  label,
  subtitle,
  enabled,
  disabled,
  first,
  activeColor,
  onPress,
  onToggle,
}) => {
  const active = enabled && !disabled;
  return (
    <View className={`flex-row items-center gap-4 py-3.5 ${first ? "" : "border-t border-line"}`}>
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        pressedScale={0.985}
        className="flex-1 min-w-0"
        accessibilityRole="button"
        accessibilityLabel={`Ubah jam ${label}, saat ini pukul ${time}`}
      >
        <View className="flex-row items-baseline gap-1.5">
          <AppText
            weight="semibold"
            className={active ? "text-ink" : "text-muted"}
            style={{ ...tnum, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 }}
          >
            {time}
          </AppText>
          <AppText weight="semibold" className="text-[12px] text-muted">
            WIB
          </AppText>
        </View>
        <AppText
          weight="semibold"
          numberOfLines={1}
          className={`text-[14px] mt-0.5 ${active ? "text-ink" : "text-muted"}`}
        >
          {label}
        </AppText>
        <AppText weight="medium" numberOfLines={1} className="text-[12px] text-muted mt-0.5">
          {subtitle}
        </AppText>
      </PressableScale>

      <ToggleSwitch
        value={active}
        disabled={disabled}
        activeColor={activeColor}
        onValueChange={onToggle}
        accessibilityLabel={`Sakelar pengingat ${label}`}
      />
    </View>
  );
};

/* ---------------------------------------------------------------- Screen */

export default function RemindersScreen() {
  const router = useRouter();
  const {
    masterEnabled,
    waterReminderEnabled,
    morningWaterEnabled,
    morningWaterTime,
    waterIntervalHours,
    waterStartHour,
    waterEndHour,
    mealSlots,
    eveningJournalEnabled,
    eveningJournalTime,
    weeklyWeightEnabled,
    weeklyWeightTime,
    setMasterEnabled,
    setWaterReminderEnabled,
    setMorningWaterEnabled,
    setWaterIntervalHours,
    toggleMealSlot,
    setMealSlotTime,
    setOtherReminderTime,
    setEveningJournalEnabled,
    setWeeklyWeightEnabled,
  } = useReminderStore();

  const [editingTarget, setEditingTarget] = useState<CustomTimeTarget | null>(null);
  const [selectedHour, setSelectedHour] = useState(7);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const activeCount = masterEnabled
    ? (waterReminderEnabled ? 1 : 0) +
      (morningWaterEnabled ? 1 : 0) +
      mealSlots.filter((s) => s.enabled).length +
      (eveningJournalEnabled ? 1 : 0) +
      (weeklyWeightEnabled ? 1 : 0)
    : 0;

  const openPicker = (target: CustomTimeTarget) => {
    const [h, m] = target.time.split(":").map((n) => parseInt(n, 10));
    setSelectedHour(Number.isNaN(h) ? 7 : h);
    setSelectedMinute(Number.isNaN(m) ? 0 : m);
    setEditingTarget(target);
  };

  const closePicker = () => setEditingTarget(null);

  const handleSave = () => {
    if (!editingTarget) return;
    const formatted = `${HOURS[selectedHour]}:${MINUTES[selectedMinute]}`;
    if (editingTarget.kind === "meal") {
      setMealSlotTime(editingTarget.id, formatted);
    } else {
      setOtherReminderTime(editingTarget.key, formatted);
    }
    closePicker();
  };

  const preview = `${HOURS[selectedHour]}:${MINUTES[selectedMinute]}`;

  return (
    <ScreenWrapper maxWidth="narrow" className="flex-1 bg-canvas" testID="reminders-screen">
      <Header
        onBack={() => router.back()}
        title="Pengingat"
        subtitle="Jadwal minum air & jam makan harian"
        rightComponent={
          <StatusPill
            tone={activeCount > 0 ? "good" : "plain"}
            label={activeCount > 0 ? `${activeCount} aktif` : "Nonaktif"}
          />
        }
      />

      <ScrollView
        className="flex-1 pt-1"
        contentContainerStyle={{ paddingBottom: 72 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-3.5">
          {/* Master switch */}
          <FadeInView index={0}>
            <Surface>
              <View className="flex-row items-center gap-3">
                <RowIcon icon="bell" tone={masterEnabled ? "accent" : "plain"} />
                <View className="flex-1 min-w-0">
                  <AppText weight="semibold" className="text-[15px] text-ink">
                    Semua pengingat
                  </AppText>
                  <AppText weight="medium" numberOfLines={1} className="text-[12.5px] text-muted mt-0.5">
                    {masterEnabled ? "Ketuk jam untuk mengubah waktu" : "Semua notifikasi dijeda"}
                  </AppText>
                </View>
                <ToggleSwitch
                  value={masterEnabled}
                  onValueChange={setMasterEnabled}
                  accessibilityLabel="Aktifkan semua pengingat"
                />
              </View>
            </Surface>
          </FadeInView>

          {/* Hydration */}
          <FadeInView index={1}>
            <Surface style={{ opacity: masterEnabled ? 1 : 0.6 }}>
              <CardHead
                title="Air minum"
                caption={`Target 8 gelas · ${waterStartHour}–${waterEndHour} WIB`}
                className="mb-1"
              />

              <View className="py-3.5">
                <View className="flex-row items-center gap-4">
                  <View className="flex-1 min-w-0">
                    <AppText
                      weight="semibold"
                      className={`text-[14px] ${masterEnabled && waterReminderEnabled ? "text-ink" : "text-muted"}`}
                    >
                      Minum berkala
                    </AppText>
                    <AppText weight="medium" numberOfLines={1} className="text-[12px] text-muted mt-0.5">
                      1 gelas (250 ml) setiap {waterIntervalHours} jam
                    </AppText>
                  </View>
                  <ToggleSwitch
                    value={masterEnabled && waterReminderEnabled}
                    disabled={!masterEnabled}
                    activeColor={BLUE}
                    onValueChange={setWaterReminderEnabled}
                    accessibilityLabel="Sakelar pengingat minum berkala"
                  />
                </View>

                {masterEnabled && waterReminderEnabled && (
                  <View className="mt-3">
                    <Segmented<string>
                      stretch
                      value={String(waterIntervalHours)}
                      onChange={(v) => setWaterIntervalHours(Number(v) as WaterIntervalHours)}
                      accessibilityLabel="Frekuensi pengingat minum"
                      options={[
                        { value: "1", label: "1 jam" },
                        { value: "2", label: "2 jam" },
                        { value: "3", label: "3 jam" },
                      ]}
                    />
                  </View>
                )}
              </View>

              <AlarmRow
                time={morningWaterTime}
                label="Bangun tidur"
                subtitle="Segelas air untuk awali pagi"
                enabled={morningWaterEnabled}
                disabled={!masterEnabled}
                activeColor={BLUE}
                onToggle={setMorningWaterEnabled}
                onPress={() =>
                  openPicker({
                    kind: "other",
                    key: "morningWaterTime",
                    label: "Bangun tidur",
                    time: morningWaterTime,
                  })
                }
              />
            </Surface>
          </FadeInView>

          {/* Meals */}
          <FadeInView index={2}>
            <Surface style={{ opacity: masterEnabled ? 1 : 0.6 }}>
              <CardHead title="Jam makan" caption="Pengingat makan & catat jurnal" className="mb-1" />
              {mealSlots.map((slot, index) => (
                <AlarmRow
                  key={slot.id}
                  first={index === 0}
                  time={slot.time}
                  label={slot.label}
                  subtitle={slot.subtitle}
                  enabled={slot.enabled}
                  disabled={!masterEnabled}
                  onToggle={() => toggleMealSlot(slot.id)}
                  onPress={() =>
                    openPicker({ kind: "meal", id: slot.id, label: slot.label, time: slot.time })
                  }
                />
              ))}
            </Surface>
          </FadeInView>

          {/* Evaluation */}
          <FadeInView index={3}>
            <Surface style={{ opacity: masterEnabled ? 1 : 0.6 }}>
              <CardHead title="Evaluasi" caption="Jurnal harian & berat badan" className="mb-1" />
              <AlarmRow
                first
                time={eveningJournalTime}
                label="Evaluasi jurnal malam"
                subtitle="Lengkapi catatan makan hari ini"
                enabled={eveningJournalEnabled}
                disabled={!masterEnabled}
                onToggle={setEveningJournalEnabled}
                onPress={() =>
                  openPicker({
                    kind: "other",
                    key: "eveningJournalTime",
                    label: "Evaluasi jurnal malam",
                    time: eveningJournalTime,
                  })
                }
              />
              <AlarmRow
                time={weeklyWeightTime}
                label="Timbang berat badan"
                subtitle="Setiap Senin · pantau target BB"
                enabled={weeklyWeightEnabled}
                disabled={!masterEnabled}
                onToggle={setWeeklyWeightEnabled}
                onPress={() =>
                  openPicker({
                    kind: "other",
                    key: "weeklyWeightTime",
                    label: "Timbang berat badan",
                    time: weeklyWeightTime,
                  })
                }
              />
            </Surface>
          </FadeInView>
        </View>
      </ScrollView>

      {/* Wheel time picker */}
      <Modal
        visible={editingTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <View className="flex-1 justify-end sm:justify-center items-center p-0 sm:p-6">
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(18, 24, 20, 0.45)" }]}
            onPress={closePicker}
            accessibilityRole="button"
            accessibilityLabel="Tutup pengatur waktu"
          />
          {editingTarget && (
            <FadeInView duration={220} translateY={16} className="w-full max-w-md z-10">
              <Surface className="w-full rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6">
                <View className="items-center mb-4">
                  <AppText weight="medium" className="text-[13px] text-muted">
                    {editingTarget.label}
                  </AppText>
                  <AppText
                    weight="semibold"
                    className="text-ink mt-1"
                    style={{ ...tnum, fontSize: 40, lineHeight: 46, letterSpacing: -1 }}
                  >
                    {preview}
                  </AppText>
                </View>

                {/* Wheels */}
                <View
                  className="bg-card-2 border border-line rounded-[20px] overflow-hidden flex-row items-center px-6"
                  style={{ height: WHEEL_HEIGHT }}
                >
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: 12,
                      right: 12,
                      top: WHEEL_PADDING,
                      height: ITEM_HEIGHT,
                      borderRadius: 12,
                      backgroundColor: "rgba(14, 122, 82, 0.09)",
                    }}
                  />
                  <WheelColumn
                    key={`h-${editingTarget.label}`}
                    values={HOURS}
                    initialIndex={selectedHour}
                    onChange={setSelectedHour}
                    accessibilityLabel="Pilih jam"
                  />
                  <AppText weight="bold" className="text-[26px] text-ink px-2" style={{ marginTop: -4 }}>
                    :
                  </AppText>
                  <WheelColumn
                    key={`m-${editingTarget.label}`}
                    values={MINUTES}
                    initialIndex={selectedMinute}
                    onChange={setSelectedMinute}
                    accessibilityLabel="Pilih menit"
                  />
                </View>

                <View className="flex-row justify-around mt-2 mb-5 px-6">
                  <AppText weight="semibold" className="text-[11px] text-muted">
                    JAM
                  </AppText>
                  <AppText weight="semibold" className="text-[11px] text-muted">
                    MENIT
                  </AppText>
                </View>

                <View className="flex-row gap-2.5">
                  <PillButton label="Batal" onPress={closePicker} className="flex-1" />
                  <PillButton
                    label="Simpan"
                    variant="primary"
                    icon="check"
                    onPress={handleSave}
                    className="flex-1"
                  />
                </View>
              </Surface>
            </FadeInView>
          )}
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
