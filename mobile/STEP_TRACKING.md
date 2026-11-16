# Pelacakan langkah

Kartu Langkah di Beranda membuka `/steps`. Pengguna dapat mengaktifkan sensor, menyinkronkan riwayat, menghentikan pelacakan, atau memasukkan total harian.

- Sensor: `expo-sensors` Pedometer. Angka diperbarui saat aplikasi aktif, dengan penulisan penyimpanan dibatasi setiap 1,5 detik dan di-flush ketika masuk latar belakang atau listener dihentikan.
- iOS: Core Motion menyediakan total sejak tengah malam, dibaca kembali saat aplikasi aktif.
- Android: Health Connect dibaca dengan izin `READ_STEPS`, menggunakan agregasi total untuk menghindari penjumlahan record tumpang tindih dari beberapa sumber. Riwayat memerlukan penyedia data langkah yang menulis ke Health Connect; ketersediaan Health Connect saja tidak menjamin ada data.
- Tidak ada layanan penghitung langkah milik Better Life yang berjalan terus setelah aplikasi ditutup. Langkah yang terlewat dilengkapi dari riwayat yang tersedia ketika aplikasi dibuka kembali. Tanpa riwayat, aplikasi hanya menjamin penghitungan selama sensor aktif.
- Data tersimpan lokal per akun dan tanggal kalender perangkat: SecureStore di Android/iOS dan localStorage di web. Belum ada sinkronisasi ke backend atau antarperangkat.
- Tidak ada batas 8.000 langkah. Target tetap 6.000, sedangkan progres visual maksimal 100%.
- Total manual dan sensor memakai angka terbesar, tidak dijumlahkan. Total manual dapat dikoreksi turun, tetapi tidak menghapus langkah dari sensor.
- Preferensi aktif/nonaktif disimpan per akun. Pergantian hari membuat catatan baru dan mengganti langganan sensor; pergantian akun menghentikan listener akun sebelumnya. Menonaktifkan pelacakan menghentikan pembacaan aplikasi, tanpa mencabut izin sistem atau menghapus data.

## Menjalankan di HP

Android memerlukan build native Better Life. `npm run android` yang sudah ada memakai Expo Go dan tidak cukup untuk sensor langkah Android atau Health Connect.

Dengan Android SDK dan HP/emulator yang terhubung, jalankan dari folder `mobile`:

```sh
npx expo run:android
```

Build iOS memerlukan macOS/Xcode atau layanan build iOS. Setelah terpasang, buka Beranda > Langkah > Aktifkan pelacakan langkah, berikan izin aktivitas fisik dan, pada Android yang mendukungnya, izin baca langkah Health Connect.

Sebelum distribusi publik, verifikasi halaman penjelasan izin/kebijakan privasi dari dialog Health Connect dan deklarasi akses data kesehatan sesuai kebutuhan distribusi aplikasi.

## Validasi perangkat lunak

- PASS: `npm run typecheck`.
- PASS: 41 tes mobile, termasuk sumber sensor tiruan, izin ditolak/permanen, Expo Go Android, riwayat iOS/Android, pelepasan listener, isolasi akun/tanggal, penulisan bersamaan, dan kegagalan storage.
- PASS: `npm run build` untuk web dan ekspor bundle Android. Ekspor bundle bukan kompilasi APK native.
- PASS: introspeksi konfigurasi Expo menghasilkan izin `ACTIVITY_RECOGNITION`, `health.READ_STEPS`, dan deskripsi izin gerak iOS.
- PASS: Playwright pada build web, validasi input kosong/negatif, Enter untuk menyimpan, total 12.345, persistensi setelah reload, penanganan kegagalan storage, pergantian tanggal, isolasi akun, kartu Beranda dan tombol kembali, tanpa runtime error.
- React Doctor seluruh proyek: 51/100, dengan temuan lama pada layar lain. Temuan kompleksitas pada layar langkah sudah diperbaiki; tidak ada temuan untuk file fitur langkah baru pada pemeriksaan terakhir.
- ESLint proyek belum mengonfigurasi pemeriksaan file TypeScript; hasil file diabaikan tidak dihitung sebagai bukti lint lolos.

Belum diuji di HP fisik karena tidak ada perangkat terhubung. Pengujian berikut masih perlu dilakukan pada build native: berjalan dengan HP dibawa, layar mati/latar belakang, pemulihan riwayat, pencabutan izin lewat Settings, dan Health Connect dengan penyedia data nyata. Tidak ada klaim bahwa pengujian perangkat telah lolos.

## Delivery Gate antislop, lingkup layar langkah

Design Read: mengikuti `DESIGN.md`, Urbanist, canvas hijau pucat, aksen hijau untuk tindakan dan progres. ENERGY 1 / RHYTHM 2 / MOTION 1. Angka langkah menjadi fokus; jarak memisahkan ringkasan, sensor, dan input manual. Tidak membuat aset visual baru.

- PASS, Hard Gate perangkat lunak: tidak ada klaim statistik fiktif, aset baru, link mati, atau kontrol web tanpa perilaku. Loading/error/empty state tersedia. Build dijalankan, kontrol web diuji lewat Playwright, input dioperasikan lewat keyboard, dan overflow diuji pada 320/390/1280 px. Pengujian perangkat native dibatasi secara eksplisit di atas.
- PASS, Purpose Gate: kartu digunakan untuk ringkasan angka, progres untuk target harian, dan warna hijau untuk status/tindakan sesuai desain produk. Tidak menambahkan gradient, glow, ilustrasi, badge dekoratif, atau animasi baru.
- PASS, Liveliness: dials ditetapkan, angka harian menjadi titik fokus, ruang antarkelompok bersifat struktural, serta warna dan bentuk kontrol memakai identitas Better Life yang ada.
- PASS, Craftsmanship: tampilan diperiksa lewat screenshot mobile; layout diuji pada tiga lebar; teks muted/canvas 5,73:1 dan primary/canvas 4,69:1 lewat contrast-check.py. Tindakan menyimpan menampilkan keberhasilan hanya setelah storage berhasil. Sensor dan manual tidak menghitung langkah yang sama dua kali.

## Referensi API

- [Expo Pedometer](https://docs.expo.dev/versions/latest/sdk/pedometer/)
- [Expo Sensors](https://docs.expo.dev/versions/latest/sdk/sensors/)
- [React Native Health Connect](https://matinzd.github.io/react-native-health-connect/docs/get-started/)
