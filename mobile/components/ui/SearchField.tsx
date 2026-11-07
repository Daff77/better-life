import React from "react";
import { View, TextInput, Platform } from "react-native";
import { PressableScale } from "./PressableScale";
import { CloseIconSvg, SearchIconSvg } from "@/constants/Assets";

export interface SearchFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  onSubmit?: () => void;
}

/**
 * Search input at 16px so iOS Safari does not zoom on focus.
 * Focus is shown by the border turning forest, not by removing the outline silently.
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
      className={`flex-row items-center bg-white rounded-2xl px-3.5 h-12 border ${
        focused ? "border-primary" : "border-[#e3e1da]"
      }`}
    >
      <SearchIconSvg size={17} color="#5a625b" />
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
        className="flex-1 ml-2.5 text-neutral-dark"
        style={{
          fontFamily: "Akatab-Medium",
          fontSize: 16,
          includeFontPadding: false,
          ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
        }}
      />
      {Boolean(value) && (
        <PressableScale
          onPress={() => onChangeText("")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="w-7 h-7 rounded-full bg-[#efeee8] items-center justify-center ml-1"
          accessibilityRole="button"
          accessibilityLabel="Hapus pencarian"
        >
          <CloseIconSvg size={12} color="#5a625b" />
        </PressableScale>
      )}
    </View>
  );
};

