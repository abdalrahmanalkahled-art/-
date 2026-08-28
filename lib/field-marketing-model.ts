export type FieldObservationKind = "shelf" | "display" | "promotion" | "event" | "outdoor";
export type ExecutionSubjectType = "store" | "event" | "signage";

export interface CompetitorObservation {
  id: string;
  competitorName: string;
  storeName: string;
  region: string;
  kind: FieldObservationKind;
  message: string;
  visibilityScore: number;
  executionScore: number;
  notes?: string;
  photoUris?: string[];
  createdAt: string;
}

export interface ExecutionAssessment {
  id: string;
  subjectType: ExecutionSubjectType;
  subjectName: string;
  region?: string;
  score: number;
  visibility: number;
  brandAlignment: number;
  materialCondition: number;
  notes?: string;
  createdAt: string;
}

export interface FieldChecklistRun {
  id: string;
  templateId: string;
  templateName: string;
  subjectName: string;
  scope?: "stores" | "regions";
  subjectNames?: string[];
  completedItemIds: string[];
  createdAt: string;
}

export interface FieldVisitDraft {
  id: string;
  title: string;
  storeName?: string;
  region?: string;
  notes?: string;
  updatedAt: string;
}

export interface RecentSearch {
  query: string;
  usedAt: string;
}

export interface CoverageGap {
  region: string;
  activeStores: number;
  recentVisits: number;
  status: "gap" | "needs_follow_up" | "covered";
}

export interface FieldPriority {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  target: "field" | "events" | "more";
}

export const FIELD_CHECKLIST_TEMPLATES = [
  { id: "store-visit", name: "زيارة محل", items: ["تأكيد ظهور الماركة", "مراجعة موضع العرض", "توثيق المواد البصرية", "تسجيل ملاحظة منافس عند وجودها"] },
  { id: "event-activation", name: "تفعيل فعالية", items: ["تأكيد وضوح الرسالة", "مراجعة الهوية البصرية", "توثيق مكان التفعيل", "تسجيل ملاحظات الحضور"] },
  { id: "signage-review", name: "مراجعة لوحة أو ستاند", items: ["فحص حالة المادة", "تأكيد وضوح الماركة", "توثيق الموقع", "تحديد إجراء متابعة عند الحاجة"] },
] as const;

const KIND_LABELS: Record<FieldObservationKind, string> = { shelf: "رف", display: "عرض", promotion: "عرض ترويجي", event: "فعالية", outdoor: "إعلان خارجي" };

export function fieldObservationKindLabel(kind: FieldObservationKind): string { return KIND_LABELS[kind]; }

export function clampScore(value: number): number { return Math.max(1, Math.min(5, Math.round(Number(value) || 1))); }

export function assessmentScore(input: Pick<ExecutionAssessment, "visibility" | "brandAlignment" | "materialCondition">): number {
  return Math.round((clampScore(input.visibility) + clampScore(input.brandAlignment) + clampScore(input.materialCondition)) / 3 * 10) / 10;
}

export function buildCoverageGaps(stores: { region?: string; isActive?: boolean }[], visits: { storeRegion?: string; surveyDate?: string }[], now = new Date()): CoverageGap[] {
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30);
  const byRegion = new Map<string, { activeStores: number; recentVisits: number }>();
  stores.filter((store) => store.isActive !== false).forEach((store) => { const region = store.region?.trim() || "غير محددة"; const current = byRegion.get(region) || { activeStores: 0, recentVisits: 0 }; current.activeStores += 1; byRegion.set(region, current); });
  visits.forEach((visit) => { if (!visit.storeRegion || !visit.surveyDate || new Date(visit.surveyDate).getTime() < cutoff.getTime()) return; const current = byRegion.get(visit.storeRegion) || { activeStores: 0, recentVisits: 0 }; current.recentVisits += 1; byRegion.set(visit.storeRegion, current); });
  return [...byRegion.entries()].map(([region, value]) => ({ region, ...value, status: value.recentVisits === 0 ? "gap" as const : value.recentVisits < Math.ceil(value.activeStores / 2) ? "needs_follow_up" as const : "covered" as const })).sort((a, b) => a.recentVisits - b.recentVisits || b.activeStores - a.activeStores);
}

export function buildFieldPriorities(input: { overdueTasks: { id: string; title: string }[]; upcomingEvents: { id: string; title: string; eventDate: string }[]; coverageGaps: CoverageGap[]; lowQualityAssessments: ExecutionAssessment[] }): FieldPriority[] {
  return [
    ...input.overdueTasks.map((task) => ({ id: `task:${task.id}`, title: "متابعة تسويقية متأخرة", description: task.title, severity: "high" as const, target: "more" as const })),
    ...input.upcomingEvents.map((event) => ({ id: `event:${event.id}`, title: "فعالية قريبة", description: `${event.title} · ${event.eventDate}`, severity: "medium" as const, target: "events" as const })),
    ...input.coverageGaps.filter((gap) => gap.status === "gap").map((gap) => ({ id: `coverage:${gap.region}`, title: "فجوة تغطية", description: `${gap.region}: لا توجد زيارة موثقة خلال 30 يوماً.`, severity: "high" as const, target: "field" as const })),
    ...input.lowQualityAssessments.filter((assessment) => assessment.score < 3).map((assessment) => ({ id: `quality:${assessment.id}`, title: "جودة تنفيذ تحتاج متابعة", description: `${assessment.subjectName}: التقييم ${assessment.score}/5`, severity: "medium" as const, target: "field" as const })),
  ].slice(0, 5);
}

export function newestComparison(visits: { storeName: string; storeRegion: string; surveyDate: string; data?: { present?: boolean }[] }[]): { storeName: string; region: string; beforeDate: string; afterDate: string; difference: number }[] {
  const groups = new Map<string, typeof visits>();
  visits.forEach((visit) => { const group = groups.get(visit.storeName) || []; group.push(visit); groups.set(visit.storeName, group); });
  return [...groups.values()].flatMap((group) => {
    const sorted = [...group].sort((a, b) => String(b.surveyDate).localeCompare(String(a.surveyDate)));
    if (sorted.length < 2) return [];
    const ratio = (item: typeof sorted[number]) => item.data?.length ? item.data.filter((entry) => entry.present).length / item.data.length * 100 : 0;
    const [after, before] = sorted;
    return [{ storeName: after.storeName, region: after.storeRegion, beforeDate: before.surveyDate, afterDate: after.surveyDate, difference: Math.round((ratio(after) - ratio(before)) * 10) / 10 }];
  }).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}
