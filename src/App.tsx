import { Component, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from "react";
import {
  db,
  type ProductRecord, type IngredientRecord, type RecipeRecord, type SaleRecord,
  type PurchaseRecord, type ExpenseRecord, type ShiftRecord, type SupplierRecord,
  type OutletRecord, type UserRecord, type StockMovementRecord
} from "./db/db";
import { getCurrentContext, loadActiveProducts, seedDatabase } from "./db/seed";
import { cloudSyncConfigured, syncPending } from "./services/sync";

type View = "dashboard" | "pos" | "history" | "products" | "ingredients" | "recipes" | "purchases" | "stock" | "expenses" | "shift" | "reports" | "outlets" | "users" | "settings";
type Category = "Semua" | "Macaroni" | "Snack" | "Drink" | "Topping";
type CartItem = ProductRecord & { qty: number };

class ErrorBoundary extends Component<{
  children: ReactNode;
}, {
  hasError: boolean;
  message: string;
}> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unknown runtime error",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Macaroni Holic POS runtime error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="runtime-error-screen">
          <div className="runtime-error-card">
            <div className="runtime-error-mark">!</div>
            <h1>Aplikasi mengalami error</h1>
            <p>{this.state.message}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const allCategories: Exclude<Category, "Semua">[] = ["Macaroni", "Snack", "Drink", "Topping"];
const rupiah = (v: number) => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v);
const today = () => new Date().toISOString().slice(0,10);
const dateLabel = (v: string) => new Date(v).toLocaleString("id-ID");

function downloadJson(filename:string,data:unknown){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}

export default function App(){
  const [view,setView]=useState<View>("dashboard");
  const [products,setProducts]=useState<ProductRecord[]>([]);
  const [ingredients,setIngredients]=useState<IngredientRecord[]>([]);
  const [recipes,setRecipes]=useState<RecipeRecord[]>([]);
  const [sales,setSales]=useState<SaleRecord[]>([]);
  const [purchases,setPurchases]=useState<PurchaseRecord[]>([]);
  const [expenses,setExpenses]=useState<ExpenseRecord[]>([]);
  const [shifts,setShifts]=useState<ShiftRecord[]>([]);
  const [stockMoves,setStockMoves]=useState<StockMovementRecord[]>([]);
  const [suppliers,setSuppliers]=useState<SupplierRecord[]>([]);
  const [outlets,setOutlets]=useState<OutletRecord[]>([]);
  const [users,setUsers]=useState<UserRecord[]>([]);
  const [context,setContext]=useState<{outlet:OutletRecord;user:UserRecord}|null>(null);
  const [loading,setLoading]=useState(true);
  const [notice,setNotice]=useState(""); const [error,setError]=useState("");

  const [category,setCategory]=useState<Category>("Semua"); const [query,setQuery]=useState("");
  const [cart,setCart]=useState<CartItem[]>([]); const [orderType,setOrderType]=useState<"Take Away"|"Dine In">("Take Away");
  const [tableNumber,setTableNumber]=useState(""); const [paymentOpen,setPaymentOpen]=useState(false);
  const [paymentMethod,setPaymentMethod]=useState("Cash"); const [cashReceived,setCashReceived]=useState("");
  const [receiptSale,setReceiptSale]=useState<SaleRecord|null>(null);

  const [productForm,setProductForm]=useState({id:"",sku:"",name:"",size:"" as ""|"S"|"M"|"L",category:"Macaroni" as Exclude<Category,"Semua">,price:"",stock:"",trackStock:false});
  const [ingredientForm,setIngredientForm]=useState({id:"",sku:"",name:"",category:"Bahan utama",unit:"g",stock:"",minStock:"",costPerUnit:"",includeInHpp:true,priceMode:"RO" as "RO"|"MARKET"|"MANUAL",packageSize:""});
  const [recipeForm,setRecipeForm]=useState({productId:"",ingredientId:"",qty:""});
  const [purchaseForm,setPurchaseForm]=useState({ingredientId:"",supplierId:"",quantity:"",totalCost:""});
  const [stockForm,setStockForm]=useState({ingredientId:"",type:"IN" as "IN"|"OUT"|"ADJUSTMENT",quantity:"",reason:""});
  const [expenseForm,setExpenseForm]=useState({category:"Operasional",description:"",amount:"",paymentMethod:"Cash"});
  const [openingCash,setOpeningCash]=useState(""); const [closingCash,setClosingCash]=useState("");
  const [selectedId,setSelectedId]=useState("");

  const refresh=async()=>{
    const [p,i,r,s,pu,e,sh,sm,su,o,u,c]=await Promise.all([
      loadActiveProducts(),db.ingredients.toArray(),db.recipes.toArray(),db.sales.orderBy("createdAt").reverse().toArray(),
      db.purchases.orderBy("createdAt").reverse().toArray(),db.expenses.orderBy("createdAt").reverse().toArray(),
      db.shifts.orderBy("startedAt").reverse().toArray(),db.stockMovements.orderBy("createdAt").reverse().toArray(),
      db.suppliers.toArray(),db.outlets.toArray(),db.users.toArray(),getCurrentContext()
    ]);
    setProducts(p);setIngredients(i);setRecipes(r);setSales(s);setPurchases(pu);setExpenses(e);setShifts(sh);setStockMoves(sm);setSuppliers(su);setOutlets(o);setUsers(u);setContext(c);
  };

  useEffect(()=>{void(async()=>{try{await seedDatabase();await refresh();}catch(e){setError(e instanceof Error?e.message:"Aplikasi gagal dimuat.");}finally{setLoading(false);}})();},[]);

  const filteredProducts=useMemo(()=>products.filter(p=>
    (category==="Semua"||p.category===category) && (p.name+" "+p.sku).toLowerCase().includes(query.toLowerCase())
  ),[products,category,query]);

  const availableCategories = useMemo<Category[]>(() => {
    const present = new Set(products.map((p) => p.category));
    return ["Semua", ...allCategories.filter((item) => present.has(item))];
  }, [products]);


  const recipeCost=(productId:string)=>{
    const r=recipes.find(x=>x.productId===productId);
    return r ? r.items.reduce((sum,line) => {
    const ingredient = ingredients.find(i => i.id === line.ingredientId);
    if (!ingredient || ingredient.includeInHpp === false) return sum;
    return sum + (ingredient.costPerUnit ?? 0) * line.quantity;
  }, 0) : 0;
  };
  const todaySales=sales.filter(s=>s.createdAt.startsWith(today()));
  const todayRevenue=todaySales.reduce((n,s)=>n+s.total,0);
  const todayCogs=todaySales.reduce((n,s)=>n+(Number(s.costOfGoods)||0),0);
  const todayExpense=expenses.filter(e=>e.createdAt.startsWith(today())).reduce((n,e)=>n+e.amount,0);
  const lowStock=ingredients.filter(i=>i.stock<=i.minStock);
  const activeShift=shifts.find(s=>s.status==="OPEN"&&s.outletId===context?.outlet.id&&s.userId===context?.user.id)??null;

  function addCart(p:ProductRecord){
    try {
      if (!p || !p.id) return;
      const safeProduct: ProductRecord = {
        id: String(p.id),
        sku: String(p.sku ?? ""),
        name: String(p.name ?? "Produk"),
        category: p.category,
        price: Number(p.price) || 0,
        stock: Number(p.stock) || 0,
        emoji: String(p.emoji ?? "🍝"),
        active: p.active !== false,
        trackStock: p.trackStock === true,
        updatedAt: String(p.updatedAt ?? new Date().toISOString()),
      };
      setCart((list) => {
        const existing = list.find((x) => x.id === safeProduct.id);
        if (safeProduct.trackStock && (!existing ? safeProduct.stock < 1 : existing.qty >= safeProduct.stock)) return list;
        return existing
          ? list.map((x) => x.id === safeProduct.id ? { ...x, qty: x.qty + 1 } : x)
          : [...list, { ...safeProduct, qty: 1 }];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Produk gagal ditambahkan ke keranjang.");
    }
  }
  function changeQty(id:string,delta:number){setCart(list=>list.map(x=>x.id===id?{...x,qty:x.qty+delta}:x).filter(x=>x.qty>0));}

  const cartSubtotal=cart.reduce((n,x)=>n+(Number(x.price)||0)*(Number(x.qty)||0),0);
  const total=cartSubtotal; const received=Number(cashReceived)||0; const change=Math.max(received-total,0);

  async function checkout(){
    if(!context||!cart.length)return;
    if(paymentMethod==="Cash"&&received<total){setError("Nominal pembayaran belum mencukupi.");return;}
    const invoice="MH-"+today().replaceAll("-","")+"-"+String(Date.now()).slice(-5); const createdAt=new Date().toISOString();
    try{
      let created:SaleRecord|null=null;
      const validated: Array<{ item: CartItem; recipe: RecipeRecord | undefined }> = [];
      let cogs = 0;

      for (const item of cart) {
        const p = await db.products.get(item.id);
        if (!p) throw new Error("Produk tidak ditemukan.");
        const recipe = await db.recipes.where("productId").equals(p.id).first();
        if (recipe) {
          for (const line of recipe.items) {
            const ing = await db.ingredients.get(line.ingredientId);
            const needed = line.quantity * item.qty;
            if (!ing || ing.stock < needed) throw new Error("Stok " + (ing?.name ?? "bahan") + " tidak mencukupi.");
            if (ing.includeInHpp !== false) cogs += ing.costPerUnit * line.quantity * item.qty;
          }
        } else if (p.trackStock && p.stock < item.qty) {
          throw new Error("Stok " + p.name + " tidak mencukupi.");
        }
        validated.push({ item, recipe });
      }

      for (const { item, recipe } of validated) {
        if (recipe) {
          for (const line of recipe.items) {
            const ing = await db.ingredients.get(line.ingredientId);
            if (!ing) throw new Error("Bahan resep tidak ditemukan.");
            const needed = line.quantity * item.qty;
            await db.ingredients.update(ing.id, { stock: ing.stock - needed, updatedAt: createdAt });
            await db.stockMovements.add({
              id: crypto.randomUUID(),
              ingredientId: ing.id,
              type: "OUT",
              quantity: needed,
              reason: "Penjualan " + invoice,
              referenceId: invoice,
              createdAt,
            });
          }
        } else if (item.trackStock) {
          const p = await db.products.get(item.id);
          if (!p) throw new Error("Produk tidak ditemukan.");
          await db.products.update(p.id, { stock: p.stock - item.qty, updatedAt: createdAt });
        }
      }

      created = {
        id: crypto.randomUUID(),
        invoiceNo: invoice,
        orderType,
        tableNumber: orderType === "Dine In" ? tableNumber : "",
        paymentMethod,
        subtotal: cartSubtotal,
        discount: 0,
        total,
        cashReceived: paymentMethod === "Cash" ? received : total,
        change: paymentMethod === "Cash" ? change : 0,
        costOfGoods: cogs,
        items: cart.map(i => ({
          productId: i.id,
          name: i.name,
          price: i.price,
          qty: i.qty,
          cost: recipeCost(i.id),
        })),
        createdAt,
        outletId: context.outlet.id,
        userId: context.user.id,
        synced: false,
      };
      await db.sales.add(created);
      await db.syncQueue.add({id:crypto.randomUUID(),tableName:"sales",recordId:created.id,createdAt,attempts:0,synced:false});
      await refresh(); setReceiptSale(null); setCart([]); setCashReceived(""); setTableNumber(""); setPaymentOpen(false); setView("history"); setNotice(invoice+" tersimpan di perangkat.");
    }catch(e){setError(e instanceof Error?e.message:"Transaksi gagal.");}
  }

  async function saveProduct(){
    if(!productForm.name)return;
    const record:ProductRecord={id:productForm.id||crypto.randomUUID(),sku:productForm.sku||"MH-"+Date.now().toString().slice(-6),name:productForm.size ? productForm.name + " " + productForm.size : productForm.name,category:productForm.category,price:Number(productForm.price)||0,stock:Number(productForm.stock)||0,emoji:"🍝",active:true,trackStock:productForm.trackStock,size:productForm.size || undefined,updatedAt:new Date().toISOString()};
    await db.products.put(record);await refresh();setProductForm({id:"",sku:"",name:"",size:"",category:"Macaroni",price:"",stock:"",trackStock:false});setNotice("Produk tersimpan.");
  }
  function editIngredient(ingredient: IngredientRecord){
    setIngredientForm({
      id: ingredient.id,
      sku: ingredient.sku,
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      packageSize: ingredient.packageSize ?? "",
      stock: String(ingredient.stock ?? ""),
      minStock: String(ingredient.minStock ?? ""),
      costPerUnit: String(ingredient.costPerUnit ?? ""),
      includeInHpp: ingredient.includeInHpp !== false,
      priceMode: ingredient.priceMode ?? "MANUAL"
    });
    setNotice("Mode edit: " + ingredient.name);
  }

  function resetIngredientForm(){
    setIngredientForm({id:"",sku:"",name:"",category:"Bahan utama",unit:"g",stock:"",minStock:"",costPerUnit:"",includeInHpp:true,priceMode:"RO",packageSize:""});
  }

  async function saveIngredient(){
    if(!ingredientForm.name)return;
    const record:IngredientRecord={id:ingredientForm.id||crypto.randomUUID(),sku:ingredientForm.sku||"ING-"+Date.now().toString().slice(-6),name:ingredientForm.name,category:ingredientForm.category,unit:ingredientForm.unit,stock:Number(ingredientForm.stock)||0,minStock:Number(ingredientForm.minStock)||0,costPerUnit:Number(ingredientForm.costPerUnit)||0,includeInHpp:ingredientForm.includeInHpp,priceMode:ingredientForm.priceMode,packageSize:ingredientForm.packageSize,updatedAt:new Date().toISOString()};
    await db.ingredients.put(record);await refresh();setIngredientForm({id:"",sku:"",name:"",category:"Bahan utama",unit:"g",stock:"",minStock:"",costPerUnit:"",includeInHpp:true,priceMode:"RO",packageSize:""});setNotice("Bahan baku tersimpan.");
  }
  async function addRecipeItem(){
    if(!recipeForm.productId||!recipeForm.ingredientId||!recipeForm.qty)return;
    const existing=await db.recipes.where("productId").equals(recipeForm.productId).first();
    const items=existing?[...existing.items]:[];
    items.push({ingredientId:recipeForm.ingredientId,quantity:Number(recipeForm.qty),unit:ingredients.find(i=>i.id===recipeForm.ingredientId)?.unit??"unit"});
    await db.recipes.put({id:existing?.id??crypto.randomUUID(),productId:recipeForm.productId,items,updatedAt:new Date().toISOString()});
    await refresh();setRecipeForm(x=>({...x,qty:""}));setNotice("Komponen resep ditambahkan.");
  }
  async function removeRecipeItem(recipeId:string,ingredientId:string){
    const r=await db.recipes.get(recipeId);if(!r)return;
    await db.recipes.put({...r,items:r.items.filter(x=>x.ingredientId!==ingredientId),updatedAt:new Date().toISOString()});await refresh();
  }
  async function receivePurchase(){
    const ing=ingredients.find(i=>i.id===purchaseForm.ingredientId);const qty=Number(purchaseForm.quantity)||0;const cost=Number(purchaseForm.totalCost)||0;
    if(!ing||qty<=0)return;
    const now=new Date().toISOString();const inv="PO-"+today().replaceAll("-","")+"-"+String(Date.now()).slice(-4);
    await db.ingredients.update(ing.id,{stock:ing.stock+qty,costPerUnit:cost/qty||ing.costPerUnit,updatedAt:now});
    await db.purchases.add({id:crypto.randomUUID(),invoiceNo:inv,supplierId:purchaseForm.supplierId||"supplier-default",ingredientId:ing.id,quantity:qty,unit:ing.unit,totalCost:cost,unitCost:cost/qty||0,createdAt:now});
    await db.stockMovements.add({id:crypto.randomUUID(),ingredientId:ing.id,type:"IN",quantity:qty,reason:"Pembelian "+inv,createdAt:now});
;
    await refresh();setPurchaseForm({ingredientId:"",supplierId:"",quantity:"",totalCost:""});setNotice("Pembelian dicatat.");
  }
  async function adjustStock(){
    const ing=ingredients.find(i=>i.id===stockForm.ingredientId);const q=Number(stockForm.quantity)||0;if(!ing||q<0||!stockForm.reason)return;
    const delta=stockForm.type==="IN"?q:stockForm.type==="OUT"?-q:q-ing.stock;const next=Math.max(0,ing.stock+delta);const now=new Date().toISOString();
    await db.ingredients.update(ing.id,{stock:next,updatedAt:now});
    await db.stockMovements.add({id:crypto.randomUUID(),ingredientId:ing.id,type:stockForm.type,quantity:Math.abs(delta),reason:stockForm.reason,createdAt:now});
;
    await refresh();setStockForm({ingredientId:"",type:"IN",quantity:"",reason:""});setNotice("Stok disesuaikan.");
  }
  async function saveExpense(){
    if(!context||!expenseForm.description)return;const amount=Number(expenseForm.amount)||0;if(amount<=0)return;
    await db.expenses.add({id:crypto.randomUUID(),outletId:context.outlet.id,userId:context.user.id,category:expenseForm.category,description:expenseForm.description,amount,paymentMethod:expenseForm.paymentMethod,createdAt:new Date().toISOString()});
    await refresh();setExpenseForm({category:"Operasional",description:"",amount:"",paymentMethod:"Cash"});setNotice("Pengeluaran tersimpan.");
  }
  async function openShift(){
    if(!context||activeShift)return;
    await db.shifts.add({id:crypto.randomUUID(),outletId:context.outlet.id,userId:context.user.id,openingCash:Number(openingCash)||0,startedAt:new Date().toISOString(),status:"OPEN"});
    await refresh();setOpeningCash("");setNotice("Shift dibuka.");
  }
  async function closeShift(){
    if(!activeShift)return;
    const cashSales=sales.filter(s=>s.createdAt>=activeShift.startedAt&&s.paymentMethod==="Cash").reduce((n,s)=>n+s.total,0);
    const cashExpenses=expenses.filter(e=>e.createdAt>=activeShift.startedAt&&e.paymentMethod==="Cash").reduce((n,e)=>n+e.amount,0);
    const expected=activeShift.openingCash+cashSales-cashExpenses;const actual=Number(closingCash)||0;
    await db.shifts.update(activeShift.id,{closingCash:actual,expectedCash:expected,variance:actual-expected,endedAt:new Date().toISOString(),status:"CLOSED"});
    await refresh();setClosingCash("");setNotice("Shift ditutup.");
  }
  async function backup(){
    const data={products:await db.products.toArray(),ingredients:await db.ingredients.toArray(),recipes:await db.recipes.toArray(),suppliers:await db.suppliers.toArray(),purchases:await db.purchases.toArray(),stockMovements:await db.stockMovements.toArray(),sales:await db.sales.toArray(),shifts:await db.shifts.toArray(),expenses:await db.expenses.toArray(),outlets:await db.outlets.toArray(),users:await db.users.toArray(),auditLogs:await db.auditLogs.toArray(),settings:await db.settings.toArray()};
    downloadJson("macaroni-holic-backup-"+today()+".json",data);setNotice("Backup dibuat.");
  }
  async function restore(file:File){
    try{
      const p=JSON.parse(await file.text()) as Record<string,unknown[]>;
      await Promise.all([
        db.products.clear(),db.ingredients.clear(),db.recipes.clear(),db.suppliers.clear(),db.purchases.clear(),db.stockMovements.clear(),
        db.sales.clear(),db.shifts.clear(),db.expenses.clear(),db.outlets.clear(),db.users.clear(),db.auditLogs.clear(),db.settings.clear()
      ]);
      if(p.products)await db.products.bulkAdd(p.products as ProductRecord[]);
      if(p.ingredients)await db.ingredients.bulkAdd(p.ingredients as IngredientRecord[]);
      if(p.recipes)await db.recipes.bulkAdd(p.recipes as RecipeRecord[]);
      if(p.suppliers)await db.suppliers.bulkAdd(p.suppliers as SupplierRecord[]);
      if(p.purchases)await db.purchases.bulkAdd(p.purchases as PurchaseRecord[]);
      if(p.stockMovements)await db.stockMovements.bulkAdd(p.stockMovements as StockMovementRecord[]);
      if(p.sales)await db.sales.bulkAdd(p.sales as SaleRecord[]);
      if(p.shifts)await db.shifts.bulkAdd(p.shifts as ShiftRecord[]);
      if(p.expenses)await db.expenses.bulkAdd(p.expenses as ExpenseRecord[]);
      if(p.outlets)await db.outlets.bulkAdd(p.outlets as OutletRecord[]);
      if(p.users)await db.users.bulkAdd(p.users as UserRecord[]);
      if(p.auditLogs)await db.auditLogs.bulkAdd(p.auditLogs as any[]);
      if(p.settings)await db.settings.bulkAdd(p.settings as any[]);
      await refresh();setNotice("Backup dipulihkan.");
    }catch(e){setError("Backup tidak valid atau gagal dipulihkan.");}
  }
  async function doSync(){
    try{const r=await syncPending();setNotice(r.configured?"Sinkronisasi selesai: "+r.synced+" transaksi.":"Supabase belum dikonfigurasi; mode offline tetap aktif.");await refresh();}
    catch(e){setError(e instanceof Error?e.message:"Sinkronisasi gagal.");}
  }
  async function activateUser(user:UserRecord){
    await db.settings.put({key:"currentUserId",value:user.id});await refresh();setSelectedId("");setNotice("User aktif: "+user.name);
  }
  async function editOutlet(){
    const o=outlets.find(x=>x.id===selectedId);if(!o)return;const name=window.prompt("Nama outlet",o.name);if(name){await db.outlets.update(o.id,{name,updatedAt:new Date().toISOString()});await refresh();setNotice("Outlet diperbarui.");}
  }
  async function editUser(){
    const u=users.find(x=>x.id===selectedId);if(!u)return;const name=window.prompt("Nama user",u.name);if(name){await db.users.update(u.id,{name,updatedAt:new Date().toISOString()});await refresh();setNotice("User diperbarui.");}
  }

  const nav=[
    ["dashboard","Dashboard","▦"],["pos","Kasir","🛒"],["history","Transaksi","↺"],["products","Produk","🍝"],["ingredients","Bahan Baku","📦"],["recipes","Resep & HPP","🧾"],["purchases","Pembelian","🚚"],["stock","Stok","📊"],["expenses","Pengeluaran","💸"],["shift","Shift Kasir","⏱️"],["reports","Laporan","📈"],["outlets","Outlet","🏪"],["users","Pengguna","👤"],["settings","Pengaturan","⚙️"]
  ] as Array<[View,string,string]>;

  if(loading)return <div className="loading-screen">Memuat Macaroni Holic POS…</div>;

  return <div className="app-frame">
    <aside className="main-nav">
      <div className="nav-brand"><div className="brand-mark">MH</div><div><strong>MACARONI HOLIC</strong><small>POS MANAGEMENT</small></div></div>
      <div className="nav-menu">{nav.map(([id,label,icon])=><button key={id} className={view===id?"nav-item active":"nav-item"} onClick={()=>setView(id)}><span>{icon}</span>{label}</button>)}</div>
      <div className="nav-bottom"><div className="mini-status"><span/>{cloudSyncConfigured()?"Cloud configured":"Offline-first"}</div></div>
    </aside>
    <main className="main-stage">
      <header className="global-header">
        <div><div className="header-kicker">{context?.outlet.name}</div><h1>{nav.find(n=>n[0]===view)?.[1]}</h1></div>
        <div className="global-actions"><div className="connection-pill"><span/>{navigator.onLine?"Online":"Offline"}</div><button className="header-button" onClick={()=>void doSync()}>Sync</button><button className="header-user">{context?.user.name} · {context?.user.role}</button></div>
      </header>
      {notice&&<div className="global-notice success">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
      {error&&<div className="global-notice error">{error}<button onClick={()=>setError("")}>×</button></div>}

      {view==="dashboard"&&<Dashboard sales={todaySales} revenue={todayRevenue} cogs={todayCogs} expense={todayExpense} lowStock={lowStock}/>}
      {view==="pos"&&<POS categories={availableCategories} category={category} setCategory={setCategory} products={filteredProducts} query={query} setQuery={setQuery} addCart={addCart} cart={cart} clearCart={()=>setCart([])} changeQty={changeQty} total={total} cartSubtotal={cartSubtotal} orderType={orderType} setOrderType={setOrderType} tableNumber={tableNumber} setTableNumber={setTableNumber} onPay={()=>setPaymentOpen(true)}/>}
      {view==="history"&&<History sales={sales} onOpen={setReceiptSale}/>}
      {view==="products"&&<Products products={products} form={productForm} setForm={setProductForm} onSave={()=>void saveProduct()}/>}
      {view==="ingredients"&&<Ingredients ingredients={ingredients} lowStock={lowStock} form={ingredientForm} setForm={setIngredientForm} onSave={()=>void saveIngredient()} onEdit={editIngredient} onReset={resetIngredientForm}/>} 
      {view==="recipes"&&<Recipes products={products} ingredients={ingredients} recipes={recipes} form={recipeForm} setForm={setRecipeForm} cost={recipeCost} onAdd={()=>void addRecipeItem()} onRemove={(r,i)=>void removeRecipeItem(r,i)}/>}
      {view==="purchases"&&<Purchases ingredients={ingredients} suppliers={suppliers} purchases={purchases} form={purchaseForm} setForm={setPurchaseForm} onSave={()=>void receivePurchase()}/>}
      {view==="stock"&&<Stock ingredients={ingredients} movements={stockMoves} form={stockForm} setForm={setStockForm} onSave={()=>void adjustStock()}/>}
      {view==="expenses"&&<Expenses expenses={expenses} form={expenseForm} setForm={setExpenseForm} onSave={()=>void saveExpense()}/>}
      {view==="shift"&&<Shift active={activeShift} shifts={shifts} opening={openingCash} setOpening={setOpeningCash} closing={closingCash} setClosing={setClosingCash} onOpen={()=>void openShift()} onClose={()=>void closeShift()}/>}
      {view==="reports"&&<Reports sales={sales} expenses={expenses} products={products}/>}
      {view==="outlets"&&<AdminList title="Outlet" items={outlets.map(o=>({id:o.id,title:o.name,meta:o.code+" · "+o.address}))} selected={selectedId} setSelected={setSelectedId} onEdit={()=>void editOutlet()}/>}
      {view==="users"&&<Users users={users} selected={selectedId} setSelected={setSelectedId} onEdit={()=>void editUser()} onActivate={(u)=>void activateUser(u)}/>}
      {view==="settings"&&<Settings onBackup={()=>void backup()} onRestore={(f)=>void restore(f)} onSync={()=>void doSync()}/>}

      {paymentOpen&&<Modal title="Pembayaran" onClose={()=>setPaymentOpen(false)}><div className="payment-total">{rupiah(total)}</div><div className="payment-methods">{["Cash","QRIS","Debit","Transfer"].map(m=><button key={m} className={paymentMethod===m?"method-button active":"method-button"} onClick={()=>setPaymentMethod(m)}>{m}</button>)}</div>{paymentMethod==="Cash"&&<label className="field">Uang diterima<input inputMode="numeric" value={cashReceived} onChange={e=>setCashReceived(e.target.value.replace(/\\D/g,""))}/><span>Kembalian: <strong>{rupiah(change)}</strong></span></label>}<button className="confirm-pay" disabled={paymentMethod==="Cash"&&received<total} onClick={()=>void checkout()}>Konfirmasi Pembayaran</button></Modal>}
      {receiptSale&&<Receipt sale={receiptSale} onClose={()=>setReceiptSale(null)}/>}
    </main>
  </div>;
}

function Dashboard({sales,revenue,cogs,expense,lowStock}:{sales:SaleRecord[];revenue:number;cogs:number;expense:number;lowStock:IngredientRecord[]}){
  return <section className="page-section"><div className="kpi-grid"><Kpi title="Omzet Hari Ini" value={rupiah(revenue)} meta={sales.length+" transaksi"}/><Kpi title="HPP Hari Ini" value={rupiah(cogs)} meta="Cost of Goods Sold"/><Kpi title="Laba Kotor" value={rupiah(revenue-cogs)} meta="Sales - HPP"/><Kpi title="Laba Setelah Expense" value={rupiah(revenue-cogs-expense)} meta={rupiah(expense)+" expense"}/></div><div className="dashboard-grid"><Panel title="Transaksi Terbaru"><div className="simple-table">{sales.slice(0,8).map(s=><div className="table-row" key={s.id}><div><strong>{s.invoiceNo}</strong><small>{dateLabel(s.createdAt)} · {s.paymentMethod}</small></div><strong>{rupiah(s.total)}</strong></div>)}{!sales.length&&<Empty text="Belum ada transaksi hari ini."/>}</div></Panel><Panel title="Stok Menipis"><div className="simple-table">{lowStock.slice(0,8).map(i=><div className="table-row" key={i.id}><div><strong>{i.name}</strong><small>{i.stock} {i.unit} tersisa</small></div><span className="danger-text">Min {i.minStock}</span></div>)}{!lowStock.length&&<Empty text="Semua stok aman."/>}</div></Panel></div></section>;
}
function Kpi({title,value,meta}:{title:string;value:string;meta:string}){return <div className="kpi-card"><span>{title}</span><strong>{value}</strong><small>{meta}</small></div>}
function Panel({title,children}:{title:string;children:ReactNode}){return <div className="panel"><div className="panel-title">{title}</div>{children}</div>}
function Empty({text}:{text:string}){return <div className="empty-box">{text}</div>}
function Field({label,value,onChange,type="text"}:{label:string;value:string;onChange:(v:string)=>void;type?:string}){return <label className="field">{label}<input type={type} value={value} onChange={e=>onChange(e.target.value)}/></label>}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){return <div className="modal-backdrop"><div className="modal-box"><div className="modal-head"><h3>{title}</h3><button onClick={onClose}>×</button></div>{children}</div></div>}

function POS({
  categories,category,setCategory,products,query,setQuery,addCart,cart,clearCart,changeQty,total,cartSubtotal,
  orderType,setOrderType,tableNumber,setTableNumber,onPay
}:{
  categories:Category[]; category:Category; setCategory:(x:Category)=>void;
  products:ProductRecord[]; query:string; setQuery:(x:string)=>void; addCart:(p:ProductRecord)=>void;
  cart:CartItem[]; clearCart:()=>void; changeQty:(id:string,d:number)=>void; total:number; cartSubtotal:number;
  orderType:"Take Away"|"Dine In"; setOrderType:(x:"Take Away"|"Dine In")=>void;
  tableNumber:string; setTableNumber:(x:string)=>void; onPay:()=>void
}){
  const safeProducts = Array.isArray(products) ? products.filter(Boolean) : [];
  const safeCart = Array.isArray(cart) ? cart.filter(Boolean) : [];
  const itemCount = safeCart.reduce((sum,item)=>sum+(Number(item.qty)||0),0);

  return (
    <section className="pos-workspace">
      <aside className="category-panel">
        <div className="section-label">Kategori</div>
        {categories.map((c)=>
          <button key={c} type="button" className={category===c?"category-button active":"category-button"} onClick={()=>setCategory(c)}>{c}</button>
        )}
      </aside>

      <div className="catalog-area">
        <div className="catalog-toolbar">
          <div><div className="page-kicker">Kasir</div><h2>Pesanan Baru</h2></div>
          <div className="search-wrap">
            <span>⌕</span>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari menu atau SKU..." />
          </div>
        </div>

        <div className="product-grid">
          {safeProducts.length ? safeProducts.map((p)=>{
            const price=Number(p.price)||0;
            const stock=Number(p.stock)||0;
            const disabled=p.trackStock===true && stock<=0;
            return (
              <button
                key={String(p.id)}
                type="button"
                className="menu-card"
                disabled={disabled}
                onClick={()=>addCart(p)}
              >
                <div className="menu-image">{p.emoji || "🍝"}</div>
                <div>
                  <div className="menu-name">{p.name || "Produk"}</div>
                  <div className="menu-price">{rupiah(price)}</div>
                  <div className="menu-meta">{p.trackStock===true ? "Stok "+stock : "Recipe stock"}</div>
                </div>
                <div className="menu-add">+</div>
              </button>
            );
          }) : <Empty text="Belum ada produk aktif." />}
        </div>
      </div>

      <aside className="cart-panel">
        <div className="cart-head">
          <div><div className="page-kicker">Pesanan</div><h2>Keranjang <span>{itemCount}</span></h2></div>
          {safeCart.length>0 && <button type="button" className="clear-button" onClick={clearCart}>Kosongkan</button>}
        </div>

        <div className="order-type-row">
          <button type="button" className={orderType==="Take Away"?"type-button active":"type-button"} onClick={()=>setOrderType("Take Away")}>Take Away</button>
          <button type="button" className={orderType==="Dine In"?"type-button active":"type-button"} onClick={()=>setOrderType("Dine In")}>Dine In</button>
        </div>

        {orderType==="Dine In" && <input className="table-input" value={tableNumber} onChange={e=>setTableNumber(e.target.value)} placeholder="Nomor meja" />}

        <div className="cart-items">
          {safeCart.length===0 ? <Empty text="Keranjang masih kosong."/> : safeCart.map((i)=>{
            const price=Number(i.price)||0;
            const qty=Number(i.qty)||0;
            return (
              <div className="cart-item" key={String(i.id)}>
                <div className="cart-item-icon">{i.emoji || "🍝"}</div>
                <div>
                  <strong>{i.name || "Produk"}</strong>
                  <small>{rupiah(price)}</small>
                  <div className="qty-control">
                    <button type="button" onClick={()=>changeQty(i.id,-1)}>−</button>
                    <span>{qty}</span>
                    <button type="button" onClick={()=>changeQty(i.id,1)}>+</button>
                  </div>
                </div>
                <strong>{rupiah(price*qty)}</strong>
              </div>
            );
          })}
        </div>

        <div className="cart-summary">
          <div><span>Subtotal</span><strong>{rupiah(Number(cartSubtotal)||0)}</strong></div>
          <div><span>Diskon</span><strong>{rupiah(0)}</strong></div>
          <div className="summary-total"><span>Total</span><strong>{rupiah(Number(total)||0)}</strong></div>
          <button type="button" className="pay-button" disabled={safeCart.length===0} onClick={onPay}>Bayar · {rupiah(Number(total)||0)}</button>
        </div>
      </aside>
    </section>
  );
}

function History({sales,onOpen}:{sales:SaleRecord[];onOpen:(s:SaleRecord)=>void}){
  const rows = Array.isArray(sales) ? sales.filter(Boolean) : [];
  return <section className="page-section">
    <Panel title="Riwayat Transaksi">
      <div className="simple-table">
        {rows.length ? rows.map((s) => (
          <button
            className="table-row clickable"
            key={String(s.id)}
            type="button"
            onClick={() => onOpen(s)}
          >
            <div>
              <strong>{s.invoiceNo || "Tanpa nomor"}</strong>
              <small>
                {s.createdAt ? dateLabel(s.createdAt) : "Tanggal tidak tersedia"} · {s.paymentMethod || "—"} · {s.orderType || "—"}
              </small>
            </div>
            <strong>{rupiah(Number(s.total) || 0)}</strong>
          </button>
        )) : <Empty text="Belum ada transaksi." />}
      </div>
    </Panel>
  </section>;
}

function Products({products,form,setForm,onSave}:{products:ProductRecord[];form:any;setForm:(v:any)=>void;onSave:()=>void}){
  const resetForm=()=>setForm({id:"",sku:"",name:"",size:"",category:"Macaroni",price:"",stock:"",trackStock:false});
  return <section className="page-section"><div className="products-toolbar"><div><div className="page-kicker">Menu</div><h2>Master Menu</h2><p>Kelola menu yang tampil di kasir.</p></div><button className="primary-button toolbar-button" type="button" onClick={resetForm}>＋ Tambah Menu</button></div><div className="content-grid"><Panel title="Form Menu"><div className="form-grid"><Field label="SKU" value={form.sku} onChange={v=>setForm({...form,sku:v})}/><Field label="Nama menu" value={form.name} onChange={v=>setForm({...form,name:v})}/><label className="field">Ukuran<select value={form.size} onChange={e=>setForm({...form,size:e.target.value})}><option value="">Tanpa ukuran</option><option value="S">S</option><option value="M">M</option><option value="L">L</option></select></label><label className="field">Kategori<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{["Macaroni","Snack","Drink","Topping"].map(x=><option key={x}>{x}</option>)}</select></label><Field label="Harga jual" type="number" value={form.price} onChange={v=>setForm({...form,price:v})}/><Field label="Stok awal" type="number" value={form.stock} onChange={v=>setForm({...form,stock:v})}/><label className="checkbox"><input type="checkbox" checked={form.trackStock} onChange={e=>setForm({...form,trackStock:e.target.checked})}/> Track stok produk</label></div><button className="primary-button" onClick={onSave}>Simpan Produk</button></Panel><Panel title="Daftar Produk"><div className="simple-table">{products.map(p=><div className="table-row" key={p.id}><div><strong>{p.name}</strong><small>{p.sku} · {p.category}{p.size ? " · Ukuran " + p.size : ""}</small></div><div><strong>{p.price > 0 ? rupiah(p.price) : "Harga belum diatur"}</strong><small>{p.trackStock?"Stok "+p.stock:"Recipe stock"}</small></div></div>)}</div></Panel></div></section>}
function Ingredients({
  ingredients,lowStock,form,setForm,onSave,onEdit,onReset
}:{
  ingredients:IngredientRecord[];
  lowStock:IngredientRecord[];
  form:any;
  setForm:(v:any)=>void;
  onSave:()=>void;
  onEdit:(ingredient:IngredientRecord)=>void;
  onReset:()=>void;
}){
  const editing=Boolean(form.id);
  return <section className="page-section">
    <div className="content-grid">
      <Panel title={editing ? "Edit Bahan Baku" : "Tambah Bahan Baku"}>
        <div className="form-grid">
          <Field label="SKU" value={form.sku} onChange={v=>setForm({...form,sku:v})}/>
          <Field label="Nama" value={form.name} onChange={v=>setForm({...form,name:v})}/>
          <Field label="Kategori" value={form.category} onChange={v=>setForm({...form,category:v})}/>
          <Field label="Satuan pemakaian" value={form.unit} onChange={v=>setForm({...form,unit:v})}/>
          <Field label="Kemasan pembelian" value={form.packageSize} onChange={v=>setForm({...form,packageSize:v})}/>
          <Field label="Stok" type="number" value={form.stock} onChange={v=>setForm({...form,stock:v})}/>
          <Field label="Minimum" type="number" value={form.minStock} onChange={v=>setForm({...form,minStock:v})}/>
          <Field label="HPP / satuan" type="number" value={form.costPerUnit} onChange={v=>setForm({...form,costPerUnit:v})}/>
          <label className="field">Sumber harga
            <select value={form.priceMode} onChange={e=>setForm({...form,priceMode:e.target.value})}>
              <option value="RO">Harga RO / supplier</option>
              <option value="MARKET">Harga pasar — dapat berubah</option>
              <option value="MANUAL">Manual</option>
            </select>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={form.includeInHpp} onChange={e=>setForm({...form,includeInHpp:e.target.checked})}/>
            Masukkan ke HPP
          </label>
        </div>
        <div className="form-actions">
          <button className="primary-button" onClick={onSave}>{editing ? "Simpan Perubahan" : "Tambah Bahan"}</button>
          {editing && <button className="secondary-button" onClick={onReset}>Batal Edit</button>}
        </div>
      </Panel>

      <Panel title={"Daftar Bahan (" + ingredients.length + ")"}>
        <div className="simple-table">
          {ingredients.map(i=>
            <div className="table-row ingredient-row" key={i.id}>
              <button className="table-row-main" type="button" onClick={()=>onEdit(i)}>
                <div>
                  <strong>{i.name}</strong>
                  <small>{i.sku} · {i.packageSize || "Kemasan belum diatur"}</small>
                </div>
                <div className={i.stock<=i.minStock?"danger-text":""}>
                  <strong>{rupiah(i.costPerUnit)} / {i.unit}</strong>
                  <small>{i.includeInHpp===false?"Di luar HPP":"Masuk HPP"} · {i.priceMode==="MARKET"?"Harga pasar":i.priceMode==="RO"?"Harga RO":"Manual"}</small>
                </div>
              </button>
              <button className="edit-row-button" type="button" onClick={()=>onEdit(i)}>Edit</button>
            </div>
          )}
          <div className="panel-subtitle">Stok menipis: {lowStock.length}</div>
        </div>
      </Panel>
    </div>
  </section>;
}
function Recipes({products,ingredients,recipes,form,setForm,cost,onAdd,onRemove}:{products:ProductRecord[];ingredients:IngredientRecord[];recipes:RecipeRecord[];form:any;setForm:(v:any)=>void;cost:(id:string)=>number;onAdd:()=>void;onRemove:(r:string,i:string)=>void}){return <section className="page-section"><div className="content-grid"><Panel title="Resep / BOM"><label className="field">Produk<select value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})}><option value="">Pilih</option>{products.filter(p=>!p.trackStock).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="field">Bahan<select value={form.ingredientId} onChange={e=>setForm({...form,ingredientId:e.target.value})}><option value="">Pilih</option>{ingredients.map(i=><option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></label><Field label="Qty" type="number" value={form.qty} onChange={v=>setForm({...form,qty:v})}/><button className="primary-button" onClick={onAdd}>Tambah Komponen</button></Panel><Panel title="HPP & Margin">{products.filter(p=>!p.trackStock).map(p=><div className="recipe-card" key={p.id}><div className="recipe-head"><strong>{p.name}</strong><strong>HPP {rupiah(cost(p.id))}</strong></div>{recipes.filter(r=>r.productId===p.id).flatMap(r=>r.items.map(line=><div className="recipe-line" key={line.ingredientId}><span>{ingredients.find(i=>i.id===line.ingredientId)?.name}</span><span>{line.quantity} {line.unit}{line.estimated ? " · estimasi S" : ""}</span><button className="link-danger" onClick={()=>{const r=recipes.find(x=>x.productId===p.id);if(r)onRemove(r.id,line.ingredientId)}}>hapus</button></div>))}<div className="recipe-margin">Jual {rupiah(p.price)} · Margin {p.price?(((p.price-cost(p.id))/p.price)*100).toFixed(1):"0"}%</div></div>)}</Panel></div></section>}
function Purchases({ingredients,suppliers,purchases,form,setForm,onSave}:{ingredients:IngredientRecord[];suppliers:SupplierRecord[];purchases:PurchaseRecord[];form:any;setForm:(v:any)=>void;onSave:()=>void}){return <section className="page-section"><div className="content-grid"><Panel title="Penerimaan Barang"><label className="field">Supplier<select value={form.supplierId} onChange={e=>setForm({...form,supplierId:e.target.value})}><option value="">Pilih</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="field">Bahan<select value={form.ingredientId} onChange={e=>setForm({...form,ingredientId:e.target.value})}><option value="">Pilih</option>{ingredients.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label><Field label="Qty" type="number" value={form.quantity} onChange={v=>setForm({...form,quantity:v})}/><Field label="Total biaya" type="number" value={form.totalCost} onChange={v=>setForm({...form,totalCost:v})}/><button className="primary-button" onClick={onSave}>Simpan Pembelian</button></Panel><Panel title="Riwayat Pembelian"><div className="simple-table">{purchases.map(p=><div className="table-row" key={p.id}><div><strong>{p.invoiceNo}</strong><small>{dateLabel(p.createdAt)}</small></div><strong>{rupiah(p.totalCost)}</strong></div>)}</div></Panel></div></section>}
function Stock({ingredients,movements,form,setForm,onSave}:{ingredients:IngredientRecord[];movements:StockMovementRecord[];form:any;setForm:(v:any)=>void;onSave:()=>void}){return <section className="page-section"><div className="content-grid"><Panel title="Penyesuaian Stok"><label className="field">Bahan<select value={form.ingredientId} onChange={e=>setForm({...form,ingredientId:e.target.value})}><option value="">Pilih</option>{ingredients.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label><label className="field">Jenis<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="IN">Masuk</option><option value="OUT">Keluar</option><option value="ADJUSTMENT">Set Fisik</option></select></label><Field label={form.type==="ADJUSTMENT"?"Stok fisik":"Qty"} type="number" value={form.quantity} onChange={v=>setForm({...form,quantity:v})}/><Field label="Alasan" value={form.reason} onChange={v=>setForm({...form,reason:v})}/><button className="primary-button" onClick={onSave}>Simpan</button></Panel><Panel title="Kartu Stok Terbaru"><div className="simple-table">{movements.slice(0,30).map(m=><div className="table-row" key={m.id}><div><strong>{ingredients.find(i=>i.id===m.ingredientId)?.name}</strong><small>{m.type} · {m.reason}</small></div><strong>{m.quantity}</strong></div>)}</div></Panel></div></section>}
function Expenses({expenses,form,setForm,onSave}:{expenses:ExpenseRecord[];form:any;setForm:(v:any)=>void;onSave:()=>void}){return <section className="page-section"><div className="content-grid"><Panel title="Catat Pengeluaran"><Field label="Kategori" value={form.category} onChange={v=>setForm({...form,category:v})}/><Field label="Deskripsi" value={form.description} onChange={v=>setForm({...form,description:v})}/><Field label="Nominal" type="number" value={form.amount} onChange={v=>setForm({...form,amount:v})}/><label className="field">Metode<select value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})}><option>Cash</option><option>Transfer</option><option>Debit</option></select></label><button className="primary-button" onClick={onSave}>Simpan Pengeluaran</button></Panel><Panel title="Riwayat Pengeluaran"><div className="simple-table">{expenses.map(e=><div className="table-row" key={e.id}><div><strong>{e.description}</strong><small>{e.category} · {dateLabel(e.createdAt)}</small></div><strong>{rupiah(e.amount)}</strong></div>)}</div></Panel></div></section>}
function Shift({active,shifts,opening,setOpening,closing,setClosing,onOpen,onClose}:{active:ShiftRecord|null;shifts:ShiftRecord[];opening:string;setOpening:(v:string)=>void;closing:string;setClosing:(v:string)=>void;onOpen:()=>void;onClose:()=>void}){return <section className="page-section"><div className="content-grid"><Panel title="Shift Aktif">{active?<><div className="shift-current"><div><strong>OPEN</strong><small>{dateLabel(active.startedAt)}</small></div><strong>{rupiah(active.openingCash)}</strong></div><Field label="Kas fisik saat tutup" type="number" value={closing} onChange={setClosing}/><button className="primary-button" onClick={onClose}>Tutup Shift</button></>:<><Field label="Modal awal" type="number" value={opening} onChange={setOpening}/><button className="primary-button" onClick={onOpen}>Buka Shift</button></>}</Panel><Panel title="Riwayat Shift"><div className="simple-table">{shifts.map(s=><div className="table-row" key={s.id}><div><strong>{s.status}</strong><small>{dateLabel(s.startedAt)}</small></div><div><strong>{rupiah(s.openingCash)}</strong><small>{s.variance==null?"—":"Selisih "+rupiah(s.variance)}</small></div></div>)}</div></Panel></div></section>}
function Reports({sales,expenses,products}:{sales:SaleRecord[];expenses:ExpenseRecord[];products:ProductRecord[]}){
  const [from,setFrom]=useState(today());
  const [to,setTo]=useState(today());

  const inRange=(date:string)=>{
    const d=date.slice(0,10);
    return d>=from && d<=to;
  };

  const filteredSales=sales.filter(s=>inRange(s.createdAt));
  const filteredExpenses=expenses.filter(e=>inRange(e.createdAt));

  const revenue=filteredSales.reduce((n,s)=>n+(Number(s.total)||0),0);
  const cogs=filteredSales.reduce((n,s)=>n+(Number(s.costOfGoods)||0),0);
  const expense=filteredExpenses.reduce((n,e)=>n+(Number(e.amount)||0),0);
  const grossProfit=revenue-cogs;
  const netProfit=grossProfit-expense;
  const grossMargin=revenue>0?(grossProfit/revenue)*100:0;
  const avgTicket=filteredSales.length?revenue/filteredSales.length:0;
  const incompleteHpp=filteredSales.filter(s=>(Number(s.costOfGoods)||0)<=0).length;

  const paymentRows=["Cash","QRIS","Debit","Transfer"].map(method=>({
    method,
    count:filteredSales.filter(s=>s.paymentMethod===method).length,
    total:filteredSales.filter(s=>s.paymentMethod===method).reduce((n,s)=>n+(Number(s.total)||0),0)
  }));

  const productMap=new Map<string,{name:string;qty:number;revenue:number;cogs:number}>();
  for(const sale of filteredSales){
    for(const item of (sale.items||[])){
      const current=productMap.get(item.productId)||{name:item.name||"Produk",qty:0,revenue:0,cogs:0};
      current.qty+=(Number(item.qty)||0);
      current.revenue+=(Number(item.price)||0)*(Number(item.qty)||0);
      current.cogs+=(Number(item.cost)||0)*(Number(item.qty)||0);
      productMap.set(item.productId,current);
    }
  }
  const productRows=[...productMap.values()].sort((a,b)=>b.revenue-a.revenue);

  const exportReport=()=>{
    const rows=[
      ["Periode",from+" s/d "+to],
      [],
      ["Ringkasan","Nilai"],
      ["Omzet",revenue],
      ["HPP",cogs],
      ["Laba Kotor",grossProfit],
      ["Expense",expense],
      ["Laba Bersih",netProfit],
      ["Gross Margin %",grossMargin],
      ["Transaksi",filteredSales.length],
      ["Rata-rata Transaksi",avgTicket],
      [],
      ["Metode Pembayaran","Jumlah Transaksi","Omzet"],
      ...paymentRows.map(r=>[r.method,r.count,r.total]),
      [],
      ["Produk","Qty","Omzet","HPP Item","Laba Kotor"],
      ...productRows.map(r=>[r.name,r.qty,r.revenue,r.cogs,r.revenue-r.cogs])
    ];
    const csv=rows.map(row=>row.map(value=>`"${String(value??"").replaceAll('"','""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");
    a.href=url;a.download="laporan-macaroni-holic-"+from+"-sd-"+to+".csv";a.click();URL.revokeObjectURL(url);
  };

  return <section className="page-section">
    <div className="report-toolbar">
      <div>
        <div className="page-kicker">Analitik</div>
        <h2>Laporan Penjualan & Profitabilitas</h2>
        <p>Gunakan periode untuk melihat omzet, HPP, laba, pembayaran, dan produk terjual.</p>
      </div>
      <div className="report-filters">
        <label>Tanggal mulai<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
        <label>Tanggal akhir<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
        <button className="secondary-button" type="button" onClick={exportReport}>Export CSV</button>
      </div>
    </div>

    {incompleteHpp>0&&<div className="report-warning"><strong>Catatan HPP:</strong> {incompleteHpp} transaksi pada periode ini belum memiliki HPP tercatat. HPP dan laba untuk transaksi tersebut belum dapat dianggap final.</div>}

    <div className="kpi-grid">
      <Kpi title="Omzet" value={rupiah(revenue)} meta={filteredSales.length+" transaksi"}/>
      <Kpi title="HPP" value={rupiah(cogs)} meta="COGS tercatat"/>
      <Kpi title="Laba Kotor" value={rupiah(grossProfit)} meta={grossMargin.toFixed(1)+"% gross margin"}/>
      <Kpi title="Laba Bersih" value={rupiah(netProfit)} meta={rupiah(expense)+" expense"}/>
      <Kpi title="Rata-rata Transaksi" value={rupiah(avgTicket)} meta="Average ticket"/>
      <Kpi title="Jumlah Transaksi" value={String(filteredSales.length)} meta={from+" s/d "+to}/>
    </div>

    <div className="dashboard-grid">
      <Panel title="Metode Pembayaran">
        <div className="simple-table">
          {paymentRows.map(r=><div className="table-row" key={r.method}>
            <div><strong>{r.method}</strong><small>{r.count} transaksi</small></div>
            <strong>{rupiah(r.total)}</strong>
          </div>)}
        </div>
      </Panel>

      <Panel title="Produk Terjual">
        <div className="report-table">
          <div className="report-row report-head"><span>Produk</span><span>Qty</span><span>Omzet</span><span>Laba</span></div>
          {productRows.slice(0,12).map(r=><div className="report-row" key={r.name}>
            <span>{r.name}</span><strong>{r.qty}</strong><span>{rupiah(r.revenue)}</span><strong>{rupiah(r.revenue-r.cogs)}</strong>
          </div>)}
          {!productRows.length&&<Empty text="Belum ada penjualan pada periode ini."/>}
        </div>
      </Panel>
    </div>

    <div className="dashboard-grid">
      <Panel title="Rincian Profitabilitas">
        <div className="profit-breakdown">
          <div><span>Omzet</span><strong>{rupiah(revenue)}</strong></div>
          <div><span>HPP</span><strong>{rupiah(cogs)}</strong></div>
          <div><span>Laba Kotor</span><strong>{rupiah(grossProfit)}</strong></div>
          <div><span>Expense</span><strong>{rupiah(expense)}</strong></div>
          <div className="profit-total"><span>Laba Bersih</span><strong>{rupiah(netProfit)}</strong></div>
        </div>
      </Panel>
      <Panel title="Catatan">
        <p className="setting-copy">HPP dihitung dari cost bahan yang tercatat saat transaksi. Harga pasar bahan dapat berubah melalui Master Bahan Baku. Transaksi lama dengan HPP Rp0 akan tetap ditandai sebagai HPP belum tercatat agar laporan tidak memberikan angka laba yang menyesatkan.</p>
      </Panel>
    </div>
  </section>;
}

function AdminList({title,items,selected,setSelected,onEdit}:{title:string;items:Array<{id:string;title:string;meta:string}>;selected:string;setSelected:(v:string)=>void;onEdit:()=>void}){return <section className="page-section"><Panel title={title}><div className="simple-table">{items.map(i=><button className={selected===i.id?"table-row clickable selected-row":"table-row clickable"} key={i.id} onClick={()=>setSelected(i.id)}><div><strong>{i.title}</strong><small>{i.meta}</small></div><span>›</span></button>)}</div><button className="primary-button" disabled={!selected} onClick={onEdit}>Edit Dipilih</button></Panel></section>}
function Users({users,selected,setSelected,onEdit,onActivate}:{users:UserRecord[];selected:string;setSelected:(v:string)=>void;onEdit:()=>void;onActivate:(u:UserRecord)=>void}){return <section className="page-section"><Panel title="Pengguna"><div className="simple-table">{users.map(u=><div className={selected===u.id?"table-row selected-row":"table-row"} key={u.id} onClick={()=>setSelected(u.id)}><div><strong>{u.name}</strong><small>{u.username} · {u.role}</small></div><button className="secondary-button" onClick={()=>onActivate(u)}>Aktifkan</button></div>)}</div><button className="primary-button" disabled={!selected} onClick={onEdit}>Edit Nama</button></Panel></section>}
function Settings({onBackup,onRestore,onSync}:{onBackup:()=>void;onRestore:(f:File)=>void;onSync:()=>void}){return <section className="page-section"><div className="content-grid"><Panel title="Backup & Restore"><button className="primary-button" onClick={onBackup}>Download Backup JSON</button><label className="upload-button">Restore Backup<input type="file" accept="application/json" onChange={e=>{const f=e.target.files?.[0];if(f)onRestore(f);}}/></label></Panel><Panel title="Cloud Sync"><p className="setting-copy">Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY ketika database cloud siap dipakai.</p><button className="secondary-button wide" onClick={onSync}>Coba Sync Sekarang</button></Panel></div></section>}
function Receipt({sale,onClose}:{sale:SaleRecord;onClose:()=>void}){
  const items = Array.isArray(sale.items) ? sale.items : [];
  return <div className="modal-backdrop">
    <div className="receipt-modal">
      <div className="modal-head no-print"><h3>Struk</h3><button onClick={onClose}>×</button></div>
      <div className="receipt-sheet">
        <div className="receipt-brand">MACARONI HOLIC</div>
        <div className="receipt-muted">{sale.outletId || "Outlet Bandung 01"}</div>
        <div className="receipt-divider"/>
        <div className="receipt-meta"><span>No.</span><strong>{sale.invoiceNo || "—"}</strong></div>
        <div className="receipt-meta"><span>Tanggal</span><strong>{sale.createdAt ? dateLabel(sale.createdAt) : "—"}</strong></div>
        <div className="receipt-divider"/>
        {items.map((i,index)=><div className="receipt-item" key={String(i.productId ?? index)}>
          <div><strong>{i.name || "Produk"}</strong><span>{Number(i.qty)||0} × {rupiah(Number(i.price)||0)}</span></div>
          <strong>{rupiah((Number(i.qty)||0)*(Number(i.price)||0))}</strong>
        </div>)}
        <div className="receipt-divider"/>
        <div className="receipt-total"><span>Total</span><strong>{rupiah(Number(sale.total)||0)}</strong></div>
        <div className="receipt-meta"><span>Bayar</span><strong>{sale.paymentMethod || "—"}</strong></div>
        {sale.paymentMethod==="Cash"&&<div className="receipt-meta"><span>Kembali</span><strong>{rupiah(Number(sale.change)||0)}</strong></div>}
        <div className="receipt-thanks">Terima kasih.</div>
      </div>
      <div className="receipt-actions no-print">
        <button className="secondary-button" onClick={()=>window.print()}>Cetak</button>
        <button className="confirm-pay" onClick={onClose}>Selesai</button>
      </div>
    </div>
  </div>;
}
