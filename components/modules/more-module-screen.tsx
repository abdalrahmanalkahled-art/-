import WarehouseScreen from "@/components/modules/warehouse-module";
import ExpensesScreen from "@/components/modules/expenses-module";
import GoalsScreen from "@/components/modules/goals-module";
import SignageScreen from "@/components/modules/signage-module";
import { ReportsHubModule } from "@/components/modules/reports-hub-module";
import { ProductsModule } from "@/components/modules/products-module";
import { AdvancedAnalyticsModule } from "@/components/modules/advanced-analytics-module";
import { BrandsRegionsModule } from "@/components/modules/brands-regions-module";
import { FieldIntelligenceModule } from "@/components/modules/field-intelligence-module";
import AIChatModule from "@/components/modules/ai-chat-module";

export const MORE_MODULES = [
  { id: "warehouse", title: "إدارة المستودع", subtitle: "المخزون والحركة", icon: "inventory", color: "#0E9F6E" },
  { id: "expenses", title: "إدارة الصرفيات", subtitle: "الميزانية والمصروفات", icon: "receipt", color: "#F59E0B" },
  { id: "goals", title: "الخطة التسويقية", subtitle: "الأهداف والمهام", icon: "flag", color: "#7C3AED" },
  { id: "signage", title: "اللوحات والستاندات", subtitle: "الإعلانات الخارجية", icon: "campaign", color: "#1A56DB" },
  { id: "reports", title: "التقارير", subtitle: "الملخصات والملفات المحفوظة", icon: "assessment", color: "#0891B2" },
  { id: "products", title: "إدارة المنتجات", subtitle: "منتجات الشركة والمنافسين", icon: "inventory-2", color: "#059669" },
  { id: "brands_regions", title: "الماركات والمناطق", subtitle: "البيانات المرجعية والتقييم", icon: "map", color: "#9333EA" },
  { id: "analytics", title: "التحليلات المتقدمة", subtitle: "تحليل البيانات والتقارير", icon: "analytics", color: "#2563EB" },
  { id: "field-intelligence", title: "أدوات التنفيذ الميداني", subtitle: "الجودة والمنافسون والتغطية", icon: "radar", color: "#7C3AED" },
  { id: "ai-chat", title: "الحديث مع الذكاء الصناعي", subtitle: "تحليل بيانات التسويق الميداني", icon: "auto-awesome", color: "#2563EB" },
] as const;

export type MoreModuleId = (typeof MORE_MODULES)[number]["id"];

export function MoreModuleContent({ moduleId }: { moduleId: MoreModuleId }) {
  switch (moduleId) {
    case "warehouse": return <WarehouseScreen />;
    case "expenses": return <ExpensesScreen />;
    case "goals": return <GoalsScreen />;
    case "signage": return <SignageScreen />;
    case "reports": return <ReportsHubModule />;
    case "products": return <ProductsModule />;
    case "brands_regions": return <BrandsRegionsModule />;
    case "analytics": return <AdvancedAnalyticsModule />;
    case "field-intelligence": return <FieldIntelligenceModule />;
    case "ai-chat": return <AIChatModule />;
  }
}
