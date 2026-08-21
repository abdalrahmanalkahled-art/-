export type RoadsideContractStatus = "active" | "renewed" | "cancelled";
export type RoadsideContractType = "road" | "wall" | "island";
export type RoadsideArchiveReason = "renewed" | "cancelled";

export interface RoadsideBoard {
  id: string;
  contractId: string;
  region: string;
  linkedRegions?: string[];
  brand: string;
  frontBrand?: string;
  backBrand?: string;
  imageUri?: string;
  frontImageUri?: string;
  backImageUri?: string;
  sides?: 1 | 2;
  boardType?: string;
  rating?: string;
  widthCm?: number;
  heightCm?: number;
  address?: string;
  createdAt: string;
}

export interface RoadsideContract {
  id: string;
  name: string;
  type: RoadsideContractType;
  totalBoards: number;
  ownerCompany: string;
  responsiblePhone?: string;
  startDate: string;
  endDate: string;
  boards: RoadsideBoard[];
  status: RoadsideContractStatus;
  archivedAt?: string;
  archiveReason?: RoadsideArchiveReason;
  renewalOfContractId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoadsideContractDraft {
  type?: RoadsideContractType;
  totalBoards: number;
  ownerCompany: string;
  responsiblePhone?: string;
  startDate: string;
  endDate: string;
  boards: Array<Omit<RoadsideBoard, "id" | "contractId" | "createdAt">>;
}

export interface ContractAlertState {
  state: "safe" | "upcoming" | "expired";
  daysRemaining: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function calendarTime(date: string): number {
  return new Date(`${date}T12:00:00`).getTime();
}

export function getRoadsideContractArchiveTitle(contract: Pick<RoadsideContract, "startDate" | "endDate" | "type">): string {
  return `${contract.type === "wall" ? "لوحة جدارية" : contract.type === "island" ? "عقد منصفات" : "عقد لوحات طرقية"} (${contract.startDate} - ${contract.endDate})`;
}

/** الاسم الظاهر للعقد النشط يتبع الشركة المالكة، بينما يحتفظ الأرشيف بعنوانه الزمني. */
export function getRoadsideContractName(ownerCompany: string, type: RoadsideContractType = "road"): string { return type === "wall" ? `لوحة جدارية (${ownerCompany.trim()})` : type === "island" ? `عقد منصفات ${ownerCompany.trim()}` : `عقد ${ownerCompany.trim()}`; }

export function getRoadsideContractDisplayType(contract: Pick<RoadsideContract, "type">): string { return contract.type === "wall" ? "لوحة جدارية" : contract.type === "island" ? "عقد منصفات" : "عقد لوحات طرقية"; }

/** تتوافق مع العقود القديمة التي كانت تحفظ الصورة في imageUri فقط. */
export function getRoadsideBoardFrontImage(board: Pick<RoadsideBoard, "imageUri" | "frontImageUri">): string | undefined { return board.frontImageUri || board.imageUri; }

/** تحافظ على توافق العقود القديمة التي كانت تسجل ماركة واحدة للوحة ذات الوجهين. */
export function getRoadsideBoardFrontBrand(board: Pick<RoadsideBoard, "brand" | "frontBrand">): string { return board.frontBrand?.trim() || board.brand; }
export function getRoadsideBoardBackBrand(board: Pick<RoadsideBoard, "brand" | "frontBrand" | "backBrand">): string { return board.backBrand?.trim() || getRoadsideBoardFrontBrand(board); }

export function getRoadsideBoardRatingCounts(boards: Array<Pick<RoadsideBoard, "rating">>): Array<{ rating: string; count: number }> {
  const counts = new Map<string, number>();
  boards.forEach((board) => { if (board.rating?.trim()) counts.set(board.rating.trim(), (counts.get(board.rating.trim()) || 0) + 1); });
  return [...counts.entries()].sort(([first], [second]) => first.localeCompare(second, "en")).map(([rating, count]) => ({ rating, count }));
}

export function getRoadsideContractAlert(contract: Pick<RoadsideContract, "endDate" | "status">, now = new Date(), reminderDays = 30): ContractAlertState {
  if (contract.status !== "active") return { state: "safe", daysRemaining: Number.POSITIVE_INFINITY };
  const daysRemaining = Math.ceil((calendarTime(contract.endDate) - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / DAY_MS);
  if (daysRemaining < 0) return { state: "expired", daysRemaining };
  if (daysRemaining <= reminderDays) return { state: "upcoming", daysRemaining };
  return { state: "safe", daysRemaining };
}

export function validateRoadsideContractDraft(draft: RoadsideContractDraft): string | null {
  const type = draft.type || "road";
  if (!Number.isInteger(draft.totalBoards) || draft.totalBoards < 1) return "أدخل عدداً صحيحاً للوحات المستأجرة.";
  if (!draft.ownerCompany.trim()) return type === "wall" ? "أدخل اسم الشخص المسؤول عن اللوحة الجدارية." : "أدخل اسم الشركة المالكة للعقد.";
  if (type === "wall" && !draft.responsiblePhone?.trim()) return "أدخل رقم هاتف الشخص المسؤول عن اللوحة الجدارية.";
  if (!draft.startDate || !draft.endDate) return "حدد تاريخ بداية العقد ونهايته.";
  if (calendarTime(draft.endDate) < calendarTime(draft.startDate)) return "يجب أن تكون نهاية العقد بعد تاريخ بدايته.";
  if (type === "wall" && (draft.totalBoards !== 1 || draft.boards.length !== 1 || new Set(draft.boards.map((board) => board.region.trim())).size !== 1)) return "اللوحة الجدارية يجب أن تكون لوحة واحدة في منطقة واحدة فقط.";
  if (type === "island") {
    if (draft.boards.length !== 1) return "أدخل تفاصيل نموذج منصف واحد فقط؛ ستُطبق على جميع المنصفات المستأجرة.";
    const linkedRegions = draft.boards[0]?.linkedRegions?.map((region) => region.trim()).filter(Boolean) || (draft.boards[0]?.region.trim() ? [draft.boards[0].region.trim()] : []);
    if (linkedRegions.length < 1 || linkedRegions.length > 2 || new Set(linkedRegions).size !== linkedRegions.length) return "اختر منطقة واحدة للمنصف أو منطقتين مختلفتين يربط بينهما.";
  }
  if (type !== "island" && draft.boards.length !== draft.totalBoards) return "يجب توزيع جميع اللوحات المستأجرة قبل الحفظ.";
  if (draft.boards.some((board) => board.sides === 2 && !board.backBrand?.trim())) return "اختر ماركة الوجه الثاني لكل لوحة ذات وجهين.";
  if (type === "island") return draft.boards[0]?.brand.trim() ? null : "اختر الماركة للمنصفات المستأجرة.";
  if (draft.boards.some((board) => !board.region.trim() || !board.brand.trim())) return "اختر منطقة وماركة لكل لوحة طرقية.";
  return null;
}

export function createRoadsideContract(draft: RoadsideContractDraft, now = new Date()): RoadsideContract {
  const validationError = validateRoadsideContractDraft(draft);
  if (validationError) throw new Error(validationError);
  const timestamp = now.toISOString();
  const id = `road-contract-${now.getTime()}`;
  const type = draft.type || "road";
  return {
    id,
    name: getRoadsideContractName(draft.ownerCompany, type),
    type,
    totalBoards: draft.totalBoards,
    ownerCompany: draft.ownerCompany.trim(),
    responsiblePhone: type === "wall" ? draft.responsiblePhone?.trim() : undefined,
    startDate: draft.startDate,
    endDate: draft.endDate,
    boards: draft.boards.map((board, index) => ({ ...board, brand: getRoadsideBoardFrontBrand(board), frontBrand: getRoadsideBoardFrontBrand(board), backBrand: board.sides === 2 ? getRoadsideBoardBackBrand(board) : undefined, id: `${id}-board-${index + 1}`, contractId: id, createdAt: timestamp })),
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function archiveRoadsideContract(contract: RoadsideContract, reason: RoadsideArchiveReason, now = new Date()): RoadsideContract {
  return { ...contract, name: getRoadsideContractArchiveTitle(contract), status: reason === "renewed" ? "renewed" : "cancelled", archiveReason: reason, archivedAt: now.toISOString(), updatedAt: now.toISOString() };
}

/** يعيد العقد المؤرشف إلى القائمة النشطة من دون تغيير بياناته الأساسية أو لوحاته. */
export function restoreArchivedRoadsideContract(contract: RoadsideContract, now = new Date()): RoadsideContract {
  const { archivedAt: _archivedAt, archiveReason: _archiveReason, ...activeContract } = contract;
  return {
    ...activeContract,
    name: getRoadsideContractName(contract.ownerCompany, contract.type),
    status: "active",
    updatedAt: now.toISOString(),
  };
}

export function createRoadsideRenewal(previous: RoadsideContract, draft: RoadsideContractDraft, now = new Date()): { archived: RoadsideContract; renewed: RoadsideContract } {
  const archived = archiveRoadsideContract(previous, "renewed", now);
  const renewed = createRoadsideContract(draft, now);
  return { archived, renewed: { ...renewed, renewalOfContractId: previous.id } };
}

/** يعدل العقد مع الحفاظ على هويته وهويات اللوحات التي بقيت في التوزيع. */
export function updateRoadsideContract(existing: RoadsideContract, draft: RoadsideContractDraft, now = new Date()): RoadsideContract {
  const validationError = validateRoadsideContractDraft(draft);
  if (validationError) throw new Error(validationError);
  const timestamp = now.toISOString();
  const type = draft.type || existing.type;
  return {
    ...existing,
    name: getRoadsideContractName(draft.ownerCompany, type),
    type,
    totalBoards: draft.totalBoards,
    ownerCompany: draft.ownerCompany.trim(),
    responsiblePhone: type === "wall" ? draft.responsiblePhone?.trim() : undefined,
    startDate: draft.startDate,
    endDate: draft.endDate,
    boards: draft.boards.map((board, index) => ({
      ...board,
      brand: getRoadsideBoardFrontBrand(board),
      frontBrand: getRoadsideBoardFrontBrand(board),
      backBrand: board.sides === 2 ? getRoadsideBoardBackBrand(board) : undefined,
      id: existing.boards[index]?.id || `${existing.id}-board-${index + 1}`,
      contractId: existing.id,
      createdAt: existing.boards[index]?.createdAt || timestamp,
    })),
    updatedAt: timestamp,
  };
}

export function groupRoadsideBoardsByRegion(boards: Array<Pick<RoadsideBoard, "region">>): Array<{ region: string; count: number }> {
  const counts = new Map<string, number>();
  boards.forEach((board) => counts.set(board.region, (counts.get(board.region) || 0) + 1));
  return [...counts.entries()].map(([region, count]) => ({ region, count }));
}
