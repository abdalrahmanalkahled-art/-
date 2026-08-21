import {
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  float,
  mysqlEnum,
  json,
  date,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ===== STORES (المحلات) =====
export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerName: varchar("ownerName", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  region: varchar("region", { length: 100 }),
  address: text("address"),
  category: varchar("category", { length: 100 }).default("عادي").notNull(),
  notes: text("notes"),
  photos: json("photos").$type<string[]>(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ===== STORE VISITS (زيارات المحلات) =====
export const storeVisits = mysqlTable("store_visits", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  visitDate: date("visitDate").notNull(),
  notes: text("notes"),
  photos: json("photos").$type<string[]>(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ===== SURVEYS (الاستبيانات) =====
export const surveys = mysqlTable("surveys", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  surveyDate: date("surveyDate").notNull(),
  companyProducts: json("companyProducts").$type<{name: string; present: boolean; shelfPercentage: number; hasStand: boolean; hasSignage: boolean}[]>(),
  competitorProducts: json("competitorProducts").$type<{competitorName: string; products: {name: string; present: boolean; shelfPercentage: number}[]}[]>(),
  overallPresencePercentage: float("overallPresencePercentage").default(0),
  notes: text("notes"),
  photos: json("photos").$type<string[]>(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ===== EVENTS (الفعاليات) =====
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  eventDate: date("eventDate").notNull(),
  location: varchar("location", { length: 255 }),
  region: varchar("region", { length: 100 }),
  budget: float("budget").default(0),
  actualCost: float("actualCost").default(0),
  materialsUsed: json("materialsUsed").$type<{name: string; quantity: number; unit: string}[]>(),
  giftsDistributed: int("giftsDistributed").default(0),
  attendeesCount: int("attendeesCount").default(0),
  photos: json("photos").$type<string[]>(),
  status: mysqlEnum("eventStatus", ["planned", "ongoing", "completed", "cancelled"]).default("planned").notNull(),
  rating: int("rating"),
  salesImpact: text("salesImpact"),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ===== WAREHOUSE ITEMS (مواد المستودع) =====
export const warehouseItems = mysqlTable("warehouse_items", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("warehouseCategory", ["gifts", "stands", "boards", "promotional", "other"]).notNull(),
  unit: varchar("unit", { length: 50 }).default("قطعة"),
  currentQuantity: int("currentQuantity").default(0).notNull(),
  minimumQuantity: int("minimumQuantity").default(5).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ===== WAREHOUSE MOVEMENTS (حركة المستودع) =====
export const warehouseMovements = mysqlTable("warehouse_movements", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull(),
  movementType: mysqlEnum("movementType", ["in", "out"]).notNull(),
  quantity: int("quantity").notNull(),
  relatedEventId: int("relatedEventId"),
  relatedStoreId: int("relatedStoreId"),
  notes: text("notes"),
  movementDate: date("movementDate").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ===== EXPENSES (الصرفيات) =====
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  amount: float("amount").notNull(),
  category: mysqlEnum("expenseCategory", ["transport", "travel", "events", "repairs", "compensation", "promotional", "other"]).notNull(),
  expenseDate: date("expenseDate").notNull(),
  invoicePhoto: text("invoicePhoto"),
  relatedEventId: int("relatedEventId"),
  relatedTaskId: int("relatedTaskId"),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ===== MARKETING GOALS (الأهداف التسويقية) =====
export const marketingGoals = mysqlTable("marketing_goals", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  period: mysqlEnum("goalPeriod", ["monthly", "quarterly", "yearly"]).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  kpi: varchar("kpi", { length: 255 }),
  targetValue: float("targetValue"),
  currentValue: float("currentValue").default(0),
  status: mysqlEnum("goalStatus", ["pending", "in_progress", "completed", "delayed"]).default("pending").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ===== MARKETING TASKS (المهام التسويقية) =====
export const marketingTasks = mysqlTable("marketing_tasks", {
  id: int("id").autoincrement().primaryKey(),
  goalId: int("goalId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: date("dueDate"),
  status: mysqlEnum("taskStatus", ["pending", "in_progress", "completed", "delayed"]).default("pending").notNull(),
  assignedTo: int("assignedTo"),
  completionPercentage: int("completionPercentage").default(0),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ===== SIGNAGE BOARDS (اللوحات الإعلانية) =====
export const signageBoards = mysqlTable("signage_boards", {
  id: int("id").autoincrement().primaryKey(),
  location: varchar("location", { length: 255 }).notNull(),
  type: mysqlEnum("boardType", ["store", "roadside", "wall", "island"]).notNull(),
  installDate: date("installDate"),
  lastBrandChangeDate: date("lastBrandChangeDate"),
  photos: json("photos").$type<string[]>(),
  cost: float("cost").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  notes: text("notes"),
  relatedStoreId: int("relatedStoreId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ===== STANDS (الستاندات) =====
export const stands = mysqlTable("stands", {
  id: int("id").autoincrement().primaryKey(),
  serialNumber: varchar("serialNumber", { length: 100 }).notNull().unique(),
  currentStoreId: int("currentStoreId"),
  condition: mysqlEnum("standCondition", ["excellent", "good", "fair", "poor"]).default("good").notNull(),
  installDate: date("installDate"),
  photos: json("photos").$type<string[]>(),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ===== PRIZE WINNERS (الفائزون بالجوائز) =====
export const prizeWinners = mysqlTable("prize_winners", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  region: varchar("region", { length: 100 }),
  prizeType: varchar("prizeType", { length: 255 }).notNull(),
  receiveDate: date("receiveDate").notNull(),
  proofPhoto: text("proofPhoto"),
  relatedEventId: int("relatedEventId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ===== BUDGETS (الميزانيات) =====
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  period: mysqlEnum("budgetPeriod", ["monthly", "quarterly", "yearly"]).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  totalBudget: float("totalBudget").notNull(),
  category: mysqlEnum("budgetCategory", ["transport", "travel", "events", "repairs", "compensation", "promotional", "other", "total"]).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Export types
export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;
export type StoreVisit = typeof storeVisits.$inferSelect;
export type InsertStoreVisit = typeof storeVisits.$inferInsert;
export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = typeof surveys.$inferInsert;
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
export type WarehouseItem = typeof warehouseItems.$inferSelect;
export type InsertWarehouseItem = typeof warehouseItems.$inferInsert;
export type WarehouseMovement = typeof warehouseMovements.$inferSelect;
export type InsertWarehouseMovement = typeof warehouseMovements.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;
export type MarketingGoal = typeof marketingGoals.$inferSelect;
export type InsertMarketingGoal = typeof marketingGoals.$inferInsert;
export type MarketingTask = typeof marketingTasks.$inferSelect;
export type InsertMarketingTask = typeof marketingTasks.$inferInsert;
export type SignageBoard = typeof signageBoards.$inferSelect;
export type InsertSignageBoard = typeof signageBoards.$inferInsert;
export type Stand = typeof stands.$inferSelect;
export type InsertStand = typeof stands.$inferInsert;
export type PrizeWinner = typeof prizeWinners.$inferSelect;
export type InsertPrizeWinner = typeof prizeWinners.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;
