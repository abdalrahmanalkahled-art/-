import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Pressable,
  TextInput, Modal, ScrollView, Alert, Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { launchImageLibrary, launchCamera, type ImagePickerResponse } from "@/lib/media-picker";
import { useColors } from "@/hooks/use-colors";
import { useHasPermission } from "@/lib/app-context";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";
import { SuccessModal } from "@/components/success-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SignageReportSettingsSheet } from "@/components/signage-report-settings-sheet";
import { DateRangePickerModal } from "@/components/date-range-picker-modal";
import { FloatingFormModal } from "@/components/floating-form-modal";
import { MediaSourcePickerModal } from "@/components/media-source-picker-modal";
import { SignageDetailsSheet } from "@/components/signage-details-sheet";
import { SignageDetailsTab } from "@/components/signage/signage-details-tab";
import { RoadsideContractWizard, type RoadsideWizardMode } from "@/components/roadside-contract-wizard";
import { WallBoardWizard, type WallBoardWizardMode } from "@/components/wall-board-wizard";
import { IslandContractWizard, type IslandWizardMode } from "@/components/island-contract-wizard";
import { StoreBoardWizard, type StoreBoardDraft } from "@/components/store-board-wizard";
import { StandWizard, type StandDraft } from "@/components/stand-wizard";
import { ShelfWizard } from "@/components/shelf-wizard";
import { AdvertisingVehicleWizard } from "@/components/advertising-vehicle-wizard";
import { CardActionModal } from "@/components/card-action-modal";
import { getBrandUsage, loadBrandRegionCatalog, saveBrands } from "@/lib/brand-region-repository";
import { buildSignageReportData } from "@/lib/signage-report-data";
import { roadsideContractsToReportBoards } from "@/lib/roadside-contract-report";
import { exportSignageReport } from "@/lib/signage-report-exporter";
import { loadSignageReportSettings, saveSignageReportSettings } from "@/lib/signage-report-settings";
import { DEFAULT_SIGNAGE_REPORT_SETTINGS, type SignageReportScope, type SignageReportSettings } from "@/lib/signage-report-settings-model";
import { archiveRoadsideContract, createRoadsideContract, createRoadsideRenewal, getRoadsideBoardRatingCounts, getRoadsideContractAlert, type RoadsideContract, type RoadsideContractDraft, updateRoadsideContract } from "@/lib/roadside-contracts";
import { syncRoadsideContractPhoneReminders } from "@/lib/notification-center";
import { loadAppSettings } from "@/lib/app-settings";
import { getKeyboardAvoidingBehavior } from "@/lib/keyboard-layout";
import { renewStoreBoardBrand, type StoreBoardFace, type StoreBoardRecord } from "@/lib/store-board";
import { createShelfInstallation, type ShelfInstallation, type ShelfInstallationDraft } from "@/lib/shelves";
import { createAdvertisingVehicle, type AdvertisingVehicle, type AdvertisingVehicleDraft } from "@/lib/advertising-vehicles";
import { needsSignageMediaPersistence, persistSignageMediaUri } from "@/lib/signage-media-storage";

interface Signage {
  id: string;
  type: "store" | "road" | "wall" | "island";
  storeId?: string;
  storeName?: string;
  region?: string;
  address?: string;
  responsible?: string;
  brand?: string;
  frontBrand?: string;
  backBrand?: string;
  sides?: 1 | 2;
  frontImageUri?: string;
  backImageUri?: string;
  widthCm?: number;
  heightCm?: number;
  boardType?: string;
  rating?: string;
  frontBrandInstalledAt?: string;
  backBrandInstalledAt?: string;
  brandHistory?: Array<{ id: string; face: StoreBoardFace; brand: string; installedAt: string; archivedAt: string }>;
  islandCount?: number | string;
  installDate: string;
  contractEndDate?: string;
  imageUri?: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
}

interface Stand {
  id: string;
  storeId?: string;
  storeName?: string;
  brand?: string;
  condition: "good" | "damaged" | "needs_repair";
  installDate: string;
  imageUri?: string;
  maintenanceHistory: MaintenanceRecord[];
  notes: string;
  isActive: boolean;
  createdAt: string;
}

interface MaintenanceRecord {
  id: string;
  date: string;
  type: "repair" | "replacement" | "maintenance";
  description: string;
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
}

async function persistRoadsideDraftMedia(draft: RoadsideContractDraft): Promise<RoadsideContractDraft> {
  const boards = await Promise.all(draft.boards.map(async (board) => {
    const front = await persistSignageMediaUri(board.frontImageUri || board.imageUri, "board");
    const back = await persistSignageMediaUri(board.backImageUri, "board-back");
    return { ...board, imageUri: front || board.imageUri, frontImageUri: front || board.frontImageUri, backImageUri: back || board.backImageUri };
  }));
  return { ...draft, boards };
}

async function persistRoadsideContractMedia(contract: RoadsideContract): Promise<RoadsideContract> {
  const boards = await Promise.all(contract.boards.map(async (board) => {
    const front = await persistSignageMediaUri(board.frontImageUri || board.imageUri, "board");
    const back = await persistSignageMediaUri(board.backImageUri, "board-back");
    if (front === (board.frontImageUri || board.imageUri) && back === board.backImageUri) return board;
    return { ...board, imageUri: front || board.imageUri, frontImageUri: front || board.frontImageUri, backImageUri: back || board.backImageUri };
  }));
  return boards.every((board, index) => board === contract.boards[index]) ? contract : { ...contract, boards };
}

async function persistSignageRecordMedia(signage: Signage): Promise<Signage> {
  const front = await persistSignageMediaUri(signage.frontImageUri || signage.imageUri, "store-board");
  const back = await persistSignageMediaUri(signage.backImageUri, "store-board-back");
  if (front === (signage.frontImageUri || signage.imageUri) && back === signage.backImageUri) return signage;
  return { ...signage, imageUri: front || signage.imageUri, frontImageUri: front || signage.frontImageUri, backImageUri: back || signage.backImageUri };
}

async function persistStandMedia(stand: Stand): Promise<Stand> {
  const imageUri = await persistSignageMediaUri(stand.imageUri, "stand");
  return imageUri === stand.imageUri ? stand : { ...stand, imageUri };
}

async function persistShelfMedia(shelf: ShelfInstallation): Promise<ShelfInstallation> {
  const imageUri = await persistSignageMediaUri(shelf.imageUri, "shelf");
  return imageUri === shelf.imageUri ? shelf : { ...shelf, imageUri };
}

async function persistVehicleMedia(vehicle: AdvertisingVehicle): Promise<AdvertisingVehicle> {
  const images = {
    right: (await persistSignageMediaUri(vehicle.images.right, "vehicle-right")) || vehicle.images.right,
    left: (await persistSignageMediaUri(vehicle.images.left, "vehicle-left")) || vehicle.images.left,
    front: (await persistSignageMediaUri(vehicle.images.front, "vehicle-front")) || vehicle.images.front,
    back: (await persistSignageMediaUri(vehicle.images.back, "vehicle-back")) || vehicle.images.back,
  };
  return Object.keys(images).every((key) => images[key as keyof typeof images] === vehicle.images[key as keyof typeof images]) ? vehicle : { ...vehicle, images };
}

function hasPendingRoadsideContractMedia(contract: RoadsideContract): boolean {
  return contract.boards.some((board) =>
    needsSignageMediaPersistence(board.frontImageUri || board.imageUri) ||
    needsSignageMediaPersistence(board.backImageUri),
  );
}

function hasPendingSignageMedia(signage: Signage): boolean {
  return needsSignageMediaPersistence(signage.frontImageUri || signage.imageUri) || needsSignageMediaPersistence(signage.backImageUri);
}

function hasPendingVehicleMedia(vehicle: AdvertisingVehicle): boolean {
  return Object.values(vehicle.images).some((uri) => needsSignageMediaPersistence(uri));
}

/**
 * يرحّل فقط السجلات التي تحمل وسائط غير مُدارة، وبشكل متسلسل لتجنب منافسة نسخ
 * الملفات الكبيرة على الذاكرة عند استعادة التطبيق للتركيز.
 */
async function normalizePendingMedia<T>(
  records: T[],
  hasPendingMedia: (record: T) => boolean,
  persist: (record: T) => Promise<T>,
): Promise<T[]> {
  const normalized: T[] = [];
  for (const record of records) {
    normalized.push(hasPendingMedia(record) ? await persist(record) : record);
  }
  return normalized;
}

type RoadContractAlert = ReturnType<typeof getRoadsideContractAlert>;

type SignageFeedItem =
  | { kind: "contract-alert"; id: string; contract: RoadsideContract; alert: RoadContractAlert; typeLabel: string }
  | { kind: "contract"; id: string; contract: RoadsideContract; alert: RoadContractAlert; alertText: string; ratingCounts: Array<{ rating: string; count: number }> }
  | { kind: "store-board"; id: string; signage: Signage }
  | { kind: "signage"; id: string; signage: Signage };

type StandFeedItem =
  | { kind: "shelf"; id: string; shelf: ShelfInstallation; totalShelves: number }
  | { kind: "vehicle"; id: string; vehicle: AdvertisingVehicle }
  | { kind: "stand"; id: string; stand: Stand };

type SignageNotification =
  | { id: string; kind: "contract"; title: string; description: string; tone: "warning" | "error"; contract: RoadsideContract }
  | { id: string; kind: "stand"; title: string; description: string; tone: "warning" | "error"; stand: Stand };

interface SignageImage {
  id: string;
  signageId: string;
  imageUri: string;
  createdAt: string;
}

interface Store {
  id: string;
  name: string;
  ownerName?: string;
  phone?: string;
  region?: string;
  address?: string;
  category?: string;
  notes?: string;
  imageUri?: string;
  isActive?: boolean;
  createdAt?: string;
}

const SIGNAGE_TYPES = [
  { value: "store", label: "محل", icon: "store" as const, color: "#3B82F6" },
  { value: "road", label: "طرقي", icon: "directions" as const, color: "#7C3AED" },
  { value: "wall", label: "جدارية", icon: "crop-landscape" as const, color: "#DC2626" },
  { value: "island", label: "منصف", icon: "location-city" as const, color: "#0E9F6E" },
];

const STAND_CONDITIONS = [
  { value: "good", label: "جيد", color: "#10B981" },
  { value: "damaged", label: "تالف", color: "#EF4444" },
  { value: "needs_repair", label: "يحتاج إصلاح", color: "#F59E0B" },
];

const MAINTENANCE_TYPES = [
  { value: "repair", label: "إصلاح", color: "#F59E0B" },
  { value: "replacement", label: "استبدال", color: "#DC2626" },
  { value: "maintenance", label: "صيانة", color: "#3B82F6" },
];

const MAINTENANCE_STATUS = [
  { value: "pending", label: "قيد الانتظار", color: "#F59E0B" },
  { value: "in_progress", label: "قيد التنفيذ", color: "#3B82F6" },
  { value: "completed", label: "مكتمل", color: "#10B981" },
];

const toIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromIsoDate = (value?: string) => value ? new Date(`${value}T12:00:00`) : null;

export default function SignageModule() {
  const colors = useColors();
  const canCreate = useHasPermission("signage", "create");
  const canEdit = useHasPermission("signage", "edit");
  const canDelete = useHasPermission("signage", "delete");
  const [activeTab, setActiveTab] = useState<"signage" | "stands" | "details">("signage");
  const [signages, setSignages] = useState<Signage[]>([]);
  const [stands, setStands] = useState<Stand[]>([]);
  const [shelves, setShelves] = useState<ShelfInstallation[]>([]);
  const [advertisingVehicles, setAdvertisingVehicles] = useState<AdvertisingVehicle[]>([]);
  const [roadContracts, setRoadContracts] = useState<RoadsideContract[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ visible: false, message: "" });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "signage" | "stands" | "shelves" | "vehicles" } | null>(null);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [brandPendingDelete, setBrandPendingDelete] = useState<string | null>(null);
  const [newBrand, setNewBrand] = useState("");
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [dateTarget, setDateTarget] = useState<"signage-install" | "contract-end" | "stand-install" | null>(null);
  const [mediaTarget, setMediaTarget] = useState<"signage" | "stand" | null>(null);
  const [roadWizardOpen, setRoadWizardOpen] = useState(false);
  const [roadWizardMode, setRoadWizardMode] = useState<RoadsideWizardMode>("create");
  const [wallWizardOpen, setWallWizardOpen] = useState(false);
  const [wallWizardMode, setWallWizardMode] = useState<WallBoardWizardMode>("create");
  const [islandWizardOpen, setIslandWizardOpen] = useState(false);
  const [islandWizardMode, setIslandWizardMode] = useState<IslandWizardMode>("create");
  const [storeBoardWizardOpen, setStoreBoardWizardOpen] = useState(false);
  const [storeBoardWizardMode, setStoreBoardWizardMode] = useState<"create" | "edit">("create");
  const [storeBoardActionsOpen, setStoreBoardActionsOpen] = useState(false);
  const [standWizardOpen, setStandWizardOpen] = useState(false);
  const [standWizardMode, setStandWizardMode] = useState<"create" | "edit">("create");
  const [shelfWizardOpen, setShelfWizardOpen] = useState(false);
  const [shelfWizardMode, setShelfWizardMode] = useState<"create" | "edit">("create");
  const [standActionsOpen, setStandActionsOpen] = useState(false);
  const [shelfActionsOpen, setShelfActionsOpen] = useState(false);
  const [vehicleWizardOpen, setVehicleWizardOpen] = useState(false);
  const [vehicleWizardMode, setVehicleWizardMode] = useState<"create" | "edit">("create");
  const [vehicleActionsOpen, setVehicleActionsOpen] = useState(false);
  const [contractsAndBoardsOpen, setContractsAndBoardsOpen] = useState(false);
  const [advertisingWorksOpen, setAdvertisingWorksOpen] = useState(false);
  const [storeBrandRenewFace, setStoreBrandRenewFace] = useState<StoreBoardFace | null>(null);
  const [storeBrandRenewSearch, setStoreBrandRenewSearch] = useState("");
  const [selectedRoadContract, setSelectedRoadContract] = useState<RoadsideContract | null>(null);
  const [roadActionsOpen, setRoadActionsOpen] = useState(false);
  const [roadPendingAction, setRoadPendingAction] = useState<"cancel" | "delete" | null>(null);
  const [roadReminderDays, setRoadReminderDays] = useState<15 | 30 | 60>(30);

  const [signageForm, setSignageForm] = useState<Partial<Signage> & { islandCount?: string | number }>(() => ({
    type: "store" as Signage["type"],
    storeId: "",
    storeName: "",
    region: "",
    address: "",
    responsible: "",
    brand: "",
    islandCount: "",
    installDate: new Date().toISOString().split("T")[0],
    contractEndDate: "",
    imageUri: "",
    notes: "",
  }));

  const [standForm, setStandForm] = useState<Partial<Stand>>(() => ({
    storeId: "",
    storeName: "",
    brand: "",
    condition: "good",
    installDate: new Date().toISOString().split("T")[0],
    imageUri: "",
    notes: "",
    maintenanceHistory: [],
  }));

  const [showStandStoreDropdown, setShowStandStoreDropdown] = useState(false);
  const [showStandBrandDropdown, setShowStandBrandDropdown] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  
  // Search states for dropdowns
  const [storeSearchText, setStoreSearchText] = useState("");
  const [regionSearchText, setRegionSearchText] = useState("");
  const [brandSearchText, setBrandSearchText] = useState("");
  const [standStoreSearchText, setStandStoreSearchText] = useState("");
  const [standBrandSearchText, setStandBrandSearchText] = useState("");
  const [selectedStand, setSelectedStand] = useState<Stand | null>(null);
  const [selectedShelf, setSelectedShelf] = useState<ShelfInstallation | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<AdvertisingVehicle | null>(null);
  const [selectedSignage, setSelectedSignage] = useState<Signage | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState<"signage" | "stands" | null>(null);
  const [reportSettingsOpen, setReportSettingsOpen] = useState<"boards" | "works" | null>(null);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [boardReportSettings, setBoardReportSettings] = useState<SignageReportSettings>({ ...DEFAULT_SIGNAGE_REPORT_SETTINGS, reportScope: "boards" });
  const [workReportSettings, setWorkReportSettings] = useState<SignageReportSettings>({ ...DEFAULT_SIGNAGE_REPORT_SETTINGS, reportScope: "works" });
  const [exporting, setExporting] = useState<`${"boards" | "works"}-${"pdf" | "excel"}` | null>(null);
  const [selectedStandForMaintenance, setSelectedStandForMaintenance] = useState<Stand | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState({
    type: "repair" as MaintenanceRecord["type"],
    description: "",
    status: "pending" as MaintenanceRecord["status"],
  });

  const loadAssetData = useCallback(async () => {
    try {
      const [signageData, standData, shelfData, vehiclesData, contractsData, appSettings] = await Promise.all([
        getItems<Signage>(STORAGE_KEYS.SIGNAGE_BOARDS),
        getItems<Stand>(STORAGE_KEYS.STANDS),
        getItems<ShelfInstallation>(STORAGE_KEYS.SHELVES),
        getItems<AdvertisingVehicle>(STORAGE_KEYS.ADVERTISING_VEHICLES),
        getItems<RoadsideContract>(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS),
        loadAppSettings(),
      ]);
      const managedSignages = await normalizePendingMedia(signageData, hasPendingSignageMedia, persistSignageRecordMedia);
      const managedStands = await normalizePendingMedia(standData, (stand) => needsSignageMediaPersistence(stand.imageUri), persistStandMedia);
      const managedShelves = await normalizePendingMedia(shelfData, (shelf) => needsSignageMediaPersistence(shelf.imageUri), persistShelfMedia);
      const managedVehicles = await normalizePendingMedia(vehiclesData, hasPendingVehicleMedia, persistVehicleMedia);
      const managedContracts = await normalizePendingMedia(contractsData, hasPendingRoadsideContractMedia, persistRoadsideContractMedia);
      await Promise.all([
        managedSignages.some((item, index) => item !== signageData[index]) ? saveItems(STORAGE_KEYS.SIGNAGE_BOARDS, managedSignages) : Promise.resolve(),
        managedStands.some((item, index) => item !== standData[index]) ? saveItems(STORAGE_KEYS.STANDS, managedStands) : Promise.resolve(),
        managedShelves.some((item, index) => item !== shelfData[index]) ? saveItems(STORAGE_KEYS.SHELVES, managedShelves) : Promise.resolve(),
        managedVehicles.some((item, index) => item !== vehiclesData[index]) ? saveItems(STORAGE_KEYS.ADVERTISING_VEHICLES, managedVehicles) : Promise.resolve(),
        managedContracts.some((item, index) => item !== contractsData[index]) ? saveItems(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS, managedContracts) : Promise.resolve(),
      ]);
      setSignages(managedSignages.filter((s) => s.isActive));
      setStands(managedStands.filter((s) => s.isActive));
      setShelves(managedShelves.filter((shelf) => shelf.isActive));
      setAdvertisingVehicles(managedVehicles.filter((vehicle) => vehicle.isActive));
      setRoadContracts(managedContracts.filter((contract) => contract.status === "active"));
      setRoadReminderDays(appSettings.roadsideContractReminderDays);
    } catch (error) {
      console.error("خطأ في تحميل بيانات اللوحات والستاندات:", error);
    }
  }, []);

  const loadReferenceData = useCallback(async () => {
    try {
      const [storeData, catalog] = await Promise.all([
        getItems<Store>(STORAGE_KEYS.STORES),
        loadBrandRegionCatalog(),
      ]);
      const activeStores = (storeData || []).filter((store) => store.isActive !== false);
      setStores(activeStores);
      setBrands(catalog.brands.filter((brand) => brand.isActive).map((brand) => brand.name));
      setRegions(catalog.regions.filter((region) => region.isActive).map((region) => region.name));
    } catch (error) {
      console.error("خطأ في تحميل مراجع اللوحات والستاندات:", error);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadAssetData(); }, [loadAssetData]));

  useEffect(() => { void loadReferenceData(); }, [loadReferenceData]);

  const loadData = loadAssetData;

  useEffect(() => {
    void Promise.all([loadSignageReportSettings("boards"), loadSignageReportSettings("works")]).then(([boardSettings, workSettings]) => { setBoardReportSettings(boardSettings); setWorkReportSettings(workSettings); });
  }, []);

  const openRoadWizard = (mode: RoadsideWizardMode, contract: RoadsideContract | null = null) => {
    setSelectedRoadContract(contract);
    setRoadWizardMode(mode);
    setRoadActionsOpen(false);
    setRoadWizardOpen(true);
  };

  const openWallWizard = (mode: WallBoardWizardMode, contract: RoadsideContract | null = null) => {
    setSelectedRoadContract(contract);
    setWallWizardMode(mode);
    setRoadActionsOpen(false);
    setWallWizardOpen(true);
  };

  const openIslandWizard = (mode: IslandWizardMode, contract: RoadsideContract | null = null) => {
    setSelectedRoadContract(contract);
    setIslandWizardMode(mode);
    setRoadActionsOpen(false);
    setIslandWizardOpen(true);
  };

  const saveRoadContract = async (draft: RoadsideContractDraft) => {
    const durableDraft = await persistRoadsideDraftMedia(draft);
    const all = await getItems<RoadsideContract>(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS);
    let updated: RoadsideContract[];
    if (roadWizardMode === "edit" && selectedRoadContract) {
      const revised = updateRoadsideContract(selectedRoadContract, durableDraft);
      updated = all.map((contract) => contract.id === revised.id ? revised : contract);
      setSuccessMessage({ visible: true, message: "تم تعديل عقد اللوحات الطرقية بنجاح" });
    } else if ((roadWizardMode === "renew-same" || roadWizardMode === "renew-edit") && selectedRoadContract) {
      const renewal = createRoadsideRenewal(selectedRoadContract, durableDraft);
      updated = [...all.map((contract) => contract.id === renewal.archived.id ? renewal.archived : contract), renewal.renewed];
      setSuccessMessage({ visible: true, message: "تم تجديد العقد وأرشفة العقد السابق" });
    } else {
      updated = [...all, createRoadsideContract(durableDraft)];
      setSuccessMessage({ visible: true, message: "تم حفظ عقد اللوحات الطرقية وتوزيعه بنجاح" });
    }
    await saveItems(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS, updated);
    await loadData();
  };

  const saveWallContract = async (draft: RoadsideContractDraft) => {
    const durableDraft = await persistRoadsideDraftMedia(draft);
    const all = await getItems<RoadsideContract>(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS);
    let updated: RoadsideContract[];
    if (wallWizardMode === "edit" && selectedRoadContract) {
      const revised = updateRoadsideContract(selectedRoadContract, durableDraft);
      updated = all.map((contract) => contract.id === revised.id ? revised : contract);
      setSuccessMessage({ visible: true, message: "تم تعديل اللوحة الجدارية بنجاح" });
    } else if ((wallWizardMode === "renew-same" || wallWizardMode === "renew-edit") && selectedRoadContract) {
      const renewal = createRoadsideRenewal(selectedRoadContract, durableDraft);
      updated = [...all.map((contract) => contract.id === renewal.archived.id ? renewal.archived : contract), renewal.renewed];
      setSuccessMessage({ visible: true, message: "تم تجديد اللوحة الجدارية وأرشفة السجل السابق" });
    } else {
      updated = [...all, createRoadsideContract(durableDraft)];
      setSuccessMessage({ visible: true, message: "تم حفظ اللوحة الجدارية بنجاح" });
    }
    await saveItems(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS, updated);
    await loadData();
  };

  const saveIslandContract = async (draft: RoadsideContractDraft) => {
    const durableDraft = await persistRoadsideDraftMedia(draft);
    const all = await getItems<RoadsideContract>(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS);
    let updated: RoadsideContract[];
    if (islandWizardMode === "edit" && selectedRoadContract) {
      const revised = updateRoadsideContract(selectedRoadContract, durableDraft);
      updated = all.map((contract) => contract.id === revised.id ? revised : contract);
      setSuccessMessage({ visible: true, message: "تم تعديل عقد المنصفات بنجاح" });
    } else if ((islandWizardMode === "renew-same" || islandWizardMode === "renew-edit") && selectedRoadContract) {
      const renewal = createRoadsideRenewal(selectedRoadContract, durableDraft);
      updated = [...all.map((contract) => contract.id === renewal.archived.id ? renewal.archived : contract), renewal.renewed];
      setSuccessMessage({ visible: true, message: "تم تجديد عقد المنصفات وأرشفة العقد السابق" });
    } else {
      updated = [...all, createRoadsideContract(durableDraft)];
      setSuccessMessage({ visible: true, message: "تم حفظ عقد المنصفات بنجاح" });
    }
    await saveItems(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS, updated);
    await loadData();
  };

  const openStoreBoardWizard = (mode: "create" | "edit", board: Signage | null = null) => {
    setSelectedSignage(board);
    setStoreBoardWizardMode(mode);
    setStoreBoardActionsOpen(false);
    setStoreBoardWizardOpen(true);
  };

  const openStandWizard = (mode: "create" | "edit", stand: Stand | null = null) => {
    setSelectedStand(stand);
    setStandWizardMode(mode);
    setStandWizardOpen(true);
  };

  const openShelfWizard = (mode: "create" | "edit", shelf: ShelfInstallation | null = null) => {
    setSelectedShelf(shelf);
    setShelfWizardMode(mode);
    setShelfWizardOpen(true);
  };

  const openVehicleWizard = (mode: "create" | "edit", vehicle: AdvertisingVehicle | null = null) => {
    setSelectedVehicle(vehicle);
    setVehicleWizardMode(mode);
    setVehicleActionsOpen(false);
    setVehicleWizardOpen(true);
  };

  const saveStandWizard = async (draft: StandDraft) => {
    const all = await getItems<Stand>(STORAGE_KEYS.STANDS);
    const existing = standWizardMode === "edit" ? selectedStand : null;
    const next: Stand = {
      id: existing?.id || `stand-${Date.now()}`,
      storeId: draft.storeId,
      storeName: draft.storeName,
      brand: draft.brand,
      condition: draft.condition,
      installDate: draft.installDate,
      imageUri: await persistSignageMediaUri(draft.imageUri, "stand"),
      notes: draft.notes,
      maintenanceHistory: existing?.maintenanceHistory || [],
      isActive: true,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    const updated = existing ? all.map((item) => item.id === next.id ? next : item) : [...all, next];
    await saveItems(STORAGE_KEYS.STANDS, updated);
    setStands(updated.filter((item) => item.isActive));
    setSelectedStand(next);
    setSuccessMessage({ visible: true, message: existing ? "تم تعديل الستاند بنجاح" : "تم حفظ الستاند بنجاح" });
    await loadData();
  };

  const saveShelfWizard = async (draft: ShelfInstallationDraft) => {
    const all = await getItems<ShelfInstallation>(STORAGE_KEYS.SHELVES);
    const existing = shelfWizardMode === "edit" ? selectedShelf : null;
    const durableDraft = { ...draft, imageUri: await persistSignageMediaUri(draft.imageUri, "shelf") };
    const next = existing
      ? { ...existing, ...durableDraft, brandAllocations: durableDraft.brandAllocations.map((allocation) => ({ ...allocation })), notes: durableDraft.notes.trim() }
      : createShelfInstallation(durableDraft);
    const updated = existing ? all.map((item) => item.id === next.id ? next : item) : [...all, next];
    await saveItems(STORAGE_KEYS.SHELVES, updated);
    setShelves(updated.filter((item) => item.isActive));
    setSelectedShelf(next);
    setSuccessMessage({ visible: true, message: existing ? "تم تعديل الأرفف بنجاح" : "تم حفظ الأرفف بنجاح" });
    await loadData();
  };

  const saveAdvertisingVehicle = async (draft: AdvertisingVehicleDraft) => {
    const all = await getItems<AdvertisingVehicle>(STORAGE_KEYS.ADVERTISING_VEHICLES);
    const existing = vehicleWizardMode === "edit" ? selectedVehicle : null;
    const durableImages = {
      right: (await persistSignageMediaUri(draft.images.right, "vehicle-right")) || draft.images.right,
      left: (await persistSignageMediaUri(draft.images.left, "vehicle-left")) || draft.images.left,
      front: (await persistSignageMediaUri(draft.images.front, "vehicle-front")) || draft.images.front,
      back: (await persistSignageMediaUri(draft.images.back, "vehicle-back")) || draft.images.back,
    };
    const durableDraft = { ...draft, images: durableImages };
    const next = existing ? { ...existing, ...durableDraft, images: { ...durableDraft.images } } : createAdvertisingVehicle(durableDraft);
    const updated = existing ? all.map((item) => item.id === next.id ? next : item) : [...all, next];
    await saveItems(STORAGE_KEYS.ADVERTISING_VEHICLES, updated);
    setAdvertisingVehicles(updated.filter((item) => item.isActive));
    setSelectedVehicle(next);
    setSuccessMessage({ visible: true, message: existing ? "تم تعديل السيارة المعلنة بنجاح" : "تم حفظ السيارة المعلنة بنجاح" });
  };

  const confirmAssetDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "signage" && selectedSignage) {
      const all = await getItems<Signage>(STORAGE_KEYS.SIGNAGE_BOARDS);
      const updated = all.filter((item) => item.id !== selectedSignage.id);
      await saveItems(STORAGE_KEYS.SIGNAGE_BOARDS, updated);
      setSignages(updated.filter((item) => item.isActive));
    } else if (deleteTarget.type === "stands" && selectedStand) {
      const all = await getItems<Stand>(STORAGE_KEYS.STANDS);
      const updated = all.filter((item) => item.id !== selectedStand.id);
      await saveItems(STORAGE_KEYS.STANDS, updated);
      setStands(updated.filter((item) => item.isActive));
    } else if (deleteTarget.type === "shelves" && selectedShelf) {
      const all = await getItems<ShelfInstallation>(STORAGE_KEYS.SHELVES);
      const updated = all.filter((item) => item.id !== selectedShelf.id);
      await saveItems(STORAGE_KEYS.SHELVES, updated);
      setShelves(updated.filter((item) => item.isActive));
    } else if (deleteTarget.type === "vehicles" && selectedVehicle) {
      const all = await getItems<AdvertisingVehicle>(STORAGE_KEYS.ADVERTISING_VEHICLES);
      const updated = all.filter((item) => item.id !== selectedVehicle.id);
      await saveItems(STORAGE_KEYS.ADVERTISING_VEHICLES, updated);
      setAdvertisingVehicles(updated.filter((item) => item.isActive));
    }
    const label = deleteTarget.type === "signage" ? "اللوحة" : deleteTarget.type === "stands" ? "الستاند" : deleteTarget.type === "shelves" ? "الأرفف" : "السيارة المعلنة";
    setDeleteTarget(null); setShowDeleteModal(false); setShowDetails(false);
    setSuccessMessage({ visible: true, message: `تم حذف ${label} بنجاح` });
  };

  const saveStoreBoard = async (draft: StoreBoardDraft) => {
    const all = await getItems<Signage>(STORAGE_KEYS.SIGNAGE_BOARDS);
    const existing = storeBoardWizardMode === "edit" ? selectedSignage : null;
    const now = new Date().toISOString();
    const frontImageUri = await persistSignageMediaUri(draft.frontImageUri || draft.imageUri, "store-board");
    const backImageUri = await persistSignageMediaUri(draft.backImageUri, "store-board-back");
    const next: Signage = {
      id: existing?.id || `store-board-${Date.now()}`, type: "store", storeId: draft.storeId, storeName: draft.storeName, region: draft.region, address: draft.address,
      brand: draft.brand, frontBrand: draft.frontBrand, backBrand: draft.backBrand, sides: draft.sides, imageUri: frontImageUri || draft.imageUri, frontImageUri: frontImageUri || draft.frontImageUri, backImageUri: backImageUri || draft.backImageUri,
      widthCm: draft.widthCm, heightCm: draft.heightCm, boardType: draft.boardType, rating: draft.rating, installDate: draft.installDate,
      frontBrandInstalledAt: draft.frontBrandInstalledAt, backBrandInstalledAt: draft.backBrandInstalledAt, brandHistory: existing?.brandHistory || [], notes: draft.notes, isActive: true, createdAt: existing?.createdAt || now,
    };
    await saveItems(STORAGE_KEYS.SIGNAGE_BOARDS, existing ? all.map((item) => item.id === next.id ? next : item) : [...all, next]);
    setSuccessMessage({ visible: true, message: existing ? "تم تعديل لوحة المحل بنجاح" : "تم حفظ لوحة المحل بنجاح" });
    await loadData();
  };

  const renewSelectedStoreBrand = async (brand: string) => {
    if (!selectedSignage || !storeBrandRenewFace) return;
    const all = await getItems<Signage>(STORAGE_KEYS.SIGNAGE_BOARDS);
    const renewed = renewStoreBoardBrand(selectedSignage as StoreBoardRecord, storeBrandRenewFace, brand, toIsoDate(new Date())) as Signage;
    await saveItems(STORAGE_KEYS.SIGNAGE_BOARDS, all.map((item) => item.id === renewed.id ? renewed : item));
    setSelectedSignage(renewed);
    setStoreBrandRenewFace(null);
    setStoreBoardActionsOpen(false);
    setSuccessMessage({ visible: true, message: "تم تجديد الماركة وأرشفة الماركة السابقة" });
    await loadData();
  };

  const confirmRoadAction = async () => {
    if (!selectedRoadContract || !roadPendingAction) return;
    const all = await getItems<RoadsideContract>(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS);
    const updated = roadPendingAction === "cancel"
      ? all.map((contract) => contract.id === selectedRoadContract.id ? archiveRoadsideContract(contract, "cancelled") : contract)
      : all.filter((contract) => contract.id !== selectedRoadContract.id);
    await saveItems(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS, updated);
    setRoadPendingAction(null);
    setRoadActionsOpen(false);
    setSelectedRoadContract(null);
    const contractLabel = selectedRoadContract.type === "wall" ? "اللوحة الجدارية" : selectedRoadContract.type === "island" ? "عقد المنصفات" : "عقد اللوحات الطرقية";
    setSuccessMessage({ visible: true, message: roadPendingAction === "cancel" ? `تم إلغاء ${contractLabel} ونقله إلى الأرشيف` : `تم حذف ${contractLabel} نهائياً` });
    await loadData();
  };

  const detailsSignages = useMemo(() => [
    ...signages.map((signage) => ({ type: signage.type, region: signage.region, brands: [signage.frontBrand || signage.brand, signage.backBrand].filter((brand): brand is string => Boolean(brand?.trim())) })),
    ...roadContracts.flatMap((contract) => contract.type === "island"
      ? Array.from({ length: contract.totalBoards }, () => ({ type: contract.type, region: contract.boards[0]?.linkedRegions?.[0] || contract.boards[0]?.region, brands: [contract.boards[0]?.frontBrand || contract.boards[0]?.brand, contract.boards[0]?.backBrand].filter((brand): brand is string => Boolean(brand?.trim())) }))
      : contract.boards.flatMap((board) => (board.linkedRegions?.length ? board.linkedRegions : [board.region]).map((region) => ({ type: contract.type, region, brands: [board.frontBrand || board.brand, board.backBrand].filter((brand): brand is string => Boolean(brand?.trim())) })))),
  ], [roadContracts, signages]);
  const detailsStands = useMemo(() => stands.map((stand) => ({ condition: stand.condition, brand: stand.brand, region: stores.find((store) => store.id === stand.storeId)?.region })), [stands, stores]);
  const renderDetailsTab = () => <SignageDetailsTab signages={detailsSignages} stands={detailsStands} shelves={shelves} vehicles={advertisingVehicles} exporting={exporting} onExport={(scope, format) => void exportReport(scope, format)} />;

  const reportSignages = useMemo(() => [
    ...signages.map((signage) => ({ id: signage.id, type: signage.type, storeName: signage.storeName, region: signage.region, address: signage.address, brand: signage.frontBrand || signage.brand, backBrand: signage.backBrand, sides: signage.sides, boardType: signage.boardType, rating: signage.rating, widthCm: signage.widthCm, heightCm: signage.heightCm, installDate: signage.installDate, imageUri: signage.frontImageUri || signage.imageUri, frontImageUri: signage.frontImageUri || signage.imageUri, backImageUri: signage.backImageUri, notes: signage.notes })),
    ...roadsideContractsToReportBoards(roadContracts),
  ], [roadContracts, signages]);
  const reportStands = useMemo(() => stands.map((stand) => ({ ...stand, region: stores.find((store) => store.id === stand.storeId)?.region })), [stands, stores]);

  const exportReport = async (scope: "boards" | "works", format: "pdf" | "excel") => {
    const settings = scope === "boards" ? boardReportSettings : workReportSettings;
    setExporting(`${scope}-${format}`);
    try {
      await exportSignageReport(format, scope === "boards" ? buildSignageReportData(reportSignages, [], settings) : buildSignageReportData([], reportStands, settings, { shelves, vehicles: advertisingVehicles }), settings);
    } finally {
      setExporting(null);
    }
  };

  const saveReportSettings = async (settings: SignageReportSettings) => {
    const saved = await saveSignageReportSettings(settings);
    if (saved.reportScope === "boards") setBoardReportSettings(saved); else setWorkReportSettings(saved);
    setReportSettingsOpen(null);
  };

  const addBrand = async () => {
    if (!newBrand.trim()) {
      Alert.alert("خطأ", "أدخل اسم الماركة");
      return;
    }
    const catalog = await loadBrandRegionCatalog();
    if (catalog.brands.some((brand) => brand.name.toLocaleLowerCase("ar") === newBrand.trim().toLocaleLowerCase("ar"))) {
      Alert.alert("تنبيه", "هذه الماركة موجودة بالفعل");
      return;
    }
    const updatedBrands = [...catalog.brands, { id: `brand-${Date.now()}`, name: newBrand.trim(), isActive: true, createdAt: new Date().toISOString() }];
    setBrands(updatedBrands.filter((brand) => brand.isActive).map((brand) => brand.name));
    await saveBrands(updatedBrands);
    setNewBrand("");
    setShowBrandModal(false);
    setSuccessMessage({ visible: true, message: "تم إضافة الماركة بنجاح" });
  };

  const deleteBrand = (brand: string) => setBrandPendingDelete(brand);
  const confirmDeleteBrand = async () => {
    if (!brandPendingDelete) return;
    const usage = await getBrandUsage(brandPendingDelete);
    if (usage.products + usage.events + usage.signages + usage.stands + usage.shelves + usage.advertisingVehicles > 0) {
      setBrandPendingDelete(null);
      Alert.alert("لا يمكن الحذف", "هذه الماركة مرتبطة ببيانات قائمة. أزل الارتباطات أولاً.");
      return;
    }
    const catalog = await loadBrandRegionCatalog();
    const updatedBrands = catalog.brands.filter((item) => item.name !== brandPendingDelete);
    setBrands(updatedBrands.filter((item) => item.isActive).map((item) => item.name));
    await saveBrands(updatedBrands);
    setBrandPendingDelete(null);
    setSuccessMessage({ visible: true, message: "تم حذف الماركة بنجاح" });
  };

  const handleSaveSignage = async () => {
    if (signageForm.type === "store" && !signageForm.storeId) {
      Alert.alert("خطأ", "اختر محل");
      return;
    }
    if (!signageForm.brand && signageForm.type !== "island") {
      Alert.alert("خطأ", "اختر ماركة");
      return;
    }
    if ((signageForm.type === "road" || signageForm.type === "island") && !signageForm.region) {
      Alert.alert("خطأ", "اختر منطقة");
      return;
    }
    if ((signageForm.type === "road" || signageForm.type === "island") && !signageForm.address) {
      Alert.alert("خطأ", "أدخل العنوان");
      return;
    }
    if (signageForm.type === "wall" && !signageForm.responsible) {
      Alert.alert("خطأ", "أدخل اسم المسؤول");
      return;
    }
    if (signageForm.type === "island" && !signageForm.islandCount) {
      Alert.alert("خطأ", "أدخل عدد اللواحات");
      return;
    }

    try {
      const all = await getItems<Signage>(STORAGE_KEYS.SIGNAGE_BOARDS);
      const isEditing = (signageForm as any).id && all.some(s => s.id === (signageForm as any).id);
      const newItem: Signage = {
        id: (signageForm as any).id || Date.now().toString(),
        type: signageForm.type as Signage["type"],
        storeId: signageForm.storeId,
        storeName: signageForm.storeName,
        region: signageForm.region,
        address: signageForm.address,
        responsible: signageForm.responsible,
        brand: signageForm.brand,
        islandCount: signageForm.islandCount ? parseInt(String(signageForm.islandCount)) : undefined,
        installDate: signageForm.installDate || new Date().toISOString().split("T")[0],
        contractEndDate: signageForm.contractEndDate,
        imageUri: signageForm.imageUri,
        notes: signageForm.notes || "",
        isActive: true,
        createdAt: (signageForm as any).createdAt || new Date().toISOString(),
      };
      const updated = isEditing ? all.map(s => s.id === newItem.id ? newItem : s) : [...all, newItem];
      await saveItems(STORAGE_KEYS.SIGNAGE_BOARDS, updated);
      setShowModal(false);
      setSuccessMessage({ visible: true, message: isEditing ? "تم تحديث اللوحة بنجاح" : "تم إضافة اللوحة بنجاح" });
      setTimeout(() => loadData(), 500);
    } catch (error) {
      Alert.alert("خطأ", "حدث خطأ أثناء الحفظ");
    }
  };

  const pickStandImage = (source: 'camera' | 'library') => {
    try {
      const options = {
        mediaType: 'photo' as const,
        includeBase64: false,
      };

      if (source === 'camera') {
        launchCamera(options, (response: ImagePickerResponse) => {
          if (response.didCancel) {
            console.log('تم إلغاء اختيار الملف');
          } else if (response.errorCode) {
            const errorMessage = getPermissionErrorMessage(response.errorCode);
            Alert.alert('خطأ', errorMessage);
          } else if (response.assets && response.assets.length > 0) {
            const imageUri = response.assets[0].uri;
            if (imageUri) {
              setStandForm((f) => ({ ...f, imageUri }));
            }
          }
        });
      } else {
        launchImageLibrary(options, (response: ImagePickerResponse) => {
          if (response.didCancel) {
            console.log('تم إلغاء اختيار الملف');
          } else if (response.errorCode) {
            const errorMessage = getPermissionErrorMessage(response.errorCode);
            Alert.alert('خطأ', errorMessage);
          } else if (response.assets && response.assets.length > 0) {
            const imageUri = response.assets[0].uri;
            if (imageUri) {
              setStandForm((f) => ({ ...f, imageUri }));
            }
          }
        });
      }
    } catch (error) {
      console.error('خطأ في اختيار الملف:', error);
      Alert.alert('خطأ', 'حدث خطأ عند اختيار الملف');
    }
  };

  const handleSaveStand = async () => {
    if (!standForm.storeId) {
      Alert.alert("خطأ", "اختر محل");
      return;
    }
    try {
      const all = await getItems<Stand>(STORAGE_KEYS.STANDS);
      const isEditing = (standForm as any).id && all.some(s => s.id === (standForm as any).id);
      const newItem: Stand = {
        id: (standForm as any).id || Date.now().toString(),
        storeId: standForm.storeId,
        storeName: standForm.storeName,
        brand: standForm.brand,
        condition: standForm.condition as Stand["condition"],
        installDate: standForm.installDate || new Date().toISOString().split("T")[0],
        imageUri: standForm.imageUri,
        maintenanceHistory: standForm.maintenanceHistory || [],
        notes: standForm.notes || "",
        isActive: true,
        createdAt: (standForm as any).createdAt || new Date().toISOString(),
      };
      const updated = isEditing ? all.map(s => s.id === newItem.id ? newItem : s) : [...all, newItem];
      await saveItems(STORAGE_KEYS.STANDS, updated);
      setShowModal(false);
      setSuccessMessage({ visible: true, message: isEditing ? "تم تحديث الستاند بنجاح" : "تم إضافة الستاند بنجاح" });
      setTimeout(() => loadData(), 500);
    } catch (error) {
      Alert.alert("خطأ", "حدث خطأ أثناء الحفظ");
    }
  };

  const addMaintenanceRecord = async () => {
    if (!maintenanceForm.description.trim()) {
      Alert.alert("خطأ", "أدخل وصف العمل");
      return;
    }
    if (!selectedStandForMaintenance) return;

    try {
      const all = await getItems<Stand>(STORAGE_KEYS.STANDS);
      const updated = all.map((stand) => {
        if (stand.id === selectedStandForMaintenance.id) {
          return {
            ...stand,
            maintenanceHistory: [
              ...stand.maintenanceHistory,
              {
                id: Date.now().toString(),
                signageId: stand.id,
                date: new Date().toISOString().split("T")[0],
                type: maintenanceForm.type,
                description: maintenanceForm.description,
                status: maintenanceForm.status,
                createdAt: new Date().toISOString(),
              } as any,
            ],
          };
        }
        return stand;
      });
      await saveItems(STORAGE_KEYS.STANDS, updated);
      setShowMaintenanceModal(false);
      setMaintenanceForm({ type: "repair", description: "", status: "pending" });
      setSuccessMessage({ visible: true, message: "تم إضافة سجل الصيانة بنجاح" });
      setTimeout(() => loadData(), 500);
    } catch (error) {
      Alert.alert("خطأ", "حدث خطأ أثناء الحفظ");
    }
  };

  const getTypeInfo = useCallback((type: string) => SIGNAGE_TYPES.find((entry) => entry.value === type) || SIGNAGE_TYPES[0], []);

  const requestStoragePermission = async () => {
    return true;
  };

  const renderSignageFields = () => {
    const type = signageForm.type;

    return (
      <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="always" keyboardDismissMode="none" nestedScrollEnabled>
        {/* Type Selection */}
        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.foreground }]}>النوع *</Text>
          <View style={styles.typeOptions}>
            {SIGNAGE_TYPES.filter((t) => t.value !== "road" && t.value !== "wall" && t.value !== "island").map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeOption, type === t.value && { backgroundColor: t.color }]}
                onPress={() => setSignageForm((f) => ({ ...f, type: t.value as Signage["type"] }))}
              >
                <MaterialIcons name={t.icon} size={14} color={type === t.value ? "#fff" : t.color} />
                <Text style={[styles.typeOptionText, { color: type === t.value ? "#fff" : colors.muted }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Store Selection (for store type) */}
        {type === "store" && (
          <View style={[styles.formGroup, { zIndex: 1000 }]}>
            <Text style={[styles.formLabel, { color: colors.foreground }]}>المحل *</Text>
            <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border, zIndex: 1000 }]}>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowStoreDropdown(!showStoreDropdown)}>
                <Text style={[styles.dropdownText, { color: signageForm.storeId ? colors.foreground : colors.muted }]}>
                  {signageForm.storeName || "اختر محل"}
                </Text>
                <MaterialIcons name={showStoreDropdown ? "expand-less" : "expand-more"} size={20} color={colors.primary} />
              </TouchableOpacity>
              {showStoreDropdown && (
                <View style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border, zIndex: 1000 }]}>
                  <TextInput
                    style={[styles.dropdownSearchInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="ابحث عن محل..."
                    placeholderTextColor={colors.muted}
                    value={storeSearchText}
                    onChangeText={setStoreSearchText}
                    textAlign="right"
                  />
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                    {stores.filter(s => s.name.toLowerCase().includes(storeSearchText.toLowerCase())).map((store) => (
                        <TouchableOpacity
                          key={store.id}
                          style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                          onPress={() => {
                            setSignageForm((f) => ({ ...f, storeId: store.id, storeName: store.name }));
                            setShowStoreDropdown(false);
                            setStoreSearchText("");
                          }}
                        >
                          <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{store.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                </View>
              )}
            </View>
          </View>
        )}        {/* Region Selection (for road and island types) */}
        {(type === "road" || type === "island") && (
          <View style={[styles.formGroup, { zIndex: 900 }]}>
            <Text style={[styles.formLabel, { color: colors.foreground }]}>المنطقة *</Text>
            <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border, zIndex: 900 }]}>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowRegionDropdown(!showRegionDropdown)}>
                <Text style={[styles.dropdownText, { color: signageForm.region ? colors.foreground : colors.muted }]}>
                  {signageForm.region || "اختر منطقة"}
                </Text>
                <MaterialIcons name={showRegionDropdown ? "expand-less" : "expand-more"} size={20} color={colors.primary} />
              </TouchableOpacity>
              {showRegionDropdown && (
                <View style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border, zIndex: 900 }]}>
                  <TextInput
                    style={[styles.dropdownSearchInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="ابحث عن منطقة..."
                    placeholderTextColor={colors.muted}
                    value={regionSearchText}
                    onChangeText={setRegionSearchText}
                    textAlign="right"
                  />
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                    {regions.filter(r => r.toLowerCase().includes(regionSearchText.toLowerCase())).map((region) => (
                      <TouchableOpacity
                        key={region}
                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setSignageForm((f) => ({ ...f, region }));
                          setShowRegionDropdown(false);
                          setRegionSearchText("");
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{region}</Text>
                      </TouchableOpacity>
                    ))}
                    </ScrollView>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Address (for road, wall, and island types) */}
        {(type === "road" || type === "wall" || type === "island") && (
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.foreground }]}>العنوان بالتفصيل {type !== "wall" ? "*" : ""}</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={signageForm.address}
              onChangeText={(v) => setSignageForm((f) => ({ ...f, address: v }))}
              placeholder="أدخل العنوان"
              placeholderTextColor={colors.muted}
              textAlign="right"
            />
          </View>
        )}

        {/* Responsible (for wall type) */}
        {type === "wall" && (
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.foreground }]}>اسم المسؤول *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={signageForm.responsible}
              onChangeText={(v) => setSignageForm((f) => ({ ...f, responsible: v }))}
              placeholder="أدخل اسم المسؤول"
              placeholderTextColor={colors.muted}
              textAlign="right"
            />
          </View>
        )}

        {/* Brand Selection */}
        {(type === "store" || type === "road" || type === "wall") && (
          <View style={[styles.formGroup, { zIndex: 800 }]}>
            <Text style={[styles.formLabel, { color: colors.foreground }]}>الماركة</Text>
            <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border, zIndex: 800 }]}>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowBrandDropdown(!showBrandDropdown)}>
                <Text style={[styles.dropdownText, { color: signageForm.brand ? colors.foreground : colors.muted }]}>
                  {signageForm.brand || "اختر ماركة"}
                </Text>
                <MaterialIcons name={showBrandDropdown ? "expand-less" : "expand-more"} size={20} color={colors.primary} />
              </TouchableOpacity>
              {showBrandDropdown && (
                <View style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border, zIndex: 800 }]}>
                  <TextInput
                    style={[styles.dropdownSearchInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="ابحث عن ماركة..."
                    placeholderTextColor={colors.muted}
                    value={brandSearchText}
                    onChangeText={setBrandSearchText}
                    textAlign="right"
                  />
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                    {brands.filter(b => b.toLowerCase().includes(brandSearchText.toLowerCase())).map((brand) => (
                      <View key={brand} style={[styles.dropdownItem, { borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                        <TouchableOpacity onPress={() => deleteBrand(brand)}>
                          <MaterialIcons name="delete" size={18} color={colors.error} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1 }}
                          onPress={() => {
                            setSignageForm((f) => ({ ...f, brand }));
                            setShowBrandDropdown(false);
                            setBrandSearchText("");
                          }}
                        >
                          <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{brand}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity
                      style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setShowBrandDropdown(false);
                        setShowBrandModal(true);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: colors.primary, fontWeight: "600" as any }]}>+ إضافة ماركة جديدة</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Island Count (for island type) */}
        {type === "island" && (
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.foreground }]}>عدد اللواحات المنصفة *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={String(signageForm.islandCount || "")}
              onChangeText={(v) => setSignageForm((f) => ({ ...f, islandCount: v }))}
              placeholder="أدخل العدد"
              placeholderTextColor={colors.muted}
              textAlign="right"
              keyboardType="number-pad"
            />
          </View>
        )}

        {/* Install Date */}
        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.foreground }]}>تاريخ التركيب *</Text>
          <TouchableOpacity onPress={() => setDateTarget("signage-install")} style={[styles.formInput, styles.datePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
            <Text style={[styles.datePickerText, { color: signageForm.installDate ? colors.foreground : colors.muted }]}>{signageForm.installDate || "اختر تاريخ التركيب"}</Text>
          </TouchableOpacity>
        </View>

        {/* Contract End Date (for wall type) */}
        {type === "wall" && (
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.foreground }]}>تاريخ نهاية العقد</Text>
            <TouchableOpacity onPress={() => setDateTarget("contract-end")} style={[styles.formInput, styles.datePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
              <Text style={[styles.datePickerText, { color: signageForm.contractEndDate ? colors.foreground : colors.muted }]}>{signageForm.contractEndDate || "اختر تاريخ نهاية العقد"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Image Upload */}
        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.foreground }]}>اختياري - الصورة</Text>
          <TouchableOpacity onPress={() => setMediaTarget("signage")} style={[styles.imageButton, { borderColor: colors.primary, backgroundColor: colors.primary + "12" }]}>
            <MaterialIcons name="add-photo-alternate" size={20} color={colors.primary} />
            <Text style={[styles.imageButtonText, { color: colors.primary }]}>{signageForm.imageUri ? "تغيير الصورة" : "إضافة صورة"}</Text>
          </TouchableOpacity>
          {signageForm.imageUri && <Image source={{ uri: signageForm.imageUri }} style={styles.imagePreview} />}
        </View>

        {/* Notes */}
        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.foreground }]}>ملاحظات</Text>
          <TextInput
            style={[styles.formInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={signageForm.notes}
            onChangeText={(v) => setSignageForm((f) => ({ ...f, notes: v }))}
            placeholder="ملاحظات..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            textAlign="right"
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    );
  };

  const getPermissionErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
      'permission_denied': 'الأذونة مرفوضة. يرجى السماح بالوصول إلى الكاميرا أو معرض الصور',
      'permission_undefined': 'لم يتم طلب الأذونة',
    };
    return errorMessages[errorCode] || 'حدث خطأ عند اختيار الملف';
  };

  const pickSignageImage = (source: 'camera' | 'library') => {
    try {
      const options = {
        mediaType: 'photo' as const,
        includeBase64: false,
      };

      if (source === 'camera') {
        launchCamera(options, (response: ImagePickerResponse) => {
          if (response.didCancel) {
            console.log('تم إلغاء اختيار الملف');
          } else if (response.errorCode) {
            const errorMessage = getPermissionErrorMessage(response.errorCode);
            Alert.alert('خطأ', errorMessage);
          } else if (response.assets && response.assets.length > 0) {
            const imageUri = response.assets[0].uri;
            if (imageUri) {
              setSignageForm((f) => ({ ...f, imageUri }));
            }
          }
        });
      } else {
        launchImageLibrary(options, (response: ImagePickerResponse) => {
          if (response.didCancel) {
            console.log('تم إلغاء اختيار الملف');
          } else if (response.errorCode) {
            const errorMessage = getPermissionErrorMessage(response.errorCode);
            Alert.alert('خطأ', errorMessage);
          } else if (response.assets && response.assets.length > 0) {
            const imageUri = response.assets[0].uri;
            if (imageUri) {
              setSignageForm((f) => ({ ...f, imageUri }));
            }
          }
        });
      }
    } catch (error) {
      console.error('خطأ في اختيار الملف:', error);
      Alert.alert('خطأ', 'حدث خطأ عند اختيار الملف');
    }
  };

  const signageFeed = useMemo<SignageFeedItem[]>(() => {
    const referenceDate = new Date();
    const contracts = roadContracts.flatMap((contract) => {
      const alert = getRoadsideContractAlert(contract, referenceDate, roadReminderDays);
      const isWall = contract.type === "wall";
      const isIsland = contract.type === "island";
      const typeLabel = isWall ? "لوحة جدارية" : isIsland ? "عقد منصفات" : "عقد لوحات طرقية";
      const alertText = alert.state === "expired"
        ? `${isWall ? "انتهت اللوحة" : isIsland ? "انتهى عقد المنصفات" : "انتهى العقد"} — اضغط مطولاً للتجديد أو الإلغاء`
        : alert.state === "upcoming" ? `ينتهي خلال ${alert.daysRemaining} يوم` : `ساري حتى ${contract.endDate}`;
      const ratingCounts = isIsland && contract.boards[0]?.rating?.trim()
        ? [{ rating: contract.boards[0].rating.trim(), count: contract.totalBoards }]
        : getRoadsideBoardRatingCounts(contract.boards);
      return [{ kind: "contract" as const, id: `contract-${contract.id}`, contract, alert, alertText, ratingCounts }];
    });
    const boards = signages.map((signage): SignageFeedItem => signage.type === "store"
      ? { kind: "store-board", id: `store-${signage.id}`, signage }
      : { kind: "signage", id: `signage-${signage.id}`, signage });
    return [...contracts, ...boards];
  }, [roadContracts, roadReminderDays, signages]);

  const standFeed = useMemo<StandFeedItem[]>(() => [
    ...advertisingVehicles.map((vehicle) => ({ kind: "vehicle" as const, id: `vehicle-${vehicle.id}`, vehicle })),
    ...shelves.map((shelf) => ({ kind: "shelf" as const, id: `shelf-${shelf.id}`, shelf, totalShelves: shelf.brandAllocations.reduce((sum, allocation) => sum + allocation.shelfCount, 0) })),
    ...stands.map((stand) => ({ kind: "stand" as const, id: `stand-${stand.id}`, stand })),
  ], [advertisingVehicles, shelves, stands]);

  const signageNotifications = useMemo<SignageNotification[]>(() => roadContracts.flatMap((contract) => {
    const alert = getRoadsideContractAlert(contract, new Date(), roadReminderDays);
    if (alert.state === "safe") return [];
    const typeLabel = contract.type === "wall" ? "اللوحة الجدارية" : contract.type === "island" ? "عقد المنصفات" : "عقد اللوحات الطرقية";
    return [{ id: `contract-alert-${contract.id}`, kind: "contract" as const, tone: alert.state === "expired" ? "error" as const : "warning" as const, title: alert.state === "expired" ? `انتهت ${typeLabel}` : `${typeLabel} يقترب من النهاية`, description: alert.state === "expired" ? `${contract.name} يحتاج إجراءً` : `${contract.name} ينتهي خلال ${alert.daysRemaining} يوم`, contract }];
  }), [roadContracts, roadReminderDays]);

  const standNotifications = useMemo<SignageNotification[]>(() => stands.flatMap((stand) => {
    if (stand.condition === "good") return [];
    const needsRepair = stand.condition === "needs_repair";
    return [{ id: `stand-alert-${stand.id}`, kind: "stand" as const, tone: needsRepair ? "warning" as const : "error" as const, title: needsRepair ? "ستاند يحتاج إصلاحاً" : "ستاند بحالة تالفة", description: `${stand.storeName || "ستاند"} · ${stand.brand || "ماركة غير محددة"}`, stand }];
  }), [stands]);

  const visibleNotifications = notificationsOpen === "signage" ? signageNotifications : standNotifications;

  const openNotificationDetails = (notification: SignageNotification) => {
    setNotificationsOpen(null);
    if (notification.kind === "contract") {
      router.push({ pathname: "/roadside-contract-details", params: { id: notification.contract.id } } as any);
      return;
    }
    setSelectedStand(notification.stand);
    setActiveTab("stands");
    setShowDetails(true);
  };

  const renderSignageFeedItem = useCallback(({ item }: { item: SignageFeedItem }) => {
    if (item.kind === "contract-alert") {
      const alertColor = item.alert.state === "expired" ? colors.error : colors.warning;
      return <TouchableOpacity onPress={() => router.push({ pathname: "/roadside-contract-details", params: { id: item.contract.id } } as any)} style={[styles.contractAlert, { backgroundColor: alertColor + "10", borderColor: alertColor + "4D" }]}><MaterialIcons name="notifications-active" size={19} color={alertColor} /><View style={styles.contractAlertCopy}><Text style={[styles.contractAlertTitle, { color: alertColor }]}>{item.alert.state === "expired" ? `انتهت ${item.typeLabel}` : `${item.typeLabel} تقترب من النهاية`}</Text><Text style={[styles.contractAlertText, { color: colors.foreground }]}>{item.contract.name} — اضغط لعرض التفاصيل</Text></View></TouchableOpacity>;
    }
    if (item.kind === "contract") {
      const { contract, alert, alertText, ratingCounts } = item;
      const alertColor = alert.state === "expired" ? colors.error : alert.state === "upcoming" ? colors.warning : colors.success;
      const isWall = contract.type === "wall";
      const isIsland = contract.type === "island";
      return <TouchableOpacity onPress={() => router.push({ pathname: "/roadside-contract-details", params: { id: contract.id } } as any)} onLongPress={() => { setSelectedRoadContract(contract); setRoadActionsOpen(true); }} delayLongPress={350} style={[styles.roadContractCard, { backgroundColor: colors.surface, borderColor: alert.state === "safe" ? colors.border : alertColor + "80" }]}><View style={[styles.roadContractIcon, { backgroundColor: colors.primary + "14" }]}><MaterialIcons name={isWall ? "crop-landscape" : isIsland ? "location-city" : "directions"} size={28} color={colors.primary} /></View><View style={styles.roadContractCopy}><View style={styles.roadContractTitleRow}><View style={[styles.contractStatus, { backgroundColor: alertColor + "16" }]}><View style={[styles.statusDot, { backgroundColor: alertColor }]} /><Text style={[styles.contractStatusText, { color: alertColor }]}>{alertText}</Text></View><Text style={[styles.roadContractTitle, { color: colors.foreground }]}>{contract.name}</Text></View><Text style={[styles.roadContractMeta, { color: colors.muted }]}>{isWall ? `لوحة جدارية · ${contract.ownerCompany}${contract.responsiblePhone ? ` · ${contract.responsiblePhone}` : ""}` : isIsland ? `${contract.totalBoards} منصف مستأجر · ${contract.boards[0]?.linkedRegions?.join(" ← ") || contract.boards[0]?.region || "—"}` : `${contract.totalBoards} لوحة مستأجرة`} · {contract.startDate} ← {contract.endDate}</Text>{ratingCounts.length ? <Text style={[styles.roadContractRatings, { color: colors.primary }]}>التقييمات: {ratingCounts.map((rating) => `${rating.rating}: ${rating.count}`).join(" · ")}</Text> : null}<Text style={[styles.roadContractHint, { color: colors.muted }]}>اضغط مطولاً للتعديل أو التجديد أو الإلغاء</Text></View></TouchableOpacity>;
    }
    const signage = item.signage;
    if (item.kind === "store-board") {
      const imageUri = signage.frontImageUri || signage.imageUri;
      return <TouchableOpacity onPress={() => { setSelectedSignage(signage); setActiveTab("signage"); setShowDetails(true); }} onLongPress={() => { setSelectedSignage(signage); setStoreBoardActionsOpen(true); }} delayLongPress={350} style={[styles.roadContractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.roadContractIcon, { backgroundColor: colors.primary + "14", overflow: "hidden" }]}>{imageUri ? <ExpoImage source={imageUri} style={styles.storeBoardThumb} contentFit="cover" cachePolicy="memory-disk" transition={0} recyclingKey={imageUri} /> : <MaterialIcons name="store" size={27} color={colors.primary} />}</View><View style={styles.roadContractCopy}><View style={styles.roadContractTitleRow}><View style={[styles.contractStatus, { backgroundColor: colors.primary + "16" }]}><View style={[styles.statusDot, { backgroundColor: colors.primary }]} /><Text style={[styles.contractStatusText, { color: colors.primary }]}>لوحة محل</Text></View><Text style={[styles.roadContractTitle, { color: colors.foreground }]} numberOfLines={1}>{signage.storeName || "لوحة محل"}</Text></View><Text style={[styles.roadContractMeta, { color: colors.muted }]}>{signage.region || "منطقة غير محددة"} · {signage.installDate}</Text><Text style={[styles.roadContractRatings, { color: colors.primary }]}>الماركة: {signage.frontBrand || signage.brand || "غير محددة"}{signage.rating ? ` · التقييم: ${signage.rating}` : ""}</Text><Text style={[styles.roadContractHint, { color: colors.muted }]}>اضغط لعرض التفاصيل أو اضغط مطولاً لتجديد الماركة</Text></View></TouchableOpacity>;
    }
    const typeInfo = getTypeInfo(signage.type);
    return <TouchableOpacity onPress={() => { setSelectedSignage(signage); setActiveTab("signage"); setShowDetails(true); }} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{signage.imageUri ? <View style={styles.cardImageContainer}><ExpoImage source={signage.imageUri} style={styles.cardImage} contentFit="cover" cachePolicy="memory-disk" transition={0} recyclingKey={signage.imageUri} /><View style={[styles.cardImageOverlay, { backgroundColor: typeInfo.color }]} /></View> : <View style={[styles.cardImagePlaceholder, { backgroundColor: typeInfo.color }]}><MaterialIcons name={typeInfo.icon} size={40} color="#fff" /></View>}<View style={styles.cardContent}><View style={{ flex: 1 }}><View style={styles.cardTitleRow}><MaterialIcons name="label" size={14} color={colors.primary} style={{ marginRight: 6 }} /><Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{signage.storeName || signage.responsible || signage.address || "لوحة"}</Text></View><View style={styles.cardMetaRow}><MaterialIcons name={typeInfo.icon} size={12} color={colors.muted} style={{ marginRight: 4 }} /><Text style={[styles.cardMeta, { color: colors.muted }]} numberOfLines={1}>{typeInfo.label}</Text></View>{signage.brand && <View style={styles.cardMetaRow}><MaterialIcons name="business" size={12} color={colors.muted} style={{ marginRight: 4 }} /><Text style={[styles.cardMeta, { color: colors.muted }]} numberOfLines={1}>{signage.brand}</Text></View>}<View style={styles.cardMetaRow}><MaterialIcons name="calendar-today" size={12} color={colors.muted} style={{ marginRight: 4 }} /><Text style={[styles.cardDate, { color: colors.muted }]}>{signage.installDate}</Text></View></View><View style={[styles.typeTag, { backgroundColor: typeInfo.color }]}><MaterialIcons name={typeInfo.icon} size={16} color="#fff" /></View></View></TouchableOpacity>;
  }, [colors, getTypeInfo]);

  const renderStandFeedItem = useCallback(({ item }: { item: StandFeedItem }) => {
    if (item.kind === "shelf") {
      const { shelf, totalShelves } = item;
      return <TouchableOpacity onPress={() => router.push(`/shelf-details?id=${encodeURIComponent(shelf.id)}` as never)} onLongPress={() => { setSelectedShelf(shelf); setShelfActionsOpen(true); }} delayLongPress={350} style={[styles.roadContractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.roadContractIcon, { backgroundColor: colors.primary + "14", overflow: "hidden" }]}>{shelf.imageUri ? <ExpoImage source={shelf.imageUri} style={styles.storeBoardThumb} contentFit="cover" cachePolicy="memory-disk" transition={0} recyclingKey={shelf.imageUri} /> : <MaterialIcons name="view-quilt" size={27} color={colors.primary} />}</View><View style={styles.roadContractCopy}><View style={styles.roadContractTitleRow}><View style={[styles.contractStatus, { backgroundColor: colors.primary + "16" }]}><View style={[styles.statusDot, { backgroundColor: colors.primary }]} /><Text style={[styles.contractStatusText, { color: colors.primary }]}>أرفف</Text></View><Text style={[styles.roadContractTitle, { color: colors.foreground }]} numberOfLines={1}>{shelf.storeName}</Text></View><Text style={[styles.roadContractMeta, { color: colors.muted }]}>{shelf.region || "منطقة غير محددة"} · {shelf.installDate}</Text><Text style={[styles.roadContractRatings, { color: colors.primary }]}>{shelf.brandAllocations.length} ماركات · {totalShelves} رفوف</Text><Text style={[styles.roadContractHint, { color: colors.muted }]}>اضغط للتفاصيل · ضغط مطوّل للإجراءات</Text></View></TouchableOpacity>;
    }
    if (item.kind === "vehicle") {
      const { vehicle } = item;
      const preview = vehicle.images.right || vehicle.images.left || vehicle.images.front || vehicle.images.back;
      return <TouchableOpacity onPress={() => router.push(`/advertising-vehicle-details?id=${encodeURIComponent(vehicle.id)}` as never)} onLongPress={() => { setSelectedVehicle(vehicle); setVehicleActionsOpen(true); }} delayLongPress={350} style={[styles.roadContractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.roadContractIcon, { backgroundColor: colors.primary + "14", overflow: "hidden" }]}>{preview ? <ExpoImage source={preview} style={styles.storeBoardThumb} contentFit="cover" cachePolicy="memory-disk" transition={0} recyclingKey={preview} /> : <MaterialIcons name="directions-car" size={27} color={colors.primary} />}</View><View style={styles.roadContractCopy}><View style={styles.roadContractTitleRow}><View style={[styles.contractStatus, { backgroundColor: colors.primary + "16" }]}><View style={[styles.statusDot, { backgroundColor: colors.primary }]} /><Text style={[styles.contractStatusText, { color: colors.primary }]}>سيارة معلنة</Text></View><Text style={[styles.roadContractTitle, { color: colors.foreground }]} numberOfLines={1}>{vehicle.vehicleNumber}</Text></View><Text style={[styles.roadContractMeta, { color: colors.muted }]}>{vehicle.installDate}</Text><Text style={[styles.roadContractRatings, { color: colors.primary }]}>الماركة: {vehicle.brand}</Text><Text style={[styles.roadContractHint, { color: colors.muted }]}>اضغط للتفاصيل · ضغط مطوّل للإجراءات</Text></View></TouchableOpacity>;
    }
    const { stand } = item;
    const condition = STAND_CONDITIONS.find((option) => option.value === stand.condition) || STAND_CONDITIONS[0];
    return <TouchableOpacity onPress={() => { setSelectedStand(stand); setActiveTab("stands"); setShowDetails(true); }} onLongPress={() => { setSelectedStand(stand); setStandActionsOpen(true); }} delayLongPress={350} style={[styles.roadContractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.roadContractIcon, { backgroundColor: condition.color + "16", overflow: "hidden" }]}>{stand.imageUri ? <ExpoImage source={stand.imageUri} style={styles.storeBoardThumb} contentFit="cover" cachePolicy="memory-disk" transition={0} recyclingKey={stand.imageUri} /> : <MaterialIcons name="location-city" size={27} color={condition.color} />}</View><View style={styles.roadContractCopy}><View style={styles.roadContractTitleRow}><View style={[styles.contractStatus, { backgroundColor: condition.color + "16" }]}><View style={[styles.statusDot, { backgroundColor: condition.color }]} /><Text style={[styles.contractStatusText, { color: condition.color }]}>{condition.label}</Text></View><Text style={[styles.roadContractTitle, { color: colors.foreground }]} numberOfLines={1}>{stand.storeName || "ستاند"}</Text></View><Text style={[styles.roadContractMeta, { color: colors.muted }]}>{stand.installDate}</Text><Text style={[styles.roadContractRatings, { color: colors.primary }]}>الماركة: {stand.brand || "غير محددة"}</Text><Text style={[styles.roadContractHint, { color: colors.muted }]}>اضغط للتفاصيل · ضغط مطوّل للإجراءات</Text></View></TouchableOpacity>;
  }, [colors]);

  const hasAnyBoard = signageFeed.length > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "stands" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("stands")}
        >
          <Text style={[styles.tabText, { color: activeTab === "stands" ? colors.primary : colors.muted }]}>
            الستاندات ({stands.length + shelves.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "signage" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("signage")}
        >
          <Text style={[styles.tabText, { color: activeTab === "signage" ? colors.primary : colors.muted }]}> 
            اللوحات ({signages.length + roadContracts.length})
          </Text>
        </TouchableOpacity>
        {(() => {
          const notifications = activeTab === "stands" ? standNotifications : signageNotifications;
          const tint = notifications.some((notification) => notification.tone === "error") ? colors.error : colors.warning;
          return <TouchableOpacity accessibilityRole="button" accessibilityLabel="عرض التنبيهات" onPress={() => setNotificationsOpen(activeTab === "stands" ? "stands" : "signage")} style={[styles.notificationButton, { backgroundColor: notifications.length ? tint + "14" : colors.background, borderColor: notifications.length ? tint + "55" : colors.border }]}><MaterialIcons name={notifications.length ? "notifications-active" : "notifications-none"} size={21} color={notifications.length ? tint : colors.muted} />{notifications.length ? <View style={[styles.notificationBadge, { backgroundColor: tint }]}><Text style={styles.notificationBadgeText}>{notifications.length > 99 ? "99+" : notifications.length}</Text></View> : null}</TouchableOpacity>;
        })()}
      </View>

      {activeTab === "signage" ? (
        <>
          <FlatList
            data={signageFeed}
            keyExtractor={(item) => item.id}
            renderItem={renderSignageFeedItem}
            contentContainerStyle={styles.list}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            updateCellsBatchingPeriod={50}
            windowSize={7}
            removeClippedSubviews
            ListEmptyComponent={hasAnyBoard ? null : <View style={styles.empty}><MaterialIcons name="crop-landscape" size={48} color={colors.muted} /><Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد لوحات</Text></View>}
          />
          {false && (
        <FlatList
          data={signages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={roadContracts.length ? <View style={styles.contractsList}>{roadContracts.filter((contract) => getRoadsideContractAlert(contract, new Date(), roadReminderDays).state !== "safe").map((contract) => { const alert = getRoadsideContractAlert(contract, new Date(), roadReminderDays); const alertColor = alert.state === "expired" ? colors.error : colors.warning; const typeLabel = contract.type === "wall" ? "لوحة جدارية" : "عقد لوحات طرقية"; return <TouchableOpacity key={`alert-${contract.id}`} onPress={() => router.push({ pathname: "/roadside-contract-details", params: { id: contract.id } } as any)} style={[styles.contractAlert, { backgroundColor: alertColor + "10", borderColor: alertColor + "4D" }]}><MaterialIcons name="notifications-active" size={19} color={alertColor} /><View style={styles.contractAlertCopy}><Text style={[styles.contractAlertTitle, { color: alertColor }]}>{alert.state === "expired" ? `انتهت ${typeLabel}` : `${typeLabel} تقترب من النهاية`}</Text><Text style={[styles.contractAlertText, { color: colors.foreground }]}>{contract.name} — اضغط لعرض التفاصيل</Text></View></TouchableOpacity>; })}{roadContracts.map((contract) => {
            const alert = getRoadsideContractAlert(contract, new Date(), roadReminderDays);
            const alertColor = alert.state === "expired" ? colors.error : alert.state === "upcoming" ? colors.warning : colors.success;
            const isWall = contract.type === "wall";
            const isIsland = contract.type === "island";
            const ratingCounts = isIsland && contract.boards[0]?.rating?.trim() ? [{ rating: contract.boards[0].rating.trim(), count: contract.totalBoards }] : getRoadsideBoardRatingCounts(contract.boards);
            const alertText = alert.state === "expired" ? `${isWall ? "انتهت اللوحة" : isIsland ? "انتهى عقد المنصفات" : "انتهى العقد"} — اضغط مطولاً للتجديد أو الإلغاء` : alert.state === "upcoming" ? `ينتهي خلال ${alert.daysRemaining} يوم` : `ساري حتى ${contract.endDate}`;
            return <TouchableOpacity key={contract.id} onPress={() => router.push({ pathname: "/roadside-contract-details", params: { id: contract.id } } as any)} onLongPress={() => { setSelectedRoadContract(contract); setRoadActionsOpen(true); }} delayLongPress={350} style={[styles.roadContractCard, { backgroundColor: colors.surface, borderColor: alert.state === "safe" ? colors.border : alertColor + "80" }]}> 
              <View style={[styles.roadContractIcon, { backgroundColor: colors.primary + "14" }]}><MaterialIcons name={isWall ? "crop-landscape" : isIsland ? "location-city" : "directions"} size={28} color={colors.primary} /></View>
              <View style={styles.roadContractCopy}><View style={styles.roadContractTitleRow}><View style={[styles.contractStatus, { backgroundColor: alertColor + "16" }]}><View style={[styles.statusDot, { backgroundColor: alertColor }]} /><Text style={[styles.contractStatusText, { color: alertColor }]}>{alertText}</Text></View><Text style={[styles.roadContractTitle, { color: colors.foreground }]}>{contract.name}</Text></View><Text style={[styles.roadContractMeta, { color: colors.muted }]}>{isWall ? `لوحة جدارية · ${contract.ownerCompany}${contract.responsiblePhone ? ` · ${contract.responsiblePhone}` : ""}` : isIsland ? `${contract.totalBoards} منصف مستأجر · ${contract.boards[0]?.linkedRegions?.join(" ← ") || contract.boards[0]?.region || "—"}` : `${contract.totalBoards} لوحة مستأجرة`} · {contract.startDate} ← {contract.endDate}</Text>{ratingCounts.length ? <Text style={[styles.roadContractRatings, { color: colors.primary }]}>التقييمات: {ratingCounts.map((item) => `${item.rating}: ${item.count}`).join(" · ")}</Text> : null}<Text style={[styles.roadContractHint, { color: colors.muted }]}>اضغط مطولاً للتعديل أو التجديد أو الإلغاء</Text></View>
            </TouchableOpacity>;
          })}</View> : null}
          renderItem={({ item }) => item.type === "store" ? (
            <TouchableOpacity
              onPress={() => { setSelectedSignage(item); setActiveTab("signage"); setShowDetails(true); }}
              onLongPress={() => { setSelectedSignage(item); setStoreBoardActionsOpen(true); }}
              delayLongPress={350}
              style={[styles.roadContractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.roadContractIcon, { backgroundColor: colors.primary + "14", overflow: "hidden" }]}>
                {item.frontImageUri || item.imageUri ? <Image source={{ uri: item.frontImageUri || item.imageUri }} style={styles.storeBoardThumb} /> : <MaterialIcons name="store" size={27} color={colors.primary} />}
              </View>
              <View style={styles.roadContractCopy}>
                <View style={styles.roadContractTitleRow}>
                  <View style={[styles.contractStatus, { backgroundColor: colors.primary + "16" }]}><View style={[styles.statusDot, { backgroundColor: colors.primary }]} /><Text style={[styles.contractStatusText, { color: colors.primary }]}>لوحة محل</Text></View>
                  <Text style={[styles.roadContractTitle, { color: colors.foreground }]} numberOfLines={1}>{item.storeName || "لوحة محل"}</Text>
                </View>
                <Text style={[styles.roadContractMeta, { color: colors.muted }]}>{item.region || "منطقة غير محددة"} · {item.installDate}</Text>
                <Text style={[styles.roadContractRatings, { color: colors.primary }]}>الماركة: {item.frontBrand || item.brand || "غير محددة"}{item.rating ? ` · التقييم: ${item.rating}` : ""}</Text>
                <Text style={[styles.roadContractHint, { color: colors.muted }]}>اضغط لعرض التفاصيل أو اضغط مطولاً لتجديد الماركة</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setSelectedSignage(item);
                setActiveTab("signage");
                setShowDetails(true);
              }}
              onLongPress={() => {
                if (item.type !== "store") return;
                setSelectedSignage(item);
                setStoreBoardActionsOpen(true);
              }}
              delayLongPress={350}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {item.imageUri ? (
                <View style={styles.cardImageContainer}>
                  <Image source={{ uri: item.imageUri }} style={styles.cardImage} />
                  <View style={[styles.cardImageOverlay, { backgroundColor: getTypeInfo(item.type).color }]} />
                </View>
              ) : (
                <View style={[styles.cardImagePlaceholder, { backgroundColor: getTypeInfo(item.type).color }]}>
                  <MaterialIcons name={getTypeInfo(item.type).icon} size={40} color="#fff" />
                </View>
              )}
              <View style={styles.cardContent}>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTitleRow}>
                    <MaterialIcons name="label" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {item.storeName || item.responsible || item.address || "لوحة"}
                    </Text>
                  </View>
                  <View style={styles.cardMetaRow}>
                    <MaterialIcons name={getTypeInfo(item.type).icon} size={12} color={colors.muted} style={{ marginRight: 4 }} />
                    <Text style={[styles.cardMeta, { color: colors.muted }]} numberOfLines={1}>
                      {getTypeInfo(item.type).label}
                    </Text>
                  </View>
                  {item.brand && (
                    <View style={styles.cardMetaRow}>
                      <MaterialIcons name="business" size={12} color={colors.muted} style={{ marginRight: 4 }} />
                      <Text style={[styles.cardMeta, { color: colors.muted }]} numberOfLines={1}>
                        {item.brand}
                      </Text>
                    </View>
                  )}
                  <View style={styles.cardMetaRow}>
                    <MaterialIcons name="calendar-today" size={12} color={colors.muted} style={{ marginRight: 4 }} />
                    <Text style={[styles.cardDate, { color: colors.muted }]}>
                      {item.installDate}
                    </Text>
                  </View>
                </View>
                <View style={[styles.typeTag, { backgroundColor: getTypeInfo(item.type).color }]}>
                  <MaterialIcons name={getTypeInfo(item.type).icon} size={16} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={hasAnyBoard ? null : (
            <View style={styles.empty}>
              <MaterialIcons name="crop-landscape" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد لوحات</Text>
            </View>
          )}
        />
          )}
        </>
      ) : (
        <>
          <FlatList
            data={standFeed}
            keyExtractor={(item) => item.id}
            renderItem={renderStandFeedItem}
            contentContainerStyle={styles.list}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            updateCellsBatchingPeriod={50}
            windowSize={7}
            removeClippedSubviews
            ListEmptyComponent={standFeed.length ? null : <View style={styles.empty}><MaterialIcons name="location-city" size={48} color={colors.muted} /><Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد ستاندات</Text></View>}
          />
          {false && (
        <FlatList
          data={stands}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={shelves.length ? <View style={styles.contractsList}>{shelves.map((shelf) => {
            const totalShelves = shelf.brandAllocations.reduce((sum, allocation) => sum + allocation.shelfCount, 0);
            return <TouchableOpacity key={shelf.id} onPress={() => router.push(`/shelf-details?id=${encodeURIComponent(shelf.id)}` as never)} onLongPress={() => { setSelectedShelf(shelf); setShelfActionsOpen(true); }} delayLongPress={350} style={[styles.roadContractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.roadContractIcon, { backgroundColor: colors.primary + "14", overflow: "hidden" }]}>{shelf.imageUri ? <Image source={{ uri: shelf.imageUri }} style={styles.storeBoardThumb} /> : <MaterialIcons name="view-quilt" size={27} color={colors.primary} />}</View>
              <View style={styles.roadContractCopy}><View style={styles.roadContractTitleRow}><View style={[styles.contractStatus, { backgroundColor: colors.primary + "16" }]}><View style={[styles.statusDot, { backgroundColor: colors.primary }]} /><Text style={[styles.contractStatusText, { color: colors.primary }]}>أرفف</Text></View><Text style={[styles.roadContractTitle, { color: colors.foreground }]} numberOfLines={1}>{shelf.storeName}</Text></View><Text style={[styles.roadContractMeta, { color: colors.muted }]}>{shelf.region || "منطقة غير محددة"} · {shelf.installDate}</Text><Text style={[styles.roadContractRatings, { color: colors.primary }]}>{shelf.brandAllocations.length} ماركات · {totalShelves} رفوف</Text><Text style={[styles.roadContractHint, { color: colors.muted }]}>اضغط للتفاصيل · ضغط مطوّل للإجراءات</Text></View>
            </TouchableOpacity>;
          })}</View> : null}
          renderItem={({ item }) => {
            const condition = STAND_CONDITIONS.find((option) => option.value === item.condition) || STAND_CONDITIONS[0];
            return <TouchableOpacity onPress={() => { setSelectedStand(item); setActiveTab("stands"); setShowDetails(true); }} onLongPress={() => { setSelectedStand(item); setStandActionsOpen(true); }} delayLongPress={350} style={[styles.roadContractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.roadContractIcon, { backgroundColor: condition.color + "16", overflow: "hidden" }]}>{item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.storeBoardThumb} /> : <MaterialIcons name="location-city" size={27} color={condition.color} />}</View>
              <View style={styles.roadContractCopy}><View style={styles.roadContractTitleRow}><View style={[styles.contractStatus, { backgroundColor: condition.color + "16" }]}><View style={[styles.statusDot, { backgroundColor: condition.color }]} /><Text style={[styles.contractStatusText, { color: condition.color }]}>{condition.label}</Text></View><Text style={[styles.roadContractTitle, { color: colors.foreground }]} numberOfLines={1}>{item.storeName || "ستاند"}</Text></View><Text style={[styles.roadContractMeta, { color: colors.muted }]}>{item.installDate}</Text><Text style={[styles.roadContractRatings, { color: colors.primary }]}>الماركة: {item.brand || "غير محددة"}</Text><Text style={[styles.roadContractHint, { color: colors.muted }]}>اضغط للتفاصيل · ضغط مطوّل للإجراءات</Text></View>
            </TouchableOpacity>;
          }}
          ListEmptyComponent={shelves.length ? null : (
            <View style={styles.empty}>
              <MaterialIcons name="location-city" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد ستاندات</Text>
            </View>
          )}
        />
          )}
        </>
      )}

      <Modal transparent visible={notificationsOpen !== null} animationType="fade" onRequestClose={() => setNotificationsOpen(null)}>
        <View style={styles.notificationOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setNotificationsOpen(null)} />
          <View style={[styles.notificationSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.notificationHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setNotificationsOpen(null)} style={[styles.notificationClose, { backgroundColor: colors.background }]}><MaterialIcons name="close" size={19} color={colors.foreground} /></TouchableOpacity>
              <View style={styles.notificationHeaderCopy}><Text style={[styles.notificationTitle, { color: colors.foreground }]}>تنبيهات {notificationsOpen === "stands" ? "الستاندات" : "اللوحات"}</Text><Text style={[styles.notificationHint, { color: colors.muted }]}>اضغط على التنبيه لفتح التفاصيل</Text></View>
            </View>
            <FlatList data={visibleNotifications} keyExtractor={(item) => item.id} contentContainerStyle={styles.notificationList} renderItem={({ item }) => { const tint = item.tone === "error" ? colors.error : colors.warning; return <TouchableOpacity onPress={() => openNotificationDetails(item)} style={[styles.notificationItem, { borderColor: tint + "44", backgroundColor: tint + "0D" }]}><View style={[styles.notificationIcon, { backgroundColor: tint + "18" }]}><MaterialIcons name={item.tone === "error" ? "error-outline" : "warning-amber"} size={20} color={tint} /></View><View style={styles.notificationCopy}><Text style={[styles.notificationItemTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.notificationItemDescription, { color: colors.muted }]} numberOfLines={2}>{item.description}</Text></View><MaterialIcons name="chevron-left" size={21} color={colors.muted} /></TouchableOpacity>; }} ListEmptyComponent={<View style={styles.notificationEmpty}><MaterialIcons name="notifications-none" size={36} color={colors.muted} /><Text style={[styles.notificationEmptyText, { color: colors.muted }]}>لا توجد تنبيهات حالياً</Text></View>} />
          </View>
        </View>
      </Modal>

      {/* Main Modal */}
      <FloatingFormModal visible={showModal} onClose={() => setShowModal(false)} backgroundColor={colors.background}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAvoidingView behavior={getKeyboardAvoidingBehavior(Platform.OS)} style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={[styles.modal, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <MaterialIcons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {activeTab === "details" ? "تفاصيل اللوحات والستاندات" : activeTab === "signage" ? "لوحة جديدة" : "ستاند جديد"}
                </Text>
                <View style={{ width: 24 }} />
              </View>

              {activeTab === "details" ? (
                renderDetailsTab()
              ) : activeTab === "signage" ? renderSignageFields() : (
                <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="always" keyboardDismissMode="none" nestedScrollEnabled>
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.foreground }]}>تاريخ التركيب</Text>
                    <TouchableOpacity onPress={() => setDateTarget("stand-install")} style={[styles.formInput, styles.datePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
                      <Text style={[styles.datePickerText, { color: standForm.installDate ? colors.foreground : colors.muted }]}>{standForm.installDate || "اختر تاريخ التركيب"}</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Store Selection */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.foreground }]}>اختر محل *</Text>
                    <View style={[styles.dropdown, { borderColor: colors.border }]}>
                      <TouchableOpacity
                        style={[styles.dropdownButton, { backgroundColor: colors.surface }]}
                        onPress={() => setShowStandStoreDropdown(!showStandStoreDropdown)}
                      >
                        <MaterialIcons name={showStandStoreDropdown ? "expand-less" : "expand-more"} size={20} color={colors.muted} />
                        <Text style={[styles.dropdownText, { color: standForm.storeId ? colors.foreground : colors.muted }]}>
                          {standForm.storeName || "اختر محل"}
                        </Text>
                      </TouchableOpacity>
                      {showStandStoreDropdown && (
                        <ScrollView style={[styles.dropdownMenu, { borderTopColor: colors.border, maxHeight: 200 }]} nestedScrollEnabled={true}>
                          {stores.map((store) => (
                            <TouchableOpacity
                              key={store.id}
                              style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                              onPress={() => {
                                setStandForm((f) => ({ ...f, storeId: store.id, storeName: store.name }));
                                setShowStandStoreDropdown(false);
                              }}
                            >
                              <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{store.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </View>

                  {/* Brand Selection */}
                  <View style={styles.formGroup}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <TouchableOpacity onPress={() => setShowBrandModal(true)}>
                        <MaterialIcons name="add-circle" size={20} color={colors.primary} />
                      </TouchableOpacity>
                      <Text style={[styles.formLabel, { color: colors.foreground, marginBottom: 0 }]}>اختر ماركة</Text>
                    </View>
                    <View style={[styles.dropdown, { borderColor: colors.border }]}>
                      <TouchableOpacity
                        style={[styles.dropdownButton, { backgroundColor: colors.surface }]}
                        onPress={() => setShowStandBrandDropdown(!showStandBrandDropdown)}
                      >
                        <MaterialIcons name={showStandBrandDropdown ? "expand-less" : "expand-more"} size={20} color={colors.muted} />
                        <Text style={[styles.dropdownText, { color: standForm.brand ? colors.foreground : colors.muted }]}>
                          {standForm.brand || "اختر ماركة"}
                        </Text>
                      </TouchableOpacity>
                      {showStandBrandDropdown && (
                        <ScrollView style={[styles.dropdownMenu, { borderTopColor: colors.border, maxHeight: 200 }]} nestedScrollEnabled={true}>
                          {brands.map((brand) => (
                            <TouchableOpacity
                              key={brand}
                              style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                              onPress={() => {
                                setStandForm((f) => ({ ...f, brand }));
                                setShowStandBrandDropdown(false);
                              }}
                            >
                              <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{brand}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </View>

                  {/* Condition */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.foreground }]}>الحالة</Text>
                    <View style={styles.condOptions}>
                      {STAND_CONDITIONS.map((c) => (
                        <TouchableOpacity
                          key={c.value}
                          style={[styles.condOption, standForm.condition === c.value && { backgroundColor: c.color }]}
                          onPress={() => setStandForm((f) => ({ ...f, condition: c.value as Stand["condition"] }))}
                        >
                          <Text style={[styles.condOptionText, { color: standForm.condition === c.value ? "#fff" : colors.muted }]}>{c.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Image Upload */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.foreground }]}>اختياري - الصورة</Text>
                    <TouchableOpacity onPress={() => setMediaTarget("stand")} style={[styles.imageButton, { borderColor: colors.primary, backgroundColor: colors.primary + "12" }]}>
                      <MaterialIcons name="add-photo-alternate" size={20} color={colors.primary} />
                      <Text style={[styles.imageButtonText, { color: colors.primary }]}>{standForm.imageUri ? "تغيير الصورة" : "إضافة صورة"}</Text>
                    </TouchableOpacity>
                    {standForm.imageUri && <Image source={{ uri: standForm.imageUri }} style={styles.imagePreview} />}
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.foreground }]}>ملاحظات</Text>
                    <TextInput
                      style={[styles.formInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                      value={standForm.notes}
                      onChangeText={(v) => setStandForm((f) => ({ ...f, notes: v }))}
                      placeholder="ملاحظات..."
                      placeholderTextColor={colors.muted}
                      multiline
                      numberOfLines={3}
                      textAlign="right"
                      textAlignVertical="top"
                    />
                  </View>
                </ScrollView>
              )}



              <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                <TouchableOpacity onPress={() => setShowModal(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>إغلاق</Text>
                </TouchableOpacity>
                {activeTab !== "details" && (
                  <TouchableOpacity
                    onPress={activeTab === "signage" ? handleSaveSignage : handleSaveStand}
                    style={[styles.saveBtnBottom, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.saveBtnText}>حفظ</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </FloatingFormModal>
      <DateRangePickerModal
        visible={dateTarget !== null}
        startDate={fromIsoDate(dateTarget === "stand-install" ? standForm.installDate : dateTarget === "contract-end" ? signageForm.contractEndDate : signageForm.installDate)}
        endDate={fromIsoDate(dateTarget === "stand-install" ? standForm.installDate : dateTarget === "contract-end" ? signageForm.contractEndDate : signageForm.installDate)}
        selectionMode="single"
        title={dateTarget === "contract-end" ? "تاريخ نهاية العقد" : "تاريخ التركيب"}
        onCancel={() => setDateTarget(null)}
        onConfirm={(date) => {
          const value = toIsoDate(date);
          if (dateTarget === "stand-install") setStandForm((current) => ({ ...current, installDate: value }));
          else if (dateTarget === "contract-end") setSignageForm((current) => ({ ...current, contractEndDate: value }));
          else setSignageForm((current) => ({ ...current, installDate: value }));
          setDateTarget(null);
        }}
      />
      <MediaSourcePickerModal
        visible={mediaTarget !== null}
        title={mediaTarget === "stand" ? "إضافة صورة الستاند" : "إضافة صورة اللوحة"}
        description="اختر تصوير صورة جديدة أو اختيار صورة من المعرض"
        onClose={() => setMediaTarget(null)}
        onCamera={() => { if (mediaTarget === "stand") pickStandImage("camera"); else pickSignageImage("camera"); }}
        onLibrary={() => { if (mediaTarget === "stand") pickStandImage("library"); else pickSignageImage("library"); }}
      />

      {/* Brand Modal */}
      <FloatingFormModal visible={showBrandModal} onClose={() => { setShowBrandModal(false); setNewBrand(""); }} backgroundColor={colors.background}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView behavior={getKeyboardAvoidingBehavior(Platform.OS)} style={{ flex: 1 }}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => { setShowBrandModal(false); setNewBrand(""); }}>
                <MaterialIcons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>إضافة ماركة جديدة</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="always" keyboardDismissMode="none" nestedScrollEnabled>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>اسم الماركة *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  value={newBrand}
                  onChangeText={setNewBrand}
                  placeholder="أدخل اسم الماركة"
                  placeholderTextColor={colors.muted}
                  textAlign="right"
                />
              </View>
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
              <TouchableOpacity onPress={() => { setShowBrandModal(false); setNewBrand(""); }} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addBrand} style={[styles.saveBtnBottom, { backgroundColor: colors.primary }]}>
                <Text style={styles.saveBtnText}>إضافة</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </FloatingFormModal>

      {/* Success Modal */}
      <SuccessModal
        visible={successMessage.visible}
        message={successMessage.message}
        onClose={() => setSuccessMessage({ visible: false, message: "" })}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        visible={showDeleteModal}
        title="حذف العنصر"
        message={deleteTarget?.type === "signage" ? "هل تريد حذف هذه اللوحة؟ لا يمكن التراجع عن هذا الإجراء." : deleteTarget?.type === "stands" ? "هل تريد حذف هذا الستاند؟ لا يمكن التراجع عن هذا الإجراء." : "هل تريد حذف هذه الأرفف؟ لا يمكن التراجع عن هذا الإجراء."}
        confirmText="حذف"
        isDangerous
        icon="warning"
        onConfirm={() => void confirmAssetDelete()}
        onCancel={() => setShowDeleteModal(false)}
      />
      <ConfirmDialog
        visible={Boolean(brandPendingDelete)}
        title="حذف الماركة"
        message={brandPendingDelete ? `هل تريد حذف «${brandPendingDelete}»؟ لا يمكن التراجع عن ذلك.` : ""}
        confirmText="حذف"
        isDangerous
        icon="warning"
        onCancel={() => setBrandPendingDelete(null)}
        onConfirm={() => void confirmDeleteBrand()}
      />

      <SignageDetailsSheet
        visible={showDetails}
        kind={activeTab === "stands" ? "stand" : "signage"}
        signage={selectedSignage}
        stand={selectedStand}
        onClose={() => setShowDetails(false)}
        onEdit={() => {
          if (activeTab === "signage" && selectedSignage) {
            if (selectedSignage.type === "store") {
              setShowDetails(false);
              openStoreBoardWizard("edit", selectedSignage);
              return;
            }
            setSignageForm({ ...selectedSignage, storeId: selectedSignage.storeId || "" });
          } else if (activeTab === "stands" && selectedStand) {
            setShowDetails(false);
            openStandWizard("edit", selectedStand);
            return;
          }
          setShowDetails(false);
          setShowModal(true);
        }}
        onDelete={() => {
          setDeleteTarget({ type: activeTab === "stands" ? "stands" : "signage" });
          setShowDeleteModal(true);
        }}
      />
      <CardActionModal
        visible={standActionsOpen}
        title={selectedStand?.storeName || "إجراءات الستاند"}
        description="يمكنك تعديل بيانات الستاند أو حذفه نهائياً"
        onClose={() => setStandActionsOpen(false)}
        actions={[
          ...(canEdit ? [{ id: "edit-stand", label: "تعديل الستاند", icon: "edit" as const, onPress: () => { const stand = selectedStand; setStandActionsOpen(false); if (stand) openStandWizard("edit", stand); } }] : []),
          ...(canDelete ? [{ id: "delete-stand", label: "حذف الستاند", icon: "delete-outline" as const, tone: "danger" as const, onPress: () => { setStandActionsOpen(false); setDeleteTarget({ type: "stands" }); setShowDeleteModal(true); } }] : []),
        ]}
      />
      <CardActionModal
        visible={shelfActionsOpen}
        title={selectedShelf?.storeName || "إجراءات الأرفف"}
        description="يمكنك تعديل توزيع الأرفف أو حذفه نهائياً"
        onClose={() => setShelfActionsOpen(false)}
        actions={[
          ...(canEdit ? [{ id: "edit-shelf", label: "تعديل الأرفف", icon: "edit" as const, onPress: () => { const shelf = selectedShelf; setShelfActionsOpen(false); if (shelf) openShelfWizard("edit", shelf); } }] : []),
          ...(canDelete ? [{ id: "delete-shelf", label: "حذف الأرفف", icon: "delete-outline" as const, tone: "danger" as const, onPress: () => { setShelfActionsOpen(false); setDeleteTarget({ type: "shelves" }); setShowDeleteModal(true); } }] : []),
        ]}
      />

      {/* التفاصيل السابقة معطلة؛ استُبدلت بورقة التفاصيل الموحدة أعلاه. */}
      <Modal visible={false} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDetails(false)}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.detailsContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.detailsHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.detailsTitle, { color: colors.foreground }]}>
                {activeTab === "signage" ? "تفاصيل اللوحة" : "تفاصيل الستاند"}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity onPress={() => {
                  if (activeTab === "signage" && selectedSignage) {
                    setSignageForm({ ...selectedSignage, storeId: selectedSignage.storeId || "" });
                  } else if (activeTab === "stands" && selectedStand) {
                    setStandForm({ ...selectedStand, storeId: selectedStand.storeId || "" });
                  }
                  setShowDetails(false);
                  setShowModal(true);
                }}>
                  <MaterialIcons name="edit" size={24} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  setDeleteTarget({ type: activeTab as "signage" | "stands" });
                  setShowDeleteModal(true);
                }}>
                  <MaterialIcons name="delete" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.detailsContent}>
              {activeTab === "signage" && selectedSignage ? (
                <>
                  {selectedSignage.imageUri && (
                    <Image source={{ uri: selectedSignage.imageUri }} style={styles.detailsImage} />
                  )}
                  <View style={styles.detailsInfo}>
                    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.infoLabel, { color: colors.muted }]}>النوع</Text>
                      <Text style={[styles.infoValue, { color: colors.foreground }]}>{getTypeInfo(selectedSignage.type).label}</Text>
                    </View>
                    {selectedSignage.storeName && (
                      <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.infoLabel, { color: colors.muted }]}>المحل</Text>
                        <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedSignage.storeName}</Text>
                      </View>
                    )}
                    {selectedSignage.region && (
                      <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.infoLabel, { color: colors.muted }]}>المنطقة</Text>
                        <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedSignage.region}</Text>
                      </View>
                    )}
                    {selectedSignage.address && (
                      <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.infoLabel, { color: colors.muted }]}>العنوان</Text>
                        <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedSignage.address}</Text>
                      </View>
                    )}
                    {selectedSignage.responsible && (
                      <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.infoLabel, { color: colors.muted }]}>المسؤول</Text>
                        <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedSignage.responsible}</Text>
                      </View>
                    )}
                    {selectedSignage.brand && (
                      <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.infoLabel, { color: colors.muted }]}>الماركة</Text>
                        <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedSignage.brand}</Text>
                      </View>
                    )}
                    {selectedSignage.islandCount && (
                      <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.infoLabel, { color: colors.muted }]}>عدد اللواحات</Text>
                        <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedSignage.islandCount}</Text>
                      </View>
                    )}
                    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.infoLabel, { color: colors.muted }]}>تاريخ التركيب</Text>
                      <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedSignage.installDate}</Text>
                    </View>
                    {selectedSignage.contractEndDate && (
                      <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.infoLabel, { color: colors.muted }]}>تاريخ نهاية العقد</Text>
                        <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedSignage.contractEndDate}</Text>
                      </View>
                    )}
                    {selectedSignage.notes && (
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.muted }]}>ملاحظات</Text>
                        <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedSignage.notes}</Text>
                      </View>
                    )}
                  </View>
                </>
              ) : activeTab === "stands" && selectedStand ? (
                <>
                  {selectedStand.imageUri && (
                    <Image source={{ uri: selectedStand.imageUri }} style={styles.detailsImage} />
                  )}
                  <View style={styles.detailsInfo}>
                    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.infoLabel, { color: colors.muted }]}>المحل</Text>
                      <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedStand.storeName || "بدون محل"}</Text>
                    </View>
                    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.infoLabel, { color: colors.muted }]}>الماركة</Text>
                      <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedStand.brand || "بدون ماركة"}</Text>
                    </View>
                    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.infoLabel, { color: colors.muted }]}>الحالة</Text>
                      <Text style={[styles.infoValue, { color: STAND_CONDITIONS.find(c => c.value === selectedStand.condition)?.color }]}>
                        {STAND_CONDITIONS.find(c => c.value === selectedStand.condition)?.label}
                      </Text>
                    </View>
                    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.infoLabel, { color: colors.muted }]}>تاريخ التركيب</Text>
                      <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedStand.installDate}</Text>
                    </View>
                    {selectedStand.maintenanceHistory && selectedStand.maintenanceHistory.length > 0 && (
                      <View style={styles.maintenanceSection}>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>سجل الصيانة</Text>
                        {selectedStand.maintenanceHistory.map((record) => (
                          <View key={record.id} style={[styles.maintenanceItem, { borderLeftColor: record.status === "completed" ? colors.success : colors.warning }]}>
                            <Text style={[styles.maintenanceType, { color: colors.foreground }]}>{record.type}</Text>
                            <Text style={[styles.maintenanceDate, { color: colors.muted }]}>{record.date}</Text>
                            <Text style={[styles.maintenanceStatus, { color: record.status === "completed" ? colors.success : colors.warning }]}>{record.status}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {selectedStand.notes && (
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.muted }]}>ملاحظات</Text>
                        <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedStand.notes}</Text>
                      </View>
                    )}
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* نافذة الحذف القديمة معطلة؛ يستخدم التطبيق ConfirmDialog الموحد أعلاه. */}<Modal visible={false} animationType="fade" transparent onRequestClose={() => setShowDeleteModal(false)}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <View style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, width: "85%", maxWidth: 320, overflow: "hidden" }]}>
            <View style={{ alignItems: "center", paddingTop: 24, paddingHorizontal: 16 }}>
              <MaterialIcons name="delete-outline" size={48} color="#EF4444" />
            </View>
            <Text style={[{ fontSize: 18, fontWeight: "700" as any, color: colors.foreground, textAlign: "center", marginTop: 16, marginHorizontal: 16 }]}>تأكيد الحذف</Text>
            <Text style={[{ fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 8, marginHorizontal: 16, marginBottom: 24 }]}>
              {deleteTarget?.type === "signage" ? "هل تريد حذف هذه اللوحة؟ لا يمكن التراجع عن هذا الإجراء." : "هل تريد حذف هذا الستاند؟ لا يمكن التراجع عن هذا الإجراء."}
            </Text>
            <View style={[{ flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)} style={[{ flex: 1, paddingVertical: 12, alignItems: "center", borderRightWidth: 1, borderRightColor: colors.border }]}>
                <Text style={[{ fontSize: 15, fontWeight: "600" as any, color: colors.foreground }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                if (deleteTarget?.type === "signage" && selectedSignage) {
                  const updatedSignages = signages.filter(s => s.id !== selectedSignage.id);
                  saveItems(STORAGE_KEYS.SIGNAGE_BOARDS, updatedSignages);
                  setSignages(updatedSignages);
                } else if (deleteTarget?.type === "stands" && selectedStand) {
                  const updatedStands = stands.filter(s => s.id !== selectedStand.id);
                  saveItems(STORAGE_KEYS.STANDS, updatedStands);
                  setStands(updatedStands);
                }
                setShowDeleteModal(false);
                setShowDetails(false);
                setSuccessMessage({ visible: true, message: deleteTarget?.type === "signage" ? "تم حذف اللوحة بنجاح" : "تم حذف الستاند بنجاح" });
              }} style={[{ flex: 1, paddingVertical: 12, alignItems: "center" }]}>
                <Text style={[{ fontSize: 15, fontWeight: "600" as any, color: "#EF4444" }]}>حذف</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SignageFab visible={fabMenuOpen} onToggle={() => setFabMenuOpen((current) => !current)} icon={activeTab === "stands" ? "campaign" : "add-road"} groups={canCreate ? activeTab === "stands" ? [
        { id: "works", title: "الأعمال الإعلانية", actions: [{ id: "advertising-works", label: "إضافة أعمال إعلانية", icon: "campaign", onPress: () => setAdvertisingWorksOpen(true) }] },
        { id: "follow-up", title: "المتابعة", actions: [{ id: "details", label: "تفاصيل الأعمال", icon: "dashboard", onPress: () => { setActiveTab("details"); setShowModal(true); } }] },
        { id: "report", title: "تقرير الأعمال", actions: [{ id: "report-settings", label: "إعدادات التقرير", icon: "settings", onPress: () => setReportSettingsOpen("works") }, { id: "report-pdf", label: exporting === "works-pdf" ? "جارٍ إنشاء PDF..." : "تقرير PDF", icon: "picture-as-pdf", color: colors.error, disabled: Boolean(exporting), onPress: () => void exportReport("works", "pdf") }, { id: "report-excel", label: exporting === "works-excel" ? "جارٍ إنشاء Excel..." : "ملف Excel", icon: "table-chart", color: colors.success, disabled: Boolean(exporting), onPress: () => void exportReport("works", "excel") }] },
      ] : [
        { id: "boards", title: "اللوحات والعقود", actions: [{ id: "contracts-and-boards", label: "إضافة عقد أو لوحة", icon: "add-road", onPress: () => setContractsAndBoardsOpen(true) }, { id: "road-contract-archive", label: "أرشيف العقود", icon: "inventory-2", onPress: () => router.push("/roadside-contract-archive" as any) }] },
        { id: "follow-up", title: "المتابعة", actions: [{ id: "details", label: "تفاصيل اللوحات", icon: "dashboard", onPress: () => { setActiveTab("details"); setShowModal(true); } }] },
        { id: "report", title: "تقرير اللوحات", actions: [{ id: "report-settings", label: "إعدادات التقرير", icon: "settings", onPress: () => setReportSettingsOpen("boards") }, { id: "report-pdf", label: exporting === "boards-pdf" ? "جارٍ إنشاء PDF..." : "تقرير PDF", icon: "picture-as-pdf", color: colors.error, disabled: Boolean(exporting), onPress: () => void exportReport("boards", "pdf") }, { id: "report-excel", label: exporting === "boards-excel" ? "جارٍ إنشاء Excel..." : "ملف Excel", icon: "table-chart", color: colors.success, disabled: Boolean(exporting), onPress: () => void exportReport("boards", "excel") }] },
      ] : []} />
      <SignageReportSettingsSheet visible={reportSettingsOpen !== null} value={reportSettingsOpen === "works" ? workReportSettings : boardReportSettings} regions={regions} brands={brands} contracts={roadContracts.map((contract) => ({ id: contract.id, name: contract.name }))} onClose={() => setReportSettingsOpen(null)} onSave={(settings) => void saveReportSettings(settings)} />
      <RoadsideContractWizard visible={roadWizardOpen} contract={selectedRoadContract} mode={roadWizardMode} regions={regions} brands={brands} onClose={() => setRoadWizardOpen(false)} onSave={saveRoadContract} />
      <WallBoardWizard visible={wallWizardOpen} contract={selectedRoadContract} mode={wallWizardMode} regions={regions} brands={brands} onClose={() => setWallWizardOpen(false)} onSave={saveWallContract} />
      <IslandContractWizard visible={islandWizardOpen} contract={selectedRoadContract} mode={islandWizardMode} regions={regions} brands={brands} onClose={() => setIslandWizardOpen(false)} onSave={saveIslandContract} />
      <StoreBoardWizard visible={storeBoardWizardOpen} record={selectedSignage as StoreBoardRecord | null} mode={storeBoardWizardMode} stores={stores} brands={brands} onClose={() => setStoreBoardWizardOpen(false)} onSave={saveStoreBoard} />
      <StandWizard visible={standWizardOpen} record={selectedStand} mode={standWizardMode} stores={stores} brands={brands} onClose={() => setStandWizardOpen(false)} onSave={saveStandWizard} />
      <ShelfWizard visible={shelfWizardOpen} record={selectedShelf} mode={shelfWizardMode} stores={stores} brands={brands} onClose={() => setShelfWizardOpen(false)} onSave={saveShelfWizard} />
      <AdvertisingVehicleWizard visible={vehicleWizardOpen} record={selectedVehicle} mode={vehicleWizardMode} brands={brands} onClose={() => setVehicleWizardOpen(false)} onSave={saveAdvertisingVehicle} />
      <CardActionModal visible={advertisingWorksOpen} title="أعمال إعلانية" description="اختر نوع العمل الإعلاني الذي تريد إضافته" onClose={() => setAdvertisingWorksOpen(false)} actions={[
        { id: "stand", label: "ستاند جديد", icon: "location-city", onPress: () => { setAdvertisingWorksOpen(false); setActiveTab("stands"); openStandWizard("create"); } },
        { id: "shelves", label: "إضافة أرفف", icon: "view-quilt", onPress: () => { setAdvertisingWorksOpen(false); setActiveTab("stands"); openShelfWizard("create"); } },
        { id: "advertising-vehicle", label: "سيارة معلنة", icon: "directions-car", onPress: () => { setAdvertisingWorksOpen(false); setActiveTab("stands"); openVehicleWizard("create"); } },
      ]} />
      <CardActionModal visible={contractsAndBoardsOpen} title="عقود ولوحات" description="اختر نوع العقد أو اللوحة التي تريد إضافتها" onClose={() => setContractsAndBoardsOpen(false)} actions={[
        { id: "road-contract", label: "عقد لوحة طرقية", icon: "directions", onPress: () => { setContractsAndBoardsOpen(false); openRoadWizard("create"); } },
        { id: "wall-contract", label: "لوحة جدارية", icon: "crop-landscape", onPress: () => { setContractsAndBoardsOpen(false); openWallWizard("create"); } },
        { id: "island-contract", label: "عقد منصفات", icon: "location-city", onPress: () => { setContractsAndBoardsOpen(false); openIslandWizard("create"); } },
        { id: "store-board", label: "لوحة محل جديدة", icon: "store", onPress: () => { setContractsAndBoardsOpen(false); openStoreBoardWizard("create"); } },
      ]} />
      <CardActionModal visible={storeBoardActionsOpen} title={selectedSignage?.storeName || "لوحة المحل"} description="يمكنك تعديل اللوحة أو تجديد ماركة أحد الوجهين. تُحفظ الماركة السابقة في سجل الأرشيف." onClose={() => setStoreBoardActionsOpen(false)} actions={[
        { id: "edit", label: "تعديل لوحة المحل", icon: "edit", onPress: () => selectedSignage && openStoreBoardWizard("edit", selectedSignage) },
        { id: "renew-front", label: "تجديد ماركة الوجه الأول", icon: "autorenew", tone: "primary", onPress: () => { setStoreBoardActionsOpen(false); setStoreBrandRenewSearch(""); setStoreBrandRenewFace("front"); } },
        ...(selectedSignage?.sides === 2 ? [{ id: "renew-back", label: "تجديد ماركة الوجه الثاني", icon: "autorenew" as const, tone: "primary" as const, onPress: () => { setStoreBoardActionsOpen(false); setStoreBrandRenewSearch(""); setStoreBrandRenewFace("back"); } }] : []),
        { id: "delete", label: "حذف لوحة المحل", icon: "delete-outline", tone: "danger", onPress: () => { setStoreBoardActionsOpen(false); setDeleteTarget({ type: "signage" }); setShowDeleteModal(true); } },
      ]} />
      <CardActionModal visible={vehicleActionsOpen} title={selectedVehicle?.vehicleNumber || "السيارة المعلنة"} description="يمكنك تعديل بيانات السيارة أو حذفها نهائياً" onClose={() => setVehicleActionsOpen(false)} actions={[
        ...(canEdit ? [{ id: "edit", label: "تعديل السيارة", icon: "edit" as const, onPress: () => selectedVehicle && openVehicleWizard("edit", selectedVehicle) }] : []),
        ...(canDelete ? [{ id: "delete", label: "حذف السيارة", icon: "delete-outline" as const, tone: "danger" as const, onPress: () => { setVehicleActionsOpen(false); setDeleteTarget({ type: "vehicles" }); setShowDeleteModal(true); } }] : []),
      ]} />
      <Modal transparent visible={Boolean(storeBrandRenewFace)} animationType="fade" onRequestClose={() => setStoreBrandRenewFace(null)}><View style={styles.renewOverlay}><TouchableOpacity activeOpacity={1} onPress={() => setStoreBrandRenewFace(null)} style={StyleSheet.absoluteFill} /><View style={[styles.renewDialog, { backgroundColor: colors.surface }]}><Text style={[styles.renewTitle, { color: colors.foreground }]}>تجديد ماركة {storeBrandRenewFace === "back" ? "الوجه الثاني" : "الوجه الأول"}</Text><TextInput value={storeBrandRenewSearch} onChangeText={setStoreBrandRenewSearch} placeholder="ابحث عن ماركة" placeholderTextColor={colors.muted} style={[styles.renewSearch, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} textAlign="right" /><ScrollView style={styles.renewList} keyboardShouldPersistTaps="handled">{brands.filter((brand) => brand.toLocaleLowerCase("ar").includes(storeBrandRenewSearch.toLocaleLowerCase("ar"))).map((brand) => <TouchableOpacity key={brand} onPress={() => void renewSelectedStoreBrand(brand)} style={[styles.renewOption, { borderBottomColor: colors.border }]}><Text style={[styles.renewOptionText, { color: colors.foreground }]}>{brand}</Text><MaterialIcons name="business" size={19} color={colors.primary} /></TouchableOpacity>)}</ScrollView></View></View></Modal>
      <CardActionModal visible={roadActionsOpen} title={selectedRoadContract?.name || "عقد لوحة"} description="اختر الإجراء المطلوب أو اضغط خارج النافذة للإغلاق" onClose={() => setRoadActionsOpen(false)} actions={[
        { id: "edit", label: selectedRoadContract?.type === "wall" ? "تعديل اللوحة الجدارية" : selectedRoadContract?.type === "island" ? "تعديل عقد المنصفات" : "تعديل العقد واللوحات", icon: "edit", onPress: () => selectedRoadContract?.type === "wall" ? openWallWizard("edit", selectedRoadContract) : selectedRoadContract?.type === "island" ? openIslandWizard("edit", selectedRoadContract) : openRoadWizard("edit", selectedRoadContract) },
        { id: "renew-same", label: "تجديد بنفس التفاصيل", icon: "content-copy", tone: "success", onPress: () => selectedRoadContract?.type === "wall" ? openWallWizard("renew-same", selectedRoadContract) : selectedRoadContract?.type === "island" ? openIslandWizard("renew-same", selectedRoadContract) : openRoadWizard("renew-same", selectedRoadContract) },
        { id: "renew-edit", label: "تجديد بتفاصيل جديدة", icon: "autorenew", tone: "primary", onPress: () => selectedRoadContract?.type === "wall" ? openWallWizard("renew-edit", selectedRoadContract) : selectedRoadContract?.type === "island" ? openIslandWizard("renew-edit", selectedRoadContract) : openRoadWizard("renew-edit", selectedRoadContract) },
        { id: "cancel", label: "إلغاء العقد وأرشفته", icon: "archive", tone: "warning", onPress: () => { setRoadActionsOpen(false); setRoadPendingAction("cancel"); } },
        { id: "delete", label: "حذف العقد نهائياً", icon: "delete-outline", tone: "danger", onPress: () => { setRoadActionsOpen(false); setRoadPendingAction("delete"); } },
      ]} />
      <ConfirmDialog visible={Boolean(roadPendingAction)} title={roadPendingAction === "cancel" ? "إلغاء عقد اللوحات" : "حذف عقد اللوحات"} message={roadPendingAction === "cancel" ? "سيُنقل العقد بكامل تفاصيله إلى الأرشيف تحت اسم العقد وتاريخيه. هل تريد المتابعة؟" : "سيُحذف العقد بكل لوحاته نهائياً ولا يمكن التراجع عن ذلك."} confirmText={roadPendingAction === "cancel" ? "إلغاء وأرشفة" : "حذف نهائي"} isDangerous={roadPendingAction === "delete"} icon="warning" onCancel={() => setRoadPendingAction(null)} onConfirm={() => void confirmRoadAction()} />
    </View>
  );
}

type SignageFabAction = { id: string; label: string; icon: keyof typeof MaterialIcons.glyphMap; color?: string; disabled?: boolean; onPress: () => void };
type SignageFabGroup = { id: string; title: string; actions: SignageFabAction[] };

function SignageFab({ visible, groups, icon, onToggle }: { visible: boolean; groups: SignageFabGroup[]; icon: keyof typeof MaterialIcons.glyphMap; onToggle: () => void }) {
  const colors = useColors();
  if (!groups.length) return null;
  const choose = (action: SignageFabAction) => { onToggle(); action.onPress(); };
  return <View style={styles.signageFabWrap}>{visible ? <View style={[styles.signageFabMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>{groups.map((group, groupIndex) => <View key={group.id}>{groupIndex ? <View style={[styles.signageFabDivider, { backgroundColor: colors.border }]} /> : null}<Text style={[styles.signageFabHeader, { color: colors.muted }]}>{group.title}</Text>{group.actions.map((action) => <TouchableOpacity key={action.id} disabled={action.disabled} onPress={() => choose(action)} style={[styles.signageFabItem, action.disabled && { opacity: 0.55 }]}><MaterialIcons name={action.icon} size={18} color={action.color || colors.primary} /><Text style={[styles.signageFabItemText, { color: colors.foreground }]}>{action.label}</Text></TouchableOpacity>)}</View>)}</View> : null}<TouchableOpacity onPress={onToggle} style={[styles.signageFab, { backgroundColor: colors.primary }]} accessibilityLabel="إدارة اللوحات والستاندات"><MaterialIcons name={visible ? "close" : icon} size={25} color="#fff" /></TouchableOpacity></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 0.5 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 14, fontWeight: "600" as any },
  notificationButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center", marginLeft: 4, position: "relative" },
  notificationBadge: { position: "absolute", top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#fff" },
  notificationBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" as any },
  notificationOverlay: { flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(15,23,42,0.38)" },
  notificationSheet: { maxHeight: "72%", borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  notificationHeader: { minHeight: 66, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 10 },
  notificationClose: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  notificationHeaderCopy: { flex: 1, alignItems: "flex-end" },
  notificationTitle: { fontSize: 16, fontWeight: "800" as any, textAlign: "right" },
  notificationHint: { fontSize: 10, marginTop: 3, textAlign: "right" },
  notificationList: { padding: 12, gap: 8 },
  notificationItem: { minHeight: 70, borderWidth: 1, borderRadius: 14, padding: 10, flexDirection: "row", alignItems: "center", gap: 9 },
  notificationIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  notificationCopy: { flex: 1, gap: 3 },
  notificationItemTitle: { fontSize: 12, fontWeight: "800" as any, textAlign: "right" },
  notificationItemDescription: { fontSize: 10, lineHeight: 16, textAlign: "right" },
  notificationEmpty: { minHeight: 170, alignItems: "center", justifyContent: "center", gap: 8 },
  notificationEmptyText: { fontSize: 12, textAlign: "center" },
  list: { padding: 12, gap: 8 },
  contractsList: { gap: 8, marginBottom: 8 },
  contractAlert: { minHeight: 58, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", gap: 8, alignItems: "center" },
  contractAlertCopy: { flex: 1, alignItems: "flex-end" },
  contractAlertTitle: { fontSize: 11, fontWeight: "800" as any, textAlign: "right" },
  contractAlertText: { fontSize: 10, marginTop: 3, textAlign: "right" },
  card: { borderRadius: 12, padding: 12, borderWidth: 1 },
  roadContractCard: { minHeight: 102, borderRadius: 16, padding: 13, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  roadContractIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  storeBoardThumb: { width: 48, height: 48 },
  roadContractCopy: { flex: 1, alignItems: "flex-end" },
  roadContractTitleRow: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  roadContractTitle: { flex: 1, fontSize: 14, fontWeight: "800" as any, textAlign: "right" },
  roadContractMeta: { fontSize: 10, marginTop: 5, textAlign: "right" },
  roadContractRatings: { fontSize: 10, marginTop: 4, textAlign: "right", fontWeight: "700" as any },
  roadContractHint: { fontSize: 9, marginTop: 4, textAlign: "right" },
  contractStatus: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 4, maxWidth: 170 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  contractStatusText: { fontSize: 8, fontWeight: "700" as any, textAlign: "right", flexShrink: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700" as any, marginBottom: 4 },
  cardMeta: { fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5 },
  modalTitle: { fontSize: 17, fontWeight: "700" as any },
  modalContent: { flex: 1, padding: 16 },
  detailsScrollContent: { paddingBottom: 104 },
  detailsHero: { borderRadius: 22, padding: 18, marginBottom: 14 },
  detailsHeroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  detailsHeroIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  detailsHeroCopy: { flex: 1, alignItems: "flex-end" },
  detailsHeroEyebrow: { color: "rgba(255,255,255,0.78)", fontSize: 11, fontWeight: "700" as any },
  detailsHeroTitle: { color: "#fff", fontSize: 19, fontWeight: "800" as any, marginTop: 2 },
  detailsHeroDescription: { color: "rgba(255,255,255,0.86)", fontSize: 11, marginTop: 4, textAlign: "right" },
  detailsMetrics: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.22)" },
  detailsMetric: { flex: 1, alignItems: "center" },
  detailsMetricValue: { color: "#fff", fontSize: 20, fontWeight: "800" as any },
  detailsMetricLabel: { color: "rgba(255,255,255,0.82)", fontSize: 10, fontWeight: "600" as any, marginTop: 3 },
  detailsMetricDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.22)" },
  exportPanel: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 14 },
  exportPanelHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  exportPanelIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  exportPanelCopy: { flex: 1, alignItems: "flex-end" },
  exportPanelTitle: { fontSize: 15, fontWeight: "800" as any },
  exportPanelDescription: { fontSize: 11, marginTop: 3, textAlign: "right" },
  exportActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  exportAction: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  excelExportAction: { borderWidth: 1 },
  exportActionDisabled: { opacity: 0.58 },
  excelExportText: { fontSize: 13, fontWeight: "800" as any },
  pdfExportText: { color: "#fff", fontSize: 13, fontWeight: "800" as any },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: "600" as any, marginBottom: 8, textAlign: "right" },
  formInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  datePickerButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  datePickerText: { fontSize: 15, fontWeight: "600" as any },
  textArea: { height: 80 },
  typeOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeOption: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: "#E5E7EB", gap: 4 },
  typeOptionText: { fontSize: 12, fontWeight: "500" as any },
  dropdown: { borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  dropdownButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12 },
  dropdownText: { fontSize: 15 },
  dropdownMenu: { borderTopWidth: 1, maxHeight: 200 },
  dropdownSearchInput: { borderWidth: 1, borderRadius: 8, padding: 10, margin: 8, fontSize: 14 },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  dropdownItemText: { fontSize: 14, textAlign: "right" },
  condOptions: { flexDirection: "row", gap: 8 },
  condOption: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#E5E7EB", alignItems: "center" },
  condOptionText: { fontSize: 13, fontWeight: "600" as any },
  modalFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, gap: 12, borderTopWidth: 0.5 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: "600" as any },
  saveBtnBottom: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "600" as any, color: "#fff" },
  imageButton: { borderWidth: 1, borderRadius: 10, padding: 16, alignItems: "center", gap: 8 },
  imageButtonText: { fontSize: 14, fontWeight: "500" as any },
  imagePreview: { width: "100%", height: 200, borderRadius: 10, marginTop: 8 },
  cardImageContainer: { width: "100%", height: 150, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: "hidden", position: "relative" },
  cardImage: { width: "100%", height: 150 },
  cardImageOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.15 },
  cardImagePlaceholder: { width: "100%", height: 150, borderTopLeftRadius: 12, borderTopRightRadius: 12, justifyContent: "center", alignItems: "center" },
  cardContent: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: 12 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  cardDate: { fontSize: 12 },
  typeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, justifyContent: "center", alignItems: "center" },
  conditionTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, justifyContent: "center", alignItems: "center" },
  detailsContainer: { flex: 1 },
  detailsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5 },
  detailsTitle: { fontSize: 17, fontWeight: "700" as any },
  detailsContent: { flex: 1, padding: 16 },
  detailsImage: { width: "100%", height: 250, borderRadius: 12, marginBottom: 16 },
  detailsInfo: { gap: 0 },
  infoRow: { paddingVertical: 12, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontSize: 14, fontWeight: "600" as any },
  infoValue: { fontSize: 14, textAlign: "right", flex: 1, marginLeft: 12 },
  maintenanceSection: { marginTop: 16, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as any, marginBottom: 8 },
  maintenanceItem: { paddingLeft: 12, paddingVertical: 8, borderLeftWidth: 3, gap: 4 },
  maintenanceType: { fontSize: 14, fontWeight: "600" as any },
  maintenanceDate: { fontSize: 12 },
  maintenanceStatus: { fontSize: 12, fontWeight: "600" as any },
  reportSection: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 8 },
  reportTitle: { fontSize: 16, fontWeight: "700" as any },
  detailsHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  detailsHeadingCopy: { flex: 1 },
  detailsHint: { fontSize: 11, marginTop: 3 },
  detailsBadge: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  statLabel: { fontSize: 14, fontWeight: "500" as any },
  statValue: { fontSize: 18, fontWeight: "700" as any },
  typeStatsContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  subTitle: { fontSize: 14, fontWeight: "600" as any, marginBottom: 8 },
  typeStatRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  typeStatLabel: { fontSize: 13, fontWeight: "500" as any },
  typeStatCount: { fontSize: 14, fontWeight: "600" as any },
  condStatsContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  condStatRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  condStatLabel: { fontSize: 13, fontWeight: "500" as any },
  condStatCount: { fontSize: 14, fontWeight: "600" as any },
  condDot: { width: 8, height: 8, borderRadius: 4 },
  brandStatsContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  brandStatRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  brandStatLabel: { fontSize: 13, fontWeight: "500" as any },
  brandStatCount: { fontSize: 14, fontWeight: "600" as any },
  warningBox: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, marginTop: 12, borderWidth: 1 },
  warningTitle: { fontSize: 14, fontWeight: "600" as any },
  warningText: { fontSize: 12 },
  renewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "center", padding: 20 },
  renewDialog: { maxHeight: "72%", borderRadius: 20, padding: 16 },
  renewTitle: { fontSize: 16, fontWeight: "800" as any, textAlign: "right" },
  renewSearch: { minHeight: 42, borderWidth: 1, borderRadius: 11, marginTop: 12, paddingHorizontal: 10, fontSize: 13 },
  renewList: { marginTop: 8 },
  renewOption: { minHeight: 49, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  renewOptionText: { fontSize: 13, fontWeight: "700" as any },
  signageFabWrap: { position: "absolute", right: 18, bottom: 20, alignItems: "flex-end", gap: 10, zIndex: 100 },
  signageFab: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", elevation: 5 },
  signageFabMenu: { minWidth: 236, borderWidth: 1, borderRadius: 16, paddingVertical: 7, elevation: 5, overflow: "hidden" },
  signageFabHeader: { fontSize: 10, fontWeight: "800" as any, paddingHorizontal: 13, paddingTop: 6, paddingBottom: 3, textAlign: "right" },
  signageFabItem: { minHeight: 43, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8 },
  signageFabItemText: { fontSize: 12, fontWeight: "800" as any, flex: 1, textAlign: "right" },
  signageFabDivider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
});
