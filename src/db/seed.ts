import { db, type ProductRecord } from "./db";

const seedProducts: ProductRecord[] = [
  { id: "mac-cheese", name: "Mac & Cheese", category: "Macaroni", price: 25000, stock: 18, emoji: "🧀", active: true, updatedAt: new Date().toISOString() },
  { id: "mac-beef", name: "Mac & Beef", category: "Macaroni", price: 30000, stock: 12, emoji: "🥩", active: true, updatedAt: new Date().toISOString() },
  { id: "spicy-mac", name: "Spicy Macaroni", category: "Macaroni", price: 27000, stock: 15, emoji: "🌶️", active: true, updatedAt: new Date().toISOString() },
  { id: "mac-chicken", name: "Mac & Chicken", category: "Macaroni", price: 28000, stock: 10, emoji: "🍗", active: true, updatedAt: new Date().toISOString() },
  { id: "fries", name: "French Fries", category: "Snack", price: 15000, stock: 25, emoji: "🍟", active: true, updatedAt: new Date().toISOString() },
  { id: "sausage", name: "Sausage", category: "Snack", price: 17000, stock: 20, emoji: "🌭", active: true, updatedAt: new Date().toISOString() },
  { id: "chicken-nugget", name: "Chicken Nugget", category: "Snack", price: 18000, stock: 16, emoji: "🍗", active: true, updatedAt: new Date().toISOString() },
  { id: "iced-tea", name: "Iced Tea", category: "Drink", price: 8000, stock: 40, emoji: "🧋", active: true, updatedAt: new Date().toISOString() },
  { id: "mineral", name: "Mineral Water", category: "Drink", price: 6000, stock: 50, emoji: "💧", active: true, updatedAt: new Date().toISOString() },
  { id: "cola", name: "Cola", category: "Drink", price: 9000, stock: 32, emoji: "🥤", active: true, updatedAt: new Date().toISOString() },
  { id: "extra-cheese", name: "Extra Cheese", category: "Topping", price: 6000, stock: 30, emoji: "🧀", active: true, updatedAt: new Date().toISOString() },
  { id: "extra-beef", name: "Extra Beef", category: "Topping", price: 9000, stock: 14, emoji: "🥩", active: true, updatedAt: new Date().toISOString() },
];

export async function seedDatabase() {
  const count = await db.products.count();
  if (count === 0) {
    await db.products.bulkAdd(seedProducts);
  }
}

export async function loadActiveProducts() {
  return db.products.toCollection().filter((product) => product.active).toArray();
}
