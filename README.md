# 🌱 Better Life — Nutrition & Healthy Living Ecosystem

> Aplikasi pelacak nutrisi, kalori harian, panduan resep sehat, dan pencatat aktivitas hidup sehat dengan arsitektur modern (*Fullstack Monorepo*).

---

## 📌 Daftar Isi
- [Tentang Proyek](#-tentang-proyek)
- [Fitur Utama](#-fitur-utama)
- [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
- [Struktur Direktori](#-struktur-direktori)
- [Prasyarat Sistem](#-prasyarat-sistem)
- [Panduan Instalasi & Setup](#-panduan-instalasi--setup)
  - [1. Clone Repositori](#1-clone-repositori)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Konfigurasi Environment Variables](#3-konfigurasi-environment-variables)
  - [4. Setup Database & Migrasi](#4-setup-database--migrasi)
  - [5. Menjalankan Backend & Mobile](#5-menjalankan-backend--mobile)
- [Dokumentasi API](#-dokumentasi-api)
- [Daftar Perintah (Scripts)](#-daftar-perintah-scripts)
- [Catatan Pengujian & Tips Jaringan Mobile](#-catatan-pengujian--tips-jaringan-mobile)
- [Lisensi](#-lisensi)

---

## 📖 Tentang Proyek

**Better Life** dirancang untuk membantu pengguna membangun pola makan dan gaya hidup sehat secara terukur dan menyenangkan. Aplikasi ini menggabungkan pencatatan makanan (*meal logger*), pelacakan target kalori harian beserta rincian makronutrisi (karbohidrat, protein, lemak), katalog resep sehat, serta pencatatan aktivitas fisik dalam satu ekosistem terpadu antara aplikasi mobile (React Native/Expo) dan REST API backend (Express/TypeScript/Drizzle).

---

## ✨ Fitur Utama

- 📊 **Dashboard & Tracker Harian**:
  - Pelacakan progres kalori masuk vs target kalori harian.
  - Distribusi makronutrisi (*Carbs, Protein, Fat*).
  - Indikator asupan cairan & ringkasan aktivitas.
- 🥗 **Meal Journal (Pencatatan Makanan)**:
  - Pembagian log makanan berdasarkan kategori: *Breakfast, Lunch, Dinner, Snack, Drink*.
  - Input kalori otomatis & riwayat konsumsi harian.
- 🍲 **Katalog & Panduan Resep Sehat**:
  - Filter kategori makanan dan preferensi diet.
  - Rincian nutrisi per porsi, estimasi waktu masak, dan tingkat kesulitan.
  - Panduan bahan dan instruksi langkah demi langkah (*step-by-step cooking guide*).
- 🚶 **Aktivitas & Target Langkah**:
  - Pelacakan langkah harian (*steps goal*).
  - Kalori terbakar dan durasi aktivitas olahraga.
- 🎯 **Onboarding & Personalisasi Profil**:
  - Kustomisasi target berdasarkan tujuan: *Eat balanced, Lose weight, Gain muscle*.
  - Perhitungan kalori berdasarkan tinggi, berat badan, gender, dan preferensi diet/alergi.
- 🔐 **Autentikasi Aman**:
  - Registrasi dan Login menggunakan token JWT.
  - Penyimpanan kredensial aman di perangkat mobile via `expo-secure-store`.

---

## 🛠 Teknologi yang Digunakan

### 📱 Mobile Application (`/mobile`)
- **Core Framework**: [React Native](https://reactnative.dev/) (0.86) & [Expo SDK 57](https://expo.dev/)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **Styling**: [NativeWind v4](https://www.nativewind.dev/) (TailwindCSS v3)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching & Caching**: [TanStack React Query v5](https://tanstack.com/query/latest)
- **Animasi & Interaksi**: React Native Reanimated v4 & React Native Gesture Handler
- **Storage**: Expo SecureStore

### 🖥 Backend API (`/backend`)
- **Runtime & Language**: [Node.js](https://nodejs.org/) & [TypeScript](https://www.typescriptlang.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database & ORM**: PostgreSQL & [Drizzle ORM](https://orm.drizzle.team/)
- **Validation**: [Zod](https://zod.dev/)
- **Dev Runner**: `tsx` (Watch mode)

---

## 📁 Struktur Direktori

```text
better-life/
├── akatab/                   # Aset font kustom (Akatab Font Family)
├── assets/                   # Aset visual umum
├── backend/                  # REST API Express + TypeScript
│   ├── src/
│   │   ├── config/           # Konfigurasi environment (zod env validator)
│   │   ├── db/               # Inisialisasi koneksi Drizzle & skema tabel Postgres
│   │   ├── routes/           # Endpoint API (auth, profile, meals, recipes, activity)
│   │   ├── schemas/          # Zod schema untuk validasi request payload
│   │   ├── services/         # Business logic layer
│   │   └── index.ts          # Entry point Express server
│   ├── drizzle.config.ts     # Konfigurasi Drizzle Kit
│   └── package.json
├── mobile/                   # Aplikasi Mobile React Native (Expo)
│   ├── app/                  # File-based routing (Expo Router)
│   │   ├── (auth)/           # Halaman login & register
│   │   ├── (onboarding)/     # Alur onboarding pengguna baru
│   │   ├── (app)/
│   │   │   ├── (tabs)/       # Halaman utama: Home, Meals, Recipes, Profile
│   │   │   └── recipe-detail.tsx
│   │   └── _layout.tsx       # Root layout & providers
│   ├── components/           # Komponen UI modular (cards, modal, buttons, dsb.)
│   ├── stores/               # Zustand stores (auth, journal, onboarding, preferences)
│   ├── tailwind.config.js    # Konfigurasi TailwindCSS / NativeWind
│   └── package.json
├── package.json              # Workspace root package.json
└── README.md                 # Dokumentasi proyek
```

---

## ⚙️ Prasyarat Sistem

Sebelum menjalankan proyek, pastikan perangkat Anda telah terpasang:
- **Node.js** versi 18.x atau 20.x LTS ([Download Node.js](https://nodejs.org/))
- **npm** atau package manager pilihan (`pnpm` / `yarn`)
- **PostgreSQL** versi 14+ aktif (lokal atau menggunakan cloud provider seperti Neon / Supabase)
- **Expo Go** terpasang di smartphone (iOS / Android) atau Android Studio / Xcode Simulator jika ingin menjalankan emulator.

---

## 🚀 Panduan Instalasi & Setup

### 1. Clone Repositori
```bash
git clone <url-repository-anda>
cd "better life"
```

### 2. Install Dependencies

Install seluruh dependensi untuk root, backend, dan mobile:

```bash
# Install di root workspace (opsional untuk script runner)
npm install

# Install dependensi backend
cd backend
npm install

# Install dependensi mobile
cd ../mobile
npm install

# Kembali ke root
cd ..
```

---

### 3. Konfigurasi Environment Variables

#### Backend (`/backend/.env`)
Buat file `.env` di dalam folder `backend/`:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/betterlife_db
JWT_SECRET=rahasia_jwt_super_aman_untuk_pengembangan
CORS_ORIGIN=http://localhost:8081,http://localhost:8085
```
> *Sesuaikan `username`, `password`, dan nama database PostgreSQL sesuai dengan konfigurasi lokal Anda.*

---

### 4. Setup Database & Migrasi

Jalankan migrasi tabel database menggunakan Drizzle:

```bash
cd backend
npx drizzle-kit push
cd ..
```

---

### 5. Menjalankan Backend & Mobile

Anda dapat menjalankan kedua layanan langsung dari root project:

#### 🔹 Jalankan Server Backend
```bash
npm run dev:backend
```
Server akan aktif di: `http://localhost:4000` (Health check: `http://localhost:4000/health`)

#### 🔹 Jalankan Aplikasi Mobile (Expo)
Buka terminal baru di root:
```bash
npm run dev:mobile
```
Setelah Expo bundler menyala:
- Tekan `a` untuk membuka di **Android Emulator**
- Tekan `i` untuk membuka di **iOS Simulator**
- Tekan `w` untuk membuka di **Web Browser**
- Pindai kode QR menggunakan kamera ponsel (iOS) atau aplikasi **Expo Go** (Android)

---

## 🔌 Dokumentasi API

Seluruh endpoint backend diawali dengan prefix `/api`:

| Method | Endpoint | Deskripsi | Autentikasi |
| :--- | :--- | :--- | :---: |
| `GET` | `/health` | Pemeriksaan status server | ❌ |
| `POST` | `/api/auth/register` | Pendaftaran pengguna baru | ❌ |
| `POST` | `/api/auth/login` | Autentikasi & perolehan token JWT | ❌ |
| `GET` | `/api/profile` | Mengambil data profil & target nutrisi | ✅ |
| `PUT` | `/api/profile` | Memperbarui profil / data onboarding | ✅ |
| `GET` | `/api/meals` | Mengambil daftar makanan yang telah dicatat hari ini | ✅ |
| `POST` | `/api/meals` | Mencatat makanan baru (*log meal*) | ✅ |
| `DELETE` | `/api/meals/:id` | Menghapus catatan makanan | ✅ |
| `GET` | `/api/recipes` | Mengambil daftar katalog resep sehat | ❌ / ✅ |
| `GET` | `/api/recipes/:id` | Mengambil rincian detail resep tertentu | ❌ / ✅ |
| `GET` | `/api/activity` | Mengambil statistik langkah & aktivitas harian | ✅ |
| `POST` | `/api/activity` | Memperbarui data langkah & kalori terbakar | ✅ |

---

## 📜 Daftar Perintah (Scripts)

Daftar perintah yang dapat dijalankan dari root direktori:

| Perintah | Fungsi |
| :--- | :--- |
| `npm run dev:backend` | Menjalankan server backend Express dengan hot-reload |
| `npm run dev:mobile` | Menjalankan bundler Expo untuk aplikasi mobile |
| `npm run build:backend` | Melakukan kompilasi TypeScript backend ke folder `dist/` |
| `npm run build:mobile` | Melakukan ekspor web bundle aplikasi Expo |

---

## 💡 Catatan Pengujian & Tips Jaringan Mobile

Saat menguji aplikasi di **perangkat HP fisik (via Expo Go)**:
1. Pastikan komputer/laptop dan smartphone berada di **jaringan Wi-Fi yang sama**.
2. Alamat `localhost` di ponsel merujuk ke ponsel itu sendiri. Ganti base URL API di konfigurasi aplikasi mobile dengan **IP lokal laptop/komputer Anda** (contoh: `http://192.168.1.15:4000/api`).
3. Pastikan port `4000` diizinkan lewat Firewall komputer Anda.

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi [MIT](LICENSE). Silakan gunakan dan kembangkan sesuai kebutuhan.
