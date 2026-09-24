import { db, type IngredientRecord, type ProductRecord, type RecipeRecord, type OutletRecord, type UserRecord, type SupplierRecord } from "./db";
const now = () => new Date().toISOString();
const outlet: OutletRecord = { id:"outlet-bdg-01", code:"BDG01", name:"Macaroni Holic Bandung 01", address:"Bandung, Jawa Barat", phone:"", active:true, updatedAt:now() };
const users: UserRecord[] = [
  { id:"user-owner", name:"Owner", username:"owner", role:"OWNER", outletId:outlet.id, active:true, updatedAt:now() },
  { id:"user-admin", name:"Admin Kasir", username:"admin", role:"CASHIER", outletId:outlet.id, active:true, updatedAt:now() }
];
const suppliers: SupplierRecord[] = [{ id:"supplier-default", name:"Supplier Utama", phone:"", address:"", updatedAt:now() }];
const products: ProductRecord[] = [
  { id:"mac-cheese",sku:"MH-MAC-001",name:"Mac & Cheese",category:"Macaroni",price:25000,stock:0,emoji:"🧀",active:true,trackStock:false,updatedAt:now() },
  { id:"mac-beef",sku:"MH-MAC-002",name:"Mac & Beef",category:"Macaroni",price:30000,stock:0,emoji:"🥩",active:true,trackStock:false,updatedAt:now() },
  { id:"spicy-mac",sku:"MH-MAC-003",name:"Spicy Macaroni",category:"Macaroni",price:27000,stock:0,emoji:"🌶️",active:true,trackStock:false,updatedAt:now() },
  { id:"mac-chicken",sku:"MH-MAC-004",name:"Mac & Chicken",category:"Macaroni",price:28000,stock:0,emoji:"🍗",active:true,trackStock:false,updatedAt:now() },
  { id:"fries",sku:"MH-SNK-001",name:"French Fries",category:"Snack",price:15000,stock:25,emoji:"🍟",active:true,trackStock:true,updatedAt:now() },
  { id:"sausage",sku:"MH-SNK-002",name:"Sausage",category:"Snack",price:17000,stock:20,emoji:"🌭",active:true,trackStock:true,updatedAt:now() },
  { id:"chicken-nugget",sku:"MH-SNK-003",name:"Chicken Nugget",category:"Snack",price:18000,stock:16,emoji:"🍗",active:true,trackStock:true,updatedAt:now() },
  { id:"iced-tea",sku:"MH-DRK-001",name:"Iced Tea",category:"Drink",price:8000,stock:40,emoji:"🧋",active:true,trackStock:true,updatedAt:now() },
  { id:"mineral",sku:"MH-DRK-002",name:"Mineral Water",category:"Drink",price:6000,stock:50,emoji:"💧",active:true,trackStock:true,updatedAt:now() },
  { id:"cola",sku:"MH-DRK-003",name:"Cola",category:"Drink",price:9000,stock:32,emoji:"🥤",active:true,trackStock:true,updatedAt:now() },
  { id:"extra-cheese",sku:"MH-TOP-001",name:"Extra Cheese",category:"Topping",price:6000,stock:30,emoji:"🧀",active:true,trackStock:true,updatedAt:now() },
  { id:"extra-beef",sku:"MH-TOP-002",name:"Extra Beef",category:"Topping",price:9000,stock:14,emoji:"🥩",active:true,trackStock:true,updatedAt:now() }
];
const ingredients: IngredientRecord[] = [
  { id:"ing-macaroni",sku:"ING-001",name:"Macaroni",category:"Bahan utama",unit:"g",stock:15000,minStock:3000,costPerUnit:22,updatedAt:now() },
  { id:"ing-cheese",sku:"ING-002",name:"Keju",category:"Bahan utama",unit:"g",stock:5000,minStock:1000,costPerUnit:60,updatedAt:now() },
  { id:"ing-sauce",sku:"ING-003",name:"Saus",category:"Bumbu",unit:"g",stock:6000,minStock:1500,costPerUnit:20,updatedAt:now() },
  { id:"ing-milk",sku:"ING-004",name:"Susu",category:"Bahan utama",unit:"ml",stock:10000,minStock:2000,costPerUnit:18,updatedAt:now() },
  { id:"ing-beef",sku:"ING-005",name:"Beef",category:"Protein",unit:"g",stock:5000,minStock:1000,costPerUnit:100,updatedAt:now() },
  { id:"ing-chicken",sku:"ING-006",name:"Chicken",category:"Protein",unit:"g",stock:5000,minStock:1000,costPerUnit:70,updatedAt:now() },
  { id:"ing-spicy",sku:"ING-007",name:"Bumbu Pedas",category:"Bumbu",unit:"g",stock:3000,minStock:500,costPerUnit:25,updatedAt:now() },
  { id:"ing-cup",sku:"ING-008",name:"Cup / Packaging",category:"Packaging",unit:"pcs",stock:500,minStock:100,costPerUnit:800,updatedAt:now() },
  { id:"ing-spoon",sku:"ING-009",name:"Sendok",category:"Packaging",unit:"pcs",stock:500,minStock:100,costPerUnit:200,updatedAt:now() }
];
const recipes: RecipeRecord[] = [
  { id:"recipe-mac-cheese",productId:"mac-cheese",items:[{ingredientId:"ing-macaroni",quantity:100,unit:"g"},{ingredientId:"ing-cheese",quantity:30,unit:"g"},{ingredientId:"ing-sauce",quantity:50,unit:"g"},{ingredientId:"ing-milk",quantity:50,unit:"ml"},{ingredientId:"ing-cup",quantity:1,unit:"pcs"},{ingredientId:"ing-spoon",quantity:1,unit:"pcs"}],updatedAt:now() },
  { id:"recipe-mac-beef",productId:"mac-beef",items:[{ingredientId:"ing-macaroni",quantity:100,unit:"g"},{ingredientId:"ing-cheese",quantity:30,unit:"g"},{ingredientId:"ing-sauce",quantity:50,unit:"g"},{ingredientId:"ing-milk",quantity:50,unit:"ml"},{ingredientId:"ing-beef",quantity:50,unit:"g"},{ingredientId:"ing-cup",quantity:1,unit:"pcs"},{ingredientId:"ing-spoon",quantity:1,unit:"pcs"}],updatedAt:now() },
  { id:"recipe-spicy-mac",productId:"spicy-mac",items:[{ingredientId:"ing-macaroni",quantity:100,unit:"g"},{ingredientId:"ing-sauce",quantity:50,unit:"g"},{ingredientId:"ing-spicy",quantity:15,unit:"g"},{ingredientId:"ing-cup",quantity:1,unit:"pcs"},{ingredientId:"ing-spoon",quantity:1,unit:"pcs"}],updatedAt:now() },
  { id:"recipe-mac-chicken",productId:"mac-chicken",items:[{ingredientId:"ing-macaroni",quantity:100,unit:"g"},{ingredientId:"ing-cheese",quantity:30,unit:"g"},{ingredientId:"ing-sauce",quantity:50,unit:"g"},{ingredientId:"ing-milk",quantity:50,unit:"ml"},{ingredientId:"ing-chicken",quantity:50,unit:"g"},{ingredientId:"ing-cup",quantity:1,unit:"pcs"},{ingredientId:"ing-spoon",quantity:1,unit:"pcs"}],updatedAt:now() }
];
export async function seedDatabase(){
  if(await db.outlets.count()===0) await db.outlets.add(outlet);
  if(await db.users.count()===0) await db.users.bulkAdd(users);
  if(await db.suppliers.count()===0) await db.suppliers.bulkAdd(suppliers);
  if(await db.products.count()===0) await db.products.bulkAdd(products);
  if(await db.ingredients.count()===0) await db.ingredients.bulkAdd(ingredients);
  if(await db.recipes.count()===0) await db.recipes.bulkAdd(recipes);
  const defaults=[["companyName","Macaroni Holic"],["currentOutletId",outlet.id],["currentUserId","user-admin"]];
  for(const [key,value] of defaults){ if(!(await db.settings.get(key))) await db.settings.add({key,value}); }
}
export async function loadActiveProducts(){ return db.products.toCollection().filter((p)=>p.active).toArray(); }
export async function getCurrentContext(){
  const outletId=(await db.settings.get("currentOutletId"))?.value ?? outlet.id;
  const userId=(await db.settings.get("currentUserId"))?.value ?? "user-admin";
  return { outlet:(await db.outlets.get(outletId))??outlet, user:(await db.users.get(userId))??users[1] };
}
