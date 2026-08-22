import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useApp, useHasPermission } from "@/lib/app-context";
import { logout } from "@/lib/storage";
import { getKeyboardAvoidingBehavior } from "@/lib/keyboard-layout";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MORE_MODULES, MoreModuleContent, type MoreModuleId } from "@/components/modules/more-module-screen";
import { MoreModuleShell } from "@/components/modules/more-module-shell";

type CardFrame = { x: number; y: number; width: number; height: number };

export default function MoreScreen() {
  const colors = useColors();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const { user, dispatch } = useApp();
  const canViewWarehouse = useHasPermission("warehouse");
  const canViewExpenses = useHasPermission("expenses");
  const canViewGoals = useHasPermission("goals");
  const canViewSignage = useHasPermission("signage");
  const canViewReports = useHasPermission("reports");
  const canViewProducts = useHasPermission("products");
  const canViewAnalytics = useHasPermission("analytics");
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [activeModule, setActiveModule] = useState<MoreModuleId | null>(null);
  const [activeFrame, setActiveFrame] = useState<CardFrame | null>(null);
  const [moduleOpened, setModuleOpened] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: screenWidth, height: screenHeight });
  const cardRefs = useRef<Partial<Record<MoreModuleId, View | null>>>({});
  const expansion = useRef(new Animated.Value(0)).current;
  const contentReveal = useRef(new Animated.Value(18)).current;

  const handleLogout = async () => {
    await logout();
    dispatch({ type: "LOGOUT" });
    router.replace("/login");
  };

  const moduleAccess: Record<MoreModuleId, boolean> = {
    warehouse: canViewWarehouse,
    expenses: canViewExpenses,
    goals: canViewGoals,
    signage: canViewSignage,
    reports: canViewReports,
    products: canViewProducts,
    brands_regions: canViewProducts,
    analytics: canViewAnalytics,
  };
  const modules = MORE_MODULES.filter((module) => moduleAccess[module.id]);
  const activeModuleInfo = activeModule ? MORE_MODULES.find((module) => module.id === activeModule) : null;

  const openModule = (moduleId: MoreModuleId) => {
    const card = cardRefs.current[moduleId];
    if (!card) return;

    card.measureInWindow((x, y, width, height) => {
                // تحفظ الحركة إحداثيات النافذة الفعلية، فتظل نقطة التمدد صحيحة في LTR على الهاتف والمعاينة.

      setActiveFrame({ x: Math.max(x, 0), y: Math.max(y, 0), width, height });
      setActiveModule(moduleId);
      setModuleOpened(false);
      expansion.setValue(0);
      contentReveal.setValue(18);
      requestAnimationFrame(() => {
        Animated.timing(expansion, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished) return;
          setModuleOpened(true);
          requestAnimationFrame(() => {
            Animated.timing(contentReveal, {
              toValue: 0,
              duration: 180,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start();
          });
        });
      });
    });
  };

  const closeModule = () => {
    if (!activeModule) return;
    setModuleOpened(false);
    Animated.timing(expansion, {
      toValue: 0,
      duration: 200,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setActiveModule(null);
      setActiveFrame(null);
      expansion.setValue(0);
    });
  };

  const expandedCardStyle = activeFrame ? {
    left: activeFrame.x,
    top: activeFrame.y,
    width: activeFrame.width,
    height: activeFrame.height,
    borderRadius: moduleOpened ? 0 : 16,
    transform: [
      {
        // إحداثيات القياس فعلية، والحركة الآن تتبع المحور البصري LTR.
        translateX: expansion.interpolate({
          inputRange: [0, 1],
          outputRange: [0, (canvasSize.width - activeFrame.width) / 2 - activeFrame.x],
        }),
      },
      {
        translateY: expansion.interpolate({
          inputRange: [0, 1],
          outputRange: [0, (canvasSize.height - activeFrame.height) / 2 - activeFrame.y],
        }),
      },
      { scaleX: expansion.interpolate({ inputRange: [0, 1], outputRange: [1, canvasSize.width / activeFrame.width] }) },
      { scaleY: expansion.interpolate({ inputRange: [0, 1], outputRange: [1, canvasSize.height / activeFrame.height] }) },
    ],
  } : undefined;
  const expandingHeroStyle = activeFrame ? {
    left: activeFrame.x,
    top: activeFrame.y,
    width: activeFrame.width,
    height: activeFrame.height,
  } : undefined;

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>المزيد</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.userCard, { backgroundColor: colors.primary }]}> 
          <View style={styles.userInfo}>
            <Text style={styles.userRole}>{user?.role === "system_admin" || user?.role === "marketing_manager" ? "مدير النظام" : user?.role === "viewer" ? "مشاهد" : "مستخدم ميداني"}</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <View style={[styles.userAvatar, { backgroundColor: "rgba(255,255,255,0.3)" }]}>{user?.avatarUri ? <Image source={{ uri: user.avatarUri }} style={styles.userAvatarImage} /> : <Text style={styles.userAvatarText}>{user?.name?.[0] || "م"}</Text>}</View>
        </View>

        <View style={styles.modulesSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الوحدات</Text>
          <View style={styles.modulesGrid}>
            {modules.map((module) => (
              <TouchableOpacity
                key={module.id}
                ref={(node) => { cardRefs.current[module.id] = node; }}
                style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => openModule(module.id)}
                activeOpacity={0.9}
              >
                <View style={[styles.moduleIcon, { backgroundColor: module.color + "20" }]}><MaterialIcons name={module.icon} size={26} color={module.color} /></View>
                <Text style={[styles.moduleTitle, { color: colors.foreground }]}>{module.title}</Text>
                <Text style={[styles.moduleSubtitle, { color: colors.muted }]}>{module.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.settingsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <TouchableOpacity style={[styles.settingsItem, { borderBottomColor: colors.border }]} onPress={() => router.push("/settings" as any)}>
            <MaterialIcons name="chevron-left" size={20} color={colors.muted} /><Text style={[styles.settingsText, { color: colors.foreground }]}>الإعدادات</Text><MaterialIcons name="settings" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={() => setShowLogoutConfirmation(true)}>
            <MaterialIcons name="chevron-left" size={20} color={colors.error} /><Text style={[styles.settingsText, { color: colors.error }]}>تسجيل الخروج</Text><MaterialIcons name="logout" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
        <View style={styles.bottomPadding} />
      </ScrollView>

      <ConfirmDialog visible={showLogoutConfirmation} title="تسجيل الخروج" message="هل تريد تسجيل الخروج من الحساب الحالي؟" confirmText="تسجيل الخروج" isDangerous icon="logout" onCancel={() => setShowLogoutConfirmation(false)} onConfirm={() => { setShowLogoutConfirmation(false); void handleLogout(); }} />

      <Modal visible={activeModule !== null} transparent animationType="none" statusBarTranslucent onRequestClose={closeModule}>
        <View style={styles.transitionCanvas} onLayout={(event) => setCanvasSize(event.nativeEvent.layout)}>
          {activeModuleInfo ? <>
            <Animated.View pointerEvents="none" style={[styles.expandingCard, expandedCardStyle, { backgroundColor: colors.surface, borderColor: colors.border }]} />
            {!moduleOpened ? <View pointerEvents="none" style={[styles.expandingHero, expandingHeroStyle]}> 
              <View style={[styles.moduleIcon, { backgroundColor: activeModuleInfo.color + "20" }]}><MaterialIcons name={activeModuleInfo.icon} size={26} color={activeModuleInfo.color} /></View>
              <Text style={[styles.moduleTitle, { color: colors.foreground }]}>{activeModuleInfo.title}</Text>
              <Text style={[styles.moduleSubtitle, { color: colors.muted }]}>{activeModuleInfo.subtitle}</Text>
            </View> : null}

            {moduleOpened && activeModule ? <SafeAreaView edges={["top", "bottom", "left", "right"]} style={[styles.expandedPage, { backgroundColor: colors.background }]}> 
              <MoreModuleShell title={activeModuleInfo.title} subtitle={activeModuleInfo.subtitle} icon={activeModuleInfo.icon} accent={activeModuleInfo.color} compact={activeModule === "products"} onClose={closeModule} />
              <Animated.View style={[styles.moduleContent, { transform: [{ translateY: contentReveal }] }]}> 
                <KeyboardAvoidingView behavior={getKeyboardAvoidingBehavior(Platform.OS)} style={styles.moduleContent}> 
                  <MoreModuleContent moduleId={activeModule} />
                </KeyboardAvoidingView>
              </Animated.View>
            </SafeAreaView> : null}
          </> : null}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 18, fontWeight: "700" as any }, scroll: { flex: 1 },
  userCard: { margin: 16, borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, userInfo: { flex: 1 }, userName: { fontSize: 20, fontWeight: "800" as any, color: "#fff" }, userRole: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 4 }, userAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },   userAvatarImage: { width: "100%", height: "100%" },
  userAvatarText: { fontSize: 22, fontWeight: "800" as any, color: "#fff" },
  modulesSection: { paddingHorizontal: 16, marginBottom: 16 }, sectionTitle: { fontSize: 16, fontWeight: "700" as any, textAlign: "right", marginBottom: 12 }, modulesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, moduleCard: { width: "47%", borderRadius: 16, padding: 16, borderWidth: 1, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }, moduleIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10 }, moduleTitle: { fontSize: 14, fontWeight: "700" as any, textAlign: "center", marginBottom: 4 }, moduleSubtitle: { fontSize: 11, textAlign: "center" },
  settingsSection: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 16 }, settingsItem: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 }, settingsText: { flex: 1, fontSize: 15, fontWeight: "500" as any, textAlign: "right" }, bottomPadding: { height: 30 },
  transitionCanvas: { flex: 1 }, expandingCard: { position: "absolute", borderWidth: 1, elevation: 14 }, expandingHero: { position: "absolute", alignItems: "center", justifyContent: "center", zIndex: 1 }, expandedPage: { ...StyleSheet.absoluteFillObject }, moduleModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth }, moduleModalTitle: { fontSize: 17, fontWeight: "700" as any }, headerSpacer: { width: 24 }, moduleHero: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth }, moduleHeroIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" }, moduleHeroText: { flex: 1, alignItems: "flex-end" }, moduleHeroTitle: { fontSize: 16, fontWeight: "800" as any, textAlign: "right" }, moduleHeroSubtitle: { fontSize: 11, marginTop: 3, textAlign: "right" }, moduleCloseButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }, moduleContent: { flex: 1 },
});
