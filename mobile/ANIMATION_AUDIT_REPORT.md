# ANIMATION AUDIT & PARITY REPORT — BETTER LIFE (WEB & EXPO GO ANDROID)

Laporan ini mendokumentasikan hasil audit menyeluruh, analisis akar masalah (*root cause analysis*), implementasi perbaikan berbasis `react-native-reanimated`, serta hasil validasi sistem animasi pada project **Better Life** untuk mencapai kesetaraan visual dan interaksi (*animation parity*) antara **Web** dan **Expo Go (Android/iOS)**.

---

## 1. Daftar Animasi yang Bermasalah

Hasil audit pada seluruh komponen UI dan halaman menemukan **10 kategori animasi** yang sebelumnya berjalan di Web (atau tampak memiliki kode animasi), tetapi **tidak muncul, terputus, atau berbeda perilakunya di Expo Go (Android)**:

| No | Kategori Animasi | Gejala Masalah di Expo Go (Android) | Lokasi Terdampak |
| :--- | :--- | :--- | :--- |
| 1 | **Button & Card Press Interaction** (`style={({ pressed }) => ...}` & `hover:*`) | Tombol, kartu makanan, tile pilihan onboarding, dan tombol autentikasi memiliki efek *hover/active* di Web, tetapi **sama sekali tidak merespons sentuhan** (tidak ada *scale* maupun *opacity feedback*) di Android ketika menggunakan `className` NativeWind v4 bersama fungsi `style={({ pressed }) => ...}`. | `Button.tsx`, `Card.tsx`, `FoodCard.tsx`, `OptionCard.tsx`, `IconButton.tsx`, `AppButton.tsx`, `Flow.tsx` (`ChoiceTile`, `FlowScreen`, `TextLink`), `(auth)/login.tsx`, `(auth)/signup.tsx`, `(onboarding)/index.tsx`, `GoogleSignInModal.tsx`, `ResponsiveTabBar.tsx` |
| 2 | **Card Entrance, Fade-In & Slide Animation** (`FadeInView`) | `FadeInView.tsx` sebelumnya telah dinonaktifkan menjadi `<View>` statis (*no-op*) untuk menghindari bug hilangnya layout `className` NativeWind v4. Akibatnya, seluruh kartu dashboard, daftar makanan, langkah registrasi, dan langkah onboarding muncul mendadak tanpa animasi *staggered fade-in + slide-up*. | `FadeInView.tsx`, `(app)/(tabs)/index.tsx`, `(app)/(tabs)/recipes.tsx`, `(app)/(tabs)/chat.tsx`, `(app)/(tabs)/profile.tsx`, `(auth)/login.tsx`, `(auth)/signup.tsx`, `(onboarding)/index.tsx`, `(onboarding)/plan.tsx`, `(app)/analytics.tsx`, `(app)/meal-planner.tsx`, `(app)/upgrade.tsx` |
| 3 | **PressableScale (Spring Feedback)** | `PressableScale.tsx` sebelumnya hanya menggunakan `useState(false)` biasa (`transform: [{ scale: pressed ? scaleTo : 1 }]`), sehingga di Android hanya terjadi lompatan 1-frame yang kaku tanpa fisika pegas (*spring physics*) UI-thread. | `PressableScale.tsx` dan seluruh komponen interaktif yang menggunakannya |
| 4 | **Tab Transition & Floating Emerald Pill Navigation** | Pada `ResponsiveTabBar.tsx`, perpindahan tab pada navigasi bawah (*floating emerald pill*) dan munculnya label tab aktif hanya mengandalkan render ulang instan tanpa animasi *spring* pada ikon maupun transisi lebar/opasitas label. | `components/layout/ResponsiveTabBar.tsx`, `components/ui/AnimatedTabIcon.tsx` |
| 5 | **Page & Multi-Step Flow Transition** | Perpindahan antar-langkah pada halaman **Sign Up** (4 langkah), **Onboarding** (7 langkah), tab **Profile** (Overview/Settings), dan **Google Sign-In Modal** (3 langkah) berpindah secara instan tanpa transisi *fade + slide* maupun animasi pengisian bilah progres (`StepProgress`). | `app/(auth)/signup.tsx`, `app/(onboarding)/index.tsx`, `components/ui/Flow.tsx` (`StepProgress`), `app/(app)/(tabs)/profile.tsx`, `components/ui/GoogleSignInModal.tsx` |
| 6 | **Dashboard Animation (Macro `MixBar`, `ProgressBar`, `AnimatedNumber`)** | 1) `MixBar` (distribusi kalori & makronutrisi) menggunakan `flexGrow` statis tanpa transisi.<br>2) `ProgressBar` menggunakan `transform: [{ scaleX }]` + `transformOrigin: "left"` yang mendistorsi *border-radius* ujung kapsul pada Android.<br>3) `AnimatedNumber` memicu `setState` pada setiap frame (~60fps) di JS thread dan belum memiliki efek *micro-scale pulse* di UI thread. | `components/ui/Surface.tsx` (`MixBar`, `Segmented`), `components/ui/ProgressBar.tsx`, `components/ui/ProgressRing.tsx`, `components/ui/AnimatedNumber.tsx`, `app/(app)/(tabs)/index.tsx` |
| 7 | **Modal & Bottom Sheet Animation** | Beberapa modal (`MealLogModal`, `FoodDetailModal`, `StepLogModal`) sudah memakai Reanimated spring, tetapi modal lain (`NutritionCard`, Month Picker di `onboarding/index.tsx`, Edit Profile & Delete Account di `profile.tsx`, Preference & Substitution modal di `meal-planner.tsx`, Cancel Subscription di `upgrade.tsx`, dan `GoogleSignInModal`) belum memiliki animasi masuk (*sheet entrance*) yang konsisten. | `NutritionCard.tsx`, `GoogleSignInModal.tsx`, `app/(onboarding)/index.tsx`, `app/(app)/(tabs)/profile.tsx`, `app/(app)/meal-planner.tsx`, `app/(app)/upgrade.tsx` |
| 8 | **Chart & Scroll/Section Animation (Analytics)** | Grafik batang tren kalori/makro mingguan (`TrendBar`) dan bilah distribusi waktu makan (`TimingFill`) pada halaman **Analytics** menggunakan persentase tinggi/lebar statis tanpa animasi pengisian bertahap (*staggered bar fill*). | `app/(app)/analytics.tsx` |
| 9 | **Loading & Splash Screen Animation** | Halaman pembuka (`app/index.tsx`) masih menggunakan API `Animated` lama dari `react-native` (bukan `react-native-reanimated`), sehingga tidak konsisten dengan sistem animasi UI-thread di komponen lainnya. | `app/index.tsx` |
| 10 | **CSS Web-Only Classes (`transition-*`, `hover:*`, `duration-*`)** | Kelas Tailwind seperti `transition-all`, `transition-colors`, `duration-200`, dan `hover:opacity-90` otomatis dieksekusi oleh mesin CSS browser di Web, tetapi diabaikan di React Native Android jika tidak didampingi animasi Reanimated atau feedback sentuh native. | `OptionCard.tsx`, `IconButton.tsx`, `AppButton.tsx`, `ResponsiveTabBar.tsx`, `Surface.tsx` |

---

## 2. Penyebab Masalah (Root Cause Teknis)

Melalui inspeksi kode sumber aplikasi dan *runtime* `node_modules`, ditemukan **4 akar masalah utama** mengapa animasi berjalan di Web tetapi gagal di Expo Go (Android):

### A. Bug Fungsi `style={({ pressed }) => ...}` pada NativeWind v4 (`react-native-css-interop`)
Pada `node_modules/react-native-css-interop/dist/runtime/native/native-interop.js` (baris 563), NativeWind v4 memproses *inline style* pada komponen yang memiliki `className` dengan kode berikut:
```js
assignToTarget(props, { ...declaration }, state.config, { objectMergeStyle: "assign" });
```
Ketika `props.style` berupa fungsi callback `({ pressed }) => [...]` milik `<Pressable>`, operasi *object spread* `{ ...declaration }` pada fungsi di JavaScript menghasilkan objek kosong `{}`! Akibatnya, **seluruh fungsi `style={({ pressed }) => ...}` terhapus secara diam-diam di Android/iOS**, sedangkan di Web (`web/api.js`) fungsi tersebut tetap dipertahankan atau tertutupi oleh efek `:hover` CSS.

### B. Tabrakan `className` NativeWind v4 dengan `useAnimatedStyle` Reanimated v4 (`PropsFilter.tsx`)
Ketika `<Animated.View className="..." style={animatedStyle}>` digunakan secara langsung:
1. `react-native-css-interop` di Android menggabungkan objek hasil `className` dan `animatedStyle` menggunakan `Object.assign` ke dalam satu objek tunggal.
2. Objek `animatedStyle` dari `useAnimatedStyle()` memiliki properti internal `.viewDescriptors` (`AnimatedStyleHandle`).
3. Saat `Animated.View` memfilter props di `react-native-reanimated/src/createAnimatedComponent/PropsFilter.tsx` (baris 42–54), Reanimated mendeteksi `if (style?.viewDescriptors)` lalu **mengganti seluruh objek gabungan tersebut** dengan `handle.initial.value` (yang hanya berisi properti animasi seperti `opacity` dan `transform`).
4. Akibatnya, semua properti layout dari `className` (`flex`, `padding`, `backgroundColor`, `borderRadius`) hilang di Android. Karena masalah inilah `FadeInView.tsx` sebelumnya sempat dimatikan menjadi `<View>` statis.

### C. Ketergantungan pada CSS Web-Only (`transition-*`, `hover:*`) & `useState` Non-Animasi
Di Web, perubahan state atau kursor mouse otomatis dihaluskan oleh CSS engine browser. Di Android (Expo Go), tidak ada kursor mouse (`hover`) dan perubahan `useState` hanya mengubah nilai properti dalam 1 frame tanpa interpolasi waktu.

### D. Distorsi `scaleX` pada `ProgressBar` Android
Mengubah ukuran bilah progres berbentuk kapsul (`borderRadius: 9999`) menggunakan `transform: [{ scaleX }]` di Android menyebabkan sudut lengkung (*border-radius*) ikut terdistorsi (gepeng pada persentase kecil) dan `transformOrigin: "left"` tidak selalu konsisten di semua versi renderer Android dibandingkan animasi `width: "${pct}%"` pada Reanimated.

---

## 3. Perubahan yang Dilakukan

1. **Membangun Bridge `AnimatedView` & `AnimatedPressable` (`mobile/lib/nativewindInterop.ts`)**
   - Memisahkan resolusi `className -> style` milik NativeWind dari `animatedStyle` milik Reanimated melalui prop khusus `animatedStyle`.
   - Di dalam komponen bridge, keduanya digabungkan sebagai array dua elemen terpisah `style={[style, animatedStyle]}` setelah `cssInterop` selesai bekerja, sehingga `PropsFilter` Reanimated memproses `animatedStyle` tanpa pernah menghapus style `className` di Expo Go Android maupun Web.

2. **Mengaktifkan Kembali `FadeInView` di UI Thread (`mobile/components/ui/FadeInView.tsx`)**
   - Mengimplementasikan animasi masuk *staggered fade-in + slide-up* menggunakan `useSharedValue`, `withDelay`, `withTiming`, dan kurva `Easing.bezier(0.23, 1, 0.32, 1)` (`MotionCurves.out`).
   - Menambahkan dukungan aksesibilitas `useReducedMotion()` dan pembersihan memori `cancelAnimation()` saat *unmount*.

3. **Mengupgrade `PressableScale` ke Fisika Pegas Reanimated (`mobile/components/ui/PressableScale.tsx`)**
   - Mengganti `useState` 1-frame dengan `useSharedValue(1)` + `withSpring(scaleTo, AnimationEasings.pressSpringConfig)` untuk skala dan `withTiming` untuk opasitas pada `onPressIn`/`onPressOut`.
   - Menambahkan dukungan *hover micro-spring* (`1.012x`) untuk Web (`onHoverIn`/`onHoverOut`) dan *press spring* (`0.97x`–`0.985x`) untuk Android/iOS sehingga kedua platform memiliki respons taktil yang setara.

4. **Migrasi Seluruh Tombol & Kartu dari `style={({ pressed }) => ...}` ke `PressableScale`**
   - Seluruh tombol utama, kartu makanan, opsi onboarding, tombol autentikasi, dan navigasi kini menggunakan `PressableScale` sehingga bebas dari bug penghapusan fungsi `style` oleh NativeWind v4.

5. **Animasi Dashboard, Progress, Segmented Control & Navigasi Bawah**
   - `ProgressBar.tsx`: Animasi lebar (`width: "${animatedPct.value}%"`) menggunakan Reanimated `withTiming` tanpa distorsi `scaleX`.
   - `Surface.tsx`: Menambahkan `AnimatedMixSegment` (animasi `flexGrow` pada `MixBar`) dan `SegmentedOption` (animasi *spring scale & opacity* pada `Segmented`).
   - `AnimatedNumber.tsx`: Menambahkan *UI-thread scale pulse* (`1 -> 1.04 -> 1`) saat angka berubah serta *throttling* update teks (~30ms) dan `cancelAnimation`.
   - `ResponsiveTabBar.tsx`: Menambahkan `PhoneTabItem` dengan animasi *spring* Reanimated pada ikon tab dan label tab aktif di *floating emerald pill* bawah.

6. **Animasi Grafik Analytics, Multi-Step Flows & Seluruh Modal**
   - Menambahkan `AnimatedTrendBar` dan `AnimatedTimingFill` di `app/(app)/analytics.tsx`.
   - Menambahkan `StepProgressSegment` beranimasi dan `ChoiceTile` beranimasi *spring* di `components/ui/Flow.tsx`.
   - Membungkus seluruh transisi langkah (`login`, `signup`, `onboarding/index`, `onboarding/plan`, `profile`, `GoogleSignInModal`) dan modal sheet dengan `FadeInView`.

---

## 4. Komponen dan Halaman yang Diperbaiki

### A. Infrastruktur & Primitif UI (`mobile/lib/` & `mobile/components/ui/`)
- [`mobile/lib/nativewindInterop.ts`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/lib/nativewindInterop.ts) — Bridge `AnimatedView` & `AnimatedPressable` untuk kompatibilitas NativeWind v4 + Reanimated v4.
- [`mobile/components/ui/FadeInView.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/FadeInView.tsx) — Animasi *staggered fade-in & slide-up* UI-thread dengan `cancelAnimation` & `useReducedMotion`.
- [`mobile/components/ui/PressableScale.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/PressableScale.tsx) — Interaksi *press spring* (Mobile & Web) + *hover spring* (Web).
- [`mobile/components/ui/Button.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/Button.tsx) — Migrasi ke `PressableScale`.
- [`mobile/components/ui/Card.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/Card.tsx) — Migrasi kartu interaktif ke `PressableScale`.
- [`mobile/components/ui/FoodCard.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/FoodCard.tsx) — Migrasi kartu makanan & tombol aksi cepat (`Quick log`, `Detail`, `+`) ke `PressableScale`.
- [`mobile/components/ui/OptionCard.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/OptionCard.tsx) — Migrasi dari CSS `transition-all` ke `PressableScale` + Reanimated.
- [`mobile/components/ui/IconButton.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/IconButton.tsx) & [`mobile/components/ui/AppButton.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/AppButton.tsx) — Migrasi ke `PressableScale`.
- [`mobile/components/ui/Flow.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/Flow.tsx) — Animasi `StepProgressSegment`, `ChoiceTile` (*spring check badge*), `FlowScreen` back button, `TextLink`, dan `FormAlert`.
- [`mobile/components/ui/Surface.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/Surface.tsx) — Animasi `AnimatedMixSegment` pada `MixBar` dan `SegmentedOption` pada `Segmented`.
- [`mobile/components/ui/ProgressBar.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/ProgressBar.tsx) — Animasi lebar persentase Reanimated + `cancelAnimation`.
- [`mobile/components/ui/ProgressRing.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/ProgressRing.tsx) — Penambahan `cancelAnimation` cleanup dan penghapusan `className` langsung pada `Animated.View`.
- [`mobile/components/ui/AnimatedNumber.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/AnimatedNumber.tsx) — Penambahan *scale pulse* Reanimated, *throttled frame update*, dan cleanup.
- [`mobile/components/ui/AnimatedTabIcon.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/AnimatedTabIcon.tsx) — Penambahan `cancelAnimation` cleanup.
- [`mobile/components/ui/NutritionCard.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/NutritionCard.tsx) & [`mobile/components/ui/GoogleSignInModal.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/ui/GoogleSignInModal.tsx) — Animasi masuk modal & transisi langkah akun Google.

### B. Navigasi & Halaman Aplikasi (`mobile/components/layout/` & `mobile/app/`)
- [`mobile/components/layout/ResponsiveTabBar.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/components/layout/ResponsiveTabBar.tsx) — Komponen `PhoneTabItem` dengan Reanimated *spring* pada *floating emerald pill* bawah serta `PressableScale` pada navigasi desktop/tablet.
- [`mobile/app/index.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/app/index.tsx) — Migrasi penuh Splash Screen dari `Animated` legacy ke `react-native-reanimated`.
- [`mobile/app/(auth)/login.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/app/%28auth%29/login.tsx) & [`mobile/app/(auth)/signup.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/app/%28auth%29/signup.tsx) — Animasi `FadeInView` per seksi/langkah dan `PressableScale` pada seluruh tombol autentikasi & OTP.
- [`mobile/app/(onboarding)/index.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/app/%28onboarding%29/index.tsx) & [`mobile/app/(onboarding)/plan.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/app/%28onboarding%29/plan.tsx) — Animasi transisi 7 langkah personalisasi, modal pemilih bulan, dan halaman hasil kalkulasi nutrisi (`AnimatedNumber` + *staggered cards*).
- [`mobile/app/(app)/(tabs)/index.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/app/%28app%29/%28tabs%29/index.tsx) — Animasi angka kalori & langkah (`animateOnMount`), `MixBar` makronutrisi, kartu jurnal makan, dan modal pencatatan.
- [`mobile/app/(app)/(tabs)/profile.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/app/%28app%29/%28tabs%29/profile.tsx) — Animasi perpindahan tab Overview/Settings serta modal Edit Profile & Delete Account.
- [`mobile/app/(app)/analytics.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/app/%28app%29/analytics.tsx) — Komponen `AnimatedTrendBar` & `AnimatedTimingFill` serta `FadeInView` pada inspektor harian.
- [`mobile/app/(app)/meal-planner.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/app/%28app%29/meal-planner.tsx) & [`mobile/app/(app)/upgrade.tsx`](file:///c:/DaffaP/VSC%20Daff/better%20life/mobile/app/%28app%29/upgrade.tsx) — Animasi kartu rencana makan 7 hari, kartu perbandingan paket, dan seluruh modal konfirmasi.

---

## 5. Hasil Validasi Web dan Expo Go (Android)

1. **Validasi Statik & Tipe Data (`npx tsc --noEmit`)**:
   - **Status**: **LULUS (Exit Code 0, 0 error)**.
   - Seluruh tipe properti Reanimated (`AnimatedStyleHandle`), NativeWind (`className`), dan komponen UI tervalidasi tanpa konflik tipe.

2. **Validasi Kompilasi Bundle Android Hermes (Expo Go) & Web (Metro Bundler)**:
   - **Android Hermes Bytecode Bundle** (`platform=android&transform.engine=hermes&transform.bytecode=1`): **HTTP 200 OK** (kompilasi worklet Reanimated v4 dan interop NativeWind v4 berhasil tanpa warning/error).
   - **Web Bundle** (`platform=web`): **HTTP 200 OK**.
   - **Kompatibilitas Expo Go**: Seluruh animasi hanya menggunakan `react-native-reanimated` dan `react-native-svg` bawaan Expo SDK 54 tanpa library native eksternal yang membutuhkan *custom development build*.

3. **Validasi Perilaku Runtime per Halaman (Web & Expo Go Android)**:
   - **Splash & Welcome (`/` -> `/welcome`)**: Logo muncul dengan *spring scale* dan *fade-in* halus, diikuti transisi halaman tanpa *flicker*.
   - **Login & Sign Up (`/(auth)/login`, `/(auth)/signup`)**: Setiap perpindahan langkah (Email -> OTP -> Username -> Password) memiliki animasi *fade + slide-up* dan pengisian `StepProgress` yang mulus; seluruh tombol memiliki *spring press feedback*.
   - **Onboarding (`/(onboarding)` & `/(onboarding)/plan`)**: Ketujuh langkah personalisasi, tile pilihan (`ChoiceTile` dengan *spring checkmark*), tombol `-`/`+`, dan halaman hasil target kalori (`AnimatedNumber` + `MixBar`) beranimasi mulus di Android maupun Web.
   - **Dashboard / Home (`/(app)/(tabs)`)**: Cincin progres kalori (`ProgressRing`), angka kalori & langkah (`AnimatedNumber`), bilah proporsi makronutrisi (`MixBar`), kartu slot waktu makan, dan modal **Catat ke jurnal** (`MealLogModal`) berjalan di UI thread tanpa menghambat *scrolling*.
   - **Recipes, Chat AI, Analytics, Meal Planner, Upgrade & Profile**: Staggered card entrance (`FadeInView`), grafik batang (`AnimatedTrendBar`), dan navigasi bawah (*floating emerald pill* `ResponsiveTabBar`) berjalan konsisten di Web dan Expo Go.

---

## 6. Animasi yang Masih Memiliki Keterbatasan Platform

1. **Interaksi Hover Kursor (`onHoverIn` / `onHoverOut` & `cursor: pointer`)**:
   - Pada versi **Web**, pengguna dengan mouse mendapatkan efek *micro-scale hover* (`1.012x`) sebelum mengklik tombol/kartu.
   - Pada **Android (Expo Go)**, layar sentuh tidak memiliki event *hover* kursor, sehingga interaksi langsung menggunakan alternatif native berupa *press-in spring* (`scale: 0.97x`–`0.985x` + reduksi opasitas halus) saat jari menyentuh elemen.
2. **Backdrop Blur (`backdrop-filter: blur()`) pada Modal Overlay**:
   - Pada **Web**, beberapa browser mendukung efek *blur* CSS pada latar belakang modal, sedangkan pada `<Modal transparent>` standar React Native di Android (tanpa *custom native blur view* di atas setiap elemen), latar belakang dirender menggunakan *scrim* gelap semi-transparan (`rgba(17, 28, 22, 0.42)`–`0.55`) demi menjaga performa 60fps di perangkat Android kelas menengah ke bawah.
3. **Interpolasi Text String pada `AnimatedNumber`**:
   - Karena komponen `<Text>` standar React Native me-render *string node* dari JS thread, perubahan teks angka di-throttle pada interval ~30ms (~33fps) yang dipadukan dengan *scale pulse* 60fps di UI thread Reanimated agar tidak membebani jembatan JS–Native saat pengguna melakukan *scroll* bersamaan dengan perubahan angka.

