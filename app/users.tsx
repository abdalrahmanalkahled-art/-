import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useIsManager } from "@/lib/app-context";
import { createManagedUser, getManagedUsers, updateManagedUser } from "@/lib/user-management";
import { ROLE_PERMISSION_PRESETS, type ManagedUser, type PermissionModule, type UserPermissions, type UserRole } from "@/lib/user-permissions-model";

const ROLE_OPTIONS: { id: UserRole; title: string; description: string; color: string }[] = [
  { id: "system_admin", title: "مدير النظام", description: "وصول كامل وإدارة الحسابات", color: "#7C3AED" },
  { id: "marketing_manager", title: "مدير التسويق", description: "إدارة التسويق والتقارير دون الحسابات", color: "#1A56DB" },
  { id: "field_supervisor", title: "مشرف ميداني", description: "المحلات والاستبيانات والفعاليات", color: "#0E9F6E" },
  { id: "viewer", title: "مشاهد", description: "الاطلاع على اللوحة والتقارير فقط", color: "#64748B" },
];

const MODULE_LABELS: { id: PermissionModule; title: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: "dashboard", title: "الرئيسية", icon: "dashboard" }, { id: "stores", title: "المحلات", icon: "store" }, { id: "surveys", title: "الاستبيانات", icon: "assignment" },
  { id: "events", title: "الفعاليات", icon: "event" }, { id: "warehouse", title: "المستودع", icon: "inventory" }, { id: "expenses", title: "الصرفيات", icon: "receipt" },
  { id: "goals", title: "الخطة التسويقية", icon: "flag" }, { id: "signage", title: "اللوحات والستاندات", icon: "campaign" }, { id: "reports", title: "التقارير", icon: "assessment" },
  { id: "products", title: "المنتجات", icon: "inventory-2" }, { id: "analytics", title: "التحليلات", icon: "insights" }, { id: "settings", title: "الإعدادات", icon: "settings" },
  { id: "users", title: "المستخدمون", icon: "manage-accounts" },
];

function clonePermissions(permissions: UserPermissions): UserPermissions {
  return Object.fromEntries(Object.entries(permissions).map(([key, actions]) => [key, [...actions]])) as UserPermissions;
}

function roleDetails(role: UserRole) { return ROLE_OPTIONS.find((option) => option.id === role) || ROLE_OPTIONS[2]; }

export default function UsersScreen() {
  const colors = useColors();
  const isManager = useIsManager();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("field_supervisor");
  const [permissions, setPermissions] = useState<UserPermissions>(clonePermissions(ROLE_PERMISSION_PRESETS.field_supervisor));
  const [customPermissions, setCustomPermissions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingStatusUser, setPendingStatusUser] = useState<ManagedUser | null>(null);

  const loadUsers = useCallback(async () => setUsers(await getManagedUsers()), []);
  useEffect(() => { void loadUsers(); }, [loadUsers]);
  useFocusEffect(useCallback(() => { void loadUsers(); }, [loadUsers]));

  const resetForm = () => {
    setEditing(null); setName(""); setUsername(""); setPassword(""); setRole("field_supervisor");
    setPermissions(clonePermissions(ROLE_PERMISSION_PRESETS.field_supervisor)); setCustomPermissions(false);
  };
  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (user: ManagedUser) => {
    setEditing(user); setName(user.name); setUsername(user.username); setPassword(""); setRole(user.role);
    setPermissions(clonePermissions(user.permissions)); setCustomPermissions(false); setShowForm(true);
  };
  const chooseRole = (next: UserRole) => {
    setRole(next);
    if (!customPermissions) setPermissions(clonePermissions(ROLE_PERMISSION_PRESETS[next]));
  };
  const setModuleAccess = (module: PermissionModule, enabled: boolean) => {
    setPermissions((current) => ({ ...current, [module]: enabled ? ["view", "create", "edit", "delete", "export"] : [] }));
  };
  const save = async () => {
    if (!name.trim() || !username.trim()) { Alert.alert("بيانات ناقصة", "أدخل الاسم واسم المستخدم."); return; }
    if (!editing && !password.trim()) { Alert.alert("بيانات ناقصة", "أدخل كلمة مرور للحساب الجديد."); return; }
    setIsSaving(true);
    try {
      if (editing) {
        await updateManagedUser(editing.id, { name: name.trim(), role, permissions, ...(password.trim() ? { password } : {}) });
      } else {
        await createManagedUser({ name: name.trim(), username: username.trim(), password, role, permissions });
      }
      await loadUsers(); setShowForm(false); resetForm();
    } catch (error) { Alert.alert("تعذر حفظ المستخدم", error instanceof Error ? error.message : "حدث خطأ غير معروف"); }
    finally { setIsSaving(false); }
  };
  const updateStatus = async () => {
    if (!pendingStatusUser) return;
    await updateManagedUser(pendingStatusUser.id, { isActive: !pendingStatusUser.isActive });
    setPendingStatusUser(null); await loadUsers();
  };

  if (!isManager) return <ScreenContainer className="bg-background"><View style={styles.locked}><MaterialIcons name="lock" size={38} color={colors.error} /><Text style={[styles.lockedTitle, { color: colors.foreground }]}>ليس لديك صلاحية إدارة المستخدمين</Text><TouchableOpacity onPress={() => router.back()}><Text style={[styles.backText, { color: colors.primary }]}>العودة</Text></TouchableOpacity></View></ScreenContainer>;

  return <ScreenContainer containerClassName="bg-background">
    <View style={[styles.header, { borderBottomColor: colors.border }]}><TouchableOpacity onPress={() => router.back()} style={[styles.roundButton, { backgroundColor: colors.surface }]}><MaterialIcons name="arrow-back" size={22} color={colors.foreground} /></TouchableOpacity><View style={styles.headerText}><Text style={[styles.headerTitle, { color: colors.foreground }]}>إدارة المستخدمين</Text><Text style={[styles.headerSubtitle, { color: colors.muted }]}>الأدوار وصلاحيات الوصول المحلية</Text></View><TouchableOpacity onPress={openCreate} style={[styles.roundButton, { backgroundColor: colors.primary }]}><MaterialIcons name="person-add" size={21} color="#fff" /></TouchableOpacity></View>
    <FlatList data={users} keyExtractor={(user) => user.id} contentContainerStyle={styles.list} renderItem={({ item }) => {
      const details = roleDetails(item.role);
      return <TouchableOpacity activeOpacity={0.75} onPress={() => openEdit(item)} style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: item.isActive ? 1 : 0.6 }]}>
        <View style={styles.userActions}><Switch value={item.isActive} onValueChange={() => setPendingStatusUser(item)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.background} /><MaterialIcons name="edit" size={18} color={colors.muted} /></View>
        <View style={styles.userInfo}><Text style={[styles.userName, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.userHandle, { color: colors.muted }]}>@{item.username} • {details.title}</Text></View>
        <View style={[styles.avatar, { backgroundColor: details.color + "18" }]}><Text style={[styles.avatarText, { color: details.color }]}>{item.name[0]}</Text></View>
      </TouchableOpacity>;
    }} ListHeaderComponent={<View style={[styles.infoCard, { backgroundColor: colors.primary + "0E", borderColor: colors.primary + "30" }]}><MaterialIcons name="shield" size={22} color={colors.primary} /><Text style={[styles.infoText, { color: colors.muted }]}>يمكنك تعديل دور المستخدم أو تخصيص الوحدات التي يستطيع الوصول إليها. كلمات المرور تُحفظ محلياً على هذا الجهاز.</Text></View>} />

    <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => { setShowForm(false); resetForm(); }}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}><View style={[styles.formSheet, { backgroundColor: colors.background }]}>
      <View style={styles.sheetHeader}><TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}><Text style={[styles.cancel, { color: colors.muted }]}>إلغاء</Text></TouchableOpacity><Text style={[styles.sheetTitle, { color: colors.foreground }]}>{editing ? "تعديل مستخدم" : "مستخدم جديد"}</Text><View style={{ width: 36 }} /></View>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.foreground }]}>الاسم</Text><TextInput value={name} onChangeText={setName} placeholder="الاسم الكامل" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} textAlign="right" />
        <Text style={[styles.label, { color: colors.foreground }]}>اسم المستخدم</Text><TextInput editable={!editing} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="مثال: field.user" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface, opacity: editing ? 0.6 : 1 }]} textAlign="right" />
        <Text style={[styles.label, { color: colors.foreground }]}>{editing ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="4 أحرف على الأقل" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} textAlign="right" />
        <Text style={[styles.label, { color: colors.foreground }]}>الدور</Text><View style={styles.roleGrid}>{ROLE_OPTIONS.map((option) => <TouchableOpacity key={option.id} onPress={() => chooseRole(option.id)} style={[styles.roleOption, { borderColor: role === option.id ? option.color : colors.border, backgroundColor: role === option.id ? option.color + "12" : colors.surface }]}><MaterialIcons name={role === option.id ? "radio-button-checked" : "radio-button-unchecked"} size={17} color={role === option.id ? option.color : colors.muted} /><View style={styles.roleText}><Text style={[styles.roleTitle, { color: colors.foreground }]}>{option.title}</Text><Text style={[styles.roleDescription, { color: colors.muted }]}>{option.description}</Text></View></TouchableOpacity>)}</View>
        <View style={[styles.customHeader, { borderColor: colors.border }]}><Switch value={customPermissions} onValueChange={(value) => { setCustomPermissions(value); if (!value) setPermissions(clonePermissions(ROLE_PERMISSION_PRESETS[role])); }} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} /><View style={styles.customText}><Text style={[styles.customTitle, { color: colors.foreground }]}>تخصيص صلاحيات الوصول</Text><Text style={[styles.customSubtitle, { color: colors.muted }]}>اختيار الوحدات المتاحة لهذا المستخدم</Text></View></View>
        {customPermissions && <View style={[styles.permissionsCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>{MODULE_LABELS.map((module) => <View key={module.id} style={[styles.permissionRow, { borderBottomColor: colors.border }]}><Switch value={permissions[module.id].includes("view")} onValueChange={(value) => setModuleAccess(module.id, value)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.background} /><Text style={[styles.permissionTitle, { color: colors.foreground }]}>{module.title}</Text><MaterialIcons name={module.icon} size={18} color={permissions[module.id].includes("view") ? colors.primary : colors.muted} /></View>)}</View>}
        <TouchableOpacity disabled={isSaving} onPress={() => void save()} style={[styles.saveButton, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}><Text style={styles.saveText}>{isSaving ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "إضافة المستخدم"}</Text></TouchableOpacity>
      </ScrollView>
    </View></KeyboardAvoidingView></Modal>
    <ConfirmDialog visible={Boolean(pendingStatusUser)} title={pendingStatusUser?.isActive ? "إيقاف المستخدم" : "تفعيل المستخدم"} message={pendingStatusUser?.isActive ? `سيتم منع ${pendingStatusUser.name} من تسجيل الدخول حتى إعادة تفعيله.` : `سيتم السماح لـ${pendingStatusUser?.name} بتسجيل الدخول.`} confirmText={pendingStatusUser?.isActive ? "إيقاف" : "تفعيل"} isDangerous={pendingStatusUser?.isActive} icon={pendingStatusUser?.isActive ? "person-off" : "person"} onCancel={() => setPendingStatusUser(null)} onConfirm={() => void updateStatus()} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  header: { height: 76, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, borderBottomWidth: 1 }, roundButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, headerText: { flex: 1, alignItems: "flex-start" }, headerTitle: { fontSize: 18, fontWeight: "800" as any }, headerSubtitle: { fontSize: 11, marginTop: 2 }, list: { padding: 16, gap: 10, paddingBottom: 34 }, infoCard: { borderWidth: 1, borderRadius: 14, padding: 13, flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 4 }, infoText: { flex: 1, fontSize: 12, lineHeight: 19, textAlign: "left" }, userCard: { borderRadius: 16, borderWidth: 1, padding: 13, flexDirection: "row", alignItems: "center", gap: 11 }, avatar: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" }, avatarText: { fontSize: 18, fontWeight: "800" as any }, userInfo: { flex: 1, alignItems: "flex-start" }, userName: { fontSize: 14, fontWeight: "800" as any }, userHandle: { fontSize: 11, marginTop: 4, textAlign: "left" }, userActions: { gap: 7, alignItems: "center" }, locked: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, lockedTitle: { fontSize: 16, fontWeight: "800" as any }, backText: { fontSize: 14, fontWeight: "700" as any }, modalOverlay: { flex: 1, justifyContent: "flex-start", backgroundColor: "rgba(15,23,42,0.45)" }, formSheet: { maxHeight: "94%", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" }, sheetHeader: { height: 62, paddingHorizontal: 18, alignItems: "center", justifyContent: "space-between", flexDirection: "row" }, sheetTitle: { fontSize: 16, fontWeight: "800" as any }, cancel: { fontSize: 14, fontWeight: "700" as any }, formContent: { paddingHorizontal: 18, paddingBottom: 32 }, label: { fontSize: 13, fontWeight: "700" as any, textAlign: "left", marginTop: 12, marginBottom: 6 }, input: { borderWidth: 1, borderRadius: 12, minHeight: 48, paddingHorizontal: 12, fontSize: 14 }, roleGrid: { gap: 8 }, roleOption: { borderWidth: 1, borderRadius: 13, padding: 11, flexDirection: "row", gap: 9, alignItems: "center" }, roleText: { flex: 1, alignItems: "flex-start" }, roleTitle: { fontSize: 13, fontWeight: "800" as any }, roleDescription: { fontSize: 10, textAlign: "left", marginTop: 2 }, customHeader: { borderTopWidth: 1, borderBottomWidth: 1, marginTop: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 }, customText: { flex: 1, alignItems: "flex-start" }, customTitle: { fontSize: 13, fontWeight: "800" as any }, customSubtitle: { fontSize: 10, textAlign: "left", marginTop: 2 }, permissionsCard: { marginTop: 10, borderWidth: 1, borderRadius: 13, overflow: "hidden" }, permissionRow: { minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 }, permissionTitle: { flex: 1, textAlign: "left", fontSize: 12, fontWeight: "700" as any }, saveButton: { marginTop: 20, minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" }, saveText: { color: "#fff", fontSize: 15, fontWeight: "800" as any },
});
