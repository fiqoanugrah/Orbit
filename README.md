# Orbit

Orbit adalah sistem manajemen tempat les untuk mengelola murid, orang tua, guru,
program belajar, paket, kelas, enrollment, absensi, invoice, pembayaran, dan
laporan dalam satu aplikasi.

## Stack

- Next.js 15 App Router
- React 19
- Tailwind CSS 4
- Prisma dengan PostgreSQL/Supabase

## Getting Started

Install dependency lalu jalankan app:

First, run the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Setup database development:

```bash
cp .env.example .env
pnpm db:migrate
```

## Product Notes

- Flow awal produk: landing page -> buat tempat les -> dashboard organization.
- Organization adalah batas data utama untuk fondasi multi-tenant.
- User bisa masuk ke lebih dari satu organization lewat membership.
- Di UI, pricing plan ditampilkan sebagai "Paket".
- Di database, entity tersebut bernama `pricing_plans`.
- Program tidak menyimpan harga; harga hanya berada pada pricing plan.
- Enrollment dipisahkan dari billing dan invoice.
- Invoice yang sudah diterbitkan tidak boleh diubah nominalnya; gunakan invoice
  baru atau adjustment.
