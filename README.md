# Sora Anindya · Portofolio Desainer Grafis

Portofolio full-stack dan studio untuk persona fiktif Sora Anindya dari Ruang Karya. Galeri publik mempertahankan grid karya, filter kategori, detail studi kasus, dan panduan identitas Temu.

## Studio

- Masuk di `/admin` untuk membuat, menyunting, atau menyembunyikan studi kasus. Isi ringkasan, cerita, kredit, hasil, palet, wordmark, dan tipografi.
- Unggah aset sampul, logo, mockup, tipografi, atau perbandingan varian. Masukkan teks alternatif, kredit, dan urutan tampil. Sampul pertama mengikuti urutan tampilan aset.
- Buat varian dengan nama, warna, deskripsi, urutan, dan pilihan gambar dari studi kasus yang sama. Draf beserta asetnya dapat dibuka oleh admin.

Aset JPEG, PNG, dan WebP statis diterima hingga 12 MB dan 30 megapiksel. Server mengolahnya menjadi WebP untuk tampilan galeri dan penampil gambar. PostgreSQL menyimpan gambar olahan, metadata, studi kasus, varian, dan sesi.

## Menjalankan secara lokal

Siapkan Node.js 24 dan PostgreSQL. Salin `.env.example` ke `.env` dan isi `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, dan `ADMIN_PASSWORD`. Gunakan kata sandi admin unik minimal 16 karakter.

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm ci
npm run db:migrate
npm run db:seed
npm run admin:provision
npm run dev
```

Perintah pertama membuat nilai acak untuk `SESSION_SECRET`. Pengisian awal menyediakan empat studi kasus contoh. `admin:provision` membuat atau mereset akun admin dan mengakhiri sesi sebelumnya. Mode pengembangan tersedia pada [portofolio di port 5177](http://127.0.0.1:5177/) dan [studio admin](http://127.0.0.1:5177/admin).

Untuk hasil build lokal, atur `APP_ORIGIN=http://127.0.0.1:4177`, jalankan `npm run build`, lalu `npm start`. Express menyajikan frontend dan API dari origin yang sama. Frontend memakai React, Vite, TypeScript, dan CSS Modules. Prisma mengelola migrasi dan akses PostgreSQL.

## Kredit

- Pengembangan oleh [guspriaman](https://github.com/guspriaman) untuk [guspriStack](https://github.com/guspristack).
- Desain portofolio, potret, dan mockup contoh berasal dari prototipe Ruang Karya. Kredit per karya contoh memakai persona fiktif Sora Anindya.
