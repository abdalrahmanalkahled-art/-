/** أدوات نقية لمقارنة حالة النموذج وحمايته قبل الإغلاق. */
export function snapshotFormState<T>(value: T): string {
  return JSON.stringify(value);
}

export function hasUnsavedFormChanges<T>(snapshot: string, value: T): boolean {
  return snapshot !== snapshotFormState(value);
}
