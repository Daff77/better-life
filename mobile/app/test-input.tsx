import React, { useState } from "react";
import { View, TextInput, Text, StyleSheet } from "react-native";

export default function TestInputScreen() {
  const [text, setText] = useState("");
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Plain TextInput Test Screen</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Type here..."
        style={styles.input}
      />
      <Text style={styles.result}>Typed: {text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  input: {
    width: "100%",
    maxWidth: 320,
    height: 50,
    borderColor: "#333333",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  result: {
    marginTop: 16,
    fontSize: 14,
    color: "#666666",
  },
});
