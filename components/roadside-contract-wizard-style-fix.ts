import { StyleSheet } from "react-native";

const originalCreate = StyleSheet.create;
let hasAppliedRoadsidePickerFix = false;

/**
 * The roadside wizard stylesheet is intentionally compacted into one source line.
 * It removes the legacy top brand picker, while normalizing the remaining image
 * slots, brand selectors, and field spacing to the board and stand card pattern.
 */
(StyleSheet as unknown as { create: typeof StyleSheet.create }).create = ((definitions: Record<string, unknown>) => {
  const isRoadsideWizard = !hasAppliedRoadsidePickerFix && "boardCard" in definitions && "imageSlot" in definitions && "brandPicker" in definitions;
  if (!isRoadsideWizard) return originalCreate(definitions as any);

  hasAppliedRoadsidePickerFix = true;
  const result = originalCreate({
    ...definitions,
    brandPicker: { ...(definitions.brandPicker as object), display: "none" },
    boardCard: { ...(definitions.boardCard as object), borderRadius: 16, padding: 14, marginBottom: 12 },
    boardTop: { ...(definitions.boardTop as object), marginBottom: 9 },
    sidesRow: { ...(definitions.sidesRow as object), minHeight: 60, borderRadius: 12 },
    compactPicker: { ...(definitions.compactPicker as object), minHeight: 37, borderRadius: 8, paddingHorizontal: 8, gap: 5 },
    imageSlot: { ...(definitions.imageSlot as object), borderRadius: 12 },
    imagePreview: { ...(definitions.imagePreview as object), height: 124 },
    imagePlaceholder: { ...(definitions.imagePlaceholder as object), height: 124 },
    imageActions: { ...(definitions.imageActions as object), minHeight: 42, padding: 6 },
    imageAction: { ...(definitions.imageAction as object), minHeight: 30, borderRadius: 8 },
    dimensions: { ...(definitions.dimensions as object), marginTop: 8 },
  } as any);
  (StyleSheet as unknown as { create: typeof StyleSheet.create }).create = originalCreate;
  return result;
}) as typeof StyleSheet.create;
