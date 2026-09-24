import { db, type SaleRecord } from "../db/db";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function cloudSyncConfigured(){ return Boolean(url && key); }

async function upsert(table:string, records:unknown[]){
  if(!url||!key||!records.length)return;
  const response=await fetch(url+"/rest/v1/"+table,{
    method:"POST",
    headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},
    body:JSON.stringify(records)
  });
  if(!response.ok)throw new Error("Sync "+table+" gagal: "+response.status);
}

const mapProduct=(p:any)=>({id:p.id,sku:p.sku,name:p.name,category:p.category,price:p.price,stock:p.stock,emoji:p.emoji,active:p.active,track_stock:p.trackStock,updated_at:p.updatedAt});
const mapIngredient=(i:any)=>({id:i.id,sku:i.sku,name:i.name,category:i.category,unit:i.unit,stock:i.stock,min_stock:i.minStock,cost_per_unit:i.costPerUnit,updated_at:i.updatedAt});
const mapRecipe=(r:any)=>({id:r.id,product_id:r.productId,items:r.items,updated_at:r.updatedAt});
const mapSupplier=(s:any)=>({id:s.id,name:s.name,phone:s.phone,address:s.address,updated_at:s.updatedAt});
const mapPurchase=(p:any)=>({id:p.id,invoice_no:p.invoiceNo,supplier_id:p.supplierId,ingredient_id:p.ingredientId,quantity:p.quantity,unit:p.unit,total_cost:p.totalCost,unit_cost:p.unitCost,created_at:p.createdAt});
const mapMove=(m:any)=>({id:m.id,ingredient_id:m.ingredientId,type:m.type,quantity:m.quantity,reason:m.reason,reference_id:m.referenceId,created_at:m.createdAt});
const mapSale=(s:SaleRecord)=>({id:s.id,invoice_no:s.invoiceNo,order_type:s.orderType,table_number:s.tableNumber,payment_method:s.paymentMethod,subtotal:s.subtotal,discount:s.discount,total:s.total,cash_received:s.cashReceived,change:s.change,cost_of_goods:s.costOfGoods,items:s.items,created_at:s.createdAt,outlet_id:s.outletId,user_id:s.userId,synced:true});
const mapShift=(s:any)=>({id:s.id,outlet_id:s.outletId,user_id:s.userId,opening_cash:s.openingCash,closing_cash:s.closingCash,expected_cash:s.expectedCash,variance:s.variance,started_at:s.startedAt,ended_at:s.endedAt,status:s.status});
const mapExpense=(e:any)=>({id:e.id,outlet_id:e.outletId,user_id:e.userId,category:e.category,description:e.description,amount:e.amount,payment_method:e.paymentMethod,created_at:e.createdAt});
const mapOutlet=(o:any)=>({id:o.id,code:o.code,name:o.name,address:o.address,phone:o.phone,active:o.active,updated_at:o.updatedAt});
const mapUser=(u:any)=>({id:u.id,name:u.name,username:u.username,role:u.role,outlet_id:u.outletId,active:u.active,updated_at:u.updatedAt});
const mapAudit=(a:any)=>({id:a.id,user_id:a.userId,action:a.action,entity:a.entity,entity_id:a.entityId,detail:a.detail,created_at:a.createdAt});

export async function syncPending(){
  if(!cloudSyncConfigured())return {configured:false,synced:0};
  const [outlets,users,products,ingredients,recipes,suppliers,purchases,moves,sales,shifts,expenses,audits]=await Promise.all([
    db.outlets.toArray(),db.users.toArray(),db.products.toArray(),db.ingredients.toArray(),db.recipes.toArray(),db.suppliers.toArray(),
    db.purchases.toArray(),db.stockMovements.toArray(),db.sales.filter(s=>!s.synced).toArray(),db.shifts.toArray(),db.expenses.toArray(),db.auditLogs.toArray()
  ]);
  await upsert("outlets",outlets.map(mapOutlet));
  await upsert("users",users.map(mapUser));
  await upsert("products",products.map(mapProduct));
  await upsert("ingredients",ingredients.map(mapIngredient));
  await upsert("recipes",recipes.map(mapRecipe));
  await upsert("suppliers",suppliers.map(mapSupplier));
  await upsert("purchases",purchases.map(mapPurchase));
  await upsert("stock_movements",moves.map(mapMove));
  await upsert("sales",sales.map(mapSale));
  await upsert("shifts",shifts.map(mapShift));
  await upsert("expenses",expenses.map(mapExpense));
  await upsert("audit_logs",audits.map(mapAudit));
  if(sales.length) await db.sales.bulkPut(sales.map(s=>({...s,synced:true})));
  return {configured:true,synced:sales.length};
}
