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

function mapSale(s:SaleRecord){
  return {
    id:s.id,
    invoice_no:s.invoiceNo,
    order_type:s.orderType,
    table_number:s.tableNumber,
    payment_method:s.paymentMethod,
    subtotal:s.subtotal,
    discount:s.discount,
    total:s.total,
    cash_received:s.cashReceived,
    change:s.change,
    cost_of_goods:s.costOfGoods,
    items:s.items,
    created_at:s.createdAt,
    outlet_id:s.outletId,
    user_id:s.userId,
    synced:true
  };
}

export async function syncPending(){
  if(!cloudSyncConfigured())return {configured:false,synced:0};
  const pending=await db.sales.filter(s=>!s.synced).toArray();
  if(!pending.length)return {configured:true,synced:0};
  await upsert("sales",pending.map(mapSale));
  await db.sales.bulkPut(pending.map(s=>({...s,synced:true})));
  return {configured:true,synced:pending.length};
}
