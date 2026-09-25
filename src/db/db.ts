import Dexie, { type Table } from "dexie";

export type Category = "Macaroni" | "Snack" | "Drink" | "Topping";
export type ProductRecord = {
  id: string; sku: string; name: string; category: Category; price: number; stock: number; productCost?: number;
  emoji: string; active: boolean; trackStock: boolean; size?: "S" | "M" | "L"; updatedAt: string;
};
export type IngredientRecord = {
  id: string; sku: string; name: string; category: string; unit: string; packageSize?: string;
  purchasePrice?: number; yieldMultiplier?: number;
  stock: number; minStock: number; costPerUnit: number; includeInHpp?: boolean;
  priceMode?: "RO" | "MARKET" | "MANUAL"; updatedAt: string;
};
export type RecipeItem = { ingredientId: string; quantity: number; unit: string; estimated?: boolean; };
export type RecipeRecord = { id: string; productId: string; items: RecipeItem[]; updatedAt: string; };
export type SupplierRecord = { id: string; name: string; phone: string; address: string; updatedAt: string; };
export type PurchaseRecord = {
  id: string; invoiceNo: string; supplierId: string; ingredientId: string; quantity: number;
  unit: string; totalCost: number; unitCost: number; createdAt: string;
};
export type StockMovementRecord = {
  id: string; ingredientId: string; type: "IN" | "OUT" | "ADJUSTMENT"; quantity: number;
  reason: string; referenceId?: string; createdAt: string;
};
export type PromoType = "PERCENT" | "NOMINAL";
export type PromoRecord = {
  id: string;
  code: string;
  name: string;
  type: PromoType;
  value: number;
  minSubtotal: number;
  maxDiscount?: number;
  startDate: string;
  endDate: string;
  productIds: string[];
  outletIds: string[];
  maxUses?: number;
  usedCount: number;
  active: boolean;
  updatedAt: string;
};
export type SaleRecord = {
  id: string; invoiceNo: string; orderType: "Take Away" | "Dine In"; tableNumber: string;
  paymentMethod: string; subtotal: number; discount: number; total: number; cashReceived: number;
  change: number; costOfGoods: number;
  promoId?: string; promoCode?: string; promoName?: string;
  items: Array<{ productId: string; name: string; price: number; qty: number; cost: number }>;
  createdAt: string; outletId: string; userId: string; synced: boolean;
};
export type ShiftRecord = {
  id: string; outletId: string; userId: string; openingCash: number; closingCash?: number;
  expectedCash?: number; variance?: number; startedAt: string; endedAt?: string; status: "OPEN" | "CLOSED";
};
export type ExpenseRecord = {
  id: string; outletId: string; userId: string; category: string; description: string;
  amount: number; paymentMethod: string; createdAt: string;
};
export type OutletRecord = {
  id: string; code: string; name: string; address: string; phone: string; active: boolean; updatedAt: string;
};
export type UserRecord = {
  id: string; name: string; username: string; role: "OWNER" | "SUPERVISOR" | "CASHIER";
  outletId: string; active: boolean; passwordHash?: string; passwordSalt?: string; updatedAt: string;
};
export type AuditLogRecord = {
  id: string; userId: string; action: string; entity: string; entityId: string; detail: string; createdAt: string;
};
export type SyncQueueRecord = {
  id: string; tableName: string; recordId: string; createdAt: string; attempts: number; synced: boolean;
};
export type SettingRecord = { key: string; value: string; };

class MacaroniHolicDB extends Dexie {
  products!: Table<ProductRecord, string>;
  ingredients!: Table<IngredientRecord, string>;
  recipes!: Table<RecipeRecord, string>;
  suppliers!: Table<SupplierRecord, string>;
  purchases!: Table<PurchaseRecord, string>;
  stockMovements!: Table<StockMovementRecord, string>;
  sales!: Table<SaleRecord, string>;
  shifts!: Table<ShiftRecord, string>;
  expenses!: Table<ExpenseRecord, string>;
  outlets!: Table<OutletRecord, string>;
  users!: Table<UserRecord, string>;
  auditLogs!: Table<AuditLogRecord, string>;
  promos!: Table<PromoRecord, string>;
  syncQueue!: Table<SyncQueueRecord, string>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super("macaroni-holic-pos");
    this.version(1).stores({
      products: "id, category, active, updatedAt",
      sales: "id, invoiceNo, createdAt, synced",
    });
    this.version(2).stores({
      products: "id, sku, category, active, updatedAt",
      ingredients: "id, sku, category, updatedAt",
      recipes: "id, productId, updatedAt",
      suppliers: "id, name, updatedAt",
      purchases: "id, invoiceNo, supplierId, ingredientId, createdAt",
      stockMovements: "id, ingredientId, type, createdAt",
      sales: "id, invoiceNo, createdAt, outletId, userId, synced",
      shifts: "id, outletId, userId, status, startedAt",
      expenses: "id, outletId, userId, category, createdAt",
      outlets: "id, code, active, updatedAt",
      users: "id, username, role, outletId, active, updatedAt",
      auditLogs: "id, userId, entity, createdAt",
      syncQueue: "id, tableName, recordId, createdAt, synced",
      settings: "key",
    });
    this.version(3).stores({
      products: "id, sku, category, active, updatedAt",
      ingredients: "id, sku, category, updatedAt",
      recipes: "id, productId, updatedAt",
      suppliers: "id, name, updatedAt",
      purchases: "id, invoiceNo, supplierId, ingredientId, createdAt",
      stockMovements: "id, ingredientId, type, createdAt",
      sales: "id, invoiceNo, createdAt, outletId, userId, synced",
      shifts: "id, outletId, userId, status, startedAt",
      expenses: "id, outletId, userId, category, createdAt",
      outlets: "id, code, active, updatedAt",
      users: "id, username, role, outletId, active, updatedAt",
      auditLogs: "id, userId, entity, createdAt",
      syncQueue: "id, tableName, recordId, createdAt, synced",
      settings: "key",
      promos: "id, code, active, startDate, endDate, updatedAt"
    });
  }
}
export const db = new MacaroniHolicDB();
