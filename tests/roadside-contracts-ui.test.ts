import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const moduleSource = readFileSync(resolve(process.cwd(), "components/modules/signage-module.tsx"), "utf8");
const wizardSource = readFileSync(resolve(process.cwd(), "components/roadside-contract-wizard.tsx"), "utf8");
const roadsidePickerFixSource = readFileSync(resolve(process.cwd(), "components/roadside-contract-wizard-style-fix.ts"), "utf8");
const wallWizardSource = readFileSync(resolve(process.cwd(), "components/wall-board-wizard.tsx"), "utf8");
const islandWizardSource = readFileSync(resolve(process.cwd(), "components/island-contract-wizard.tsx"), "utf8");
const storeWizardSource = readFileSync(resolve(process.cwd(), "components/store-board-wizard.tsx"), "utf8");
const standWizardSource = readFileSync(resolve(process.cwd(), "components/stand-wizard.tsx"), "utf8");
const shelfWizardSource = readFileSync(resolve(process.cwd(), "components/shelf-wizard.tsx"), "utf8");
const shelfDetailsSource = readFileSync(resolve(process.cwd(), "app/shelf-details.tsx"), "utf8");
const vehicleWizardSource = readFileSync(resolve(process.cwd(), "components/advertising-vehicle-wizard.tsx"), "utf8");
const vehicleDetailsSource = readFileSync(resolve(process.cwd(), "app/advertising-vehicle-details.tsx"), "utf8");
const archiveSource = readFileSync(resolve(process.cwd(), "app/roadside-contract-archive.tsx"), "utf8");
const detailsSource = readFileSync(resolve(process.cwd(), "app/roadside-contract-details.tsx"), "utf8");
const signageDetailsSource = readFileSync(resolve(process.cwd(), "components/signage-details-sheet.tsx"), "utf8");
const settingsSource = readFileSync(resolve(process.cwd(), "app/settings.tsx"), "utf8");

describe("واجهة عقود اللوحات الطرقية", () => {
  it("تضيف عقداً طرقياً من الزر العائم وتمنع إنشاء لوحة طرقية منفردة مع إبقاء السجلات القديمة ظاهرة", () => {
    expect(moduleSource).toContain('id: "road-contract"');
    expect(moduleSource).toContain('SIGNAGE_TYPES.filter((t) => t.value !== "road" && t.value !== "wall" && t.value !== "island")');
    expect(moduleSource).toContain("data={signages}");
  });

  it("تعرض مراحل العقد والتوزيع والتحقق من عدم تجاوز العدد", () => {
    expect(wizardSource).toContain("الخطوة {step + 1} من 3");
    expect(wizardSource).toContain("totalBoards - allocated");
    expect(wizardSource).toContain("يجب أن يساوي مجموع اللوحات في المناطق العدد الإجمالي");
    expect(wizardSource).toContain("اختر المنطقة وماركة الوجه الأول لكل لوحة");
    expect(wizardSource).toContain("حفظ ومتابعة");
  });

  it("يدعم إجراءات العقد من الضغط المطول", () => {
    expect(moduleSource).toContain("onLongPress");
    expect(moduleSource).toContain("تجديد بنفس التفاصيل");
    expect(moduleSource).toContain("إلغاء العقد وأرشفته");
    expect(moduleSource).toContain("انتهت ${typeLabel}");
  });

  it("يوفر صفحة أرشيف مستقلة مقسمة بحسب أنواع اللوحات غير التابعة للمحل", () => {
    expect(moduleSource).toContain('"/roadside-contract-archive"');
    expect(archiveSource).toContain("أرشيف عقود اللوحات");
    expect(archiveSource).toContain("جدارية");
    expect(archiveSource).toContain("منصف");
    expect(archiveSource).toContain("onLongPress");
  });

  it("يفتح العقد المؤرشف بالنقر ويتيح إلغاء أرشفته مع إبقاء الحذف النهائي بالضغط المطول", () => {
    expect(archiveSource).toContain('pathname: "/roadside-contract-details"');
    expect(archiveSource).toContain("restoreArchivedRoadsideContract");
    expect(archiveSource).toContain("إلغاء الأرشفة وإعادة العقد للنشطة");
    expect(archiveSource).toContain("حذف العقد نهائياً");
    expect(archiveSource).toContain("allContracts.filter");
    expect(detailsSource).toContain("حالة الأرشفة");
    expect(detailsSource).toContain("مؤرشف");
  });

  it("يحدّث الأرشيف فوراً بعد إلغاء الأرشفة ويعيد تحميل العقود النشطة عند العودة للشاشة", () => {
    expect(archiveSource).toContain("setContracts((current) => current.filter");
    expect(archiveSource).toContain("void syncRoadsideContractPhoneReminders");
    expect(moduleSource).toContain("useFocusEffect");
    expect(moduleSource).toContain("void loadAssetData()");
  });

  it("يفتح تفاصيل العقد بالنقر ويحتفظ بالضغط المطول للإجراءات", () => {
    expect(moduleSource).toContain('pathname: "/roadside-contract-details"');
    expect(moduleSource).toContain("onLongPress");
    expect(detailsSource).toContain("تفاصيل عقد اللوحات");
    expect(detailsSource).toContain("الشركة المالكة");
    expect(detailsSource).toContain("اللوحات الفعلية");
  });

  it("يدعم مدة تنبيه قابلة للضبط وخصائص الوجوه والصور والنوع والتقييم", () => {
    expect(settingsSource).toContain("مدة تذكير عقود اللوحات");
    expect(settingsSource).toContain("[15, 30, 60]");
    expect(wizardSource).toContain("عدد وجوه اللوحة");
    expect(wizardSource).toContain("تقييم اللوحة");
    expect(wizardSource).toContain("rotateImage");
    expect(wizardSource).toContain("frontImageUri");
    expect(detailsSource).toContain("توزيع تقييم اللوحات");
    expect(detailsSource).toContain("setActiveImage");
    expect(moduleSource).toContain("getRoadsideBoardRatingCounts");
  });

  it("يعرض حالة العقد داخل شارة عالية التباين ويفتح ويغلق التفاصيل بحركة متدرجة", () => {
    expect(detailsSource).toContain("contractStateBadge");
    expect(detailsSource).toContain('backgroundColor: "#FFFFFF"');
    expect(detailsSource).toContain("alertColor");
    expect(detailsSource).toContain("Easing.out(Easing.cubic)");
    expect(detailsSource).toContain("Easing.in(Easing.cubic)");
    expect(detailsSource).toContain("closeDetail");
  });

  it("يدعم لوحة جدارية واحدة ببيانات المسؤول والمنطقة الواحدة وتفاصيل اللوحة الكاملة", () => {
    expect(moduleSource).toContain('id: "wall-contract"');
    expect(moduleSource).toContain("WallBoardWizard");
    expect(wallWizardSource).toContain('type: "wall"');
    expect(wallWizardSource).toContain("اسم الشخص المسؤول");
    expect(wallWizardSource).toContain("رقم هاتف المسؤول");
    expect(wallWizardSource).toContain("المنطقة الواحدة");
    expect(wallWizardSource).toContain("KeyboardAvoidingView");
    expect(detailsSource).toContain("تفاصيل اللوحة الجدارية");
    expect(detailsSource).toContain("رقم هاتف المسؤول");
  });

  it("يدعم عقد المنصفات بنطاق منطقة أو منطقتين ونموذج تفاصيل موحد لكل المنصفات", () => {
    expect(moduleSource).toContain('id: "island-contract"');
    expect(moduleSource).toContain("IslandContractWizard");
    expect(moduleSource).toContain('t.value !== "island"');
    expect(islandWizardSource).toContain('type: "island"');
    expect(islandWizardSource).toContain("عدد المنصفات المستأجرة");
    expect(islandWizardSource).toContain("يربط منطقتين");
    expect(islandWizardSource).toContain("تفاصيل المنصف الفعلي");
    expect(islandWizardSource).toContain("rotateImage");
    expect(detailsSource).toContain("تفاصيل عقد المنصفات");
    expect(detailsSource).toContain("تفاصيل المنصف الفعلي");
    expect(archiveSource).toContain("منصف");
  });

  it("يفصل ماركة كل وجه في العقود الطرقية والجدارية والمنصفات", () => {
    expect(wizardSource).toContain("ماركة الوجه الثاني");
    expect(wallWizardSource).toContain("backBrand");
    expect(islandWizardSource).toContain("backBrand");
    expect(detailsSource).toContain("getRoadsideBoardBackBrand");
  });

  it("يبقي اختيار الماركة داخل صورة اللوحة الطرقية ويخفي الاختيار العلوي المكرر", () => {
    expect(wizardSource).toContain('import "@/components/roadside-contract-wizard-style-fix"');
    expect(wizardSource).toContain("const ImageSlot");
    expect(wizardSource).toContain("اختر ماركة ${face === \"front\"");
    expect(roadsidePickerFixSource).toContain('brandPicker: { ...(definitions.brandPicker as object), display: "none" }');
  });

  it("ينشئ لوحة محل باختيار قابل للبحث ويجدد الماركة مع أرشفتها", () => {
    expect(moduleSource).toContain("StoreBoardWizard");
    expect(moduleSource).toContain("لوحة محل جديدة");
    expect(moduleSource).toContain("تجديد ماركة الوجه الأول");
    expect(moduleSource).toContain("تجديد الماركة وأرشفة الماركة السابقة");
    expect(storeWizardSource).toContain("تفاصيل لوحة المحل الأساسية");
    expect(storeWizardSource).toContain("المنطقة المستوردة");
    expect(storeWizardSource).toContain("تفاصيل اللوحة الفعلية");
    expect(storeWizardSource).toContain("ابحث عن محل");
    expect(signageDetailsSource).toContain("أرشيف الماركات");
  });

  it("يجمع إنشاء العقود واللوحات في نافذة واحدة ويفصلها عن إجراءات الستاندات", () => {
    expect(moduleSource).toContain('id: "contracts-and-boards"');
    expect(moduleSource).toContain('title="عقود ولوحات"');
    expect(moduleSource).toContain('id: "road-contract"');
    expect(moduleSource).toContain('id: "wall-contract"');
    expect(moduleSource).toContain('id: "island-contract"');
    expect(moduleSource).toContain('id: "store-board"');
    expect(moduleSource).toContain('activeTab === "stands"');
    expect(moduleSource).toContain('ListEmptyComponent={hasAnyBoard ? null');
    expect(storeWizardSource).toContain('sides: 1');
    expect(storeWizardSource).toContain("لوحة المحل بوجه واحد");
  });

  it("يعرض لوحة المحل ببطاقة وتفاصيل تتبع أسلوب العقود", () => {
    expect(moduleSource).toContain('item.type === "store"');
    expect(moduleSource).toContain("اضغط لعرض التفاصيل أو اضغط مطولاً لتجديد الماركة");
    expect(moduleSource).toContain("storeBoardThumb");
    expect(signageDetailsSource).toContain("تفاصيل لوحة المحل");
    expect(signageDetailsSource).toContain("storeContractHero");
    expect(signageDetailsSource).toContain("تفاصيل اللوحة الفعلية");
  });

  it("يضيف الستاند بمعالج موحد ويعرضه ببطاقة تتبع أسلوب العقود", () => {
    expect(moduleSource).toContain("StandWizard");
    expect(moduleSource).toContain('openStandWizard("create")');
    expect(moduleSource).toContain('openStandWizard("edit", selectedStand)');
    expect(moduleSource).toContain("اضغط للتفاصيل · ضغط مطوّل للإجراءات");
    expect(standWizardSource).toContain("تفاصيل الستاند الأساسية");
    expect(standWizardSource).toContain("تفاصيل الستاند الفعلية");
    expect(standWizardSource).toContain("حالة الستاند *");
    expect(standWizardSource).toContain("لا يحتاج الستاند إلى إدخال مقاسات");
    expect(standWizardSource).toContain("rotate");
  });

  it("يلزم ماركة الستاند ويضيف الأرفف بحسب الماركات وعدد الأرفف", () => {
    expect(standWizardSource).toContain("اختر ماركة الستاند أولاً");
    expect(standWizardSource).toContain('Label text="الماركة *"');
    expect(moduleSource).toContain('id: "shelves"');
    expect(moduleSource).toContain("ShelfWizard");
    expect(moduleSource).toContain("اضغط للتفاصيل · ضغط مطوّل للإجراءات");
    expect(shelfWizardSource).toContain("عدد الماركات المركبة *");
    expect(shelfWizardSource).toContain("عدد الأرفف لهذه الماركة *");
    expect(shelfWizardSource).toContain("لا توجد حالة للأرفف");
  });

  it("يدعم صورة الأرفف وتفاصيلها الموحدة وإجراءات الضغط المطوّل للستاندات والأرفف", () => {
    expect(shelfWizardSource).toContain("صورة الأرفف");
    expect(shelfWizardSource).toContain("rotateImage");
    expect(moduleSource).toContain('router.push(`/shelf-details?id=${encodeURIComponent(shelf.id)}` as never)');
    expect(moduleSource).toContain("setShelfActionsOpen(true)");
    expect(moduleSource).toContain("setStandActionsOpen(true)");
    expect(moduleSource).toContain('type: "shelves"');
    expect(shelfDetailsSource).toContain("تفاصيل الأرفف");
    expect(shelfDetailsSource).toContain("صورة الأرفف");
    expect(shelfDetailsSource).toContain("توزيع الأرفف على الماركات");
    expect(signageDetailsSource).toContain("isSignage ? (");
    expect(signageDetailsSource).toContain(") : <View style={styles.headerAction} />}" );
  });

  it("يعرض مركز إشعارات علوياً لكل من اللوحات والستاندات وينتقل للتفاصيل عند اختيار التنبيه", () => {
    expect(moduleSource).toContain("notificationsOpen");
    expect(moduleSource).toContain("تنبيهات {notificationsOpen === \"stands\" ? \"الستاندات\" : \"اللوحات\"}");
    expect(moduleSource).toContain("openNotificationDetails");
    expect(moduleSource).toContain("notifications-active");
  });

  it("يضيف سيارة معلنة بماركة ورقم وتاريخ وصور الجوانب الأربعة مع صفحة تفاصيل وإجراءات ضغط مطوّل", () => {
    expect(moduleSource).toContain('id: "advertising-vehicle"');
    expect(moduleSource).toContain("openVehicleWizard");
    expect(moduleSource).toContain("vehicleActionsOpen");
    expect(moduleSource).toContain("ADVERTISING_VEHICLES");
    expect(vehicleWizardSource).toContain("رقم السيارة *");
    expect(vehicleWizardSource).toContain("صور الإعلان على السيارة");
    expect(vehicleWizardSource).toContain("الصور الأربع مطلوبة");
    expect(vehicleDetailsSource).toContain("تفاصيل السيارة المعلنة");
    expect(vehicleDetailsSource).toContain("صور الجوانب الأربعة");
  });

  it("يستخدم قوائم افتراضية وتحميل صور مؤقت لتصفح أخف للّوحات والستاندات", () => {
    expect(moduleSource).toContain("const signageFeed = useMemo");
    expect(moduleSource).toContain("const standFeed = useMemo");
    expect(moduleSource).toContain("data={signageFeed}");
    expect(moduleSource).toContain("data={standFeed}");
    expect(moduleSource).toContain("removeClippedSubviews");
    expect(moduleSource).toContain("maxToRenderPerBatch={6}");
    expect(moduleSource).toContain('cachePolicy="memory-disk"');
    expect(moduleSource).toContain("const loadAssetData");
    expect(moduleSource).toContain("const loadReferenceData");
  });
});
