import { Component, useEffect, useMemo, useState, type ErrorInfo, type FormEvent, type ReactNode } from "react";
import {
  db,
  type ProductRecord, type IngredientRecord, type RecipeRecord, type SaleRecord,
  type PurchaseRecord, type ExpenseRecord, type ShiftRecord, type SupplierRecord,
  type OutletRecord, type UserRecord, type StockMovementRecord, type PromoRecord
} from "./db/db";
import { getCurrentContext, loadActiveProducts, seedDatabase } from "./db/seed";
import { cloudSyncConfigured, syncNow } from "./services/sync";
import { getAuthenticatedUser, loginLocal, logoutLocal } from "./services/auth";
import { calculatePromoDiscount, promoRuleLabel } from "./services/promos";

type View = "dashboard" | "pos" | "history" | "products" | "ingredients" | "recipes" | "purchases" | "stock" | "expenses" | "shift" | "reports" | "promos" | "outlets" | "users" | "settings";
type Category = "Semua" | "Macaroni" | "Snack" | "Drink" | "Topping";
type CartItem = ProductRecord & { qty: number };
type Role = UserRecord["role"];

const roleViews: Record<Role, View[]> = {
  CASHIER: ["dashboard","pos","history","shift"],
  SUPERVISOR: ["dashboard","pos","history","products","ingredients","recipes","purchases","stock","expenses","shift","reports","promos"],
  OWNER: ["dashboard","pos","history","products","ingredients","recipes","purchases","stock","expenses","shift","reports","promos","outlets","users","settings"],
};

function LoginScreen({onLogin}:{onLogin:(username:string,password:string)=>Promise<void>}){
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function submit(e:FormEvent){
    e.preventDefault();
    if(!username||!password){setError("Username dan password wajib diisi.");return;}
    setBusy(true);setError("");
    try{await onLogin(username,password);}
    catch(err){setError(err instanceof Error?err.message:"Login gagal.");}
    finally{setBusy(false);}
  }

  return <div className="login-screen">
    <div className="login-card">
      <div className="login-brand">
        <div className="login-mark">MH</div>
        <div><strong>MACARONI HOLIC</strong><small>POINT OF SALE</small></div>
      </div>
      <div className="login-title">
        <div className="page-kicker">Secure Access</div>
        <h1>Masuk ke POS</h1>
        <p>Gunakan akun sesuai role Anda.</p>
      </div>
      <form onSubmit={submit}>
        <label className="field">Username<input autoFocus autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="username"/></label>
        <label className="field">Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password"/></label>
        {error&&<div className="login-error">{error}</div>}
        <button className="primary-button" type="submit" disabled={busy}>{busy?"Memeriksa…":"Masuk"}</button>
      </form>
      <div className="login-info">
        <strong>Akun demo lokal</strong>
        <span>Owner: owner / owner123</span>
        <span>Supervisor: supervisor / supervisor123</span>
        <span>Kasir: admin / admin123</span>
        <small>Ganti password sebelum digunakan di outlet nyata.</small>
      </div>
    </div>
  </div>;
}



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
const paymentMethods = ["Cash", "QRIS", "Debit", "Transfer", "Online"];
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
  const [promos,setPromos]=useState<PromoRecord[]>([]);
  const [context,setContext]=useState<{outlet:OutletRecord;user:UserRecord}|null>(null);
  const [authUser,setAuthUser]=useState<UserRecord|null>(null);
  const [loading,setLoading]=useState(true);
  const [notice,setNotice]=useState(""); const [error,setError]=useState("");

  const [category,setCategory]=useState<Category>("Semua"); const [query,setQuery]=useState("");
  const [cart,setCart]=useState<CartItem[]>([]); const [orderType,setOrderType]=useState<"Take Away"|"Dine In">("Take Away");
  const [tableNumber,setTableNumber]=useState(""); const [paymentOpen,setPaymentOpen]=useState(false); const [promoOpen,setPromoOpen]=useState(false);
  const [paymentMethod,setPaymentMethod]=useState("Cash"); const [cashReceived,setCashReceived]=useState(""); const [selectedPromoId,setSelectedPromoId]=useState("");
  const [receiptSale,setReceiptSale]=useState<SaleRecord|null>(null);

  const [productForm,setProductForm]=useState({id:"",sku:"",name:"",size:"" as ""|"S"|"M"|"L",category:"Macaroni" as Exclude<Category,"Semua">,price:"",stock:"",productCost:"",trackStock:false});
  const [ingredientForm,setIngredientForm]=useState({id:"",sku:"",name:"",category:"Bahan utama",unit:"g",stock:"",minStock:"",costPerUnit:"",includeInHpp:true,priceMode:"RO" as "RO"|"MARKET"|"MANUAL",packageSize:"",purchasePrice:"",yieldMultiplier:"1"});
  const [recipeForm,setRecipeForm]=useState({productId:"",ingredientId:"",qty:""});
  const [purchaseForm,setPurchaseForm]=useState({ingredientId:"",supplierId:"",quantity:"",totalCost:""});
  const [stockForm,setStockForm]=useState({ingredientId:"",type:"IN" as "IN"|"OUT"|"ADJUSTMENT",quantity:"",reason:""});
  const [expenseForm,setExpenseForm]=useState({category:"Operasional",description:"",amount:"",paymentMethod:"Cash"});
  const [openingCash,setOpeningCash]=useState(""); const [closingCash,setClosingCash]=useState("");
  const [selectedId,setSelectedId]=useState("");
  const [promoForm,setPromoForm]=useState({id:"",code:"",name:"",type:"PERCENT" as "PERCENT"|"NOMINAL",value:"10",minSubtotal:"0",maxDiscount:"",startDate:today(),endDate:today(),productId:"",maxUses:"",active:true});
  const [syncing,setSyncing]=useState(false);

  const refresh=async()=>{
    const [p,i,r,s,pu,e,sh,sm,su,o,u,pr,c]=await Promise.all([
      loadActiveProducts(),db.ingredients.toArray(),db.recipes.toArray(),db.sales.orderBy("createdAt").reverse().toArray(),
      db.purchases.orderBy("createdAt").reverse().toArray(),db.expenses.orderBy("createdAt").reverse().toArray(),
      db.shifts.orderBy("startedAt").reverse().toArray(),db.stockMovements.orderBy("createdAt").reverse().toArray(),
      db.suppliers.toArray(),db.outlets.toArray(),db.users.toArray(),db.promos.toArray(),getCurrentContext()
    ]);
    setProducts(p);setIngredients(i);setRecipes(r);setSales(s);setPurchases(pu);setExpenses(e);setShifts(sh);setStockMoves(sm);setSuppliers(su);setOutlets(o);setUsers(u);setPromos(pr);setContext(c);
  };

  useEffect(()=>{void(async()=>{
    try{
      await seedDatabase();
      if(cloudSyncConfigured()){
        setSyncing(true);
        try{await syncNow();}finally{setSyncing(false);}
      }
      const session=await getAuthenticatedUser();
      if(session){
        setAuthUser(session);
        await refresh();
      }
    }catch(e){
      setError(e instanceof Error?e.message:"Aplikasi gagal dimuat.");
    }finally{
      setLoading(false);
    }
  })();},[]);

  useEffect(()=>{
    if(!authUser || !cloudSyncConfigured()) return;
    const run=async()=>{
      try{setSyncing(true);await syncNow();await refresh();}
      catch(e){console.error("Background sync failed",e);}
      finally{setSyncing(false);}
    };
    const timer=window.setInterval(()=>void run(),30000);
    const onOnline=()=>void run();
    window.addEventListener("online",onOnline);
    return()=>{window.clearInterval(timer);window.removeEventListener("online",onOnline);};
  },[authUser]);

  const filteredProducts=useMemo(()=>{
    const familyOrder=[
      "Macaroni Cheese",
      "Macaroni Cheese Chicken Crispy",
      "Macaroni Cheese Bolognese",
      "Macaroni Cheese Bolognese Chicken Crispy",
    ] as const;
    const familyRank:Record<string,number>={
      "Macaroni Cheese":0,
      "Macaroni Cheese Chicken Crispy":1,
      "Macaroni Cheese Bolognese":2,
      "Macaroni Cheese Bolognese Chicken Crispy":3
    };
    const sizeRank:Record<string,number>={S:0,M:1,L:2};

    const baseFamily=(product:ProductRecord)=>{
      const name=(product.name||"").trim();
      const size=product.size;
      if(size && name.endsWith(" "+size)) return name.slice(0,-(size.length+1)).trim();
      for(const family of familyOrder){
        if(name===family || name.startsWith(family+" ")) return family;
      }
      return name;
    };

    return products
      .filter(p=>
        (category==="Semua"||p.category===category) &&
        (p.name+" "+p.sku).toLowerCase().includes(query.toLowerCase())
      )
      .sort((a,b)=>{
        const af=baseFamily(a);
        const bf=baseFamily(b);
        const familyCompare=(familyRank[af]??99)-(familyRank[bf]??99);
        if(familyCompare!==0) return familyCompare;

        const sizeCompare=(a.size?sizeRank[a.size]:99)-(b.size?sizeRank[b.size]:99);
        if(sizeCompare!==0) return sizeCompare;

        return a.name.localeCompare(b.name,"id");
      });
  },[products,category,query]);

  const availableCategories = useMemo<Category[]>(() => {
    const present = new Set(products.map((p) => p.category));
    return ["Semua", ...allCategories.filter((item) => present.has(item))];
  }, [products]);


  const recipeCost=(productId:string)=>{
    const r=recipes.find(x=>x.productId===productId);
    return r ? r.items.reduce((sum,line) => {
    const ingredient = ingredients.find(i => i.id === line.ingredientId);
    if (!ingredient || ingredient.includeInHpp === false) return sum;
    return sum + (Number(ingredient.costPerUnit) || 0) * (Number(line.quantity) || 0);
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
  const selectedPromo=promos.find(p=>p.id===selectedPromoId)??null;
  const promoCalculation=selectedPromo&&context
    ? calculatePromoDiscount(selectedPromo,cart,cartSubtotal,context.outlet.id)
    : {eligible:false,discount:0,base:0,reason:""};
  const promoDiscount=promoCalculation.eligible ? promoCalculation.discount : 0;
  const total=Math.max(cartSubtotal-promoDiscount,0);
  const received=Number(cashReceived)||0; const change=Math.max(received-total,0);
  const availablePromos=promos.map(p=>({promo:p,calc:context?calculatePromoDiscount(p,cart,cartSubtotal,context.outlet.id):{eligible:false,discount:0,base:0}})).filter(x=>x.calc.eligible).sort((a,b)=>b.calc.discount-a.calc.discount);

  async function calculateSaleHpp(sale: SaleRecord){
    let cogs = 0;
    const updatedItems = Array.isArray(sale.items) ? sale.items.map(item => ({...item})) : [];
    for (const item of updatedItems) {
      const recipe = await db.recipes.where("productId").equals(item.productId).first();
      let itemCost = 0;
      if (recipe) {
        for (const line of recipe.items) {
          const ingredient = await db.ingredients.get(line.ingredientId);
          if (ingredient?.includeInHpp === false) continue;
          itemCost += (Number(ingredient?.costPerUnit) || 0) * (Number(line.quantity) || 0);
        }
      }
      item.cost = itemCost;
      cogs += itemCost * (Number(item.qty) || 0);
    }
    return { cogs, items: updatedItems };
  }

  async function recalculateReportHpp(from: string, to: string){
    const targets = sales.filter(s => {
      const d = s.createdAt.slice(0,10);
      return d >= from && d <= to;
    });
    if (!targets.length) {
      setNotice("Tidak ada transaksi pada periode yang dipilih.");
      return;
    }
    const confirmed = window.confirm(
      "Hitung ulang HPP transaksi pada periode ini menggunakan resep dan harga bahan baku saat ini? Ini cocok untuk pengujian data lama."
    );
    if (!confirmed) return;

    try {
      for (const sale of targets) {
        const result = await calculateSaleHpp(sale);
        await db.sales.update(sale.id, { costOfGoods: result.cogs, items: result.items });
      }
      await refresh();
      setNotice(targets.length + " transaksi berhasil dihitung ulang menggunakan HPP saat ini.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghitung ulang HPP.");
    }
  }

  async function checkout(){
    if(!context||!cart.length)return;
    const activePromo=selectedPromo;
    const activePromoCalc=activePromo ? calculatePromoDiscount(activePromo,cart,cartSubtotal,context.outlet.id) : {eligible:true,discount:0,base:0};
    if(activePromo && !activePromoCalc.eligible){setError(activePromoCalc.reason||"Promo tidak lagi memenuhi syarat.");return;}
    const finalDiscount=activePromoCalc.discount||0;
    const finalTotal=Math.max(cartSubtotal-finalDiscount,0);
    const finalChange=Math.max(received-finalTotal,0);
    if(paymentMethod==="Cash"&&received<finalTotal){setError("Nominal pembayaran belum mencukupi.");return;}
    const invoice="MH-"+today().replaceAll("-","")+"-"+String(Date.now()).slice(-5); const createdAt=new Date().toISOString();
    try{
      let created:SaleRecord|null=null;
      const validated: Array<{ item: CartItem; recipe: RecipeRecord | undefined }> = [];
      let cogs = 0;

      for (const item of cart) {
        const p = await db.products.get(item.id);
        if (!p) throw new Error("Produk tidak ditemukan.");
        const recipe = await db.recipes.where("productId").equals(p.id).first();
        const usableRecipe = recipe && recipe.items.length ? recipe : undefined;
        if (usableRecipe) {
          for (const line of usableRecipe.items) {
            const ing = await db.ingredients.get(line.ingredientId);
            const needed = line.quantity * item.qty;
            if (!ing || ing.stock < needed) throw new Error("Stok " + (ing?.name ?? "bahan") + " tidak mencukupi.");
            if (ing.includeInHpp !== false) cogs += (Number(ing.costPerUnit)||0) * line.quantity * item.qty;
          }
        } else if (p.trackStock) {
          if (p.stock < item.qty) throw new Error("Stok " + p.name + " tidak mencukupi.");
          cogs += (Number(p.productCost)||0) * item.qty;
        } else {
          throw new Error("Menu " + p.name + " belum memiliki resep. Atur resepnya di Produk → Atur Resep sebelum dijual.");
        }
        validated.push({ item, recipe: usableRecipe });
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
        discount: finalDiscount,
        total: finalTotal,
        cashReceived: paymentMethod === "Cash" ? received : finalTotal,
        change: paymentMethod === "Cash" ? finalChange : 0,
        promoId: activePromo?.id,
        promoCode: activePromo?.code,
        promoName: activePromo?.name,
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
      if(activePromo){
        const usedPromo={...activePromo,usedCount:(activePromo.usedCount||0)+1,updatedAt:createdAt};
        await db.promos.put(usedPromo);
        await db.auditLogs.add({id:crypto.randomUUID(),userId:context.user.id,action:"UPSERT",entity:"PROMO",entityId:usedPromo.id,detail:JSON.stringify(usedPromo),createdAt});
        await db.auditLogs.add({id:crypto.randomUUID(),userId:context.user.id,action:"UPSERT",entity:"SALE_PROMO",entityId:created.id,detail:JSON.stringify({saleId:created.id,promoId:activePromo.id,promoCode:activePromo.code,promoName:activePromo.name}),createdAt});
      }
      await refresh(); setReceiptSale(null); setCart([]); setSelectedPromoId(""); setCashReceived(""); setTableNumber(""); setPaymentOpen(false); setPromoOpen(false); setView("history"); setNotice(invoice+" tersimpan di perangkat.");
    }catch(e){setError(e instanceof Error?e.message:"Transaksi gagal.");}
  }

  async function handleLogin(username:string,password:string){
    const user=await loginLocal(username,password);
    setAuthUser(user);
    if(cloudSyncConfigured()){setSyncing(true);try{await syncNow();}finally{setSyncing(false);}}
    setView(user.role==="CASHIER"?"pos":"dashboard");
    setNotice("Selamat datang, "+user.name+".");
    await refresh();
  }

  async function handleLogout(){
    await logoutLocal();
    setAuthUser(null);
    setContext(null);
    setCart([]);
    setPaymentOpen(false);
    setReceiptSale(null);
    setView("dashboard");
  }

  async function saveProduct(){
    if(!productForm.name.trim()){
      setError("Nama menu wajib diisi.");
      return;
    }
    const productId=productForm.id||crypto.randomUUID();
    const now=new Date().toISOString();
    const record:ProductRecord={
      id:productId,
      sku:productForm.sku||"MH-"+Date.now().toString().slice(-6),
      name:productForm.size ? productForm.name.trim()+" "+productForm.size : productForm.name.trim(),
      category:productForm.category,
      price:Number(productForm.price)||0,
      stock:productForm.trackStock ? Number(productForm.stock)||0 : 0,
      productCost:productForm.trackStock ? Number(productForm.productCost)||0 : 0,
      emoji:productForm.category==="Drink" ? "🥤" : productForm.category==="Snack" ? "🍟" : productForm.category==="Topping" ? "🧀" : "🍝",
      active:true,
      trackStock:productForm.trackStock,
      size:productForm.size || undefined,
      updatedAt:now
    };
    await db.products.put(record);
    await refresh();
    if(productForm.trackStock){
      setNotice("Menu tersimpan sebagai produk jadi. Stok dikelola di menu Stok.");
    }else{
      setNotice("Menu tersimpan. Langkah berikutnya: atur resep di Resep & HPP agar stok bahan dan HPP otomatis mengikuti penjualan.");
    }
    setProductForm({id:"",sku:"",name:"",size:"",category:"Macaroni",price:"",stock:"",productCost:"",trackStock:false});
  }
  function editIngredient(ingredient: IngredientRecord){
    setIngredientForm({
      id: ingredient.id,
      sku: ingredient.sku,
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      packageSize: ingredient.packageSize ?? "",
      purchasePrice: String(ingredient.purchasePrice ?? ""),
      yieldMultiplier: String(ingredient.yieldMultiplier ?? 1),
      stock: String(ingredient.stock ?? ""),
      minStock: String(ingredient.minStock ?? ""),
      costPerUnit: String(ingredient.costPerUnit ?? ""),
      includeInHpp: ingredient.includeInHpp !== false,
      priceMode: ingredient.priceMode ?? "MANUAL"
    });
    setNotice("Mode edit: " + ingredient.name);
  }

  function resetIngredientForm(){
    setIngredientForm({id:"",sku:"",name:"",category:"Bahan utama",unit:"g",stock:"",minStock:"",costPerUnit:"",includeInHpp:true,priceMode:"RO",packageSize:"",purchasePrice:"",yieldMultiplier:"1"});
  }

  async function saveIngredient(){
    if(!ingredientForm.name)return;
    const record:IngredientRecord={id:ingredientForm.id||crypto.randomUUID(),sku:ingredientForm.sku||"ING-"+Date.now().toString().slice(-6),name:ingredientForm.name,category:ingredientForm.category,unit:ingredientForm.unit,stock:Number(ingredientForm.stock)||0,minStock:Number(ingredientForm.minStock)||0,costPerUnit:Number(ingredientForm.costPerUnit)||0,includeInHpp:ingredientForm.includeInHpp,priceMode:ingredientForm.priceMode,packageSize:ingredientForm.packageSize,purchasePrice:Number(ingredientForm.purchasePrice)||0,yieldMultiplier:Number(ingredientForm.yieldMultiplier)||1,updatedAt:new Date().toISOString()};
    await db.ingredients.put(record);await refresh();setIngredientForm({id:"",sku:"",name:"",category:"Bahan utama",unit:"g",stock:"",minStock:"",costPerUnit:"",includeInHpp:true,priceMode:"RO",packageSize:"",purchasePrice:"",yieldMultiplier:"1"});setNotice("Bahan baku tersimpan.");
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
  function resetPromoForm(){
    setPromoForm({id:"",code:"",name:"",type:"PERCENT",value:"10",minSubtotal:"0",maxDiscount:"",startDate:today(),endDate:today(),productId:"",maxUses:"",active:true});
  }
  function editPromo(promo:PromoRecord){
    setPromoForm({id:promo.id,code:promo.code,name:promo.name,type:promo.type,value:String(promo.value),minSubtotal:String(promo.minSubtotal||0),maxDiscount:promo.maxDiscount?String(promo.maxDiscount):"",startDate:promo.startDate,endDate:promo.endDate,productId:promo.productIds?.[0]||"",maxUses:promo.maxUses?String(promo.maxUses):"",active:promo.active});
    setView("promos");
  }
  async function savePromo(){
    if(!context)return;
    const code=promoForm.code.trim().toUpperCase().replace(/\s+/g,"-");
    const name=promoForm.name.trim();
    const value=Math.max(0,Number(promoForm.value)||0);
    const minSubtotal=Math.max(0,Number(promoForm.minSubtotal)||0);
    const maxDiscount=Math.max(0,Number(promoForm.maxDiscount)||0);
    const maxUses=Math.max(0,Number(promoForm.maxUses)||0);
    if(!code||!name){setError("Kode dan nama promo wajib diisi.");return;}
    if(value<=0){setError("Nilai promo harus lebih dari 0.");return;}
    if(promoForm.startDate>promoForm.endDate){setError("Tanggal mulai tidak boleh melewati tanggal berakhir.");return;}
    if(promoForm.type==="PERCENT"&&value>100){setError("Diskon persen maksimal 100%.");return;}
    if(promos.some(p=>p.code===code&&p.id!==promoForm.id)){setError("Kode promo sudah digunakan.");return;}
    const now=new Date().toISOString();
    const record:PromoRecord={id:promoForm.id||crypto.randomUUID(),code,name,type:promoForm.type,value,minSubtotal,maxDiscount:maxDiscount||undefined,startDate:promoForm.startDate,endDate:promoForm.endDate,productIds:promoForm.productId?[promoForm.productId]:[],outletIds:[],maxUses:maxUses||undefined,usedCount:promoForm.id?(promos.find(p=>p.id===promoForm.id)?.usedCount||0):0,active:promoForm.active,updatedAt:now};
    await db.promos.put(record);
    await db.auditLogs.add({id:crypto.randomUUID(),userId:context.user.id,action:"UPSERT",entity:"PROMO",entityId:record.id,detail:JSON.stringify(record),createdAt:now});
    await refresh();resetPromoForm();setNotice("Promo "+record.code+" tersimpan.");
  }
  async function togglePromo(promo:PromoRecord){
    if(!context)return;
    const updated={...promo,active:!promo.active,updatedAt:new Date().toISOString()};
    await db.promos.put(updated);
    await db.auditLogs.add({id:crypto.randomUUID(),userId:context.user.id,action:"UPSERT",entity:"PROMO",entityId:updated.id,detail:JSON.stringify(updated),createdAt:updated.updatedAt});
    if(selectedPromoId===promo.id&&!updated.active)setSelectedPromoId("");
    await refresh();setNotice(updated.active?"Promo diaktifkan.":"Promo dinonaktifkan.");
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
    const data={products:await db.products.toArray(),ingredients:await db.ingredients.toArray(),recipes:await db.recipes.toArray(),suppliers:await db.suppliers.toArray(),purchases:await db.purchases.toArray(),stockMovements:await db.stockMovements.toArray(),sales:await db.sales.toArray(),shifts:await db.shifts.toArray(),expenses:await db.expenses.toArray(),outlets:await db.outlets.toArray(),users:await db.users.toArray(),promos:await db.promos.toArray(),auditLogs:await db.auditLogs.toArray(),settings:await db.settings.toArray()};
    downloadJson("macaroni-holic-backup-"+today()+".json",data);setNotice("Backup dibuat.");
  }
  async function restore(file:File){
    try{
      const p=JSON.parse(await file.text()) as Record<string,unknown[]>;
      await Promise.all([
        db.products.clear(),db.ingredients.clear(),db.recipes.clear(),db.suppliers.clear(),db.purchases.clear(),db.stockMovements.clear(),
        db.sales.clear(),db.shifts.clear(),db.expenses.clear(),db.outlets.clear(),db.users.clear(),db.promos.clear(),db.auditLogs.clear(),db.settings.clear()
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
      if(p.promos)await db.promos.bulkAdd(p.promos as PromoRecord[]);
      if(p.auditLogs)await db.auditLogs.bulkAdd(p.auditLogs as any[]);
      if(p.settings)await db.settings.bulkAdd(p.settings as any[]);
      await refresh();setNotice("Backup dipulihkan.");
    }catch(e){setError("Backup tidak valid atau gagal dipulihkan.");}
  }
  async function doSync(){
    try{
      setSyncing(true);
      const r=await syncNow();
      await refresh();
      setNotice(r.configured?"Sinkronisasi selesai. Data lokal dan cloud diperbarui.":"Supabase belum dikonfigurasi; mode offline tetap aktif.");
    }catch(e){setError(e instanceof Error?e.message:"Sinkronisasi gagal.");}
    finally{setSyncing(false);}
  }
  async function clearTransactionHistory(){
    const confirmed=window.confirm("Hapus seluruh riwayat transaksi lokal? Data penjualan akan dihapus dan tidak dapat dipulihkan dari aplikasi ini.");
    if(!confirmed)return;
    try{
      await db.sales.clear();
      await db.syncQueue.clear();
      await refresh();
      setReceiptSale(null);
      setNotice("Riwayat transaksi berhasil dikosongkan.");
    }catch(e){
      setError(e instanceof Error?e.message:"Riwayat transaksi gagal dihapus.");
    }
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
    ["dashboard","Dashboard","▦"],["pos","Kasir","🛒"],["history","Transaksi","↺"],["products","Produk","🍝"],["ingredients","Bahan Baku","📦"],["recipes","Resep & HPP","🧾"],["purchases","Pembelian","🚚"],["stock","Stok","📊"],["expenses","Pengeluaran","💸"],["shift","Shift Kasir","⏱️"],["reports","Laporan","📈"],["promos","Promo & Diskon","🎟️"],["outlets","Outlet","🏪"],["users","Pengguna","👤"],["settings","Pengaturan","⚙️"]
  ] as Array<[View,string,string]>;

  const visibleNav = nav.filter(([id]) => authUser ? roleViews[authUser.role].includes(id) : false);

  useEffect(()=>{
    if(authUser && !roleViews[authUser.role].includes(view)){
      setView(authUser.role==="CASHIER"?"pos":"dashboard");
    }
  },[authUser,view]);

  if(loading)return <div className="loading-screen">Memuat Macaroni Holic POS…</div>;
  if(!authUser)return <LoginScreen onLogin={handleLogin}/>;

  return <div className="app-frame">
    <aside className="main-nav">
      <div className="nav-brand"><div className="brand-mark">MH</div><div><strong>MACARONI HOLIC</strong><small>POS MANAGEMENT</small></div></div>
      <div className="nav-menu">{visibleNav.map(([id,label,icon])=><button key={id} className={view===id?"nav-item active":"nav-item"} onClick={()=>setView(id)}><span>{icon}</span>{label}</button>)}</div>
      <div className="nav-bottom"><div className="mini-status"><span/>{cloudSyncConfigured()?"Cloud configured":"Offline-first"}</div></div>
    </aside>
    <main className="main-stage">
      <header className="global-header">
        <div><div className="header-kicker">{context?.outlet.name}</div><h1>{nav.find(n=>n[0]===view)?.[1]}</h1></div>
        <div className="global-actions"><div className="connection-pill"><span/>{navigator.onLine?"Online":"Offline"}</div><button className="header-button" onClick={()=>void doSync()} disabled={syncing}>{syncing?"Syncing…":"Sync"}</button><button className="header-user" onClick={()=>void handleLogout()}>{context?.user.name} · {context?.user.role} · Keluar</button></div>
      </header>
      {notice&&<div className="global-notice success">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
      {error&&<div className="global-notice error">{error}<button onClick={()=>setError("")}>×</button></div>}

      {view==="dashboard"&&<Dashboard sales={todaySales} revenue={todayRevenue} cogs={todayCogs} expense={todayExpense} lowStock={lowStock}/>}
      {view==="pos"&&<POS categories={availableCategories} category={category} setCategory={setCategory} products={filteredProducts} query={query} setQuery={setQuery} addCart={addCart} cart={cart} clearCart={()=>{setCart([]);setSelectedPromoId("");}} changeQty={changeQty} total={total} cartSubtotal={cartSubtotal} promo={selectedPromo} promoDiscount={promoDiscount} onPromo={()=>setPromoOpen(true)} onClearPromo={()=>setSelectedPromoId("")} orderType={orderType} setOrderType={setOrderType} tableNumber={tableNumber} setTableNumber={setTableNumber} onPay={()=>setPaymentOpen(true)}/>}
      {view==="history"&&<History sales={sales} onOpen={setReceiptSale} onClear={()=>void clearTransactionHistory()}/>} 
      {view==="products"&&<Products products={products} recipes={recipes} form={productForm} setForm={setProductForm} onSave={()=>void saveProduct()} onSetupRecipe={(productId)=>{setRecipeForm(x=>({...x,productId}));setView("recipes");setNotice("Produk dipilih. Silakan tambahkan komponen resep.");}}/>}
      {view==="ingredients"&&<Ingredients ingredients={ingredients} lowStock={lowStock} form={ingredientForm} setForm={setIngredientForm} onSave={()=>void saveIngredient()} onEdit={editIngredient} onReset={resetIngredientForm}/>} 
      {view==="recipes"&&<Recipes products={products} ingredients={ingredients} recipes={recipes} form={recipeForm} setForm={setRecipeForm} cost={recipeCost} onAdd={()=>void addRecipeItem()} onRemove={(r,i)=>void removeRecipeItem(r,i)}/>}
      {view==="purchases"&&<Purchases ingredients={ingredients} suppliers={suppliers} purchases={purchases} form={purchaseForm} setForm={setPurchaseForm} onSave={()=>void receivePurchase()}/>}
      {view==="stock"&&<Stock ingredients={ingredients} movements={stockMoves} form={stockForm} setForm={setStockForm} onSave={()=>void adjustStock()}/>}
      {view==="expenses"&&<Expenses expenses={expenses} form={expenseForm} setForm={setExpenseForm} onSave={()=>void saveExpense()}/>}
      {view==="shift"&&<Shift active={activeShift} shifts={shifts} opening={openingCash} setOpening={setOpeningCash} closing={closingCash} setClosing={setClosingCash} onOpen={()=>void openShift()} onClose={()=>void closeShift()}/>}
      {view==="reports"&&<Reports sales={sales} expenses={expenses} products={products} onRecalculateHpp={recalculateReportHpp}/>} 
      {view==="promos"&&<Promos promos={promos} products={products} form={promoForm} setForm={setPromoForm} onSave={()=>void savePromo()} onReset={resetPromoForm} onEdit={editPromo} onToggle={(p)=>void togglePromo(p)}/>}
      {view==="outlets"&&<AdminList title="Outlet" items={outlets.map(o=>({id:o.id,title:o.name,meta:o.code+" · "+o.address}))} selected={selectedId} setSelected={setSelectedId} onEdit={()=>void editOutlet()}/>}
      {view==="users"&&<Users users={users} selected={selectedId} setSelected={setSelectedId} onEdit={()=>void editUser()} onActivate={(u)=>void activateUser(u)}/>}
      {view==="settings"&&<Settings onBackup={()=>void backup()} onRestore={(f)=>void restore(f)} onSync={()=>void doSync()}/>}

      {promoOpen&&<Modal title="Pilih Promo / Diskon" onClose={()=>setPromoOpen(false)}><div className="simple-table">{availablePromos.length?availablePromos.map(({promo,calc})=><button key={promo.id} type="button" className={selectedPromoId===promo.id?"table-row clickable selected-row":"table-row clickable"} onClick={()=>{setSelectedPromoId(promo.id);setPromoOpen(false);}}><div><strong>{promo.code} · {promo.name}</strong><small>{promoRuleLabel(promo)} · hemat {rupiah(calc.discount)}{promo.productIds?.length?" · produk tertentu":""}</small></div><span>＋</span></button>):<Empty text="Belum ada promo yang memenuhi syarat transaksi ini."/>}</div></Modal>}
      {paymentOpen&&<Modal title="Pembayaran" onClose={()=>setPaymentOpen(false)}><div className="payment-total">{rupiah(total)}</div>{selectedPromo&&<div className="promo-payment-summary"><strong>{selectedPromo.code}</strong><span>{selectedPromo.name} · Diskon {rupiah(promoDiscount)}</span></div>}<div className="payment-methods">{paymentMethods.map(m=><button key={m} className={paymentMethod===m?"method-button active":"method-button"} onClick={()=>setPaymentMethod(m)}>{m}</button>)}</div><div className="payment-breakdown"><div><span>Subtotal</span><strong>{rupiah(cartSubtotal)}</strong></div><div><span>Diskon</span><strong>{rupiah(promoDiscount)}</strong></div><div><span>Total</span><strong>{rupiah(total)}</strong></div></div>{paymentMethod==="Cash"&&<label className="field">Uang diterima<input inputMode="numeric" value={cashReceived} onChange={e=>setCashReceived(e.target.value.replace(/\\D/g,""))}/><span>Kembalian: <strong>{rupiah(change)}</strong></span></label>}<button className="confirm-pay" disabled={paymentMethod==="Cash"&&received<total} onClick={()=>void checkout()}>Konfirmasi Pembayaran</button></Modal>}
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
  categories,category,setCategory,products,query,setQuery,addCart,cart,clearCart,changeQty,total,cartSubtotal,promo,promoDiscount,onPromo,onClearPromo,
  orderType,setOrderType,tableNumber,setTableNumber,onPay
}:{
  categories:Category[]; category:Category; setCategory:(x:Category)=>void;
  products:ProductRecord[]; query:string; setQuery:(x:string)=>void; addCart:(p:ProductRecord)=>void;
  cart:CartItem[]; clearCart:()=>void; changeQty:(id:string,d:number)=>void; total:number; cartSubtotal:number;
  promo:PromoRecord|null; promoDiscount:number; onPromo:()=>void; onClearPromo:()=>void;
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
          {safeCart.length>0&&<>{promo?<div className="promo-applied"><div><strong>🎟️ {promo.code}</strong><small>{promo.name}</small></div><button type="button" onClick={onClearPromo}>×</button></div>:<button type="button" className="secondary-button wide" onClick={onPromo}>🎟️ Pilih Promo / Diskon</button>}</>}
          <div><span>Subtotal</span><strong>{rupiah(Number(cartSubtotal)||0)}</strong></div>
          <div><span>Diskon</span><strong>{rupiah(Number(promoDiscount)||0)}</strong></div>
          <div className="summary-total"><span>Total</span><strong>{rupiah(Number(total)||0)}</strong></div>
          <button type="button" className="pay-button" disabled={safeCart.length===0} onClick={onPay}>Bayar · {rupiah(Number(total)||0)}</button>
        </div>
      </aside>
    </section>
  );
}

function History({sales,onOpen,onClear}:{sales:SaleRecord[];onOpen:(s:SaleRecord)=>void;onClear:()=>void}){
  const rows = Array.isArray(sales) ? sales.filter(Boolean) : [];
  return <section className="page-section">
    <div className="history-toolbar">
      <div>
        <div className="page-kicker">Transaksi</div>
        <h2>Riwayat Transaksi</h2>
        <p>{rows.length} transaksi tersimpan di perangkat.</p>
      </div>
      <button className="danger-button" type="button" onClick={onClear} disabled={!rows.length}>Hapus Riwayat</button>
    </div>
    <Panel title="Daftar Transaksi">
      <div className="simple-table">
        {rows.length ? rows.map((s) => (
          <button className="table-row clickable" key={String(s.id)} type="button" onClick={() => onOpen(s)}>
            <div>
              <strong>{s.invoiceNo || "Tanpa nomor"}</strong>
              <small>{s.createdAt ? dateLabel(s.createdAt) : "Tanggal tidak tersedia"} · {s.paymentMethod || "—"} · {s.orderType || "—"}{s.promoCode ? " · Promo "+s.promoCode : ""}</small>
            </div>
            <strong>{rupiah(Number(s.total) || 0)}</strong>
          </button>
        )) : <Empty text="Belum ada transaksi." />}
      </div>
    </Panel>
  </section>;
}
function Products({
  products,recipes,form,setForm,onSave,onSetupRecipe
}:{
  products:ProductRecord[];
  recipes:RecipeRecord[];
  form:any;
  setForm:(v:any)=>void;
  onSave:()=>void;
  onSetupRecipe:(productId:string)=>void;
}){
  const resetForm=()=>setForm({id:"",sku:"",name:"",size:"",category:"Macaroni",price:"",stock:"",productCost:"",trackStock:false});
  return <section className="page-section">
    <div className="products-toolbar">
      <div><div className="page-kicker">Menu</div><h2>Master Menu</h2><p>Tambah menu dulu, lalu tentukan apakah stok dari resep atau stok produk jadi.</p></div>
      <button className="primary-button toolbar-button" type="button" onClick={resetForm}>＋ Tambah Menu</button>
    </div>
    <div className="content-grid">
      <Panel title={form.id ? "Edit Menu" : "Tambah Menu"}>
        <div className="form-grid">
          <Field label="SKU" value={form.sku} onChange={v=>setForm({...form,sku:v})}/>
          <Field label="Nama menu" value={form.name} onChange={v=>setForm({...form,name:v})}/>
          <label className="field">Ukuran<select value={form.size} onChange={e=>setForm({...form,size:e.target.value})}><option value="">Tanpa ukuran</option><option value="S">S</option><option value="M">M</option><option value="L">L</option></select></label>
          <label className="field">Kategori<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{allCategories.map(x=><option key={x}>{x}</option>)}</select></label>
          <Field label="Harga jual" type="number" value={form.price} onChange={v=>setForm({...form,price:v})}/>
          <label className="field">Model stok<select value={form.trackStock?"PRODUCT":"RECIPE"} onChange={e=>setForm({...form,trackStock:e.target.value==="PRODUCT"})}><option value="RECIPE">Produksi dari resep / bahan baku</option><option value="PRODUCT">Produk jadi / stok langsung</option></select></label>
          {form.trackStock && <>
            <Field label="HPP produk jadi / unit" type="number" value={form.productCost} onChange={v=>setForm({...form,productCost:v})}/>
            <Field label="Stok awal produk jadi" type="number" value={form.stock} onChange={v=>setForm({...form,stock:v})}/>
          </>}
        </div>
        <div className="menu-model-note">
          {form.trackStock
            ? "Produk jadi cocok untuk minuman botol, air mineral, atau barang yang dibeli lalu dijual kembali. Penjualan mengurangi stok produk dan memakai HPP/unit."
            : "Berbasis resep cocok untuk macaroni/snack produksi. Penjualan akan mengurangi bahan sesuai resep dan menghitung HPP otomatis."}
        </div>
        <button className="primary-button" onClick={onSave}>{form.id ? "Simpan Perubahan" : "Tambah Menu"}</button>
      </Panel>

      <Panel title={"Daftar Menu ("+products.length+")"}>
        <div className="simple-table">
          {products.map(p=>{
            const recipe=recipes.find(r=>r.productId===p.id);
            const recipeReady=Boolean(recipe && recipe.items.length);
            return <div className="menu-master-row" key={p.id}>
              <div className="menu-master-main">
                <strong>{p.name}</strong>
                <small>{p.sku} · {p.category}{p.size ? " · "+p.size : ""}</small>
              </div>
              <div className="menu-master-meta">
                <strong>{p.price>0?rupiah(p.price):"Harga belum diatur"}</strong>
                <small>{p.trackStock ? "Produk jadi · stok "+p.stock+" · HPP "+rupiah(p.productCost||0) : (recipeReady ? "Resep siap · HPP terhubung" : "Resep belum diatur")}</small>
              </div>
              {!p.trackStock && <button className="edit-row-button" type="button" onClick={()=>onSetupRecipe(p.id)}>{recipeReady ? "Edit Resep" : "Atur Resep"}</button>}
            </div>;
          })}
          {!products.length&&<Empty text="Belum ada menu."/>}
        </div>
      </Panel>
    </div>
  </section>;
}

function Promos({promos,products,form,setForm,onSave,onReset,onEdit,onToggle}:{promos:PromoRecord[];products:ProductRecord[];form:any;setForm:(v:any)=>void;onSave:()=>void;onReset:()=>void;onEdit:(p:PromoRecord)=>void;onToggle:(p:PromoRecord)=>void}){
  const editing=Boolean(form.id);
  return <section className="page-section">
    <div className="products-toolbar">
      <div><div className="page-kicker">Marketing</div><h2>Promo & Diskon</h2><p>Buat promo terkontrol untuk kasir. Promo aktif hanya bisa dipakai ketika syaratnya terpenuhi.</p></div>
      <button className="primary-button toolbar-button" type="button" onClick={onReset}>＋ Promo Baru</button>
    </div>
    <div className="content-grid">
      <Panel title={editing?"Edit Promo":"Buat Promo"}>
        <div className="form-grid">
          <Field label="Kode promo" value={form.code} onChange={v=>setForm({...form,code:v})}/>
          <Field label="Nama promo" value={form.name} onChange={v=>setForm({...form,name:v})}/>
          <label className="field">Jenis
            <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
              <option value="PERCENT">Persentase (%)</option>
              <option value="NOMINAL">Nominal (Rp)</option>
            </select>
          </label>
          <Field label={form.type==="PERCENT"?"Nilai diskon (%)":"Nilai diskon (Rp)"} type="number" value={form.value} onChange={v=>setForm({...form,value:v})}/>
          <Field label="Minimum transaksi (Rp)" type="number" value={form.minSubtotal} onChange={v=>setForm({...form,minSubtotal:v})}/>
          <Field label="Maksimum diskon (Rp, opsional)" type="number" value={form.maxDiscount} onChange={v=>setForm({...form,maxDiscount:v})}/>
          <label className="field">Berlaku untuk
            <select value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})}>
              <option value="">Semua menu</option>
              {products.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <Field label="Maks. pemakaian (0 = tanpa batas)" type="number" value={form.maxUses} onChange={v=>setForm({...form,maxUses:v})}/>
          <label className="field">Mulai<input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label>
          <label className="field">Berakhir<input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></label>
        </div>
        <label className="checkbox-field"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/><span>Promo aktif setelah disimpan</span></label>
        <div className="menu-model-note">{form.type==="PERCENT"?"Potongan "+(form.value||0)+"%":"Potongan tetap "+rupiah(Number(form.value)||0)}{Number(form.maxDiscount)>0?" maksimal "+rupiah(Number(form.maxDiscount)):""}. Minimum transaksi {rupiah(Number(form.minSubtotal)||0)}.</div>
        <div className="form-actions"><button className="primary-button" onClick={onSave}>{editing?"Simpan Perubahan":"Simpan Promo"}</button>{editing&&<button className="secondary-button" onClick={onReset}>Batal</button>}</div>
      </Panel>
      <Panel title={"Daftar Promo ("+promos.length+")"}>
        <div className="simple-table">
          {promos.length?promos.slice().sort((a,b)=>Number(b.active)-Number(a.active)||b.updatedAt.localeCompare(a.updatedAt)).map(p=><div className="table-row" key={p.id}>
            <button className="table-row-main" type="button" onClick={()=>onEdit(p)}>
              <div><strong>{p.code} · {p.name}</strong><small>{promoRuleLabel(p)} · {p.startDate} s/d {p.endDate}</small></div>
              <div><strong>{p.usedCount}{p.maxUses?"/"+p.maxUses:""}x</strong><small>{p.active?"Aktif":"Nonaktif"}</small></div>
            </button>
            <button className={p.active?"edit-row-button":"secondary-button"} type="button" onClick={()=>onToggle(p)}>{p.active?"Nonaktifkan":"Aktifkan"}</button>
          </div>):<Empty text="Belum ada promo. Buat promo pertama di panel sebelah kiri."/>}
        </div>
      </Panel>
    </div>
  </section>;
}
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
                  <small>{i.sku} · {i.packageSize || "Kemasan belum diatur"} · Beli {rupiah(i.purchasePrice ?? 0)}</small>
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
function Stock({
  ingredients,movements,form,setForm,onSave
}:{
  ingredients:IngredientRecord[];
  movements:StockMovementRecord[];
  form:any;
  setForm:(v:any)=>void;
  onSave:()=>void;
}){
  const selected = ingredients.find(i=>i.id===form.ingredientId);
  const unitLabel = selected?.unit || "unit";

  const selectIngredient = (id:string) => {
    const item = ingredients.find(i=>i.id===id);
    setForm({
      ...form,
      ingredientId:id,
      quantity:form.type==="ADJUSTMENT" && item ? String(item.stock) : "",
      reason:form.type==="ADJUSTMENT" && item ? "Koreksi stok fisik" : form.reason
    });
  };

  const changeType = (type:"IN"|"OUT"|"ADJUSTMENT") => {
    setForm({
      ...form,
      type,
      quantity:type==="ADJUSTMENT" && selected ? String(selected.stock) : "",
      reason:type==="ADJUSTMENT" && selected ? "Koreksi stok fisik" : ""
    });
  };

  const editCurrentStock = (ingredient:IngredientRecord) => {
    setForm({
      ingredientId:ingredient.id,
      type:"ADJUSTMENT",
      quantity:String(ingredient.stock),
      reason:"Koreksi stok fisik"
    });
  };

  return <section className="page-section">
    <div className="content-grid">
      <Panel title="Penyesuaian Stok">
        <label className="field">
          Bahan
          <select value={form.ingredientId} onChange={e=>selectIngredient(e.target.value)}>
            <option value="">Pilih bahan</option>
            {ingredients.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>

        {selected && <div className="stock-current-box">
          <div><span>Stok saat ini</span><strong>{selected.stock} {selected.unit}</strong></div>
          <small>{selected.packageSize ? "Kemasan: "+selected.packageSize : "Satuan stok: "+selected.unit}</small>
        </div>}

        <label className="field">
          Jenis
          <select value={form.type} onChange={e=>changeType(e.target.value as "IN"|"OUT"|"ADJUSTMENT")}>
            <option value="IN">Stok Masuk</option>
            <option value="OUT">Stok Keluar</option>
            <option value="ADJUSTMENT">Koreksi / Edit Stok Fisik</option>
          </select>
        </label>

        <div className="quantity-field">
          <label className="field">
            {form.type==="ADJUSTMENT" ? "Stok fisik" : form.type==="IN" ? "Jumlah masuk" : "Jumlah keluar"}
            <div className="quantity-input-wrap">
              <input
                type="number"
                min="0"
                step={selected?.unit==="pcs" ? "1" : "0.01"}
                value={form.quantity}
                onChange={e=>setForm({...form,quantity:e.target.value})}
                placeholder="0"
              />
              <span>{unitLabel}</span>
            </div>
          </label>
        </div>

        <Field label="Alasan" value={form.reason} onChange={v=>setForm({...form,reason:v})}/>

        {selected && <div className="stock-result-preview">
          {form.type==="ADJUSTMENT"
            ? <>Stok baru: <strong>{Number(form.quantity)||0} {selected.unit}</strong></>
            : <>Stok setelah transaksi: <strong>{Math.max(0, selected.stock + (form.type==="IN" ? (Number(form.quantity)||0) : -(Number(form.quantity)||0)))} {selected.unit}</strong></>
          }
        </div>}

        <button className="primary-button" onClick={onSave} disabled={!selected || !(Number(form.quantity)>=0) || !form.reason}>
          Simpan Perubahan Stok
        </button>
      </Panel>

      <Panel title="Kartu Stok Terbaru">
        <div className="simple-table">
          {ingredients.map(i=>
            <div className="stock-row" key={i.id}>
              <div className="stock-row-main">
                <div>
                  <strong>{i.name}</strong>
                  <small>Stok: {i.stock} {i.unit}{i.packageSize ? " · "+i.packageSize : ""}</small>
                </div>
                <strong className={i.stock<=i.minStock ? "danger-text" : ""}>{i.stock} {i.unit}</strong>
              </div>
              <button className="edit-row-button" type="button" onClick={()=>editCurrentStock(i)}>Edit</button>
            </div>
          )}

          <div className="panel-subtitle">Aktivitas stok terbaru</div>
          {movements.slice(0,15).map(m=>
            <div className="table-row" key={m.id}>
              <div>
                <strong>{ingredients.find(i=>i.id===m.ingredientId)?.name || "Bahan"}</strong>
                <small>{m.type} · {m.reason}</small>
              </div>
              <strong>{m.quantity} {ingredients.find(i=>i.id===m.ingredientId)?.unit || ""}</strong>
            </div>
          )}
        </div>
      </Panel>
    </div>
  </section>;
}
function Expenses({expenses,form,setForm,onSave}:{expenses:ExpenseRecord[];form:any;setForm:(v:any)=>void;onSave:()=>void}){return <section className="page-section"><div className="content-grid"><Panel title="Catat Pengeluaran"><Field label="Kategori" value={form.category} onChange={v=>setForm({...form,category:v})}/><Field label="Deskripsi" value={form.description} onChange={v=>setForm({...form,description:v})}/><Field label="Nominal" type="number" value={form.amount} onChange={v=>setForm({...form,amount:v})}/><label className="field">Metode<select value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})}><option>Cash</option><option>Transfer</option><option>Debit</option></select></label><button className="primary-button" onClick={onSave}>Simpan Pengeluaran</button></Panel><Panel title="Riwayat Pengeluaran"><div className="simple-table">{expenses.map(e=><div className="table-row" key={e.id}><div><strong>{e.description}</strong><small>{e.category} · {dateLabel(e.createdAt)}</small></div><strong>{rupiah(e.amount)}</strong></div>)}</div></Panel></div></section>}
function Shift({active,shifts,opening,setOpening,closing,setClosing,onOpen,onClose}:{active:ShiftRecord|null;shifts:ShiftRecord[];opening:string;setOpening:(v:string)=>void;closing:string;setClosing:(v:string)=>void;onOpen:()=>void;onClose:()=>void}){return <section className="page-section"><div className="content-grid"><Panel title="Shift Aktif">{active?<><div className="shift-current"><div><strong>OPEN</strong><small>{dateLabel(active.startedAt)}</small></div><strong>{rupiah(active.openingCash)}</strong></div><Field label="Kas fisik saat tutup" type="number" value={closing} onChange={setClosing}/><button className="primary-button" onClick={onClose}>Tutup Shift</button></>:<><Field label="Modal awal" type="number" value={opening} onChange={setOpening}/><button className="primary-button" onClick={onOpen}>Buka Shift</button></>}</Panel><Panel title="Riwayat Shift"><div className="simple-table">{shifts.map(s=><div className="table-row" key={s.id}><div><strong>{s.status}</strong><small>{dateLabel(s.startedAt)}</small></div><div><strong>{rupiah(s.openingCash)}</strong><small>{s.variance==null?"—":"Selisih "+rupiah(s.variance)}</small></div></div>)}</div></Panel></div></section>}
function Reports({sales,expenses,products,onRecalculateHpp}:{sales:SaleRecord[];expenses:ExpenseRecord[];products:ProductRecord[];onRecalculateHpp:(from:string,to:string)=>void}){
  const [from,setFrom]=useState(today());
  const [to,setTo]=useState(today());

  const inRange=(date:string)=>{
    const d=date.slice(0,10);
    return d>=from && d<=to;
  };

  const filteredSales=sales.filter(s=>inRange(s.createdAt));
  const filteredExpenses=expenses.filter(e=>inRange(e.createdAt));

  const revenue=filteredSales.reduce((n,s)=>n+(Number(s.total)||0),0);
  const grossRevenue=filteredSales.reduce((n,s)=>n+(Number(s.subtotal)||0),0);
  const discountTotal=filteredSales.reduce((n,s)=>n+(Number(s.discount)||0),0);
  const cogs=filteredSales.reduce((n,s)=>n+(Number(s.costOfGoods)||0),0);
  const expense=filteredExpenses.reduce((n,e)=>n+(Number(e.amount)||0),0);
  const grossProfit=revenue-cogs;
  const netProfit=grossProfit-expense;
  const grossMargin=revenue>0?(grossProfit/revenue)*100:0;
  const avgTicket=filteredSales.length?revenue/filteredSales.length:0;
  const incompleteHpp=filteredSales.filter(s=>(Number(s.costOfGoods)||0)<=0).length;

  const paymentRows=paymentMethods.map(method=>({
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
  const promoMap=new Map<string,{name:string;count:number;discount:number}>();
  for(const sale of filteredSales){
    if(!sale.promoCode) continue;
    const key=sale.promoCode;
    const current=promoMap.get(key)||{name:sale.promoName||key,count:0,discount:0};
    current.count+=1;
    current.discount+=Number(sale.discount)||0;
    promoMap.set(key,current);
  }
  const promoRows=[...promoMap.entries()].map(([code,row])=>({code,...row})).sort((a,b)=>b.discount-a.discount);

  const exportReport=()=>{
    const rows=[
      ["Periode",from+" s/d "+to],
      [],
      ["Ringkasan","Nilai"],
      ["Omzet Kotor",grossRevenue],
      ["Diskon Promo",discountTotal],
      ["Omzet Bersih",revenue],
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
        <button className="secondary-button report-recalc-button" type="button" onClick={()=>void onRecalculateHpp(from,to)}>↻ Hitung Ulang HPP</button>
      </div>
    </div>

    {incompleteHpp>0&&<div className="report-warning"><strong>Catatan HPP:</strong> {incompleteHpp} transaksi pada periode ini belum memiliki HPP tercatat. HPP dan laba untuk transaksi tersebut belum dapat dianggap final.</div>}

    <div className="kpi-grid">
      <Kpi title="Omzet Kotor" value={rupiah(grossRevenue)} meta="Sebelum diskon"/>
      <Kpi title="Diskon Promo" value={rupiah(discountTotal)} meta={promoRows.length+" promo digunakan"}/>
      <Kpi title="Omzet Bersih" value={rupiah(revenue)} meta={filteredSales.length+" transaksi"}/>
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

      <Panel title="Promo Digunakan">
        <div className="simple-table">
          {promoRows.length?promoRows.map(r=><div className="table-row" key={r.code}><div><strong>{r.code}</strong><small>{r.name} · {r.count} transaksi</small></div><strong>{rupiah(r.discount)}</strong></div>):<Empty text="Belum ada promo digunakan pada periode ini."/>}
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
        <p className="setting-copy">HPP dihitung dari cost bahan yang tercatat saat transaksi. Acuan saat ini mengikuti tabel HPP terbaru, termasuk minyak goreng. Harga pasar bahan dapat berubah melalui Master Bahan Baku. Transaksi lama dengan HPP Rp0 akan tetap ditandai sebagai HPP belum tercatat agar laporan tidak memberikan angka laba yang menyesatkan.</p>
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
        <div className="receipt-meta"><span>Subtotal</span><strong>{rupiah(Number(sale.subtotal)||0)}</strong></div>
        {(Number(sale.discount)||0)>0&&<div className="receipt-meta"><span>Diskon{sale.promoCode?" · "+sale.promoCode:""}</span><strong>-{rupiah(Number(sale.discount)||0)}</strong></div>}
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
