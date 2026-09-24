# BDG Macaroni Holic POS

Point of Sale (POS) untuk Macaroni Holic — dirancang sebagai **offline-first web/PWA** untuk kasir, inventory, resep, HPP, laporan, dan multi-outlet.

## Status

**Phase 1 — Project Scaffold**

Saat ini repository sudah memiliki fondasi React + Vite + TypeScript dan manifest PWA. Modul transaksi, database lokal, sinkronisasi cloud, inventory, resep/HPP, autentikasi, dan multi-outlet akan dibangun bertahap.

## Tech Stack

- React
- Vite
- TypeScript
- PWA
- IndexedDB / Dexie.js (planned)
- Supabase PostgreSQL + Auth (planned)
- GitHub Actions
- GitHub Pages (deployment target)

## Menjalankan secara lokal

Pastikan Node.js LTS dan npm sudah terpasang.

```bash
npm install
npm run dev
```

Lalu buka URL localhost yang ditampilkan Vite.

Untuk mengecek production build:

```bash
npm run build
npm run preview
```

## Struktur target

```text
src/
├── components/
├── pages/
├── layouts/
├── features/
│   ├── pos/
│   ├── products/
│   ├── inventory/
│   ├── recipes/
│   ├── purchases/
│   ├── shifts/
│   ├── reports/
│   └── settings/
├── db/
├── services/
├── hooks/
├── utils/
└── types/
```

## Deployment

Deployment target menggunakan GitHub Actions + GitHub Pages. Workflow berada di:

```text
.github/workflows/deploy.yml
```

Untuk repository project yang dipublikasikan di bawah path repository, Vite menggunakan base:

```text
/bdg-macaroni-holic-pos/
```

## Catatan

Jangan menyimpan secret Supabase, password, API key privat, atau kredensial hardware di source code. Gunakan environment variables untuk nilai rahasia ketika integrasi backend mulai dibuat.
