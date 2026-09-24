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


## Final readiness check
The main branch is being validated with the project CI workflow before user testing.
