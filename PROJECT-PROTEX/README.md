# Protex

Protex adalah aplikasi laporan barang hilang dan ditemukan.

## Menjalankan aplikasi

1. Isi konfigurasi database, JWT, dan Cloudinary di `.env`.
2. Jalankan `npm install` jika dependensi belum tersedia.
3. Jalankan `npm run dev`, lalu buka `http://localhost:3000`.

Halaman web disajikan dari `public/` dan memakai API pada server yang sama.
Styling memakai Tailwind CSS; `npm run build:css` mengompilasi utility dari
`public/` ke `public/tailwind.css`. Perintah `npm run dev` dan `npm run build`
menjalankan kompilasi tersebut otomatis.

## Hak akses

- Pengunjung dapat melihat laporan dan kategori.
- User dapat membuat laporan dan mengajukan klaim barang temuan.
- Admin dapat menghapus laporan komunitas. Penghapusan divalidasi di API dan tidak tersedia untuk user.