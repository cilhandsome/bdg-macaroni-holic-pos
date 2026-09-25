# BDG Macaroni Holic POS

Offline-first POS untuk Macaroni Holic.

Modul utama: Dashboard, Kasir, Transaksi/Struk, Produk, Bahan Baku, Resep/HPP, Pembelian, Stok, Pengeluaran, Shift, Laporan, Outlet, Pengguna, Backup/Restore, PWA, dan sinkronisasi Supabase.

Teknologi: React + Vite + TypeScript + Dexie + PWA.

Local development:
- npm install
- npm run dev
- npm run build

Cloud:
- Jalankan supabase/schema.sql di Supabase SQL Editor.
- Salin .env.example menjadi .env.local.
- Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.
- Tombol Sync mengirim transaksi lokal yang belum tersinkron.

Backup tersedia melalui Pengaturan.


## Multi-device setup
1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Copy `.env.example` to `.env` for local development and fill in the project URL and anon key.
3. For GitHub Pages, add repository Actions secrets named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. The POS keeps an IndexedDB local copy and synchronizes data both ways with Supabase when online.

Final CI validation trigger.
