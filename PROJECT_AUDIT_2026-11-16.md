# Better Life: audit logika dan integrasi

Tanggal: 16 November 2026. Basis: commit `ed66f4d`, dengan perubahan lokal `better-life-design.html` yang sudah ada. File HTML tersebut tidak diubah dalam audit ini.

## Kesimpulan

Build dan tes bawaan lolos, tetapi alur produksi belum konsisten: mobile dapat menganggap pengguna login/premium ketika server menolak, sedangkan jurnal dan profil belum dipisahkan menurut akun. API Google dan pembayaran masih memiliki perilaku simulasi yang bisa dipakai tanpa verifikasi identitas/pembayaran. Ini merupakan penghalang rilis publik apabila aplikasi dimaksudkan melayani akun dan pembayaran nyata; untuk demo, perilaku tersebut perlu dipagari dan diberi mode eksplisit.

Audit dilakukan melalui pembacaan kode, tes bawaan, build, analisis React, dan probe terisolasi yang mengeksekusi fungsi store/API asli. Tidak ada perbaikan perilaku produk atau push yang dilakukan.

## Hasil pemeriksaan

| Pemeriksaan | Hasil |
|---|---|
| Backend integration tests | 65/65 lolos |
| Mobile domain/storage/sensor-adapter tests | 41/41 lolos |
| TypeScript backend dan mobile | Lolos |
| Backend build + Expo web export | Lolos |
| React Doctor seluruh mobile | 52/100; 3 errors, 93 warnings; diagnostik belum semuanya dikonfirmasi sebagai bug |
| Probe HTTP backend | 4 masalah terkonfirmasi pada identitas, premium, webhook, dan reset |
| Probe mobile dengan storage/fetch terisolasi | Masalah session, pemisahan akun, porsi, kalkulasi, planner, dan fallback premium terkonfirmasi |

Tes bawaan tidak membuktikan integrasi mobile-server, otorisasi Google, atau pembayaran nyata. Sebagian hanya membuktikan perilaku simulasi saat ini. Sensor fisik, aplikasi tertutup, notifikasi OS, APK/iOS native, dan layanan pembayaran asli tidak diuji.

## Temuan terurut

### F01 — Kritis: email saja cukup untuk memperoleh token akun Google

Sumber: [backend/src/routes/auth.ts:138](backend/src/routes/auth.ts#L138).

Endpoint `/api/auth/google` menerima email/nama dan langsung mencari akun lalu menerbitkan JWT. Tidak ada verifikasi ID token Google maupun pembuktian kepemilikan email. Probe terhadap Express app lokal mengirim email akun seed tanpa ID token: HTTP 200, token valid, `/api/auth/me` mengembalikan `user-daffa`.

Perbaikan: server harus memvalidasi bukti identitas Google, termasuk audience/issuer/expiry; identitas akun berasal dari token terverifikasi. Permintaan tanpa bukti harus ditolak. Tambahkan tes impersonasi terhadap akun yang sudah terdaftar.

### F02 — Kritis untuk pembayaran nyata: premium aktif tanpa pembayaran, webhook tanpa tanda tangan

Sumber: [subscriptionService.ts:123](backend/src/services/subscriptionService.ts#L123), [subscriptionService.ts:194](backend/src/services/subscriptionService.ts#L194), [subscription.ts:138](backend/src/routes/subscription.ts#L138), [subscriptionApi.ts:70](mobile/lib/api/subscriptionApi.ts#L70).

Backend checkout dengan `provider: stripe` langsung mengaktifkan premium. Parameter receipt pada verify tidak digunakan. Webhook menerima event tanpa signature dan dapat mengubah subscription pengguna yang ditunjuk payload. Probe: checkout lifetime tanpa pembayaran menghasilkan HTTP 200 dan premium=true; unsigned `subscription.revoked` menghasilkan HTTP 201 dan premium=false. Pada mobile, fetch yang dipaksa HTTP 401 tetap menghasilkan checkout sukses dan premium=true melalui fallback lokal.

Perbaikan: pisahkan sandbox secara eksplisit dan nonaktifkan di produksi; checkout hanya membuat transaksi pending. Aktivasi premium harus berdasarkan verifikasi provider. Webhook harus terverifikasi sebelum mutasi; kegagalan 401/403/validasi tidak boleh berubah menjadi keberhasilan lokal.

### F03 — Tinggi: jurnal dan personalisasi bercampur antar akun

Sumber: [journalStorage.ts:3](mobile/lib/journalStorage.ts#L3), [sessionStorage.ts:28](mobile/lib/sessionStorage.ts#L28), [useAuthStore.ts:271](mobile/stores/useAuthStore.ts#L271).

Jurnal dan personalisasi memakai key global perangkat. Logout hanya membersihkan session/auth; store jurnal, profil dan subscription tidak direset bersama akun. Probe: akun A menambah makanan, logout, akun B masuk dan initialize journal; makanan A masih terlihat pada B.

Perbaikan: namespace penyimpanan/cache/store menurut userId, dengan kebijakan migrasi data lama. Reset/hydrate seluruh state milik akun saat pergantian akun. Tracking langkah sudah menggunakan key akun/tanggal, tetapi pola ini belum berlaku pada jurnal/profil.

### F04 — Tinggi: menyelesaikan onboarding menghapus JWT

Sumber: [useAuthStore.ts:281](mobile/stores/useAuthStore.ts#L281).

`setOnboardingCompleted` menyimpan ulang session tanpa menyalin token. Probe session berisi token, lalu menyelesaikan onboarding: token menjadi `undefined`. Sinkronisasi jurnal/profil/API yang memerlukan token kemudian berhenti atau beralih ke fallback lokal.

Perbaikan: update field session secara parsial atau pertahankan token saat menyimpan. Tes harus mencakup register/login → complete onboarding → protected API.

### F05 — Tinggi: filter alergi planner dapat dibatalkan oleh fallback

Sumber: [mealPlannerApi.ts:31](mobile/lib/api/mealPlannerApi.ts#L31), [mealPlannerApi.ts:65](mobile/lib/api/mealPlannerApi.ts#L65).

Jika tidak ada resep aman, planner lokal memakai seluruh `MOCK_RECIPES`. Probe memasukkan seluruh nama bahan resep ke daftar pengecualian; planner tetap menghasilkan 7 makanan. Nama alergi onboarding seperti `Lactose`, `Nuts`, `Seafood` juga tidak seluruhnya ditangani melalui padanan bahan pada filter lokal.

Perbaikan: tidak boleh melonggarkan alergi saat kandidat kosong; kembalikan hasil kosong yang menjelaskan alasan. Gunakan pemetaan/tag alergen konsisten untuk backend dan mobile. Tambahkan tes tidak ada kandidat aman serta sinonim alergen. Ini temuan validasi kode, bukan penilaian medis atas menu.

### F06 — Tinggi: fungsi kalori yang diuji berbeda dari fungsi onboarding

Sumber: [useOnboardingStore.ts:20](mobile/stores/useOnboardingStore.ts#L20), [nutritionDomain.ts:39](mobile/lib/nutritionDomain.ts#L39), [nutrition.test.ts:3](mobile/lib/__tests__/nutrition.test.ts#L3).

Ada dua implementasi `calculatePersonalizedPlan`. Tes menguji versi domain dengan minimum target, sementara onboarding memakai implementasi store tanpa minimum tersebut. Untuk input identik perempuan, 45 kg, 150 cm, usia 70, goal Lose weight, versi onboarding menghasilkan 971 kcal dan versi domain yang diuji 1200 kcal.

Perbaikan: satu fungsi kalkulasi yang dipanggil alur nyata dan diuji. Kebijakan minimum/usia/validasi perlu ditetapkan konsisten; angka contoh ini membuktikan perbedaan implementasi, bukan rekomendasi kebutuhan kalori seseorang.

### F07 — Tinggi: perubahan porsi dan edit jurnal dapat mengubah kalori secara salah

Sumber: [useJournalStore.ts:226](mobile/stores/useJournalStore.ts#L226), [useJournalStore.ts:353](mobile/stores/useJournalStore.ts#L353), [MealLogModal.tsx:389](mobile/components/ui/MealLogModal.tsx#L389).

UI mendukung 0,5 porsi, tetapi store memaksa quantity minimal 1. Probe mengikuti payload UI: base=400, total=200, quantity=0.5. Data tersimpan quantity=1. Mengganti judul saja lalu menghitung ulang kalori mengubah 200 menjadi 400. Selain itu, perubahan quantity pada `updateEntry` tidak otomatis menskalakan makro ketika makro tidak dikirim.

Perbaikan: tetapkan satu representasi nilai per porsi dan total; pertahankan porsi pecahan serta skala kalori dan makro bersama-sama. Edit judul tidak boleh mengubah nutrisi.

### F08 — Tinggi: penghapusan/edit jurnal mobile tidak konsisten dengan server

Sumber: [useJournalStore.ts:248](mobile/stores/useJournalStore.ts#L248), [useJournalStore.ts:328](mobile/stores/useJournalStore.ts#L328), [meals.ts:53](backend/src/routes/meals.ts#L53).

Mobile membuat ID `entry-*`, server membuat ID `meal-*`. Respons POST tidak digunakan untuk menyimpan mapping ID. DELETE kemudian mengirim ID lokal yang tidak ditemukan server; status HTTP tidak diperiksa, sehingga UI terlihat berhasil tetapi data server tetap ada. `updateEntry` juga hanya mengubah penyimpanan lokal. Analytics yang berhasil membaca server dapat berbeda dari jurnal di HP.

Perbaikan: simpan ID server atau gunakan client-generated ID yang disepakati, tangani response non-2xx, dan sediakan sinkronisasi update serta antrean retry/idempotency untuk mode offline.

### F09 — Tinggi: reset satu hari menghapus riwayat semua hari di backend

Sumber: [useJournalStore.ts:412](mobile/stores/useJournalStore.ts#L412), [meals.ts:103](backend/src/routes/meals.ts#L103).

Mobile `clearDay` menarget satu tanggal tetapi mengirim `/meals/reset` tanpa tanggal. Backend mengganti seluruh daftar makanan pengguna dengan array kosong. Probe membuat catatan 15 dan 16 November; satu reset mengubah jumlah 2 menjadi 0.

Perbaikan: endpoint menerima dateKey dan menghapus hanya tanggal itu. Tambahkan tes dengan minimal dua tanggal.

### F10 — Tinggi untuk penyimpanan nyata: database belum digunakan oleh route bisnis

Sumber: [store.ts](backend/src/services/store.ts), [db/index.ts](backend/src/db/index.ts), route auth/profile/meals/activity/subscription/mealPlans.

Schema PostgreSQL dan koneksi Drizzle ada, tetapi operasi bisnis memakai Map dalam memori. Pencarian import tidak menemukan pemakaian layer DB pada jalur route/service bisnis. Restart backend menghilangkan akun baru, makanan, status premium, dan rencana yang tersimpan dalam Map. Beberapa instance server juga akan mempunyai data berbeda.

Perbaikan: sambungkan repository persisten melalui migrasi; uji simpan → restart proses → baca kembali. Jangan menyebut backend persisten hanya karena schema tersedia.

### F11 — Sedang: tampilan kelebihan kalori tidak pernah aktif

Sumber: [useJournalStore.ts:87](mobile/stores/useJournalStore.ts#L87), [index.tsx:211](mobile/app/(app)/(tabs)/index.tsx#L211).

Store memotong remainingCalories minimal 0, sedangkan Home memerlukan nilai negatif untuk menentukan `isOver`. Probe target1950/intake2200 menghasilkan remaining=0, sehingga tampilan tidak menunjukkan kelebihan250 kcal.

Perbaikan: gunakan selisih bertanda untuk status over-target, lalu clamp hanya nilai yang memang perlu divisualkan sebagai sisa nonnegatif.

### F12 — Sedang: custom range dan tanggal lokal analytics offline salah

Sumber: [analyticsApi.ts:47](mobile/lib/api/analyticsApi.ts#L47), [analyticsApi.ts:96](mobile/lib/api/analyticsApi.ts#L96).

Fallback memanggil computeLocalAnalytics hanya dengan `range`; startDate/endDate hilang. Fungsi memilih 30 hari hanya untuk 30d, selain itu 7 hari, termasuk custom. Tanggal dihasilkan memakai UTC sementara key jurnal memakai kalender lokal. Di Jakarta pukul00:00–06:59, laporan dapat berhenti pada tanggal kemarin walaupun jurnal hari ini sudah ada.

Perbaikan: satu utilitas tanggal lokal dan rentang tanggal untuk jalur server/lokal. Tambahkan tes custom range dan batas tengah malam Asia/Jakarta.

### F13 — Tinggi untuk auth nyata: login bergantung akun lokal dan password disimpan mentah

Sumber: [useAuthStore.ts:68](mobile/stores/useAuthStore.ts#L68), [useAuthStore.ts:84](mobile/stores/useAuthStore.ts#L84), [useAuthStore.ts:219](mobile/stores/useAuthStore.ts#L219), [sessionStorage.ts:14](mobile/lib/sessionStorage.ts#L14).

Login mencari akun pada registry perangkat terlebih dahulu: akun server yang belum ada lokal ditolak sebelum meminta server. Jika password tidak dikirim ke store, pemeriksaan password dilewati. Server yang merespons401 juga tidak membatalkan pembuatan session lokal. Probe `login(email)` dengan fetch401 menghasilkan success=true. Form login normal memang mewajibkan password, sehingga probe membuktikan kelemahan kontrak store/fail-open, bukan bahwa form kosong dapat langsung lolos.

Signup menyimpan password mentah pada record akun; web memakai localStorage. Perbaikan: autentikasi otoritatif di server, jangan simpan password pengguna di registry perangkat, pisahkan demo/offline dari session terautentikasi. Sediakan alur offline yang tidak memalsukan hasil verifikasi server.

## Gap fitur dan verifikasi

- Reminder merupakan konfigurasi Zustand yang belum dipersistenkan. Tidak ditemukan scheduling notifikasi OS atau dependensi expo-notifications. Mengaktifkan switch belum membuktikan notifikasi akan muncul saat aplikasi ditutup.
- Timer memasak menggunakan decrement per tick setInterval, bukan deadline timestamp. Waktu yang lewat ketika JS ditangguhkan belum ditangani. Ini risiko yang perlu tes perangkat, belum diklaim sebagai reproduksi fisik.
- Native step tracking memiliki tes adapter dan storage, tetapi belum ada tes perangkat fisik untuk izin, background, dan riwayat Health Connect. Keterbatasan yang sudah disebutkan dalam STEP_TRACKING.md tetap berlaku.
- CI mobile menjalankan domain tests dan web export, tetapi belum menjalankan `npm run typecheck` mobile secara eksplisit. Expo export bukan pengganti pemeriksaan TypeScript.
- Default JWT secret pengembangan tetap diterima oleh konfigurasi production jika environment tidak disetel. CORS callback juga mengizinkan origin yang tidak ada pada allowlist. Hardening produksi perlu pengujian konfigurasi khusus, tanpa menganggap CORS sebagai pengganti autentikasi.

## Urutan perbaikan yang disarankan

1. Tutup F01/F02 dan perilaku auth fail-open; pagar mode demo vs nyata.
2. Perbaiki session token dan isolasi akun (F03/F04/F13).
3. Perbaiki integritas jurnal dan sinkronisasi (F07/F08/F09/F11).
4. Satukan kalkulasi dan aturan meal planner (F05/F06).
5. Tambahkan persistence backend, perbaiki analytics tanggal, lalu verifikasi native/reminder.

Setiap batch perlu tes regresi terhadap jalur aplikasi asli. Hindari menambah tes yang hanya menguji fungsi salinan yang tidak dipakai UI.

## Catatan reproduksi

Probe backend dijalankan pada Express app dalam proses test melalui supertest. Tidak menyentuh server/deployment/akun eksternal. Probe mobile memakai Map sebagai storage dan fetch401 sebagai respons server, sementara fungsi store/API berasal dari kode proyek asli. Skrip probe sementara dihapus setelah hasil dicatat.

```text
GOOGLE_WITHOUT_ID_TOKEN 200 true
IDENTITY_OBTAINED user-daffa
STRIPE_WITHOUT_PAYMENT 200 true
UNSIGNED_WEBHOOK 201 premiumAfter false
RESET_ALL_DATES 2 0
LOGIN_NO_PASSWORD_SERVER_401 { success: true }
TOKEN_AFTER_ONBOARDING undefined
HALF_PORTION 1 400
RENAME_HALF_PORTION_CALORIES 200 400
B_SEES_A_MEALS [ 'Account A meal', 'Rename only' ]
CALORIE_ACTUAL_VS_TESTED 971 1200
OVER_TARGET 0
ALL_INGREDIENTS_EXCLUDED_MEALS_RETURNED 7
PREMIUM_AFTER_SERVER_401 true true
```
