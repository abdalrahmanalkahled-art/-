import { getItems, STORAGE_KEYS } from "./storage";

export interface EventGoal {
  id: string;
  title: string;
  brandName?: string;
  kpi?: string;
  targetValue?: number;
  currentValue?: number;
  completionPercentage?: number;
}

/** يجلب أحدث أهداف الخطة التسويقية عند بدء ربط فعالية بهدف. */
export async function loadEventGoals(): Promise<EventGoal[]> {
  return getItems<EventGoal>(STORAGE_KEYS.MARKETING_GOALS);
}

/** يحول معرّف الهدف المخزن مع الفعالية إلى عنوان قابل للعرض للمستخدم. */
export function getEventGoalTitle(goals: EventGoal[], goalId?: string): string | undefined {
  if (!goalId) return undefined;
  return goals.find((goal) => goal.id === goalId)?.title;
}
