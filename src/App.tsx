import { useMemo, useState } from "react";

type Category = "Semua" | "Macaroni" | "Snack" | "Drink" | "Topping";

type Product = {
  id: string;
  name: string;
  category: Exclude<Category, "Semua">;
  price: number;
  stock: number;
  emoji: string;
};

type CartItem = Product & { qty: number };

const products: Product[] = [
  { id: "mac-cheese", name: "Mac & Cheese", category: "Macaroni", price: 25000, stock: 18, emoji: "🧀" },
  { id: "mac-beef", name: "Mac & Beef", category: "Macaroni", price: 30000, stock: 12, emoji: "🥩" },
  { id: "spicy-mac", name: "Spicy Macaroni", category: "Macaroni", price: 27000, stock: 15, emoji: "🌶️" },
  { id: "mac-chicken", name: "Mac & Chicken", category: "Macaroni", price: 28000, stock: 10, emoji: "🍗" },
  { id: "fries", name: "French Fries", category: "Snack", price: 15000, stock: 25, emoji: "🍟" },
  { id: "sausage", name: "Sausage", category: "Snack", price: 17000, stock: 20, emoji: "🌭" },
  { id: "chicken-nugget", name: "Chicken Nugget", category: "Snack", price: 18000, stock: 16, emoji: "🍗" },
  { id: "iced-tea", name: "Iced Tea", category: "Drink", price: 8000, stock: 40, emoji: "🧋" },
  { id: "mineral", name: "Mineral Water", category: "Drink", price: 6000, stock: 50, emoji: "💧" },
  { id: "cola", name: "Cola", category: "Drink", price: 9000, stock: 32, emoji: "🥤" },
  { id: "extra-cheese", name: "Extra Cheese", category: "Topping", price: 6000, stock: 30, emoji: "🧀" },
  { id: "extra-beef", name: "Extra Beef", category: "Topping", price: 9000, stock: 14, emoji: "🥩" },
];

const categories: Category[] = ["Semua", "Macaroni", "Snack", "Drink", "Topping"];

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function App() {
  const [category, setCategory] = useState<Category>("Semua");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<"Take Away" | "Dine In">("Take Away");
  const [tableNumber, setTableNumber] = useState("");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [cashReceived, setCashReceived] = useState("");
  const [lastOrder, setLastOrder] = useState<string | null>(null);

  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory = category === "Semua" || product.category === category;
        const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase());
        return matchesCategory && matchesQuery;
      }),
    [category, query],
  );

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = 0;
  const total = subtotal - discount;
  const received = Number(cashReceived) || 0;
  const change = Math.max(received - total, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return current;
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...current, { ...product, qty: 1 }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0),
    );
  }

  function clearCart() {
    setCart([]);
  }

  function finishPayment() {
    if (paymentMethod === "Cash" && received < total) return;
    const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const orderNo = "MH-" + datePart + "-" + String(Date.now()).slice(-4);
    setLastOrder(orderNo);
    setIsPaymentOpen(false);
    clearCart();
    setCashReceived("");
  }

  return (
    <div className="pos-app">
      <header className="pos-topbar">
        <div className="brand-block">
          <div className="brand-mark">MH</div>
          <div>
            <div className="brand-name">MACARONI HOLIC</div>
            <div className="outlet-name">Outlet Bandung 01</div>
          </div>
        </div>

        <div className="topbar-center">
          <div className="connection-pill"><span /> Online</div>
          <div className="shift-text">Shift: Pagi · Kasir: Admin</div>
        </div>

        <div className="topbar-actions">
          <button className="icon-button" type="button" title="Riwayat">↺</button>
          <button className="cashier-button" type="button">Admin ▾</button>
        </div>
      </header>

      <div className="pos-layout">
        <aside className="category-sidebar">
          <div className="sidebar-title">Kategori</div>
          <div className="category-list">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? "category-button active" : "category-button"}
                onClick={() => setCategory(item)}
              >
                <span>{item === "Semua" ? "▦" : item === "Macaroni" ? "🍝" : item === "Snack" ? "🍟" : item === "Drink" ? "🥤" : "🧀"}</span>
                {item}
              </button>
            ))}
          </div>
          <div className="sidebar-footer">
            <div className="stock-warning"><span>!</span><div><strong>Stok menipis</strong><small>3 item perlu dicek</small></div></div>
          </div>
        </aside>

        <main className="catalog-area">
          <div className="catalog-head">
            <div>
              <div className="page-kicker">Kasir</div>
              <h1>Pesanan Baru</h1>
            </div>
            <div className="search-wrap">
              <span>⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari menu atau SKU..."
                aria-label="Cari menu"
              />
              <kbd>Ctrl K</kbd>
            </div>
          </div>

          {lastOrder && (
            <div className="success-banner">
              <div><strong>Transaksi berhasil</strong><span>{lastOrder} siap dicatat ke riwayat.</span></div>
              <button type="button" onClick={() => setLastOrder(null)}>Tutup</button>
            </div>
          )}

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                className="menu-card"
                onClick={() => addToCart(product)}
              >
                <div className="menu-image">{product.emoji}</div>
                <div className="menu-info">
                  <div className="menu-name">{product.name}</div>
                  <div className="menu-price">{formatRupiah(product.price)}</div>
                  <div className="menu-meta">{product.stock <= 10 ? "Stok " + product.stock : "Tersedia"}</div>
                </div>
                <div className="menu-add">+</div>
              </button>
            ))}
          </div>
        </main>

        <aside className="cart-panel">
          <div className="cart-head">
            <div>
              <div className="page-kicker">Pesanan</div>
              <h2>Keranjang <span>{cartCount}</span></h2>
            </div>
            {cart.length > 0 && <button type="button" className="clear-button" onClick={clearCart}>Kosongkan</button>}
          </div>

          <div className="order-type-row">
            <button type="button" className={orderType === "Take Away" ? "type-button active" : "type-button"} onClick={() => setOrderType("Take Away")}>Take Away</button>
            <button type="button" className={orderType === "Dine In" ? "type-button active" : "type-button"} onClick={() => setOrderType("Dine In")}>Dine In</button>
          </div>

          {orderType === "Dine In" && (
            <input
              className="table-input"
              value={tableNumber}
              onChange={(event) => setTableNumber(event.target.value)}
              placeholder="Nomor meja"
            />
          )}

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-icon">🛒</div>
                <strong>Keranjang masih kosong</strong>
                <span>Pilih menu di sebelah kiri untuk memulai transaksi.</span>
              </div>
            ) : (
              cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-icon">{item.emoji}</div>
                  <div className="cart-item-main">
                    <strong>{item.name}</strong>
                    <span>{formatRupiah(item.price)}</span>
                    <div className="qty-control">
                      <button type="button" onClick={() => updateQty(item.id, -1)}>−</button>
                      <span>{item.qty}</span>
                      <button type="button" onClick={() => updateQty(item.id, 1)}>+</button>
                    </div>
                  </div>
                  <strong className="cart-item-total">{formatRupiah(item.price * item.qty)}</strong>
                </div>
              ))
            )}
          </div>

          <div className="cart-summary">
            <div><span>Subtotal</span><strong>{formatRupiah(subtotal)}</strong></div>
            <div><span>Diskon</span><strong>{formatRupiah(discount)}</strong></div>
            <div className="summary-total"><span>Total</span><strong>{formatRupiah(total)}</strong></div>
            <button
              type="button"
              className="pay-button"
              disabled={cart.length === 0}
              onClick={() => setIsPaymentOpen(true)}
            >
              Bayar · {formatRupiah(total)}
            </button>
          </div>
        </aside>
      </div>

      {isPaymentOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Pembayaran">
          <div className="payment-modal">
            <div className="modal-head">
              <div><div className="page-kicker">Checkout</div><h2>Pembayaran</h2></div>
              <button type="button" className="close-modal" onClick={() => setIsPaymentOpen(false)}>×</button>
            </div>

            <div className="payment-total">{formatRupiah(total)}</div>

            <div className="payment-methods">
              {["Cash", "QRIS", "Debit", "Transfer"].map((method) => (
                <button
                  key={method}
                  type="button"
                  className={paymentMethod === method ? "method-button active" : "method-button"}
                  onClick={() => setPaymentMethod(method)}
                >
                  {method}
                </button>
              ))}
            </div>

            {paymentMethod === "Cash" && (
              <label className="cash-field">
                Uang diterima
                <input
                  inputMode="numeric"
                  value={cashReceived}
                  onChange={(event) => setCashReceived(event.target.value.replace(/\\D/g, ""))}
                  placeholder="Contoh: 50000"
                />
                <span>Kembalian: <strong>{formatRupiah(change)}</strong></span>
              </label>
            )}

            <button
              type="button"
              className="confirm-pay"
              onClick={finishPayment}
              disabled={paymentMethod === "Cash" && received < total}
            >
              Konfirmasi Pembayaran
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
