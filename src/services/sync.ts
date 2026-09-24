const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export function cloudSyncConfigured(){ return Boolean(url && key); }
import { db } from "../db/db";
async function upsert(table:string, records:unknown[]){
  if(!url||!key||!records.length) return;
  const r=await fetch(url+"/rest/v1/"+table,{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(records)});
  if(!r.ok) throw new Error("Sync "+table+" gagal: "+r.status);
}
export async function syncPending(){
  if(!cloudSyncConfigured()) return {configured:false,synced:0};
  const sales=await db.sales.filter(s=>!s.synced).toArray();
  if(!sales.length) return {configured:true,synced:0};
  await upsert("sales",sales);
  await db.sales.bulkPut(sales.map(s=>({...s,synced:true})));
  return {configured:true,synced:sales.length};
}
