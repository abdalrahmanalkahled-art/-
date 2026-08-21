const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const useVirtualCssModule = process.env.METRO_USE_VIRTUAL_CSS === "1";

// Zustand's package-export build leaves `import.meta` in the development web
// bundle, which a classic Expo script cannot execute. Prefer its compatible
// CommonJS entry for the Metro preview while keeping native app behavior.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, {
  input: "./global.css",
  // The web preview uses NativeWind's virtual module to avoid a filesystem
  // write that can stall Metro in the sandbox. Native development keeps the
  // existing filesystem-backed behavior.
  forceWriteFileSystem: !useVirtualCssModule,
});
