export type StoreBoardFace = "front" | "back";

export interface StoreBoardBrandArchive {
  id: string;
  face: StoreBoardFace;
  brand: string;
  installedAt: string;
  archivedAt: string;
}

export interface StoreBoardRecord {
  id: string;
  type: "store";
  storeId: string;
  storeName: string;
  region?: string;
  address?: string;
  brand: string;
  frontBrand?: string;
  backBrand?: string;
  sides?: 1 | 2;
  imageUri?: string;
  frontImageUri?: string;
  backImageUri?: string;
  widthCm?: number;
  heightCm?: number;
  boardType?: string;
  rating?: string;
  installDate: string;
  frontBrandInstalledAt?: string;
  backBrandInstalledAt?: string;
  brandHistory?: StoreBoardBrandArchive[];
  notes: string;
  isActive: boolean;
  createdAt: string;
}

export function getStoreBoardFrontBrand(board: Pick<StoreBoardRecord, "brand" | "frontBrand">): string {
  return board.frontBrand?.trim() || board.brand;
}

export function getStoreBoardBackBrand(board: Pick<StoreBoardRecord, "brand" | "frontBrand" | "backBrand">): string {
  return board.backBrand?.trim() || getStoreBoardFrontBrand(board);
}

export function renewStoreBoardBrand(board: StoreBoardRecord, face: StoreBoardFace, newBrand: string, archiveDate: string): StoreBoardRecord {
  const nextBrand = newBrand.trim();
  if (!nextBrand) throw new Error("اختر الماركة الجديدة قبل تجديدها.");
  const previousBrand = face === "front" ? getStoreBoardFrontBrand(board) : getStoreBoardBackBrand(board);
  const installedAt = face === "front" ? board.frontBrandInstalledAt || board.installDate : board.backBrandInstalledAt || board.installDate;
  const changed = previousBrand !== nextBrand;
  const history = previousBrand && changed ? [...(board.brandHistory || []), { id: `store-board-brand-${Date.now()}`, face, brand: previousBrand, installedAt, archivedAt: archiveDate }] : board.brandHistory || [];
  return {
    ...board,
    brand: face === "front" ? nextBrand : getStoreBoardFrontBrand(board),
    frontBrand: face === "front" ? nextBrand : getStoreBoardFrontBrand(board),
    backBrand: face === "back" ? nextBrand : board.backBrand,
    frontBrandInstalledAt: face === "front" && changed ? archiveDate : board.frontBrandInstalledAt || board.installDate,
    backBrandInstalledAt: face === "back" && changed ? archiveDate : board.backBrandInstalledAt,
    brandHistory: history,
  };
}
