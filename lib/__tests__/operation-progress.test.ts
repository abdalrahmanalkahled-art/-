import { describe, expect, it } from "vitest";

import { beginOperationProgress, getOperationProgressSnapshot, operationProgressPercent } from "../operation-progress";

describe("مؤشر تقدم العمليات", () => {
  it("يتقدم بين المراحل ويعرض تقدماً جزئياً للوسائط ثم ينظف حالته", () => {
    const controller = beginOperationProgress({ kind: "restore", title: "استعادة نسخة", steps: ["فحص النسخة", "استعادة الوسائط", "تحديث البيانات"] });
    controller.update({ stepIndex: 1, completedItems: 2, totalItems: 4, message: "استعادة الصور" });
    const active = getOperationProgressSnapshot();
    expect(active).toMatchObject({ stepIndex: 1, completedItems: 2, totalItems: 4, message: "استعادة الصور" });
    expect(operationProgressPercent(active!)).toBe(50);
    controller.complete();
    expect(getOperationProgressSnapshot()).toBeNull();
  });
});
