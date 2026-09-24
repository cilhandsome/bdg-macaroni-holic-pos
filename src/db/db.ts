import Dexie, { type Table } from "dexie";

export type ProductRecord = {
  id: string;
  name: string;
  category: "Macaroni" | "Snack" | "Drink" | "Topping";
  price: number;
  stock: number;
  emoji: string;
  active: boolean;
  updatedAt: string;
};

export type SaleRecord = {
  id: string;
  invoiceNo: string;
  orderType: "Take Away" | "Dine In";
  tableNumber: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  total: number;
  cashReceived: number;
  change: number;
  items: Array<{ productId: string; name: string; price: number; qty: number }>;
  createdAt: string;
  synced: boolean;
};

class MacaroniHolicDB extends Dexie {
  products!: Table<ProductRecord, string>;
  sales!: Table<SaleRecord, string>;

  constructor() {
    super("macaroni-holic-pos");
    this.version(1).stores({
      products: "id, category, active, updatedAt",
      sales: "id, invoiceNo, createdAt, synced",
    });
  }
}

export const db = new MacaroniHolicDB();
