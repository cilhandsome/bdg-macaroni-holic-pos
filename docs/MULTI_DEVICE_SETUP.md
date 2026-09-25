# Multi-device setup — Macaroni Holic POS

Aplikasi tetap **offline-first** dengan IndexedDB. Saat Supabase dikonfigurasi, perangkat akan melakukan sinkronisasi dua arah secara otomatis saat startup, saat kembali online, dan berkala.

## 1. Buat project Supabase

Buat satu project Supabase untuk POS.

## 2. Jalankan schema

Buka **SQL Editor** di project tersebut, lalu jalankan seluruh isi:

`supabase/schema.sql`

Schema saat ini sudah mengikuti model POS terbaru: produk, ukuran S/M/L, HPP, bahan baku, resep, transaksi, stok, pembelian, shift, expense, user, dan outlet.

## 3. Ambil kredensial

Ambil:

- Project URL
- Publishable/anon key

Keduanya dipakai di browser. Jangan pernah memasukkan service-role key ke aplikasi.

## 4. Local development

Buat file `.env` dari `.env.example`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Lalu:

```powershell
npm install
npm run dev
```

## 5. GitHub Pages

Di GitHub repository, buka:

**Settings → Secrets and variables → Actions → New repository secret**

Tambahkan:

`VITE_SUPABASE_URL`

dan

`VITE_SUPABASE_ANON_KEY`

Workflow `.github/workflows/deploy.yml` akan memasukkan secrets tersebut saat build.

Pada **Settings → Pages**, pilih:

**Source: GitHub Actions**

## 6. Cara kerja multi-device

Perangkat A:
- transaksi offline tetap tersimpan lokal;
- ketika online, data dikirim ke Supabase.

Perangkat B:
- saat startup/online, data dari Supabase ditarik ke database lokal;
- laporan, transaksi, produk, bahan, resep, pembelian, stok, shift, dan expense diperbarui.

Ada tombol **Sync** untuk sinkronisasi manual.

## 7. Penting untuk production

Policy pada `supabase/schema.sql` saat ini masih mode development dan membuka akses CRUD menggunakan anon key agar setup multi-device mudah diuji.

Sebelum dipakai untuk transaksi nyata, RLS harus diganti menjadi policy berbasis autentikasi dan outlet. Jangan menganggap konfigurasi development ini sebagai security boundary produksi.

## 8. Konsep stok

Stock master lokal tetap tersimpan per bahan. Stock movements dan transaksi juga disinkronkan. Untuk outlet dengan banyak kasir yang transaksi bersamaan, final production sebaiknya menggunakan server-side atomic inventory updates agar dua perangkat tidak menulis stok terakhir secara bersamaan.
