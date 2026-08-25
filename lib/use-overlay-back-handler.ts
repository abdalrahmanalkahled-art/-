import { useEffect } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect, useNavigation } from "expo-router";

export type OverlayCloseHandler = () => boolean;

/** ينفذ أول إغلاق متاح فقط، للحفاظ على الواجهات المتداخلة بدل إغلاقها دفعة واحدة. */
export function closeTopOverlay(handlers: OverlayCloseHandler[]): boolean {
  return handlers.some((handler) => handler());
}

/**
 * يعترض زر رجوع Android وإيماءة/رجوع الملاحق قبل إزالة الشاشة.
 * يرجع false عند عدم وجود طبقة محلية كي يستمر رجوع التنقل الطبيعي.
 */
export function useOverlayBackHandler(onOverlayBack: OverlayCloseHandler): void {
  const navigation = useNavigation();

  useFocusEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", onOverlayBack);
    return () => subscription.remove();
  });

  useEffect(() => navigation.addListener("beforeRemove", (event) => {
    if (onOverlayBack()) event.preventDefault();
  }), [navigation, onOverlayBack]);
}
