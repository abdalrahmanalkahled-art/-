import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/use-colors";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FloatingFormModal } from "@/components/floating-form-modal";
import { CATEGORY_ICON_OPTIONS, type ManagedCategory } from "@/lib/category-management";

interface CategoryManagerModalProps {
  visible: boolean;
  title: string;
  categories: ManagedCategory[];
  onClose: () => void;
  onSave: (category: ManagedCategory) => Promise<void> | void;
  onDelete: (category: ManagedCategory) => Promise<void> | void;
}

const colorsPreset = ["#2563EB", "#7C3AED", "#DC2626", "#F59E0B", "#0E9F6E", "#EC4899", "#0891B2", "#6B7280"];

export function CategoryManagerModal({ visible, title, categories, onClose, onSave, onDelete }: CategoryManagerModalProps) {
  const colors = useColors();
  const [draft, setDraft] = useState<ManagedCategory | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ManagedCategory | null>(null);

  const closeEditor = () => setDraft(null);
  const saveDraft = async () => {
    if (!draft?.label.trim()) {
      Alert.alert("خطأ", "أدخل اسم التصنيف");
      return;
    }
    await onSave({ ...draft, label: draft.label.trim() });
    closeEditor();
  };

  const requestDelete = (category: ManagedCategory) => setPendingDelete(category);
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await onDelete(pendingDelete);
    setPendingDelete(null);
    closeEditor();
  };

  const openNew = () => setDraft({ id: `category-${Date.now()}`, label: "", icon: "category", color: colors.primary, createdAt: new Date().toISOString() });

  return (
    <FloatingFormModal visible={visible} onClose={onClose} backgroundColor={colors.background}>
      <SafeAreaView edges={["top", "bottom", "left", "right"]} style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={draft ? closeEditor : onClose} style={styles.headerButton}>
            <MaterialIcons name={draft ? "arrow-forward" : "close"} size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>{draft ? (categories.some((item) => item.id === draft.id) ? "تعديل التصنيف" : "تصنيف جديد") : title}</Text>
          <TouchableOpacity onPress={draft ? saveDraft : openNew} style={styles.headerButton}>
            <MaterialIcons name={draft ? "check" : "add"} size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {draft ? (
          <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>اسم التصنيف</Text>
            <TextInput
              value={draft.label}
              onChangeText={(label) => setDraft({ ...draft, label })}
              placeholder="مثال: مستلزمات عرض"
              placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              textAlign="right"
            />

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>الرمز</Text>
            <View style={styles.iconsGrid}>
              {CATEGORY_ICON_OPTIONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  onPress={() => setDraft({ ...draft, icon })}
                  style={[styles.iconChoice, { backgroundColor: draft.icon === icon ? draft.color + "22" : colors.surface, borderColor: draft.icon === icon ? draft.color : colors.border }]}
                >
                  <MaterialIcons name={icon as keyof typeof MaterialIcons.glyphMap} size={22} color={draft.icon === icon ? draft.color : colors.muted} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>اللون</Text>
            <View style={styles.colorsRow}>
              {colorsPreset.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setDraft({ ...draft, color })}
                  style={[styles.colorChoice, { backgroundColor: color, borderColor: draft.color === color ? colors.foreground : "transparent", borderWidth: draft.color === color ? 2 : 0 }]}
                >
                  {draft.color === color ? <MaterialIcons name="check" size={16} color="#fff" /> : null}
                </TouchableOpacity>
              ))}
            </View>

            {categories.some((item) => item.id === draft.id) ? (
              <TouchableOpacity onPress={() => requestDelete(draft)} style={[styles.deleteButton, { borderColor: colors.error }]}>
                <MaterialIcons name="delete-outline" size={19} color={colors.error} />
                <Text style={[styles.deleteText, { color: colors.error }]}>حذف التصنيف</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            <Text style={[styles.description, { color: colors.muted }]}>يمكنك إضافة التصنيفات أو تغيير أسمائها ورموزها وألوانها. لا يُحذف تصنيف أخير منفرد حتى لا تفقد البيانات مرجعها.</Text>
            {categories.map((category) => (
              <TouchableOpacity key={category.id} onPress={() => setDraft(category)} style={[styles.categoryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color + "20" }]}>
                  <MaterialIcons name={category.icon as keyof typeof MaterialIcons.glyphMap} size={21} color={category.color} />
                </View>
                <Text style={[styles.categoryLabel, { color: colors.foreground }]}>{category.label}</Text>
                <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
      <ConfirmDialog
        visible={Boolean(pendingDelete)}
        title="حذف التصنيف"
        message={pendingDelete ? `هل تريد حذف «${pendingDelete.label}»؟ ستُنقل البيانات المرتبطة إلى تصنيف متبقٍ.` : ""}
        confirmText="حذف"
        isDangerous
        icon="warning"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </FloatingFormModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 60, paddingHorizontal: 12, borderBottomWidth: 0.5, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700" as any },
  listContent: { padding: 16, gap: 10 },
  description: { fontSize: 13, lineHeight: 20, marginBottom: 4, textAlign: "left" },
  categoryRow: { minHeight: 64, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12 },
  categoryIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  categoryLabel: { flex: 1, fontSize: 15, fontWeight: "700" as any, textAlign: "left" },
  editorContent: { padding: 16, paddingBottom: 32 },
  fieldLabel: { fontSize: 14, fontWeight: "700" as any, marginBottom: 8, marginTop: 12, textAlign: "left" },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  iconsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  iconChoice: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  colorsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  colorChoice: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  deleteButton: { marginTop: 32, minHeight: 48, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  deleteText: { fontSize: 14, fontWeight: "700" as any },
});
