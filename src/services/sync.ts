import { db, type IngredientRecord, type ProductRecord, type RecipeRecord, type SaleRecord, type SupplierRecord, type PurchaseRecord, type StockMovementRecord, type ShiftRecord, type ExpenseRecord, type OutletRecord, type UserRecord, type AuditLogRecord, type PromoRecord } from "../db/db";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export function cloudSyncConfigured(){ return Boolean(url && key); }

type Row = Record<string, any>;
type CloudBundle = {
  outlets: Row[]; users: Row[]; products: Row[]; ingredients: Row[]; recipes: Row[];
  suppliers: Row[]; purchases: Row[]; stock_movements: Row[]; sales: Row[];
  shifts: Row[]; expenses: Row[]; audit_logs: Row[];
};

async function request(table:string, method:"GET"|"POST", body?:unknown){
  if(!url||!key) return [];
  const headers:Record<string,string>={apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"};
  if(method==="POST") headers.Prefer="resolution=merge-duplicates,return=minimal";
  const endpoint=url+"/rest/v1/"+table;
  const response=await fetch(method==="GET"?endpoint+"?select=*":endpoint,{
    method,headers,body:method==="POST"?JSON.stringify(body):undefined
  });
  if(!response.ok) throw new Error("Cloud sync "+table+" gagal: "+response.status+" "+await response.text());
  return method==="GET" ? await response.json() : [];
}

const mapProduct=(p:any)=>({id:p.id,sku:p.sku,name:p.name,category:p.category,price:Number(p.price)||0,stock:Number(p.stock)||0,productCost:Number(p.product_cost)||0,emoji:p.emoji||"🍝",active:p.active!==false,trackStock:p.track_stock!==false,size:p.size||undefined,updatedAt:p.updated_at||new Date(0).toISOString()});
const mapProductCloud=(p:ProductRecord)=>({id:p.id,sku:p.sku,name:p.name,category:p.category,price:p.price,stock:p.stock,product_cost:p.productCost||0,emoji:p.emoji,active:p.active,track_stock:p.trackStock,size:p.size||null,updated_at:p.updatedAt});

const mapIngredient=(i:any)=>({id:i.id,sku:i.sku,name:i.name,category:i.category,unit:i.unit,packageSize:i.package_size||"",purchasePrice:Number(i.purchase_price)||0,yieldMultiplier:Number(i.yield_multiplier)||1,stock:Number(i.stock)||0,minStock:Number(i.min_stock)||0,costPerUnit:Number(i.cost_per_unit)||0,includeInHpp:i.include_in_hpp!==false,priceMode:i.price_mode||"MANUAL",updatedAt:i.updated_at||new Date(0).toISOString()});
const mapIngredientCloud=(i:IngredientRecord)=>({id:i.id,sku:i.sku,name:i.name,category:i.category,unit:i.unit,package_size:i.packageSize||"",purchase_price:i.purchasePrice||0,yield_multiplier:i.yieldMultiplier||1,stock:i.stock,min_stock:i.minStock,cost_per_unit:i.costPerUnit,include_in_hpp:i.includeInHpp!==false,price_mode:i.priceMode||"MANUAL",updated_at:i.updatedAt});

const mapRecipe=(r:any):RecipeRecord=>({id:r.id,productId:r.product_id,items:r.items||[],updatedAt:r.updated_at||new Date(0).toISOString()});
const mapRecipeCloud=(r:RecipeRecord)=>({id:r.id,product_id:r.productId,items:r.items,updated_at:r.updatedAt});
const mapSupplier=(s:any):SupplierRecord=>({id:s.id,name:s.name,phone:s.phone||"",address:s.address||"",updatedAt:s.updated_at||new Date(0).toISOString()});
const mapSupplierCloud=(s:SupplierRecord)=>({id:s.id,name:s.name,phone:s.phone,address:s.address,updated_at:s.updatedAt});
const mapPurchase=(p:any):PurchaseRecord=>({id:p.id,invoiceNo:p.invoice_no,supplierId:p.supplier_id||"",ingredientId:p.ingredient_id||"",quantity:Number(p.quantity)||0,unit:p.unit,totalCost:Number(p.total_cost)||0,unitCost:Number(p.unit_cost)||0,createdAt:p.created_at});
const mapPurchaseCloud=(p:PurchaseRecord)=>({id:p.id,invoice_no:p.invoiceNo,supplier_id:p.supplierId,ingredient_id:p.ingredientId,quantity:p.quantity,unit:p.unit,total_cost:p.totalCost,unit_cost:p.unitCost,created_at:p.createdAt});
const mapMove=(m:any):StockMovementRecord=>({id:m.id,ingredientId:m.ingredient_id,type:m.type,quantity:Number(m.quantity)||0,reason:m.reason,referenceId:m.reference_id||undefined,createdAt:m.created_at});
const mapMoveCloud=(m:StockMovementRecord)=>({id:m.id,ingredient_id:m.ingredientId,type:m.type,quantity:m.quantity,reason:m.reason,reference_id:m.referenceId||null,created_at:m.createdAt});
const mapSale=(s:any):SaleRecord=>({id:s.id,invoiceNo:s.invoice_no,orderType:s.order_type,tableNumber:s.table_number||"",paymentMethod:s.payment_method,subtotal:Number(s.subtotal)||0,discount:Number(s.discount)||0,total:Number(s.total)||0,cashReceived:Number(s.cash_received)||0,change:Number(s.change)||0,costOfGoods:Number(s.cost_of_goods)||0,items:s.items||[],createdAt:s.created_at,outletId:s.outlet_id||"",userId:s.user_id||"",promoId:s.promo_id||undefined,promoCode:s.promo_code||undefined,promoName:s.promo_name||undefined,synced:true});
const mapSaleCloud=(s:SaleRecord)=>({id:s.id,invoice_no:s.invoiceNo,order_type:s.orderType,table_number:s.tableNumber,payment_method:s.paymentMethod,subtotal:s.subtotal,discount:s.discount,total:s.total,cash_received:s.cashReceived,change:s.change,cost_of_goods:s.costOfGoods,items:s.items,created_at:s.createdAt,outlet_id:s.outletId,user_id:s.userId,synced:true});
const mapShift=(s:any):ShiftRecord=>({id:s.id,outletId:s.outlet_id||"",userId:s.user_id||"",openingCash:Number(s.opening_cash)||0,closingCash:s.closing_cash==null?undefined:Number(s.closing_cash),expectedCash:s.expected_cash==null?undefined:Number(s.expected_cash),variance:s.variance==null?undefined:Number(s.variance),startedAt:s.started_at,endedAt:s.ended_at||undefined,status:s.status});
const mapShiftCloud=(s:ShiftRecord)=>({id:s.id,outlet_id:s.outletId,user_id:s.userId,opening_cash:s.openingCash,closing_cash:s.closingCash??null,expected_cash:s.expectedCash??null,variance:s.variance??null,started_at:s.startedAt,ended_at:s.endedAt??null,status:s.status});
const mapExpense=(e:any):ExpenseRecord=>({id:e.id,outletId:e.outlet_id||"",userId:e.user_id||"",category:e.category,description:e.description,amount:Number(e.amount)||0,paymentMethod:e.payment_method,createdAt:e.created_at});
const mapExpenseCloud=(e:ExpenseRecord)=>({id:e.id,outlet_id:e.outletId,user_id:e.userId,category:e.category,description:e.description,amount:e.amount,payment_method:e.paymentMethod,created_at:e.createdAt});
const mapOutlet=(o:any):OutletRecord=>({id:o.id,code:o.code,name:o.name,address:o.address||"",phone:o.phone||"",active:o.active!==false,updatedAt:o.updated_at});
const mapOutletCloud=(o:OutletRecord)=>({id:o.id,code:o.code,name:o.name,address:o.address,phone:o.phone,active:o.active,updated_at:o.updatedAt});
const mapUser=(u:any):UserRecord=>({id:u.id,name:u.name,username:u.username,role:u.role,outletId:u.outlet_id||"",active:u.active!==false,updatedAt:u.updated_at});
const mapUserCloud=(u:UserRecord)=>({id:u.id,name:u.name,username:u.username,role:u.role,outlet_id:u.outletId,active:u.active,updated_at:u.updatedAt});
const mapAudit=(a:any):AuditLogRecord=>({id:a.id,userId:a.user_id||"",action:a.action,entity:a.entity,entityId:a.entity_id,detail:a.detail||"",createdAt:a.created_at});
const mapAuditCloud=(a:AuditLogRecord)=>({id:a.id,user_id:a.userId,action:a.action,entity:a.entity,entity_id:a.entityId,detail:a.detail,created_at:a.createdAt});

function parsePromoAudit(a:any): PromoRecord | null {
  if(a?.entity!=="PROMO" || a?.action!=="UPSERT") return null;
  try {
    const promo=JSON.parse(a.detail||"null");
    if(!promo?.id || !promo?.code) return null;
    return promo as PromoRecord;
  } catch { return null; }
}

function parseSalePromoAudit(a:any) {
  if(a?.entity!=="SALE_PROMO" || a?.action!=="UPSERT") return null;
  try {
    const meta=JSON.parse(a.detail||"null");
    if(!meta?.saleId) return null;
    return meta as {saleId:string;promoId?:string;promoCode?:string;promoName?:string};
  } catch { return null; }
}

async function pullBundle():Promise<CloudBundle>{
  const names=["outlets","users","products","ingredients","recipes","suppliers","purchases","stock_movements","sales","shifts","expenses","audit_logs"];
  const values=await Promise.all(names.map(name=>request(name,"GET") as Promise<Row[]>));
  return Object.fromEntries(names.map((name,index)=>[name,values[index]])) as CloudBundle;
}

async function pushAll(){
  const [outlets,users,products,ingredients,recipes,suppliers,purchases,moves,sales,shifts,expenses,audits]=await Promise.all([
    db.outlets.toArray(),db.users.toArray(),db.products.toArray(),db.ingredients.toArray(),db.recipes.toArray(),db.suppliers.toArray(),
    db.purchases.toArray(),db.stockMovements.toArray(),db.sales.filter(s=>!s.synced).toArray(),db.shifts.toArray(),db.expenses.toArray(),db.auditLogs.toArray()
  ]);
  await request("outlets","POST",outlets.map(mapOutletCloud));
  await request("users","POST",users.map(mapUserCloud));
  await request("products","POST",products.map(mapProductCloud));
  await request("ingredients","POST",ingredients.map(mapIngredientCloud));
  await request("recipes","POST",recipes.map(mapRecipeCloud));
  await request("suppliers","POST",suppliers.map(mapSupplierCloud));
  await request("purchases","POST",purchases.map(mapPurchaseCloud));
  await request("stock_movements","POST",moves.map(mapMoveCloud));
  await request("sales","POST",sales.map(mapSaleCloud));
  await request("shifts","POST",shifts.map(mapShiftCloud));
  await request("expenses","POST",expenses.map(mapExpenseCloud));
  await request("audit_logs","POST",audits.map(mapAuditCloud));
  if(sales.length) await db.sales.bulkPut(sales.map(s=>({...s,synced:true})));
  return sales.length;
}

async function writeRemoteToLocal(remote:CloudBundle){
  if(remote.outlets.length) await db.outlets.bulkPut(remote.outlets.map(mapOutlet));
  const localUsers=await db.users.toArray();
  if(remote.users.length){
    const localById=new Map(localUsers.map(u=>[u.id,u]));
    const mergedUsers=remote.users.map(row=>{
      const remoteUser=mapUser(row); const local=localById.get(remoteUser.id);
      return local?{...remoteUser,passwordHash:local.passwordHash,passwordSalt:local.passwordSalt}:remoteUser;
    });
    await db.users.bulkPut(mergedUsers);
  }
  if(remote.products.length) await db.products.bulkPut(remote.products.map(mapProduct));
  if(remote.ingredients.length) await db.ingredients.bulkPut(remote.ingredients.map(mapIngredient));
  if(remote.recipes.length) await db.recipes.bulkPut(remote.recipes.map(mapRecipe));
  if(remote.suppliers.length) await db.suppliers.bulkPut(remote.suppliers.map(mapSupplier));
  if(remote.purchases.length) await db.purchases.bulkPut(remote.purchases.map(mapPurchase));
  if(remote.stock_movements.length) await db.stockMovements.bulkPut(remote.stock_movements.map(mapMove));
  if(remote.sales.length) await db.sales.bulkPut(remote.sales.map(mapSale));
  if(remote.shifts.length) await db.shifts.bulkPut(remote.shifts.map(mapShift));
  if(remote.expenses.length) await db.expenses.bulkPut(remote.expenses.map(mapExpense));
  if(remote.audit_logs.length) {
    await db.auditLogs.bulkPut(remote.audit_logs.map(mapAudit));
    const promoRows = new Map<string, PromoRecord>();
    const salePromoRows = new Map<string, {saleId:string;promoId?:string;promoCode?:string;promoName?:string}>();
    for(const row of remote.audit_logs){
      const promo=parsePromoAudit(row);
      if(promo){
        const current=promoRows.get(promo.id);
        if(!current || (promo.updatedAt||"") >= (current.updatedAt||"")) promoRows.set(promo.id,promo);
      }
      const salePromo=parseSalePromoAudit(row); if(salePromo) salePromoRows.set(salePromo.saleId,salePromo);
    }
    if(promoRows.size) await db.promos.bulkPut([...promoRows.values()]);
    if(salePromoRows.size){
      const remoteSales=await db.sales.toArray();
      for(const sale of remoteSales){
        const meta=salePromoRows.get(sale.id);
        if(meta) await db.sales.update(sale.id,{promoId:meta.promoId,promoCode:meta.promoCode,promoName:meta.promoName});
      }
    }
  }
}

export async function syncNow(){
  if(!cloudSyncConfigured()) return {configured:false,pushed:0,pulled:0};
  const remote=await pullBundle();
  const hasCloudData=remote.outlets.length||remote.products.length||remote.ingredients.length||remote.sales.length;
  const cloudBootstrapped=(await db.settings.get("cloudBootstrapV1"))?.value==="done";
  if(hasCloudData || cloudBootstrapped){
    await writeRemoteToLocal(remote);
  }
  const pushed=await pushAll();
  await db.settings.put({key:"cloudBootstrapV1",value:"done"});
  return {configured:true,pushed,pulled:remote.sales.length};
}

export async function syncPending(){ return syncNow(); }
