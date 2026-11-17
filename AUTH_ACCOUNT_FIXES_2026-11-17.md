# Perbaikan batch login dan akun

Lingkup: rekomendasi nomor 1–3 dari percakapan, yaitu temuan audit F01 (Google), F03 (isolasi akun), dan F04 (token onboarding). Nomor ini bukan F01–F03 pada laporan audit.

## Perubahan

- Backend Google menerima ID token, bukan klaim email dari klien. `google-auth-library` memverifikasi signature, issuer, audience, dan expiry. Email harus terverifikasi. Identitas dalam JWT aplikasi berasal dari payload terverifikasi. Subject Google dicatat; konflik subject ditolak. Penautan otomatis akun lama untuk email pihak ketiga tanpa hosted domain ditolak.
- Client meminta ID token dan meneruskannya ke backend. Penolakan server atau kegagalan koneksi tidak menciptakan session Google lokal. Opsi login Google instan tanpa identitas provider dihapus.
- Popup memeriksa origin, source, dan state. Callback memeriksa state sebelum menggunakan respons dan membersihkan URL credential. BroadcastChannel dengan nama terikat state melengkapi postMessage untuk popup yang kehilangan opener.
- Jurnal, personalisasi, dan resep buatan disimpan menurut email akun yang dinormalisasi, memakai key yang aman untuk SecureStore. Pemilihan email menjaga scope konsisten meskipun ID lokal lama berbeda dari ID server. Pergantian email akun akan memerlukan migrasi namespace tersendiri.
- Login/logout/restore mengosongkan state akun sebelumnya dan cache query, analytics, planner, subscription, serta resep buatan sebelum memuat akun tujuan. Pembacaan journal/profil yang tertunda memakai revision guard.
- Menyelesaikan onboarding mempertahankan seluruh session termasuk token, dan tidak boleh menulis hasilnya ke akun yang sudah berganti.
- Login password kini menolak password kosong, respons server non-2xx, dan server yang tidak terhubung. Registry password lokal dan perilaku signup demo lainnya dari F13 belum diganti dalam batch ini.

## Data lama

Key global lama `betterlife_journals_v1`, `betterlife_personalization_v1`, dan `betterlife_custom_recipes_v1` tidak dihapus atau otomatis diberikan kepada akun baru. Pemilik data lama tidak tercatat dan bisa sudah tercampur. Migrasi data tersebut memerlukan pemilihan pemilik yang eksplisit. Catatan yang dibuat setelah perbaikan dipisahkan dan kembali tersedia ketika akun pemilik login ulang.

## Konfigurasi Google

`GOOGLE_CLIENT_IDS` pada backend adalah daftar audience tepercaya, dipisahkan koma. `.env.example` memakai Web Client ID yang sebelumnya digunakan aplikasi. Client ID tambahan/custom pada UI harus disetujui melalui konfigurasi backend ini; klien tidak dapat menentukan audience tepercaya sendiri.

Belum ada pengujian manual dengan akun Google nyata atau perangkat Android/iOS. Client ID, authorized redirect URI, dan setup native Google tetap harus sesuai konfigurasi proyek Google. Tes lokal tidak membuktikan persetujuan Google atau redirect native pada perangkat nyata.

## Verifikasi

- PASS: backend 66 tes, mobile 42 tes, total108.
- PASS: TypeScript backend dan mobile.
- PASS: backend build dan Expo web export.
- PASS: pengujian Google memakai RSA key lokal dan menjalankan verifier Google asli; hanya penyedia sertifikat diganti fixture. Token signature rusak, audience salah, issuer salah, expired, email belum terverifikasi, dan permintaan email tanpa token ditolak. Token bertanda tangan valid menghasilkan JWT yang dapat dipakai pada `/api/auth/me`; email/nama palsu dari body diabaikan.
- PASS: store mobile nyata dengan storage/fetch terisolasi: token hilang/401 ditolak, identitas server digunakan, JWT bertahan setelah onboarding dan initializeAuth, A→logout→B→logout→A memisahkan serta memulihkan jurnal/profil, data legacy tidak terambil, dan pembacaan jurnal lama tidak menimpa scope akun baru.
- PASS: Playwright pada Chrome390px dengan build web dan backend lokal: password salah ditolak, login password benar mendapat JWT, reload mempertahankan JWT, logout menghapus session, callback Google palsu tidak menghasilkan session. Respons layar provider/userinfo diganti fixture; keputusan backend tetap melalui endpoint lokal asli.
- React Doctor seluruh proyek:52/100,3 error dan92 warning. Ini mencakup masalah lama di luar batch; tidak diperlakukan sebagai bukti bahwa seluruh proyek bebas masalah.

## Batas batch

Belum memperbaiki pembayaran/webhook, persistence PostgreSQL, porsi/kalori, filter alergi, sinkronisasi ID jurnal, reset lintas tanggal, atau analytics tanggal. Tidak ada commit/push dilakukan dalam batch ini. Perubahan lokal HTML desain yang sudah ada dipertahankan.

Skill surgical-patch digunakan untuk menjaga perubahan pada alur terkait dan menambahkan tes regresi pada store/API asli. Antislop mengikuti pilihan sebelumnya untuk diterapkan selama pengerjaan: layout lama dipertahankan, kontrol login instan yang tidak lagi sah dihapus, dan kesalahan verifikasi tetap ditampilkan pada dialog login yang sama.
