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

## Deploy dengan Railway

Konfigurasi deploy tersedia di `railway.json`. Repository Git memiliki folder
aplikasi di `PROJECT-PROTEX`, jadi atur **Root Directory** service Railway ke
`/PROJECT-PROTEX`. Hubungkan service ke repository GitHub ini, lalu tambahkan
service MySQL di project Railway yang sama. Aplikasi dan MySQL lokal tidak
ikut online secara otomatis; buat database Railway, lalu import schema dan
data lokal sebelum mengalihkan pengguna ke website online.

Atur variables service aplikasi Railway berikut melalui dashboard (jangan
simpan rahasia di repository):

| Variable aplikasi | Nilai |
| --- | --- |
| `PORT` | Diisi otomatis oleh Railway |
| `DB_HOST` | `MYSQLHOST` dari service MySQL |
| `DB_USER` | `MYSQLUSER` dari service MySQL |
| `DB_PASSWORD` | `MYSQLPASSWORD` dari service MySQL |
| `DB_NAME` | `MYSQLDATABASE` dari service MySQL |
| `JWT_SECRET` | Secret acak yang panjang |
| `CLOUDINARY_CLOUD_NAME` | Cloud name Cloudinary |
| `CLOUDINARY_API_KEY` | API key Cloudinary |
| `CLOUDINARY_API_SECRET` | API secret Cloudinary |

Setelah deploy berhasil dan health check `/health` lolos, buat/generate public
domain dari pengaturan Networking service aplikasi. URL `*.up.railway.app`
tersebut tetap sama antar-restart dan bisa dibuka tanpa menjalankan server di
komputer lokal. Railway bisa mengenakan biaya sesuai paket dan pemakaian.

## Hak akses

- Pengunjung dapat melihat laporan dan kategori.
- User dapat membuat laporan dan mengajukan klaim barang temuan.
- Admin dapat menghapus laporan komunitas. Penghapusan divalidasi di API dan tidak tersedia untuk user.