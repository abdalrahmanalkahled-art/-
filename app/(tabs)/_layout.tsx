import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Easing, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useHasPermission } from "@/lib/app-context";
import { useAppCustomization } from "@/lib/app-customization-context";

export default function TabLayout() {
  const colors = useColors();
  const canViewStores = useHasPermission("stores");
  const canViewSurveys = useHasPermission("surveys");
  const canViewEvents = useHasPermission("events");
  const canViewDashboard = useHasPermission("dashboard");
  const { canUse } = useAppCustomization();
  const canViewMore = canUse("more");
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerShown: false,
        tabBarButton: HapticTab,
        freezeOnBlur: true,
        animation: "shift",
        transitionSpec: {
          animation: "timing",
          config: { duration: 220, easing: Easing.out(Easing.cubic) },
        },
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            transform: [{
              translateX: current.progress.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [-68, 0, 68],
              }),
            }],
          },
        }),
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600" as any,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
          tabBarButton: canViewDashboard ? undefined : () => null,
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          title: "المحلات",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="storefront.fill" color={color} />,
          tabBarButton: canViewStores ? undefined : () => null,
        }}
      />
      <Tabs.Screen
        name="surveys"
        options={{
          title: "الاستبيانات",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="doc.text.fill" color={color} />,
          tabBarButton: canViewSurveys ? undefined : () => null,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "الفعاليات",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="calendar.badge.clock" color={color} />,
          tabBarButton: canViewEvents ? undefined : () => null,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "المزيد",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="ellipsis.circle.fill" color={color} />,
          tabBarButton: canViewMore ? undefined : () => null,
        }}
      />
    </Tabs>
  );
}
