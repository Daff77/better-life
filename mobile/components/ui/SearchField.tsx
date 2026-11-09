import React from "react";
import { View, TextInput, Platform, ViewStyle } from "react-native";
import { PressableScale } from "./PressableScale";
import { LineIcon } from "./LineIcon";
import { SURFACE_SHADOW } from "./Surface";

export interface SearchFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  onSubmit?: () => void;
}

/**
 * Pill search input at 16px so iOS Safari does not zoom on focus.
 * Uses Vialo's surface elevation and turns its border emerald when focused.
 */
export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  onSubmit,
}) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <View
      className={`flex-row items-center bg-card rounded-full px-4 h-12 border ${
        focused ? "border-primary" : "border-line"
      }`}
      style={{ boxShadow: SURFACE_SHADOW } as ViewStyle}
    >
      <LineIcon name="search" size={18} color={focused ? "#0e7a52" : "#56605a"} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7b837c"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel}
        className="flex-1 ml-2.5 text-ink"
        style={{
          fontFamily: "Urbanist-Medium",
          fontSize: 16,
          includeFontPadding: false,
          ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
        }}
      />
      {Boolean(value) && (
        <PressableScale
          onPress={() => onChangeText("")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="w-7 h-7 rounded-full bg-card-2 items-center justify-center ml-1"
          accessibilityRole="button"
          accessibilityLabel="Hapus pencarian"
        >
          <LineIcon name="close" size={13} color="#56605a" />
        </PressableScale>
      )}
    </View>
  );
};
