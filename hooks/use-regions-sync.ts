import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Hook لمراقبة تغييرات المناطق في AsyncStorage
 * يقوم بتحديث المناطق تلقائياً عند تغييرها في صفحة أخرى
 */
export function useRegionsSync(
  onRegionsChange: (regions: string[]) => void
) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let appStateSubscription: any;

    const loadRegions = async () => {
      try {
        const savedRegions = await AsyncStorage.getItem('store_regions');
        if (savedRegions) {
          try {
            const regions = JSON.parse(savedRegions);
            if (Array.isArray(regions)) {
              onRegionsChange(regions);
            } else {
              console.warn('بيانات المناطق غير صحيحة');
              onRegionsChange([]);
            }
          } catch (parseError) {
            console.error('خطأ في تحليل بيانات المناطق:', parseError);
            onRegionsChange([]);
          }
        } else {
          onRegionsChange([]);
        }
      } catch (error) {
        console.error('خطأ في تحميل المناطق:', error);
        onRegionsChange([]);
      }
    };

    // تحميل المناطق عند تهيئة الـ hook
    loadRegions().then(() => setIsInitialized(true));

    // مراقبة تغييرات حالة التطبيق (عند العودة من خلفية)
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        loadRegions();
      }
    };

    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription?.remove();
    };
  }, [onRegionsChange]);

  return isInitialized;
}
