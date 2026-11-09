import React, { useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TextInputProps,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppText } from "./AppText";
import { LineIcon, LineIconName } from "./LineIcon";
import { Colors } from "@/constants/DesignTokens";

/*
 * Flow kit: the shared shell for authentication and personalization screens.
 * One column, a quiet top bar (back + progress), a scrolling body and a pinned
 * action area that stays above the keyboard and the home indicator.
 */

const INK = Colors.neutral.dark;

/* ---------------------------------------------------------- StepProgress */

export const StepProgress: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <View
    className="flex-row gap-1 flex-1"
    accessibilityRole="progressbar"
    accessibilityValue={{ min: 1, max: total, now: current }}
    accessibilityLabel={`Langkah ${current} dari ${total}`}
  >
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        className="flex-1 h-1 rounded-full"
        style={{ backgroundColor: i < current ? Colors.primary.DEFAULT : "#d5dbd7" }}
      />
    ))}
  </View>
);

/* ------------------------------------------------------------ FlowScreen */

export interface FlowScreenProps {
  onBack?: () => void;
  /** Shows a segmented bar and "n/total" next to the back button. */
  step?: { current: number; total: number };
  /** Optional right-side element in the top bar (e.g. a "Masuk" link). */
  topRight?: React.ReactNode;
  /** Pinned bottom area, normally the primary action. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Vertically centre short content (login, welcome). */
  centered?: boolean;
}

export const FlowScreen: React.FC<FlowScreenProps> = ({ onBack, step, topRight, footer, children, centered }) => (
  <SafeAreaView className="flex-1 bg-canvas" edges={["top", "bottom", "left", "right"]}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
      <View className="flex-1 w-full max-w-[520px] self-center">
        {(onBack || step || topRight) && (
          <View className="flex-row items-center gap-3 px-5 pt-2 pb-1 min-h-[52px]">
            {onBack ? (
              <Pressable
                onPress={onBack}
                hitSlop={8}
                className="w-10 h-10 -ml-2 rounded-full items-center justify-center"
                style={({ pressed }) => (pressed ? { backgroundColor: "rgba(18,26,22,0.06)" } : undefined)}
                accessibilityRole="button"
                accessibilityLabel="Kembali"
              >
                <LineIcon name="arrowLeft" size={22} color={INK} />
              </Pressable>
            ) : null}
            {step ? (
              <>
                <StepProgress current={step.current} total={step.total} />
                <AppText weight="semibold" className="text-[12.5px] text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                  {step.current}/{step.total}
                </AppText>
              </>
            ) : (
              <View className="flex-1" />
            )}
            {topRight}
          </View>
        )}

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 24,
            justifyContent: centered ? "center" : "flex-start",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {footer ? <View className="px-5 pt-3 pb-3 border-t border-line bg-canvas">{footer}</View> : null}
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>
);

/* -------------------------------------------------------------- FlowTitle */

export const FlowTitle: React.FC<{ title: string; caption?: string; eyebrow?: string }> = ({ title, caption, eyebrow }) => (
  <View className="mb-6">
    {eyebrow ? (
      <AppText weight="semibold" className="text-[13px] text-primary-text mb-2">
        {eyebrow}
      </AppText>
    ) : null}
    <AppText
      weight="semibold"
      className="text-[28px] text-ink"
      style={{ letterSpacing: -0.7, lineHeight: 34 }}
      accessibilityRole="header"
    >
      {title}
    </AppText>
    {caption ? (
      <AppText weight="medium" className="text-[15px] text-muted mt-2" style={{ lineHeight: 21 }}>
        {caption}
      </AppText>
    ) : null}
  </View>
);

/* -------------------------------------------------------------- TextField */

export interface TextFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  error?: string;
  hint?: string;
  icon?: LineIconName;
  /** Adds a show/hide toggle and masks the value. */
  password?: boolean;
  suffix?: string;
  big?: boolean;
}

export const TextField = React.forwardRef<any, TextFieldProps>(
  ({ label, error, hint, icon, password, suffix, big, editable = true, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [visible, setVisible] = useState(false);
    const borderColor = error ? "#b3301b" : focused ? Colors.primary.DEFAULT : "#d5dbd7";

    return (
      <View>
        <AppText weight="semibold" className="text-[13.5px] text-ink-2 mb-2">
          {label}
        </AppText>
        <View
          className={`flex-row items-center bg-card rounded-[16px] px-4 ${big ? "h-[68px]" : "h-[54px]"} ${
            editable ? "" : "opacity-60"
          }`}
          style={{ borderWidth: focused || error ? 1.5 : 1, borderColor } as ViewStyle}
        >
          {icon ? (
            <View className="mr-3">
              <LineIcon name={icon} size={19} color={focused ? Colors.primary.DEFAULT : "#7d8781"} />
            </View>
          ) : null}
          <TextInput
            ref={ref}
            {...props}
            editable={editable}
            secureTextEntry={password ? !visible : props.secureTextEntry}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            placeholderTextColor="#8a938d"
            accessibilityLabel={props.accessibilityLabel ?? label}
            className="flex-1 text-ink h-full"
            style={{
              fontFamily: big ? "Urbanist-SemiBold" : "Urbanist-Medium",
              fontSize: big ? 30 : 16,
              letterSpacing: big ? -0.6 : 0,
              paddingVertical: 0,
            }}
          />
          {suffix ? (
            <AppText weight="semibold" className="text-[16px] text-muted ml-2">
              {suffix}
            </AppText>
          ) : null}
          {password ? (
            <Pressable
              onPress={() => setVisible((v) => !v)}
              hitSlop={10}
              className="ml-2 w-9 h-9 items-center justify-center rounded-full"
              accessibilityRole="button"
              accessibilityLabel={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              <LineIcon name={visible ? "eyeOff" : "eye"} size={20} color="#56605a" />
            </Pressable>
          ) : null}
        </View>
        {error ? (
          <View className="flex-row items-center gap-1.5 mt-1.5" accessibilityLiveRegion="polite">
            <LineIcon name="alert" size={14} color="#b3301b" />
            <AppText weight="medium" className="text-[13px] text-bad flex-1">
              {error}
            </AppText>
          </View>
        ) : hint ? (
          <AppText weight="medium" className="text-[13px] text-muted mt-1.5">
            {hint}
          </AppText>
        ) : null}
      </View>
    );
  }
);
TextField.displayName = "TextField";

/* ------------------------------------------------------------- ChoiceTile */

export interface ChoiceTileProps {
  title: string;
  caption?: string;
  leading?: React.ReactNode;
  selected: boolean;
  multi?: boolean;
  onPress: () => void;
}

/** Single- or multi-select row. Selection reads from border, fill and the indicator. */
export const ChoiceTile: React.FC<ChoiceTileProps> = ({ title, caption, leading, selected, multi, onPress }) => (
  <Pressable
    onPress={onPress}
    className="flex-row items-center gap-3.5 rounded-[18px] px-4 py-3.5 min-h-[64px]"
    style={({ pressed }) => [
      {
        backgroundColor: selected ? "#e8f3ed" : "#fbfdfc",
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? Colors.primary.DEFAULT : "#e1e6e2",
      },
      pressed ? { transform: [{ scale: 0.985 }] } : null,
    ]}
    accessibilityRole={multi ? "checkbox" : "radio"}
    accessibilityState={multi ? { checked: selected } : { selected }}
    accessibilityLabel={caption ? `${title}. ${caption}` : title}
  >
    {leading ? <View className="flex-shrink-0">{leading}</View> : null}
    <View className="flex-1 min-w-0">
      <AppText weight="semibold" className="text-[16px] text-ink">
        {title}
      </AppText>
      {caption ? (
        <AppText weight="medium" className="text-[13.5px] text-muted mt-0.5" style={{ lineHeight: 18 }}>
          {caption}
        </AppText>
      ) : null}
    </View>
    <View
      className={`w-6 h-6 items-center justify-center flex-shrink-0 ${multi ? "rounded-[7px]" : "rounded-full"}`}
      style={{
        backgroundColor: selected ? Colors.primary.DEFAULT : "transparent",
        borderWidth: selected ? 0 : 1.5,
        borderColor: "#c3cbc6",
      }}
    >
      {selected ? <LineIcon name="check" size={14} color="#ffffff" strokeWidth={2.6} /> : null}
    </View>
  </Pressable>
);

/* --------------------------------------------------------------- FormAlert */

export const FormAlert: React.FC<{ message?: string | null }> = ({ message }) =>
  message ? (
    <View
      className="flex-row items-start gap-2.5 p-3.5 mb-5 rounded-[14px] bg-bad-soft"
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View className="mt-px">
        <LineIcon name="alert" size={17} color="#b3301b" />
      </View>
      <AppText weight="semibold" className="text-[14px] text-bad flex-1" style={{ lineHeight: 19 }}>
        {message}
      </AppText>
    </View>
  ) : null;

/* -------------------------------------------------------------- TextLink */

export const TextLink: React.FC<{ label: string; onPress: () => void; muted?: boolean }> = ({ label, onPress, muted }) => (
  <Pressable onPress={onPress} hitSlop={8} accessibilityRole="link" className="py-1">
    {({ pressed }) => (
      <AppText
        weight="bold"
        className={`text-[14.5px] ${muted ? "text-ink-2" : "text-primary-text"}`}
        style={{ opacity: pressed ? 0.6 : 1 }}
      >
        {label}
      </AppText>
    )}
  </Pressable>
);

