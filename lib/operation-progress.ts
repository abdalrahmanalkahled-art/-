export type OperationProgressKind = "restore" | "export";

export interface OperationProgressState {
  id: string;
  kind: OperationProgressKind;
  title: string;
  steps: string[];
  stepIndex: number;
  message?: string;
  completedItems?: number;
  totalItems?: number;
}

export interface OperationProgressController {
  update: (update: Omit<Partial<OperationProgressState>, "id" | "kind" | "title" | "steps">) => void;
  complete: () => void;
}

type ProgressListener = () => void;

let activeProgress: OperationProgressState | null = null;
const listeners = new Set<ProgressListener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function getOperationProgressSnapshot(): OperationProgressState | null {
  return activeProgress;
}

export function subscribeOperationProgress(listener: ProgressListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** يبدأ عملية واحدة مرئية للمستخدم؛ لا يسمح بإظهار تقدم وهمي عند عدم وجود عملية جارية. */
export function beginOperationProgress(options: Omit<OperationProgressState, "id" | "stepIndex"> & { stepIndex?: number }): OperationProgressController {
  const id = `${options.kind}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  activeProgress = { ...options, id, stepIndex: Math.max(0, Math.min(options.stepIndex || 0, Math.max(options.steps.length - 1, 0))) };
  notify();
  return {
    update(update) {
      if (!activeProgress || activeProgress.id !== id) return;
      const nextIndex = typeof update.stepIndex === "number"
        ? Math.max(0, Math.min(update.stepIndex, Math.max(activeProgress.steps.length - 1, 0)))
        : activeProgress.stepIndex;
      activeProgress = { ...activeProgress, ...update, stepIndex: nextIndex };
      notify();
    },
    complete() {
      if (!activeProgress || activeProgress.id !== id) return;
      activeProgress = null;
      notify();
    },
  };
}

export function operationProgressPercent(progress: OperationProgressState): number {
  const stepCount = Math.max(progress.steps.length, 1);
  const currentStep = progress.stepIndex / stepCount;
  if (typeof progress.completedItems !== "number" || !progress.totalItems) return Math.round(currentStep * 100);
  const itemProgress = Math.max(0, Math.min(progress.completedItems / progress.totalItems, 1));
  return Math.round(Math.min(1, currentStep + itemProgress / stepCount) * 100);
}
