import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "expo-file-system/legacy": path.resolve(__dirname, "tests/mocks/expo-file-system.ts"),
      "expo-sharing": path.resolve(__dirname, "tests/mocks/expo-sharing.ts"),
      "react-native": path.resolve(__dirname, "tests/mocks/react-native.ts"),
      "@react-native-async-storage/async-storage": path.resolve(__dirname, "tests/mocks/async-storage.ts"),
    },
  },
});
