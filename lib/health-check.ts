import { getItems, saveItems, STORAGE_KEYS } from './storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * فحص صحة البيانات - التحقق من المناطق المحذوفة
 * إذا تم حذف منطقة من المحلات، يتم حذفها من الفعاليات والاستطلاعات أيضاً
 */
export async function healthCheckDeletedRegions() {
  try {
    // الحصول على المناطق الحالية من AsyncStorage
    const savedRegions = await AsyncStorage.getItem('store_regions');
    const currentRegions = savedRegions ? JSON.parse(savedRegions) : [];

    // الحصول على جميع الفعاليات
    const events = await getItems<any>(STORAGE_KEYS.EVENTS);
    
    // الحصول على جميع الاستطلاعات
    const surveys = await getItems<any>(STORAGE_KEYS.SURVEYS);

    // تصفية الفعاليات - إزالة تلك التي تحتوي على مناطق محذوفة
    const filteredEvents = events.filter((event: any) => {
      if (!event.region) return true; // الاحتفاظ بالفعاليات بدون منطقة
      return currentRegions.includes(event.region);
    });

    // تصفية الاستطلاعات - إزالة تلك التي تحتوي على مناطق محذوفة
    const filteredSurveys = surveys.filter((survey: any) => {
      if (!survey.region) return true; // الاحتفاظ بالاستطلاعات بدون منطقة
      return currentRegions.includes(survey.region);
    });

    // حفظ البيانات المصفاة
    if (filteredEvents.length < events.length) {
      await saveItems(STORAGE_KEYS.EVENTS, filteredEvents);
      console.log(`تم حذف ${events.length - filteredEvents.length} فعالية بسبب مناطق محذوفة`);
    }

    if (filteredSurveys.length < surveys.length) {
      await saveItems(STORAGE_KEYS.SURVEYS, filteredSurveys);
      console.log(`تم حذف ${surveys.length - filteredSurveys.length} استطلاع بسبب مناطق محذوفة`);
    }

    return {
      success: true,
      eventsRemoved: events.length - filteredEvents.length,
      surveysRemoved: surveys.length - filteredSurveys.length,
    };
  } catch (error) {
    console.error('خطأ في فحص صحة البيانات:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    };
  }
}

/**
 * فحص صحة البيانات - التحقق من الأهداف المحذوفة
 * إذا تم حذف هدف، يتم حذفه من الفعاليات والاستطلاعات أيضاً
 */
export async function healthCheckDeletedGoals() {
  try {
    // الحصول على الأهداف الحالية
    const currentGoals = await getItems<any>(STORAGE_KEYS.MARKETING_GOALS);
    const currentGoalIds = currentGoals.map((g: any) => g.id);

    // الحصول على جميع الفعاليات
    const events = await getItems<any>(STORAGE_KEYS.EVENTS);
    
    // الحصول على جميع الاستطلاعات
    const surveys = await getItems<any>(STORAGE_KEYS.SURVEYS);

    // تصفية الفعاليات - إزالة تلك التي تحتوي على أهداف محذوفة
    const filteredEvents = events.filter((event: any) => {
      if (!event.goalId) return true; // الاحتفاظ بالفعاليات بدون هدف
      return currentGoalIds.includes(event.goalId);
    });

    // تصفية الاستطلاعات - إزالة تلك التي تحتوي على أهداف محذوفة
    const filteredSurveys = surveys.filter((survey: any) => {
      if (!survey.goalId) return true; // الاحتفاظ بالاستطلاعات بدون هدف
      return currentGoalIds.includes(survey.goalId);
    });

    // حفظ البيانات المصفاة
    if (filteredEvents.length < events.length) {
      await saveItems(STORAGE_KEYS.EVENTS, filteredEvents);
      console.log(`تم حذف ${events.length - filteredEvents.length} فعالية بسبب أهداف محذوفة`);
    }

    if (filteredSurveys.length < surveys.length) {
      await saveItems(STORAGE_KEYS.SURVEYS, filteredSurveys);
      console.log(`تم حذف ${surveys.length - filteredSurveys.length} استطلاع بسبب أهداف محذوفة`);
    }

    return {
      success: true,
      eventsRemoved: events.length - filteredEvents.length,
      surveysRemoved: surveys.length - filteredSurveys.length,
    };
  } catch (error) {
    console.error('خطأ في فحص صحة الأهداف:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    };
  }
}
