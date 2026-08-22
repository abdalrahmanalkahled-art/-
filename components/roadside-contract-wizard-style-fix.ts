import { StyleSheet } from "react-native";

const originalCreate = StyleSheet.create;
let hasAppliedRoadsidePickerFix = false;

/**
 * The roadside wizard stylesheet is intentionally compacted into one source line.
 * This narrowly removes the legacy top brand picker while preserving the picker
 * located inside each image slot, which is now the single source of brand choice.
 */
(StyleSheet as unknown as { create: typeof StyleSheet.create }).create = ((definitions: Record<string, unknown>) => {
  const isRoadsideWizard = !hasAppliedRoadsidePickerFix && "boardCard" in definitions && "imageSlot" in definitions && "brandPicker" in definitions;
  if (!isRoadsideWizard) return originalCreate(definitions as any);

  hasAppliedRoadsidePickerFix = true;
  const result = originalCreate({
    ...definitions,
    brandPicker: { ...(definitions.brandPicker as object), display: "none" },
  } as any);
  (StyleSheet as unknown as { create: typeof StyleSheet.create }).create = originalCreate;
  return result;
}) as typeof StyleSheet.create;
