export type SignageReportScope = "boards" | "works" | "archive";
export type SignageReportDateRangeMode = "all" | "selected";
export type SignageReportSort = "newest" | "oldest" | "brand" | "region";
export type SignageReportTheme = "teal" | "blue" | "slate";
export type SignageReportImageSize = "small" | "medium" | "large";
export type SignageReportBoardCardLayout = "grid" | "full";
export type SignageReportImageCompression = "original" | "balanced" | "compact";
export type SignageReportImageFit = "width" | "height" | "card";

export interface SignageReportSettings {
  reportScope: SignageReportScope;
  includeSummary: boolean;
  includeSignages: boolean;
  includeStands: boolean;
  includeShelves: boolean;
  includeVehicles: boolean;
  includeDetails: boolean;
  includeMaintenance: boolean;
  includeImages: boolean;
  includeVehicleSideImages: boolean;
  includeContractHeader: boolean;
  includeBoardLocation: boolean;
  includeBoardBrand: boolean;
  includeBoardSpecs: boolean;
  includeBoardRating: boolean;
  includeOwnerCompany: boolean;
  includeDates: boolean;
  includeStandStore: boolean;
  includeStandCondition: boolean;
  includeShelfAllocation: boolean;
  includeVehicleNumber: boolean;
  imageSize: SignageReportImageSize;
  imageCompression: SignageReportImageCompression;
  boardCardLayout: SignageReportBoardCardLayout;
  standCardLayout: SignageReportBoardCardLayout;
  imageFit: SignageReportImageFit;
  dateRangeMode: SignageReportDateRangeMode;
  startDate?: string;
  endDate?: string;
  region?: string;
  brand?: string;
  contractId?: string;
  contractName?: string;
  contractIds?: string[];
  contractNames?: string[];
  sortBy: SignageReportSort;
  theme: SignageReportTheme;
}

export const DEFAULT_SIGNAGE_REPORT_SETTINGS: SignageReportSettings = {
  reportScope: "boards", includeSummary: true, includeSignages: true, includeStands: true, includeShelves: true, includeVehicles: true, includeDetails: true, includeMaintenance: true, includeImages: true, includeVehicleSideImages: true,
  includeContractHeader: true, includeBoardLocation: true, includeBoardBrand: true, includeBoardSpecs: true, includeBoardRating: true, includeOwnerCompany: true, includeDates: true, includeStandStore: true, includeStandCondition: true, includeShelfAllocation: true, includeVehicleNumber: true,
  imageSize: "medium", imageCompression: "original", boardCardLayout: "grid", standCardLayout: "grid", imageFit: "card", dateRangeMode: "all", startDate: undefined, endDate: undefined, region: undefined, brand: undefined, contractId: undefined, contractName: undefined, contractIds: undefined, contractNames: undefined, sortBy: "newest", theme: "teal",
};

function optionalText(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
export function normalizeSignageReportSettings(value: unknown, scope: SignageReportScope = "boards"): SignageReportSettings {
  const candidate = value && typeof value === "object" ? value as Partial<SignageReportSettings> : {};
  const startDate = typeof candidate.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.startDate) ? candidate.startDate : undefined;
  const endDate = typeof candidate.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.endDate) ? candidate.endDate : undefined;
  const hasValidDateRange = candidate.dateRangeMode === "selected" && Boolean(startDate && endDate && startDate <= endDate);
  const rawImageSize = candidate.imageSize as string | undefined;
  const imageSize = rawImageSize === "large" ? "large" : rawImageSize === "small" || rawImageSize === "compact" ? "small" : "medium";
  const contractIds = Array.isArray(candidate.contractIds) ? candidate.contractIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0) : optionalText(candidate.contractId) ? [candidate.contractId!.trim()] : [];
  const contractNames = Array.isArray(candidate.contractNames) ? candidate.contractNames.filter((name): name is string => typeof name === "string" && name.trim().length > 0) : optionalText(candidate.contractName) ? [candidate.contractName!.trim()] : [];
  const settings: SignageReportSettings = {
    reportScope: candidate.reportScope === "works" ? "works" : scope,
    includeSummary: candidate.includeSummary !== false, includeSignages: candidate.includeSignages !== false, includeStands: candidate.includeStands !== false, includeShelves: candidate.includeShelves !== false, includeVehicles: candidate.includeVehicles !== false, includeDetails: candidate.includeDetails !== false, includeMaintenance: candidate.includeMaintenance !== false, includeImages: candidate.includeImages !== false, includeVehicleSideImages: candidate.includeVehicleSideImages !== false,
    includeContractHeader: candidate.includeContractHeader !== false, includeBoardLocation: candidate.includeBoardLocation !== false, includeBoardBrand: candidate.includeBoardBrand !== false, includeBoardSpecs: candidate.includeBoardSpecs !== false, includeBoardRating: candidate.includeBoardRating !== false, includeOwnerCompany: candidate.includeOwnerCompany !== false, includeDates: candidate.includeDates !== false, includeStandStore: candidate.includeStandStore !== false, includeStandCondition: candidate.includeStandCondition !== false, includeShelfAllocation: candidate.includeShelfAllocation !== false, includeVehicleNumber: candidate.includeVehicleNumber !== false,
    imageSize, imageCompression: candidate.imageCompression === "balanced" || candidate.imageCompression === "compact" ? candidate.imageCompression : "original", boardCardLayout: candidate.boardCardLayout === "full" ? "full" : "grid", standCardLayout: candidate.standCardLayout === "full" ? "full" : "grid", imageFit: candidate.imageFit === "width" || candidate.imageFit === "height" ? candidate.imageFit : "card", dateRangeMode: hasValidDateRange ? "selected" : "all", startDate: hasValidDateRange ? startDate : undefined, endDate: hasValidDateRange ? endDate : undefined, region: optionalText(candidate.region), brand: optionalText(candidate.brand), contractId: contractIds[0], contractName: contractNames[0], contractIds: contractIds.length ? contractIds : undefined, contractNames: contractNames.length ? contractNames : undefined, sortBy: candidate.sortBy === "oldest" || candidate.sortBy === "brand" || candidate.sortBy === "region" ? candidate.sortBy : "newest", theme: candidate.theme === "blue" || candidate.theme === "slate" ? candidate.theme : "teal",
  };
  const isBoardReport = settings.reportScope !== "works";
  const hasActiveSection = isBoardReport ? settings.includeSignages : settings.includeStands || settings.includeShelves || settings.includeVehicles;
  return hasActiveSection ? settings : isBoardReport ? { ...settings, includeSignages: true } : { ...settings, includeStands: true };
}
