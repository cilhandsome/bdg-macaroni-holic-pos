import { db, type IngredientRecord, type ProductRecord, type RecipeRecord, type OutletRecord, type UserRecord, type SupplierRecord } from "./db";
import { hashPassword } from "../services/auth";
const now = () => new Date().toISOString();
const outlet: OutletRecord = { id:"outlet-bdg-01", code:"BDG01", name:"Macaroni Holic Bandung 01", address:"Bandung, Jawa Barat", phone:"", active:true, updatedAt:now() };
const users: UserRecord[] = [
  { id:"user-owner", name:"Owner", username:"owner", role:"OWNER", outletId:outlet.id, active:true, updatedAt:now() },
  { id:"user-supervisor", name:"Supervisor", username:"supervisor", role:"SUPERVISOR", outletId:outlet.id, active:true, updatedAt:now() },
  { id:"user-admin", name:"Admin Kasir", username:"admin", role:"CASHIER", outletId:outlet.id, active:true, updatedAt:now() }
];
const suppliers: SupplierRecord[] = [{ id:"supplier-default", name:"Supplier Utama", phone:"", address:"", updatedAt:now() }];
const products: ProductRecord[] = [
  { id:"mc-cheese-s",sku:"MH-MC-001-S",name:"Macaroni Cheese S",category:"Macaroni",price:5000,stock:0,productCost:0,emoji:"🧀",active:true,trackStock:false,size:"S",updatedAt:now() },
  { id:"mc-cheese-m",sku:"MH-MC-001-M",name:"Macaroni Cheese M",category:"Macaroni",price:10000,stock:0,productCost:0,emoji:"🧀",active:true,trackStock:false,size:"M",updatedAt:now() },
  { id:"mc-cheese-l",sku:"MH-MC-001-L",name:"Macaroni Cheese L",category:"Macaroni",price:15000,stock:0,productCost:0,emoji:"🧀",active:true,trackStock:false,size:"L",updatedAt:now() },

  { id:"mc-bolognese-s",sku:"MH-MC-002-S",name:"Macaroni Cheese Bolognese S",category:"Macaroni",price:5000,stock:0,productCost:0,emoji:"🍝",active:true,trackStock:false,size:"S",updatedAt:now() },
  { id:"mc-bolognese-m",sku:"MH-MC-002-M",name:"Macaroni Cheese Bolognese M",category:"Macaroni",price:10000,stock:0,productCost:0,emoji:"🍝",active:true,trackStock:false,size:"M",updatedAt:now() },
  { id:"mc-bolognese-l",sku:"MH-MC-002-L",name:"Macaroni Cheese Bolognese L",category:"Macaroni",price:15000,stock:0,productCost:0,emoji:"🍝",active:true,trackStock:false,size:"L",updatedAt:now() },

  { id:"mc-chicken-crispy-s",sku:"MH-MC-003-S",name:"Macaroni Cheese Chicken Crispy S",category:"Macaroni",price:10000,stock:0,productCost:0,emoji:"🍗",active:true,trackStock:false,size:"S",updatedAt:now() },
  { id:"mc-chicken-crispy-m",sku:"MH-MC-003-M",name:"Macaroni Cheese Chicken Crispy M",category:"Macaroni",price:15000,stock:0,productCost:0,emoji:"🍗",active:true,trackStock:false,size:"M",updatedAt:now() },
  { id:"mc-chicken-crispy-l",sku:"MH-MC-003-L",name:"Macaroni Cheese Chicken Crispy L",category:"Macaroni",price:20000,stock:0,productCost:0,emoji:"🍗",active:true,trackStock:false,size:"L",updatedAt:now() },

  { id:"mc-bol-chicken-crispy-s",sku:"MH-MC-004-S",name:"Macaroni Cheese Bolognese Chicken Crispy S",category:"Macaroni",price:10000,stock:0,productCost:0,emoji:"🍝",active:true,trackStock:false,size:"S",updatedAt:now() },
  { id:"mc-bol-chicken-crispy-m",sku:"MH-MC-004-M",name:"Macaroni Cheese Bolognese Chicken Crispy M",category:"Macaroni",price:15000,stock:0,productCost:0,emoji:"🍝",active:true,trackStock:false,size:"M",updatedAt:now() },
  { id:"mc-bol-chicken-crispy-l",sku:"MH-MC-004-L",name:"Macaroni Cheese Bolognese Chicken Crispy L",category:"Macaroni",price:20000,stock:0,productCost:0,emoji:"🍝",active:true,trackStock:false,size:"L",updatedAt:now() }
];
const ingredients: IngredientRecord[] = [
  { id:"ing-macaroni",sku:"ING-001",name:"Macaroni Special Khas KKI",category:"Bahan utama",unit:"g",packageSize:"800 gr",purchasePrice:21000,yieldMultiplier:2,stock:0,minStock:0,costPerUnit:12.35,includeInHpp:true,priceMode:"RO",updatedAt:now() },
  { id:"ing-topping-crispy",sku:"ING-002",name:"Tepung Crispy Istimewa",category:"Pelapis",unit:"g",packageSize:"800 gr",purchasePrice:17000,yieldMultiplier:1,stock:0,minStock:0,costPerUnit:17,includeInHpp:true,priceMode:"RO",updatedAt:now() },
  { id:"ing-sauce-bolognese",sku:"ING-003",name:"Saus Bolognese Special KKI",category:"Saus",unit:"g",packageSize:"500 gr",purchasePrice:25000,yieldMultiplier:1,stock:0,minStock:0,costPerUnit:50,includeInHpp:true,priceMode:"RO",updatedAt:now() },
  { id:"ing-cheese",sku:"ING-004",name:"Bubuk Keju Super Khas KKI",category:"Saus",unit:"ml",packageSize:"200 gr",purchasePrice:28000,yieldMultiplier:1,stock:0,minStock:0,costPerUnit:40,includeInHpp:true,priceMode:"RO",updatedAt:now() },
  { id:"ing-chili",sku:"ING-005",name:"Saus Chili",category:"Saus",unit:"ml",packageSize:"1 kg",purchasePrice:35000,yieldMultiplier:1,stock:0,minStock:0,costPerUnit:27.63,includeInHpp:true,priceMode:"MARKET",updatedAt:now() },
  { id:"ing-mayo",sku:"ING-006",name:"Mayonaise",category:"Saus",unit:"ml",packageSize:"1 kg",purchasePrice:30000,yieldMultiplier:1,stock:0,minStock:0,costPerUnit:23.7,includeInHpp:true,priceMode:"MARKET",updatedAt:now() },
  { id:"ing-chicken-fillet",sku:"ING-007",name:"Ayam Fillet",category:"Protein",unit:"g",packageSize:"1 kg",purchasePrice:58000,yieldMultiplier:1,stock:0,minStock:0,costPerUnit:58,includeInHpp:true,priceMode:"MARKET",updatedAt:now() },
  { id:"ing-oil",sku:"ING-008",name:"Minyak Goreng",category:"Bahan utama",unit:"ml",packageSize:"1 L",purchasePrice:22600,yieldMultiplier:1,stock:0,minStock:0,costPerUnit:22.6,includeInHpp:true,priceMode:"MARKET",updatedAt:now() },
  { id:"ing-parsley",sku:"ING-009",name:"Parsley",category:"Topping",unit:"g",packageSize:"",purchasePrice:180,yieldMultiplier:1,stock:0,minStock:0,costPerUnit:180,includeInHpp:true,priceMode:"MARKET",updatedAt:now() },
  { id:"ing-packaging-s",sku:"ING-010-S",name:"Packaging S",category:"Packaging",unit:"pcs",packageSize:"1 pcs",purchasePrice:0,yieldMultiplier:1,stock:0,minStock:0,costPerUnit:0,includeInHpp:true,priceMode:"MARKET",updatedAt:now() },
  { id:"ing-packaging-m",sku:"ING-010-M",name:"Packaging M",category:"Packaging",unit:"pcs",packageSize:"1 pcs",purchasePrice:1250,yieldMultiplier:1,stock:0,minStock:0,costPerUnit:1250,includeInHpp:true,priceMode:"MARKET",updatedAt:now() },
  { id:"ing-packaging-l",sku:"ING-010-L",name:"Packaging L",category:"Packaging",unit:"pcs",packageSize:"1 pcs",purchasePrice:1350,yieldMultiplier:1,stock:0,minStock:0,costPerUnit:1350,includeInHpp:true,priceMode:"MARKET",updatedAt:now() }
];
const recipes: RecipeRecord[] = [
  { id:"recipe-mc-cheese-s",productId:"mc-cheese-s",items:[
    {ingredientId:"ing-macaroni",quantity:80,unit:"g",estimated:true},
    {ingredientId:"ing-cheese",quantity:20,unit:"g",estimated:true},
    {ingredientId:"ing-chili",quantity:5,unit:"ml",estimated:true},
    {ingredientId:"ing-mayo",quantity:5,unit:"ml",estimated:true},
    {ingredientId:"ing-oil",quantity:2,unit:"ml",estimated:true},
    {ingredientId:"ing-parsley",quantity:1,unit:"g"},
    {ingredientId:"ing-packaging-s",quantity:1,unit:"pcs"}
  ],updatedAt:now() },
  { id:"recipe-mc-cheese-m",productId:"mc-cheese-m",items:[
    {ingredientId:"ing-macaroni",quantity:120,unit:"g"},
    {ingredientId:"ing-cheese",quantity:40,unit:"ml"},
    {ingredientId:"ing-chili",quantity:10,unit:"ml"},
    {ingredientId:"ing-mayo",quantity:10,unit:"ml"},
    {ingredientId:"ing-oil",quantity:3,unit:"ml"},
    {ingredientId:"ing-parsley",quantity:1,unit:"g"},
    {ingredientId:"ing-packaging-m",quantity:1,unit:"pcs"}
  ],updatedAt:now() },
  { id:"recipe-mc-cheese-l",productId:"mc-cheese-l",items:[
    {ingredientId:"ing-macaroni",quantity:160,unit:"g"},
    {ingredientId:"ing-cheese",quantity:60,unit:"ml"},
    {ingredientId:"ing-chili",quantity:20,unit:"ml"},
    {ingredientId:"ing-mayo",quantity:20,unit:"ml"},
    {ingredientId:"ing-oil",quantity:5,unit:"ml"},
    {ingredientId:"ing-parsley",quantity:1,unit:"g"},
    {ingredientId:"ing-packaging-l",quantity:1,unit:"pcs"}
  ],updatedAt:now() },

  { id:"recipe-mc-bolognese-s",productId:"mc-bolognese-s",items:[
    {ingredientId:"ing-macaroni",quantity:80,unit:"g",estimated:true},
    {ingredientId:"ing-sauce-bolognese",quantity:5,unit:"g",estimated:true},
    {ingredientId:"ing-cheese",quantity:20,unit:"ml",estimated:true},
    {ingredientId:"ing-chili",quantity:5,unit:"ml",estimated:true},
    {ingredientId:"ing-mayo",quantity:5,unit:"ml",estimated:true},
    {ingredientId:"ing-oil",quantity:2,unit:"ml",estimated:true},
    {ingredientId:"ing-parsley",quantity:1,unit:"g"},
    {ingredientId:"ing-packaging-s",quantity:1,unit:"pcs"}
  ],updatedAt:now() },
  { id:"recipe-mc-bolognese-m",productId:"mc-bolognese-m",items:[
    {ingredientId:"ing-macaroni",quantity:120,unit:"g"},
    {ingredientId:"ing-sauce-bolognese",quantity:10,unit:"g"},
    {ingredientId:"ing-cheese",quantity:40,unit:"ml"},
    {ingredientId:"ing-chili",quantity:10,unit:"ml"},
    {ingredientId:"ing-mayo",quantity:10,unit:"ml"},
    {ingredientId:"ing-oil",quantity:3,unit:"ml"},
    {ingredientId:"ing-parsley",quantity:1,unit:"g"},
    {ingredientId:"ing-packaging-m",quantity:1,unit:"pcs"}
  ],updatedAt:now() },
  { id:"recipe-mc-bolognese-l",productId:"mc-bolognese-l",items:[
    {ingredientId:"ing-macaroni",quantity:160,unit:"g"},
    {ingredientId:"ing-sauce-bolognese",quantity:15,unit:"g"},
    {ingredientId:"ing-cheese",quantity:60,unit:"ml"},
    {ingredientId:"ing-chili",quantity:20,unit:"ml"},
    {ingredientId:"ing-mayo",quantity:20,unit:"ml"},
    {ingredientId:"ing-oil",quantity:5,unit:"ml"},
    {ingredientId:"ing-parsley",quantity:1,unit:"g"},
    {ingredientId:"ing-packaging-l",quantity:1,unit:"pcs"}
  ],updatedAt:now() },

  { id:"recipe-mc-chicken-crispy-s",productId:"mc-chicken-crispy-s",items:[
    {ingredientId:"ing-macaroni",quantity:80,unit:"g",estimated:true},
    {ingredientId:"ing-cheese",quantity:20,unit:"ml",estimated:true},
    {ingredientId:"ing-chili",quantity:5,unit:"ml",estimated:true},
    {ingredientId:"ing-mayo",quantity:5,unit:"ml",estimated:true},
    {ingredientId:"ing-oil",quantity:2,unit:"ml",estimated:true},
    {ingredientId:"ing-chicken-fillet",quantity:25,unit:"g",estimated:true},
    {ingredientId:"ing-topping-crispy",quantity:25,unit:"g",estimated:true},
    {ingredientId:"ing-parsley",quantity:1,unit:"g"},
    {ingredientId:"ing-packaging-s",quantity:1,unit:"pcs"}
  ],updatedAt:now() },
  { id:"recipe-mc-chicken-crispy-m",productId:"mc-chicken-crispy-m",items:[
    {ingredientId:"ing-macaroni",quantity:120,unit:"g"},
    {ingredientId:"ing-cheese",quantity:40,unit:"ml"},
    {ingredientId:"ing-chili",quantity:10,unit:"ml"},
    {ingredientId:"ing-mayo",quantity:10,unit:"ml"},
    {ingredientId:"ing-oil",quantity:3,unit:"ml"},
    {ingredientId:"ing-chicken-fillet",quantity:50,unit:"g"},
    {ingredientId:"ing-topping-crispy",quantity:50,unit:"g"},
    {ingredientId:"ing-parsley",quantity:1,unit:"g"},
    {ingredientId:"ing-packaging-m",quantity:1,unit:"pcs"}
  ],updatedAt:now() },
  { id:"recipe-mc-chicken-crispy-l",productId:"mc-chicken-crispy-l",items:[
    {ingredientId:"ing-macaroni",quantity:160,unit:"g"},
    {ingredientId:"ing-cheese",quantity:60,unit:"ml"},
    {ingredientId:"ing-chili",quantity:20,unit:"ml"},
    {ingredientId:"ing-mayo",quantity:20,unit:"ml"},
    {ingredientId:"ing-oil",quantity:5,unit:"ml"},
    {ingredientId:"ing-chicken-fillet",quantity:50,unit:"g"},
    {ingredientId:"ing-topping-crispy",quantity:50,unit:"g"},
    {ingredientId:"ing-parsley",quantity:1,unit:"g"},
    {ingredientId:"ing-packaging-l",quantity:1,unit:"pcs"}
  ],updatedAt:now() },

  { id:"recipe-mc-bol-chicken-crispy-s",productId:"mc-bol-chicken-crispy-s",items:[
    {ingredientId:"ing-macaroni",quantity:80,unit:"g",estimated:true},
    {ingredientId:"ing-sauce-bolognese",quantity:5,unit:"g",estimated:true},
    {ingredientId:"ing-cheese",quantity:20,unit:"ml",estimated:true},
    {ingredientId:"ing-chili",quantity:5,unit:"ml",estimated:true},
    {ingredientId:"ing-mayo",quantity:5,unit:"ml",estimated:true},
    {ingredientId:"ing-oil",quantity:2,unit:"ml",estimated:true},
    {ingredientId:"ing-chicken-fillet",quantity:25,unit:"g",estimated:true},
    {ingredientId:"ing-topping-crispy",quantity:25,unit:"g",estimated:true},
    {ingredientId:"ing-parsley",quantity:1,unit:"g"},
    {ingredientId:"ing-packaging-s",quantity:1,unit:"pcs"}
  ],updatedAt:now() },
  { id:"recipe-mc-bol-chicken-crispy-m",productId:"mc-bol-chicken-crispy-m",items:[
    {ingredientId:"ing-macaroni",quantity:120,unit:"g"},
    {ingredientId:"ing-sauce-bolognese",quantity:10,unit:"g"},
    {ingredientId:"ing-cheese",quantity:40,unit:"ml"},
    {ingredientId:"ing-chili",quantity:10,unit:"ml"},
    {ingredientId:"ing-mayo",quantity:10,unit:"ml"},
    {ingredientId:"ing-oil",quantity:3,unit:"ml"},
    {ingredientId:"ing-chicken-fillet",quantity:50,unit:"g"},
    {ingredientId:"ing-topping-crispy",quantity:50,unit:"g"},
    {ingredientId:"ing-parsley",quantity:1,unit:"g"},
    {ingredientId:"ing-packaging-m",quantity:1,unit:"pcs"}
  ],updatedAt:now() },
  { id:"recipe-mc-bol-chicken-crispy-l",productId:"mc-bol-chicken-crispy-l",items:[
    {ingredientId:"ing-macaroni",quantity:160,unit:"g"},
    {ingredientId:"ing-sauce-bolognese",quantity:15,unit:"g"},
    {ingredientId:"ing-cheese",quantity:60,unit:"ml"},
    {ingredientId:"ing-chili",quantity:20,unit:"ml"},
    {ingredientId:"ing-mayo",quantity:20,unit:"ml"},
    {ingredientId:"ing-oil",quantity:5,unit:"ml"},
    {ingredientId:"ing-chicken-fillet",quantity:50,unit:"g"},
    {ingredientId:"ing-topping-crispy",quantity:50,unit:"g"},
    {ingredientId:"ing-parsley",quantity:1,unit:"g"},
    {ingredientId:"ing-packaging-l",quantity:1,unit:"pcs"}
  ],updatedAt:now() }
];
export async function seedDatabase(){
  if(await db.outlets.count()===0) await db.outlets.add(outlet);
  if(await db.users.count()===0) await db.users.bulkAdd(users);
  const defaultPasswords: Record<string,string> = {
    "user-owner":"owner123",
    "user-supervisor":"supervisor123",
    "user-admin":"admin123"
  };
  for (const u of users) {
    const existing = await db.users.get(u.id);
    if (!existing) {
      const credentials = await hashPassword(defaultPasswords[u.id] ?? "change-me");
      await db.users.put({...u,passwordHash:credentials.hash,passwordSalt:credentials.salt});
    } else if (!existing.passwordHash || !existing.passwordSalt) {
      const credentials = await hashPassword(defaultPasswords[u.id] ?? "change-me");
      await db.users.update(u.id,{passwordHash:credentials.hash,passwordSalt:credentials.salt,updatedAt:now()});
    }
  }
  if (!(await db.settings.get("authMigrationV1"))) {
    await db.settings.delete("currentUserId");
    await db.settings.put({key:"authMigrationV1",value:"done"});
  }
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
  const catalogMigrationKey = "catalogMigrationV6";
  const catalogMigrationDone = (await db.settings.get(catalogMigrationKey))?.value === "done";

  if (!catalogMigrationDone) {
    for (const product of products) {
      const existing = await db.products.get(product.id);
      if (!existing) {
        await db.products.add(product);
      } else {
        await db.products.update(product.id, {
          name: product.name,
          sku: product.sku,
          category: product.category,
          price: product.price,
          productCost: product.productCost ?? 0,
          size: product.size,
          active: true,
          updatedAt: now()
        });
      }
    }

    for (const ingredient of ingredients) {
      const existing = await db.ingredients.get(ingredient.id);
      if (!existing) await db.ingredients.add(ingredient);
      else await db.ingredients.update(ingredient.id, {
        name: ingredient.name,
        sku: ingredient.sku,
        category: ingredient.category,
        unit: ingredient.unit,
        packageSize: ingredient.packageSize,
        purchasePrice: ingredient.purchasePrice,
        yieldMultiplier: ingredient.yieldMultiplier,
        costPerUnit: ingredient.costPerUnit,
        includeInHpp: ingredient.includeInHpp,
        priceMode: ingredient.priceMode,
        updatedAt: now()
      });
    }

    for (const recipe of recipes) {
      await db.recipes.put(recipe);
    }

    await db.settings.put({key:catalogMigrationKey,value:"done"});
  }

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

  const defaults=[["companyName","Macaroni Holic"],["currentOutletId",outlet.id]];
  for(const [key,value] of defaults){ if(!(await db.settings.get(key))) await db.settings.add({key,value}); }
}
export async function loadActiveProducts(){ return db.products.toCollection().filter((p)=>p.active).toArray(); }
export async function getCurrentContext(){
  const outletId=(await db.settings.get("currentOutletId"))?.value ?? outlet.id;
  const userId=(await db.settings.get("currentUserId"))?.value ?? "user-admin";
  return { outlet:(await db.outlets.get(outletId))??outlet, user:(await db.users.get(userId))??users[2] };
}
