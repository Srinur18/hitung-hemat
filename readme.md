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

## Prasyarat

| Alat | Versi | Catatan |
|---|---|---|
| Python | 3.11+ | Di Windows, jalankan dengan perintah `py` |
| Node.js | 20 LTS | Pasang dengan `winget install OpenJS.NodeJS.LTS` |
| Android Studio | terbaru | Untuk membuat APK (SDK 34, JDK 17) |

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
