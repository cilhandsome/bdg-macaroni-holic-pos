type Product = {
  id: string;
  name: string;
  price: number;
};

const demoProducts: Product[] = [
  { id: "mac-cheese", name: "Mac & Cheese", price: 25000 },
  { id: "mac-beef", name: "Mac & Beef", price: 30000 },
  { id: "spicy-macaroni", name: "Spicy Macaroni", price: 27000 },
  { id: "iced-tea", name: "Iced Tea", price: 8000 },
];

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">MACARONI HOLIC</p>
          <h1>Point of Sale</h1>
        </div>
        <span className="status-badge">● Offline-first</span>
      </header>

      <section className="hero-card">
        <div>
          <span className="section-label">MVP 0.1</span>
          <h2>Fondasi POS sudah siap.</h2>
          <p>
            Tahap awal ini menyiapkan React, TypeScript, dan PWA untuk
            dikembangkan menjadi sistem kasir offline-first.
          </p>
        </div>
      </section>

      <section className="product-grid" aria-label="Produk demo">
        {demoProducts.map((product) => (
          <article className="product-card" key={product.id}>
            <div className="product-thumb">MH</div>
            <div>
              <h3>{product.name}</h3>
              <p>{rupiah.format(product.price)}</p>
            </div>
            <button type="button">Tambah</button>
          </article>
        ))}
      </section>

      <footer className="footer">
        <span>Macaroni Holic POS</span>
        <span>Phase 1 — Project Scaffold</span>
      </footer>
    </main>
  );
}
