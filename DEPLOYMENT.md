# Deploy Better Life ke Render

Blueprint `render.yaml` menyiapkan backend Node dan PostgreSQL di Singapore. Backend Starter dan database Basic berbayar. Periksa biaya di Render sebelum aktivasi.

1. Hubungkan akun Render dan GitHub. Pilih New > Blueprint dan repo Daff77/better-life.
2. Pilih branch berisi render.yaml. Build berjalan dari root agar paket shared tersedia.
3. Isi AI_API_KEY secara privat di Render. JWT_SECRET dibuat otomatis dan DATABASE_URL terhubung otomatis.
4. Tinjau biaya lalu aktifkan layanan. Migrasi SQL berjalan otomatis sebelum server menerima request. Production tidak membuat akun demo.
5. Pastikan URL HTTPS layanan pada /health memberi status ok dan database pg.

## Aplikasi

Set EXPO_PUBLIC_API_URL di mobile/.env ke URL HTTPS backend yang benar, lalu restart Metro atau build ulang. Untuk web, tambahkan origin web sebenarnya ke CORS_ORIGIN di Render. Native tidak memerlukan origin CORS.

Expo Go tetap memerlukan Metro untuk memuat aplikasi. Agar aplikasi juga tidak bergantung laptop, gunakan build Android/iOS mandiri atau hosting web.

## Data

Database cloud baru dimulai kosong. Akun lokal perlu dimigrasikan atau didaftarkan kembali. Riwayat chat lokal diunggah oleh aplikasi setelah login dengan akun yang sesuai. Simpan database lokal sampai migrasi akun dan data berhasil diverifikasi. API key dan .env tidak boleh masuk GitHub.

## Verifikasi

Daftar akun, kirim chat, lalu login di perangkat kedua dengan akun sama dan periksa history. Ulangi setelah restart layanan. Request tanpa token ke /api/assistant/history harus mendapat 401.
