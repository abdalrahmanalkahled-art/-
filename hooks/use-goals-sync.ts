import { useEffect, useState } from 'react';
import { getItems, STORAGE_KEYS } from '@/lib/storage';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Hook لمراقبة تغييرات الأهداف التسويقية
 * يقوم بتحديث الأهداف تلقائياً عند تغييرها في صفحة أخرى
 */
export function useGoalsSync(
  onGoalsChange: (goals: any[]) => void
) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let appStateSubscription: any;

    const loadGoals = async () => {
      try {
        const goalsData = await getItems<any>(STORAGE_KEYS.MARKETING_GOALS);
        if (Array.isArray(goalsData)) {
          onGoalsChange(goalsData);
        } else {
          console.warn('بيانات الأهداف غير صحيحة');
          onGoalsChange([]);
        }
      } catch (error) {
        console.error('خطأ في تحميل الأهداف:', error);
        onGoalsChange([]);
      }
    };

    // تحميل الأهداف عند تهيئة الـ hook
    loadGoals().then(() => setIsInitialized(true));

    // مراقبة تغييرات حالة التطبيق (عند العودة من خلفية)
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        loadGoals();
      }
    };

    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription?.remove();
    };
  }, [onGoalsChange]);

  return isInitialized;
}
