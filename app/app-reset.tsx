import { useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { SuccessModal } from "@/components/success-modal";
import { useColors } from "@/hooks/use-colors";
import { APP_RESET_SCOPES, resetAppData, type AppResetScope } from "@/lib/app-reset";
import { useApp } from "@/lib/app-context";
import { verifyLocalUserPassword } from "@/lib/storage";

export default function AppResetScreen() {
  const colors = useColors();
  const { user } = useApp();
  const [selectedScope, setSelectedScope] = useState<AppResetScope | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<{ message: string; requiresLogin: boolean } | null>(null);

  const dismissConfirm = () => {
    if (busy) return;
    setSelectedScope(null);
    setPassword("");
    setPasswordError("");
  };

  const requestReset = (scope: AppResetScope) => {
    setPassword("");
    setPasswordError("");
    setSelectedScope(scope);
  };

  const confirmReset = async () => {
    if (!selectedScope || !user?.username) return;
    if (!(await verifyLocalUserPassword(user.username, password))) {
      setPasswordError("كلمة مرور الحساب الحالي غير صحيحة.");
      return;
    }
    setBusy(true);
    try {
      const outcome = await resetAppData(selectedScope.id);
      const requiresLogin = selectedScope.id === "all" || selectedScope.id === "users";
      setSelectedScope(null);
      setSuccess({ message: `تمت تهيئة «${selectedScope.title}» وحذف ${outcome.removedDataGroups} مجموعة بيانات${outcome.removedDirectories ? ` و${outcome.removedDirectories} مجلدات وسائط` : ""}. احتُفظت جميع النسخ الاحتياطية المحلية.`, requiresLogin });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "تعذر إتمام التهيئة. لم تُحذف النسخ الاحتياطية.");
    } finally { setBusy(false); }
  };

  const renderScope = ({ item }: { item: AppResetScope }) => {
    const isAll = item.id === "all";
    return <TouchableOpacity onPress={() => requestReset(item)} activeOpacity={0.82} style={[styles.scope, { backgroundColor: colors.surface, borderColor: isAll ? colors.error + "72" : colors.border }]}><View style={[styles.scopeIcon, { backgroundColor: (isAll ? colors.error : colors.warning) + "14" }]}><MaterialIcons name={isAll ? "delete-sweep" : "delete-outline"} size={21} color={isAll ? colors.error : colors.warning} /></View><View style={styles.scopeCopy}><Text style={[styles.scopeTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.scopeDescription, { color: colors.muted }]}>{item.description}</Text>{item.warning ? <View style={[styles.dependencyTag, { backgroundColor: colors.warning + "14" }]}><MaterialIcons name="warning-amber" size={13} color={colors.warning} /><Text style={[styles.dependencyText, { color: colors.warning }]}>يحذف تبعيات مرتبطة</Text></View> : null}</View><MaterialIcons name="chevron-left" size={22} color={colors.muted} /></TouchableOpacity>;
  };

  return <ScreenContainer containerClassName="bg-background">
    <View style={[styles.header, { borderBottomColor: colors.border }]}><TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}><MaterialIcons name="arrow-forward" size={22} color={colors.foreground} /></TouchableOpacity><View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.foreground }]}>تهيئة التطبيق</Text><Text style={[styles.headerSubtitle, { color: colors.muted }]}>حذف بيانات محددة أو تهيئة التطبيق بأمان</Text></View></View>
    <FlatList data={APP_RESET_SCOPES} keyExtractor={(item) => item.id} renderItem={renderScope} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} ListHeaderComponent={<><View style={[styles.notice, { backgroundColor: colors.primary + "0E", borderColor: colors.primary + "2C" }]}><View style={[styles.noticeIcon, { backgroundColor: colors.primary + "16" }]}><MaterialIcons name="shield" size={23} color={colors.primary} /></View><View style={styles.noticeCopy}><Text style={[styles.noticeTitle, { color: colors.foreground }]}>تهيئة محمية</Text><Text style={[styles.noticeText, { color: colors.muted }]}>لن تُنفذ أي عملية قبل إدخال كلمة مرور الحساب الحالي. تبقى النسخ الاحتياطية المحفوظة في إدارة النسخ الاحتياطية دون تغيير.</Text></View></View><Text style={[styles.sectionTitle, { color: colors.muted }]}>اختر البيانات المراد تهيئتها</Text></>} ItemSeparatorComponent={() => <View style={styles.gap} />} />
    <Modal visible={Boolean(selectedScope)} transparent animationType="fade" onRequestClose={dismissConfirm}><View style={styles.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={dismissConfirm} /><View style={[styles.dialog, { backgroundColor: colors.surface }]}>{selectedScope ? <><View style={[styles.dialogIcon, { backgroundColor: colors.error + "14" }]}><MaterialIcons name="warning-amber" size={28} color={colors.error} /></View><Text style={[styles.dialogTitle, { color: colors.foreground }]}>تأكيد تهيئة «{selectedScope.title}»</Text><Text style={[styles.dialogText, { color: colors.muted }]}>{selectedScope.warning || `سيتم حذف ${selectedScope.description} نهائياً من هذا الجهاز.`}</Text><View style={[styles.backupPromise, { backgroundColor: colors.primary + "0E", borderColor: colors.primary + "28" }]}><MaterialIcons name="backup" size={16} color={colors.primary} /><Text style={[styles.backupPromiseText, { color: colors.primary }]}>لن تُحذف النسخ الاحتياطية المحلية.</Text></View><TextInput value={password} onChangeText={(value) => { setPassword(value); setPasswordError(""); }} secureTextEntry placeholder="أدخل كلمة مرور الحساب الحالي" placeholderTextColor={colors.muted} textAlign="right" style={[styles.passwordInput, { color: colors.foreground, borderColor: passwordError ? colors.error : colors.border }]} /><Text style={[styles.passwordError, { color: colors.error }]}>{passwordError}</Text><View style={styles.actions}><TouchableOpacity disabled={busy} onPress={dismissConfirm} style={[styles.cancel, { borderColor: colors.border }]}><Text style={[styles.cancelText, { color: colors.foreground }]}>إلغاء</Text></TouchableOpacity><TouchableOpacity disabled={busy || !password} onPress={() => void confirmReset()} style={[styles.resetButton, { backgroundColor: colors.error, opacity: password ? 1 : 0.55 }]}>{busy ? <ActivityIndicator color="#fff" /> : <><MaterialIcons name="delete-forever" size={18} color="#fff" /><Text style={styles.resetText}>تهيئة وحذف البيانات</Text></>}</TouchableOpacity></View></> : null}</View></View></Modal>
    <SuccessModal visible={Boolean(success)} message={success?.message || ""} onClose={() => { const current = success; setSuccess(null); router.replace((current?.requiresLogin ? "/login" : "/(tabs)") as any); }} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  header: { height: 76, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1 }, back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "flex-end" }, headerTitle: { fontSize: 18, fontWeight: "800" as any }, headerSubtitle: { fontSize: 11, marginTop: 2, textAlign: "right" }, content: { padding: 16, paddingBottom: 36 }, notice: { borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: "row-reverse", gap: 10, alignItems: "flex-start" }, noticeIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, noticeCopy: { flex: 1, alignItems: "flex-end" }, noticeTitle: { fontSize: 14, fontWeight: "800" as any, textAlign: "right" }, noticeText: { fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 3 }, sectionTitle: { fontSize: 12, fontWeight: "800" as any, textAlign: "right", marginTop: 18, marginBottom: 9, marginRight: 4 }, scope: { minHeight: 81, borderRadius: 17, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, flexDirection: "row-reverse", gap: 10, alignItems: "center" }, scopeIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, scopeCopy: { flex: 1, alignItems: "flex-end" }, scopeTitle: { fontSize: 13, fontWeight: "800" as any, textAlign: "right" }, scopeDescription: { fontSize: 10, lineHeight: 15, marginTop: 3, textAlign: "right" }, dependencyTag: { marginTop: 6, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, flexDirection: "row-reverse", alignItems: "center", gap: 3 }, dependencyText: { fontSize: 9, fontWeight: "700" as any }, gap: { height: 9 }, backdrop: { flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 16 }, dialog: { borderRadius: 22, padding: 20, alignItems: "center" }, dialogIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" }, dialogTitle: { fontSize: 17, fontWeight: "800" as any, textAlign: "center", marginTop: 11 }, dialogText: { fontSize: 12, lineHeight: 19, textAlign: "center", marginTop: 9 }, backupPromise: { width: "100%", marginTop: 13, borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 6 }, backupPromiseText: { fontSize: 10, fontWeight: "700" as any }, passwordInput: { width: "100%", minHeight: 48, borderRadius: 13, borderWidth: 1, paddingHorizontal: 13, marginTop: 16 }, passwordError: { width: "100%", minHeight: 17, marginTop: 4, fontSize: 10, textAlign: "right" }, actions: { width: "100%", flexDirection: "row-reverse", gap: 9, marginTop: 5 }, cancel: { flex: 1, minHeight: 47, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" }, cancelText: { fontSize: 13, fontWeight: "700" as any }, resetButton: { flex: 1.4, minHeight: 47, borderRadius: 13, flexDirection: "row-reverse", gap: 6, alignItems: "center", justifyContent: "center" }, resetText: { color: "#fff", fontSize: 12, fontWeight: "800" as any },
});
