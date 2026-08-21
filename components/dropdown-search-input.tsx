import React from "react";
import { TextInput, View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface DropdownSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  color?: string;
  primaryColor?: string;
}

export function DropdownSearchInput({
  value,
  onChangeText,
  placeholder = "ابحث...",
  placeholderTextColor = "#999",
  backgroundColor = "#fff",
  borderColor = "#ddd",
  color = "#000",
  primaryColor = "#0066cc",
}: DropdownSearchInputProps) {
  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      <MaterialIcons name="search" size={18} color={primaryColor} style={styles.icon} />
      <TextInput
        style={[styles.input, { color }]}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        value={value}
        onChangeText={onChangeText}
        textAlign="right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    marginBottom: 8,
    marginHorizontal: 8,
    marginTop: 8,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
  },
});
