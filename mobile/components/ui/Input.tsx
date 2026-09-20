import React, { useState, useRef, useImperativeHandle } from "react";
import {
  View,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { AppText } from "./AppText";
import { Colors } from "@/constants/DesignTokens";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftAccessory?: React.ReactNode;
  rightAccessory?: React.ReactNode;
  isPassword?: boolean;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftAccessory,
      rightAccessory,
      isPassword = false,
      secureTextEntry = false,
      value,
      onChangeText,
      placeholder,
      editable = true,
      className,
      style,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const isSecure = isPassword || secureTextEntry;
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const innerInputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => innerInputRef.current as TextInput);

    const hasError = !!error;

    // React Native dynamic style values instead of dynamic NativeWind class interpolation
    const borderColor = hasError
      ? Colors.status.error
      : isFocused
      ? Colors.primary.DEFAULT
      : Colors.neutral.border;

    const labelColor = hasError
      ? Colors.status.error
      : isFocused
      ? Colors.primary.DEFAULT
      : Colors.neutral.muted;

    const handleLabelPress = () => {
      if (editable) {
        innerInputRef.current?.focus();
      }
    };

    return (
      <View className="w-full mb-3">
        <View
          className="w-full min-h-[68px] bg-white rounded-xl border px-4 py-2.5 justify-center"
          style={[
            { borderColor },
            !editable ? { opacity: 0.5, backgroundColor: Colors.neutral.bgPage } : null,
          ]}
        >
          {Boolean(label) && (
            <Pressable
              onPress={handleLabelPress}
              disabled={!editable}
              hitSlop={4}
            >
              <AppText
                weight="extrabold"
                className="text-xs uppercase tracking-wider mb-0.5"
                style={{ color: labelColor }}
              >
                {label}
              </AppText>
            </Pressable>
          )}

          <View className="flex-row items-center flex-1">
            {Boolean(leftAccessory) && <View className="mr-2">{leftAccessory}</View>}

            <TextInput
              ref={innerInputRef}
              className="flex-1 text-neutral-dark text-[17px] p-0"
              style={[
                {
                  fontFamily: "Akatab-SemiBold",
                  includeFontPadding: false,
                  minHeight: 36,
                },
                style,
              ]}
              placeholder={placeholder}
              placeholderTextColor={Colors.neutral.muted}
              value={value}
              onChangeText={onChangeText}
              editable={editable}
              secureTextEntry={isSecure && !showPassword}
              onFocus={(e) => {
                setIsFocused(true);
                onFocus?.(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                onBlur?.(e);
              }}
              accessibilityLabel={props.accessibilityLabel || label || placeholder}
              accessibilityHint={hasError ? `Error: ${error}` : helperText}
              accessibilityState={{ disabled: !editable }}
              {...props}
            />

            {isSecure ? (
              <TouchableOpacity
                className="p-1 min-w-[44px] min-h-[44px] items-center justify-center"
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                accessibilityRole="button"
              >
                <AppText weight="bold" className="text-xs text-primary">
                  {showPassword ? "HIDE" : "SHOW"}
                </AppText>
              </TouchableOpacity>
            ) : (
              Boolean(rightAccessory) && <View className="ml-2">{rightAccessory}</View>
            )}
          </View>
        </View>

        {hasError ? (
          <AppText weight="medium" className="text-xs text-status-error mt-1 ml-1">
            {error}
          </AppText>
        ) : helperText ? (
          <AppText weight="medium" className="text-xs text-neutral-muted mt-1 ml-1">
            {helperText}
          </AppText>
        ) : null}
      </View>
    );
  }
);

Input.displayName = "Input";
