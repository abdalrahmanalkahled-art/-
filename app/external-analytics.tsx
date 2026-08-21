import { useLocalSearchParams, router } from "expo-router";

import { AdvancedAnalyticsModule } from "@/components/modules/advanced-analytics-module";
import { ScreenContainer } from "@/components/screen-container";

export default function ExternalAnalyticsScreen() {
  const { packageId, mode } = useLocalSearchParams<{ packageId?: string; mode?: string }>();
  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background"><AdvancedAnalyticsModule externalPackageId={packageId} combinedExternal={mode === "combined"} onBack={() => router.back()} /></ScreenContainer>;
}
