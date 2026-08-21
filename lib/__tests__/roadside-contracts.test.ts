import { describe, expect, it } from "vitest";

import { archiveRoadsideContract, createRoadsideContract, createRoadsideRenewal, getRoadsideBoardBackBrand, getRoadsideBoardRatingCounts, getRoadsideContractAlert, getRoadsideContractArchiveTitle, restoreArchivedRoadsideContract, updateRoadsideContract, validateRoadsideContractDraft } from "../roadside-contracts";

const validDraft = {
  totalBoards: 2,
  ownerCompany: "شركة الإعلانات المتحدة",
  startDate: "2026-08-01",
  endDate: "2027-07-31",
  boards: [{ region: "دمشق", brand: "مدار" }, { region: "حلب", brand: "مدار" }],
};

describe("عقود اللوحات الطرقية", () => {
  it("ينشئ عقداً رئيسياً بلوحات فعلية بعد تحقق التوزيع", () => {
    const contract = createRoadsideContract(validDraft, new Date("2026-08-01T09:00:00Z"));
    expect(contract.boards).toHaveLength(2);
    expect(contract.boards.every((board) => board.contractId === contract.id)).toBe(true);
    expect(contract.name).toBe("عقد شركة الإعلانات المتحدة");
  });

  it("يرفض حفظ العقد عندما لا يطابق التوزيع العدد الإجمالي", () => {
    expect(validateRoadsideContractDraft({ ...validDraft, totalBoards: 3 })).toContain("توزيع جميع اللوحات");
  });

  it("يطلب اسم الشركة المالكة ضمن تفاصيل العقد الأساسية", () => {
    expect(validateRoadsideContractDraft({ ...validDraft, ownerCompany: "" })).toContain("الشركة المالكة");
  });

  it("يؤرشف العقد السابق عند التجديد أو الإلغاء", () => {
    const contract = createRoadsideContract(validDraft, new Date("2026-08-01T09:00:00Z"));
    expect(archiveRoadsideContract(contract, "cancelled").status).toBe("cancelled");
    const renewal = createRoadsideRenewal(contract, { ...validDraft, startDate: "2027-08-01", endDate: "2028-07-31" });
    expect(renewal.archived.status).toBe("renewed");
    expect(renewal.renewed.renewalOfContractId).toBe(contract.id);
    expect(getRoadsideContractArchiveTitle(contract)).toContain("عقد لوحات طرقية");
  });

  it("يعيد العقد المؤرشف للنشط من دون فقدان بياناته أو لوحاته", () => {
    const contract = createRoadsideContract(validDraft, new Date("2026-08-01T09:00:00Z"));
    const archived = archiveRoadsideContract(contract, "cancelled", new Date("2026-08-05T09:00:00Z"));
    const restored = restoreArchivedRoadsideContract(archived, new Date("2026-08-06T09:00:00Z"));
    expect(restored).toMatchObject({ id: contract.id, status: "active", ownerCompany: contract.ownerCompany, boards: contract.boards, createdAt: contract.createdAt });
    expect(restored.name).toBe("عقد شركة الإعلانات المتحدة");
    expect(restored.archivedAt).toBeUndefined();
    expect(restored.archiveReason).toBeUndefined();
  });

  it("ينبه عند قرب نهاية العقد أو انتهائه", () => {
    const contract = createRoadsideContract(validDraft);
    expect(getRoadsideContractAlert(contract, new Date("2027-07-15"))).toMatchObject({ state: "upcoming" });
    expect(getRoadsideContractAlert(contract, new Date("2027-08-02"))).toMatchObject({ state: "expired" });
  });

  it("يحافظ على هوية العقد عند تعديل تفاصيله", () => {
    const contract = createRoadsideContract(validDraft);
    const updated = updateRoadsideContract(contract, { ...validDraft, endDate: "2027-12-31" });
    expect(updated.id).toBe(contract.id);
    expect(updated.boards[0].id).toBe(contract.boards[0].id);
  });

  it("يجمع عدد اللوحات وفق تقييمها", () => {
    expect(getRoadsideBoardRatingCounts([{ rating: "A" }, { rating: "B" }, { rating: "A" }, {}])).toEqual([{ rating: "A", count: 2 }, { rating: "B", count: 1 }]);
  });

  it("يفرض لوحة جدارية واحدة في منطقة واحدة مع بيانات الشخص المسؤول", () => {
    const draft = { ...validDraft, type: "wall" as const, totalBoards: 1, ownerCompany: "أحمد", responsiblePhone: "0933000000", boards: [validDraft.boards[0]] };
    const wall = createRoadsideContract(draft, new Date("2026-08-21T10:00:00.000Z"));
    expect(wall.type).toBe("wall");
    expect(wall.name).toBe("لوحة جدارية (أحمد)");
    expect(wall.responsiblePhone).toBe("0933000000");
    expect(validateRoadsideContractDraft({ ...draft, responsiblePhone: "" })).toContain("رقم هاتف");
    expect(validateRoadsideContractDraft({ ...draft, totalBoards: 2 })).toContain("لوحة واحدة");
  });

  it("يدعم عقد المنصفات بنموذج واحد ومنطقة واحدة أو منطقتين فقط", () => {
    const draft = { ...validDraft, type: "island" as const, totalBoards: 4, boards: [{ ...validDraft.boards[0], linkedRegions: ["دمشق", "ريف دمشق"] }] };
    const island = createRoadsideContract(draft, new Date("2026-08-21T10:00:00.000Z"));
    expect(island.type).toBe("island");
    expect(island.boards).toHaveLength(1);
    expect(island.totalBoards).toBe(4);
    expect(island.name).toBe("عقد منصفات شركة الإعلانات المتحدة");
    expect(validateRoadsideContractDraft({ ...draft, boards: [{ ...draft.boards[0], linkedRegions: ["دمشق", "ريف دمشق", "حلب"] }] })).toContain("منطقة واحدة");
  });

  it("يحفظ ماركة مستقلة لكل وجه مع توافق بيانات الماركة القديمة", () => {
    const twoSided = createRoadsideContract({ ...validDraft, boards: [{ ...validDraft.boards[0], sides: 2, frontBrand: "مدار", backBrand: "الربيع" }, { ...validDraft.boards[1], sides: 2, frontBrand: "مدار", backBrand: "الربيع" }] }, new Date("2026-08-21T10:00:00.000Z"));
    expect(twoSided.boards[0]).toMatchObject({ brand: "مدار", frontBrand: "مدار", backBrand: "الربيع" });
    expect(getRoadsideBoardBackBrand({ brand: "مدار" })).toBe("مدار");
    expect(validateRoadsideContractDraft({ ...validDraft, boards: [{ ...validDraft.boards[0], sides: 2, frontBrand: "مدار" }, { ...validDraft.boards[1], sides: 2, frontBrand: "مدار" }] })).toContain("الوجه الثاني");
  });
});
