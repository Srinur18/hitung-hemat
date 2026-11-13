# HitungHemat (nama kerja)

Aplikasi Android untuk siswa SMP belajar **Persentase Diskon (Rabat) dan Potongan Harga**. Aplikasi ini dirancang berdasarkan **Cognitive Load Theory** dan bertujuan meningkatkan **Literasi Matematis**.

- **Python (FastAPI)**: backend sinkronisasi data penelitian, analitik N-gain, dan pemeriksa konten.
- **JavaScript (React + Vite + Three.js)**: aplikasi siswa yang berjalan offline, dibungkus menjadi APK dengan Capacitor.

Proyek ini dikembangkan dengan model ADDIE. Dasar perancangannya adalah wawancara siswa S01 (9 November 2026).

## Fitur

- **Wizard langkah**: satu langkah per layar, dilengkapi **Diagram Kotak** `[Harga Awal] − [Diskon] = [Harga Akhir]`.
- **Penanda warna angka** pada soal cerita. Penanda ini memudar seiring penguasaan, lalu diganti **Mode Tandai** (siswa menandai angka sendiri).
- **Petunjuk bertingkat** H1→H4, ditawarkan otomatis setelah 2 kali salah. Tidak ada tombol "lihat jawaban".
- **Umpan balik miskonsepsi** MC1–MC6, misalnya "50% + 20% bukan 70%".
- **Ilustrasi 3D Three.js**: label harga yang bisa diketuk, 100 kubus, diskon bertingkat, dan model batang. Tersedia cadangan 2D.
- **Simulasi struk belanja**, **Jelaskan ke Teman**, dan **Cek kewajaran**.
- **Pre/post-test literasi**, **skala usaha mental**, dan **ekspor CSV**. Data siswa hanya berupa kode, tanpa nama.
- **Beranda "Jalan Ruko Hemat"** dengan 5 menu (Mulai Belajar, Materi, Simulasi Belanja, Kuis/Tes, Profil), ilustrasi ruko & karakter kartun beranimasi ringan, perjalanan belajar 6 tahap, dan Simulasi Belanja dengan kasir.
- **Materi 5 bab** dengan kartu bertahap, **Rangkuman Rumus**, dan **Kamus Istilah**. **Simulasi Belanja** lengkap dengan keranjang dan struk digital. **Profil** dengan lencana, riwayat nilai, dan aspirasi. Animasi ringan dan **efek suara** yang bisa dimatikan; musik latar mati bawaan.
- **Menu Materi | Latihan | Tes**: ringkasan materi 7 topik dengan contoh bertahap, Latihan Literasi per indikator, dan **Tes Literasi Matematis** 4 soal (4 indikator, skor bertahap maks. 24 poin, skor parsial).
- **Kisi-kisi tes** untuk guru di Panel Peneliti (PIN).

## Coba Langsung

| | Link |
|---|---|
| 🌐 **Versi web** (buka di browser HP/laptop) | https://srinur18.github.io/hitung-hemat/ |
| 📱 **APK Android** | https://github.com/Srinur18/hitung-hemat/raw/main/release/HitungHemat-v0.4.0-debug.apk |
| 💻 **Kode sumber** | https://github.com/Srinur18/hitung-hemat |

Memperbarui versi web setelah kode berubah (dari folder `APK`, Git Bash):

```bash
source ~/hh-tools/env.sh && bash scripts/deploy-web.sh
```

## Unduh & Pasang APK

APK siap pakai: [`release/HitungHemat-v0.4.0-debug.apk`](release/HitungHemat-v0.4.0-debug.apk) (4 MB, Android 5.1+).

1. Kirim berkas APK ke HP (WhatsApp, Google Drive, atau kabel USB).
2. Ketuk berkasnya. Bila muncul peringatan, izinkan **"Instal dari sumber tidak dikenal"** untuk aplikasi pembuka berkas tersebut.
3. Buka **HitungHemat** dan masukkan kode siswa (mis. `S01`).

> Ini build *debug* untuk uji coba (one-to-one & kelompok kecil). Untuk Google Play, perlu build *release* yang ditandatangani (lihat task.md DV25).

## Prasyarat

| Alat | Versi | Catatan |
|---|---|---|
| Python | 3.11+ | Di Windows, jalankan dengan perintah `py` |
| Node.js | 20 LTS | Pasang dengan `winget install OpenJS.NodeJS.LTS` |
| JDK + Android SDK | JDK 17, SDK 34 | Lewat Android Studio, atau versi portable (lihat di bawah) |

Di laptop pengembang, alat-alat ini sudah dipasang versi *portable* di `C:\Users\WINDOWS11\hh-tools` (Node 22, JDK 17, Android SDK 34). Untuk memakainya di Git Bash, jalankan `source ~/hh-tools/env.sh`.

## Menjalankan

### 1. Backend Python

```bash
cd backend
py -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m app.tools.validate_content   # periksa kualitas soal
.venv\Scripts\python -m pytest                       # 21 tes
.venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# dokumentasi API: http://localhost:8000/docs
```

### 2. Aplikasi JavaScript

```bash
cd frontend
npm install
npm test            # uji domain + paritas dengan Python
npm run dev         # buka http://localhost:5173 (pakai mode HP di DevTools, 360×740)
```

Untuk mengaktifkan sinkronisasi, salin `.env.example` menjadi `.env` lalu isi `VITE_API_URL`.

### 3. APK Android

**Cara yang disarankan** (proyek ini ada di OneDrive): jalankan dari folder `APK` di Git Bash:

```bash
source ~/hh-tools/env.sh && bash scripts/build-apk.sh
```

Skrip ini menjalankan tes, membuat build, dan mengerjakan Gradle di `C:\Users\WINDOWS11\hh-build`. Hasilnya ditaruh di `release/`. Build sengaja dikerjakan di luar OneDrive, karena OneDrive mengunci folder yang sedang disinkronkan sehingga Capacitor dan Gradle gagal (`EPERM`).

Cara manual (bila proyek **tidak** berada di OneDrive):

```bash
cd frontend
npm run android:init     # sekali saja: membuat folder android/
npm run android:sync     # setiap kali kode berubah
npm run android:open     # buka di Android Studio → Run ▶ ke HP (USB debugging)
```

Hasil APK debug ada di `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

## Mengubah Soal

1. Edit `shared/content/curriculum.json`.
2. Jalankan `py -m app.tools.validate_content` (dari folder `backend`) sampai OK.
3. Jalankan `py -m app.tools.gen_vectors`, lalu `npm test` di folder `frontend`.

## Struktur

```
shared/    konten JSON + test-vectors (dipakai kedua bahasa)
backend/   Python FastAPI
frontend/  JavaScript React + Three.js + Capacitor
```

## Dokumen

[prd.md](prd.md) · [design.md](design.md) · [architecture.md](architecture.md) · [api.md](api.md) · [task.md](task.md) · [agents.md](agents.md)

## Akun Bawaan (ganti sebelum dipakai di lapangan!)

| Rahasia | Nilai bawaan | Ganti lewat |
|---|---|---|
| PIN panel peneliti (aplikasi) | `2026` | `frontend/.env` → `VITE_RESEARCH_PIN` |
| Token peneliti (backend) | `ganti-token-ini` | variabel lingkungan `HH_RESEARCH_TOKEN` |
