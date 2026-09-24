import { db, type IngredientRecord, type ProductRecord, type RecipeRecord, type OutletRecord, type UserRecord, type SupplierRecord } from "./db";
const now = () => new Date().toISOString();
const outlet: OutletRecord = { id:"outlet-bdg-01", code:"BDG01", name:"Macaroni Holic Bandung 01", address:"Bandung, Jawa Barat", phone:"", active:true, updatedAt:now() };
const users: UserRecord[] = [
  { id:"user-owner", name:"Owner", username:"owner", role:"OWNER", outletId:outlet.id, active:true, updatedAt:now() },
  { id:"user-admin", name:"Admin Kasir", username:"admin", role:"CASHIER", outletId:outlet.id, active:true, updatedAt:now() }
];
const suppliers: SupplierRecord[] = [{ id:"supplier-default", name:"Supplier Utama", phone:"", address:"", updatedAt:now() }];
const products: ProductRecord[] = [
  { id:"mc-cheese-s",sku:"MH-MC-001-S",name:"Macaroni Cheese S",category:"Macaroni",price:0,stock:0,emoji:"🧀",active:true,trackStock:false,size:"S",updatedAt:now() },
  { id:"mc-cheese-m",sku:"MH-MC-001-M",name:"Macaroni Cheese M",category:"Macaroni",price:0,stock:0,emoji:"🧀",active:true,trackStock:false,size:"M",updatedAt:now() },
  { id:"mc-cheese-l",sku:"MH-MC-001-L",name:"Macaroni Cheese L",category:"Macaroni",price:0,stock:0,emoji:"🧀",active:true,trackStock:false,size:"L",updatedAt:now() },
  { id:"mc-bolognese-s",sku:"MH-MC-002-S",name:"Macaroni Cheese Bolognese S",category:"Macaroni",price:0,stock:0,emoji:"🍝",active:true,trackStock:false,size:"S",updatedAt:now() },
  { id:"mc-bolognese-m",sku:"MH-MC-002-M",name:"Macaroni Cheese Bolognese M",category:"Macaroni",price:0,stock:0,emoji:"🍝",active:true,trackStock:false,size:"M",updatedAt:now() },
  { id:"mc-bolognese-l",sku:"MH-MC-002-L",name:"Macaroni Cheese Bolognese L",category:"Macaroni",price:0,stock:0,emoji:"🍝",active:true,trackStock:false,size:"L",updatedAt:now() },
  { id:"mc-chicken-crispy-s",sku:"MH-MC-003-S",name:"Macaroni Cheese Chicken Crispy S",category:"Macaroni",price:0,stock:0,emoji:"🍗",active:true,trackStock:false,size:"S",updatedAt:now() },
  { id:"mc-chicken-crispy-m",sku:"MH-MC-003-M",name:"Macaroni Cheese Chicken Crispy M",category:"Macaroni",price:0,stock:0,emoji:"🍗",active:true,trackStock:false,size:"M",updatedAt:now() },
  { id:"mc-chicken-crispy-l",sku:"MH-MC-003-L",name:"Macaroni Cheese Chicken Crispy L",category:"Macaroni",price:0,stock:0,emoji:"🍗",active:true,trackStock:false,size:"L",updatedAt:now() }
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
  const temporaryDemoIds = [
    "mac-cheese","mac-beef","spicy-mac","mac-chicken",
    "fries","sausage","chicken-nugget","iced-tea","mineral","cola","extra-cheese","extra-beef"
  ];
  for (const id of temporaryDemoIds) {
    await db.recipes.where("productId").equals(id).delete();
    await db.products.delete(id);
  }
  if (await db.products.where("category").equals("Macaroni").count() < products.length) {
    for (const product of products) {
      if (!(await db.products.get(product.id))) await db.products.add(product);
    }
  }
  if(await db.ingredients.count()===0) await db.ingredients.bulkAdd(ingredients);
  if(await db.recipes.count()===0) await db.recipes.bulkAdd(recipes);

  const currentProducts=await db.products.toArray();
  const recipeIds=new Set((await db.recipes.toArray()).map(r=>r.productId));
  for(const product of currentProducts){
    const patch: Partial<typeof product> = {};
    if(!product.sku) patch.sku="MH-"+product.id.toUpperCase().slice(0,10);
    if(product.trackStock===undefined) patch.trackStock=!recipeIds.has(product.id);
    if(Object.keys(patch).length) await db.products.update(product.id,patch);
  }

  const currentSales=await db.sales.toArray();
  for(const sale of currentSales){
    const patch: Partial<typeof sale> = {};
    if(sale.costOfGoods===undefined) patch.costOfGoods=0;
    if(sale.outletId===undefined) patch.outletId=outlet.id;
    if(sale.userId===undefined) patch.userId="user-admin";
    if(Object.keys(patch).length) await db.sales.update(sale.id,patch);
  }

  const defaults=[["companyName","Macaroni Holic"],["currentOutletId",outlet.id],["currentUserId","user-admin"]];
  for(const [key,value] of defaults){ if(!(await db.settings.get(key))) await db.settings.add({key,value}); }
}
export async function loadActiveProducts(){ return db.products.toCollection().filter((p)=>p.active).toArray(); }
export async function getCurrentContext(){
  const outletId=(await db.settings.get("currentOutletId"))?.value ?? outlet.id;
  const userId=(await db.settings.get("currentUserId"))?.value ?? "user-admin";
  return { outlet:(await db.outlets.get(outletId))??outlet, user:(await db.users.get(userId))??users[1] };
}
