import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import { FloatingFormModal } from "@/components/floating-form-modal";
import { useColors } from "@/hooks/use-colors";
import { getKeyboardAvoidingBehavior } from "@/lib/keyboard-layout";
import type { Question } from "@/lib/types/survey-types";

interface AddQuestionModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (question: Question) => void;
}

export function AddQuestionModal({ visible, onClose, onAdd }: AddQuestionModalProps) {
  const colors = useColors();
  const [questionText, setQuestionText] = useState("");
  const [questionOptions, setQuestionOptions] = useState<string[]>([]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [optionText, setOptionText] = useState("");

  const addOption = () => {
    if (!optionText.trim()) return;
    setQuestionOptions((current) => [...current, optionText]);
    setOptionText("");
  };

  const saveQuestion = () => {
    if (!questionText.trim()) {
      Alert.alert("خطأ", "يرجى إدخال نص السؤال");
      return;
    }
    if (!questionOptions.length) {
      Alert.alert("خطأ", "يرجى إضافة خيار واحد على الأقل");
      return;
    }
    onAdd({ id: Date.now().toString(), text: questionText, options: questionOptions, allowMultiple });
    setQuestionText("");
    setQuestionOptions([]);
    setAllowMultiple(false);
    setOptionText("");
    onClose();
  };

  return (
    <FloatingFormModal visible={visible} onClose={onClose} backgroundColor={colors.background} compactHeight>
      <KeyboardAvoidingView behavior={getKeyboardAvoidingBehavior(Platform.OS)} style={styles.root}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="إغلاق إضافة السؤال"><MaterialIcons name="close" size={22} color={colors.foreground} /></TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>إضافة سؤال</Text>
          <View style={styles.headerGap} />
        </View>
        <ScrollView style={styles.content} keyboardShouldPersistTaps="always" keyboardDismissMode="none">
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>نص السؤال</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]} placeholder="أدخل نص السؤال" placeholderTextColor={colors.muted} value={questionText} onChangeText={setQuestionText} multiline />
          </View>
          <View style={styles.formGroup}>
            <TouchableOpacity onPress={() => setAllowMultiple((current) => !current)} style={styles.multipleRow}>
              <MaterialIcons name={allowMultiple ? "check-box" : "check-box-outline-blank"} size={24} color={colors.primary} />
              <Text style={[styles.multipleLabel, { color: colors.foreground }]}>السماح بإجابات متعددة</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.label, { color: colors.foreground }]}>الخيارات</Text>
          {questionOptions.map((option, index) => (
            <View key={`${option}-${index}`} style={styles.optionRow}>
              <TextInput style={[styles.optionInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]} placeholder={`خيار ${index + 1}`} placeholderTextColor={colors.muted} value={option} onChangeText={(text) => setQuestionOptions((current) => current.map((value, optionIndex) => optionIndex === index ? text : value))} />
              <TouchableOpacity onPress={() => setQuestionOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))} style={styles.removeOption} accessibilityLabel={`حذف الخيار ${index + 1}`}><MaterialIcons name="close" size={20} color={colors.error} /></TouchableOpacity>
            </View>
          ))}
          <View style={[styles.formGroup, styles.optionField]}>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]} placeholder="أدخل الخيار الجديد" placeholderTextColor={colors.muted} value={optionText} onChangeText={setOptionText} />
          </View>
          <TouchableOpacity onPress={addOption} style={[styles.addOption, { backgroundColor: colors.primary + "20", borderColor: colors.primary }]}>
            <MaterialIcons name="add" size={20} color={colors.primary} />
            <Text style={[styles.addOptionText, { color: colors.primary }]}>إضافة خيار</Text>
          </TouchableOpacity>
          <View style={styles.bottomPadding} />
        </ScrollView>
        <SafeAreaView edges={["bottom", "left", "right"]} style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={[styles.footerButton, { backgroundColor: colors.muted + "20" }]} activeOpacity={0.8}><MaterialIcons name="close" size={20} color={colors.foreground} /><Text style={[styles.buttonText, { color: colors.foreground }]}>إلغاء</Text></TouchableOpacity>
          <TouchableOpacity onPress={saveQuestion} style={[styles.footerButton, { backgroundColor: colors.primary }]} activeOpacity={0.8}><MaterialIcons name="check" size={20} color="#fff" /><Text style={[styles.buttonText, { color: "#fff" }]}>حفظ</Text></TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </FloatingFormModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { minHeight: 58, borderBottomWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, closeButton: { padding: 6 }, title: { fontSize: 18, fontWeight: "700" }, headerGap: { width: 34 }, content: { flex: 1, padding: 16 }, formGroup: { marginBottom: 16 }, label: { fontSize: 14, fontWeight: "600", marginBottom: 8, textAlign: "right" }, input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, textAlign: "right" }, multipleRow: { flexDirection: "row", alignItems: "center", gap: 12 }, multipleLabel: { fontSize: 14, fontWeight: "600" }, optionRow: { flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "center" }, optionInput: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, textAlign: "right" }, removeOption: { padding: 8 }, optionField: { marginBottom: 12 }, addOption: { minHeight: 44, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, addOptionText: { fontSize: 14, fontWeight: "700" }, bottomPadding: { height: 18 }, footer: { borderTopWidth: StyleSheet.hairlineWidth, padding: 14, flexDirection: "row", gap: 10 }, footerButton: { flex: 1, minHeight: 46, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, buttonText: { fontSize: 14, fontWeight: "600" },
});
