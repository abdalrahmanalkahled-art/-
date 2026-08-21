import type { SignageReportSettings } from "./signage-report-settings-model";
import { DEFAULT_SIGNAGE_REPORT_SETTINGS } from "./signage-report-settings-model";

export interface SignageReportBoard { id: string; type: "store" | "road" | "wall" | "island"; storeName?: string; region?: string; address?: string; responsible?: string; brand?: string; backBrand?: string; islandCount?: number | string; installDate: string; contractEndDate?: string; imageUri?: string; frontImageUri?: string; backImageUri?: string; sides?: 1 | 2; boardType?: string; rating?: string; widthCm?: number; heightCm?: number; contractId?: string; contractName?: string; ownerCompany?: string; responsiblePhone?: string; totalBoards?: number; notes?: string; }
export interface SignageReportStand { id: string; storeName?: string; region?: string; brand?: string; condition: "good" | "damaged" | "needs_repair"; installDate: string; imageUri?: string; notes?: string; maintenanceHistory?: { id: string; date: string; type: string; description: string; status: string }[]; }
export interface SignageReportShelf { id: string; storeName: string; region?: string; installDate: string; imageUri?: string; notes?: string; brandAllocations: Array<{ brand: string; shelfCount: number }>; }
export interface SignageReportVehicle { id: string; brand: string; vehicleNumber: string; installDate: string; images: { right: string; left: string; front: string; back: string }; }
export interface SignageReportExtras { shelves?: SignageReportShelf[]; vehicles?: SignageReportVehicle[]; }
export interface SignageReportData {
  signages: SignageReportBoard[];
  stands: SignageReportStand[];
  shelves: SignageReportShelf[];
  vehicles: SignageReportVehicle[];
  generatedAt: string;
  signageByType: Record<string, number>;
  standsByCondition: Record<string, number>;
  signageByBrand: Record<string, number>;
  standsByBrand: Record<string, number>;
  shelvesByBrand: Record<string, number>;
  vehiclesByBrand: Record<string, number>;
  assetsByRegion: Record<string, number>;
  dateScopeLabel: string;
  filterScopeLabel: string;
  reportTitle?: string;
  reportSubtitle?: string;
}

function addCount(target: Record<string, number>, key?: string, amount = 1) { if (key?.trim()) target[key.trim()] = (target[key.trim()] || 0) + amount; }
function compareText(a?: string, b?: string) { return (a || "").localeCompare(b || "", "ar"); }
function sortItems<T extends { installDate: string; brand?: string; region?: string }>(items: T[], settings: SignageReportSettings): T[] { return [...items].sort((a, b) => settings.sortBy === "oldest" ? a.installDate.localeCompare(b.installDate) : settings.sortBy === "brand" ? compareText(a.brand, b.brand) : settings.sortBy === "region" ? compareText(a.region, b.region) : b.installDate.localeCompare(a.installDate)); }

export function buildSignageReportData(signages: SignageReportBoard[], stands: SignageReportStand[], settings: SignageReportSettings = DEFAULT_SIGNAGE_REPORT_SETTINGS, extras: SignageReportExtras = {}): SignageReportData {
  const inDateRange = (date: string) => settings.dateRangeMode !== "selected" || !settings.startDate || !settings.endDate || (date >= settings.startDate && date <= settings.endDate);
  const inRegion = (region?: string) => !settings.region || region === settings.region;
  const hasBrand = (brands: Array<string | undefined>) => !settings.brand || brands.some((brand) => brand === settings.brand);
  const selectedContractIds = settings.contractIds?.length ? settings.contractIds : settings.contractId ? [settings.contractId] : [];
  const filteredSignages = sortItems(signages.filter((item) => inDateRange(item.installDate) && inRegion(item.region) && hasBrand([item.brand, item.backBrand]) && (!selectedContractIds.length || Boolean(item.contractId && selectedContractIds.includes(item.contractId)))), settings);
  const filteredStands = sortItems(stands.filter((item) => inDateRange(item.installDate) && inRegion(item.region) && hasBrand([item.brand])), settings);
  const filteredShelves = sortItems((extras.shelves || []).filter((item) => inDateRange(item.installDate) && inRegion(item.region) && hasBrand(item.brandAllocations.map((allocation) => allocation.brand))), settings);
  const filteredVehicles = sortItems((extras.vehicles || []).filter((item) => inDateRange(item.installDate) && !settings.region && hasBrand([item.brand])), settings);
  const signageByType: Record<string, number> = {}; const standsByCondition: Record<string, number> = {}; const signageByBrand: Record<string, number> = {}; const standsByBrand: Record<string, number> = {}; const shelvesByBrand: Record<string, number> = {}; const vehiclesByBrand: Record<string, number> = {}; const assetsByRegion: Record<string, number> = {};
  filteredSignages.forEach((item) => { addCount(signageByType, item.type, Number(item.islandCount) || 1); addCount(signageByBrand, item.brand); addCount(signageByBrand, item.backBrand); addCount(assetsByRegion, item.region, Number(item.islandCount) || 1); });
  filteredStands.forEach((item) => { addCount(standsByCondition, item.condition); addCount(standsByBrand, item.brand); addCount(assetsByRegion, item.region); });
  filteredShelves.forEach((item) => { item.brandAllocations.forEach((allocation) => addCount(shelvesByBrand, allocation.brand, allocation.shelfCount)); addCount(assetsByRegion, item.region); });
  filteredVehicles.forEach((item) => addCount(vehiclesByBrand, item.brand));
  const dateScopeLabel = settings.dateRangeMode === "selected" && settings.startDate && settings.endDate ? settings.startDate === settings.endDate ? `بتاريخ ${settings.startDate}` : `من ${settings.startDate} إلى ${settings.endDate}` : "كل التواريخ";
  const contractNames = settings.contractNames?.length ? settings.contractNames : settings.contractName ? [settings.contractName] : [];
  const contractScope = contractNames.length === 1 ? `العقد: ${contractNames[0]}` : contractNames.length > 1 ? `العقود: ${contractNames.length}` : undefined;
  const filterScopeLabel = [contractScope, settings.region ? `المنطقة: ${settings.region}` : undefined, settings.brand ? `الماركة: ${settings.brand}` : undefined].filter(Boolean).join(" · ") || "كل المناطق والماركات";
  return { signages: filteredSignages, stands: filteredStands, shelves: filteredShelves, vehicles: filteredVehicles, generatedAt: new Date().toLocaleString("ar-SY"), signageByType, standsByCondition, signageByBrand, standsByBrand, shelvesByBrand, vehiclesByBrand, assetsByRegion, dateScopeLabel, filterScopeLabel };
}
