# Arsitektur — HitungHemat

## 1. Ringkasan Keputusan

| Keputusan | Pilihan | Status |
|---|---|---|
| Bahasa | **Python** (backend) + **JavaScript** (aplikasi) | Ditetapkan pemilik produk |
| Backend | **FastAPI** + SQLAlchemy 2 + SQLite (bisa diganti PostgreSQL lewat `HH_DATABASE_URL`) | Diimplementasikan |
| Aplikasi siswa | **React 18 + Vite 5** (JavaScript ES2020, tanpa TypeScript) | Diimplementasikan |
| 3D | **Three.js** murni (tanpa wrapper), dimuat malas, cadangan SVG 2D | Diimplementasikan |
| Penyimpanan di HP | IndexedDB lewat **Dexie** | Diimplementasikan |
| Pembungkus Android | **Capacitor 6** (APK/AAB) | Konfigurasi siap; `android/` dibuat dengan `npm run android:init` |
| Mode kerja | **Offline-first**: aplikasi berjalan penuh tanpa internet; sinkron ke backend bila `VITE_API_URL` diisi | Diimplementasikan |
| Min. Android | API 26 (Android 8.0), WebView ≥ 60 | TBD (menunggu data HP siswa) |

**Pembagian tugas kedua bahasa**

| Python (backend/) | JavaScript (frontend/) |
|---|---|
| Sumber kebenaran logika diskon & generator soal | Salinan identik logika untuk mode offline |
| Pemeriksa kualitas konten (`validate_content`) | Antarmuka siswa, wizard langkah, petunjuk |
| Pembuat *test vectors* paritas (`gen_vectors`) | Ilustrasi 3D Three.js + cadangan 2D |
| API sinkronisasi event penelitian | Log event lokal, sinkron, ekspor CSV |
| Analitik: N-gain, miskonsepsi, usaha mental | — |

Kedua implementasi dijaga **identik** lewat `shared/test-vectors.json`: Python membuatnya, lalu Vitest memeriksa bahwa JavaScript menghasilkan angka, format, dan soal yang sama persis (PRNG mulberry32 yang sama).

## 2. Diagram

```
┌────────────────────────── HP Android (Capacitor) ──────────────────────────┐
│ WebView                                                                     │
│  features/  ProblemSolver · WorkedExample · ModuleRunner · Screens          │
│     │            │ props angka yang sudah diketahui                         │
│     ▼            ▼                                                          │
│  domain/ (JS murni)            three/ SceneHost → scenes/bars, hundredCubes │
│  discount · problems · text      └→ Fallback2D (SVG) bila WebGL lemah        │
│  misconceptions · scaffold                                                   │
│     │                                                                        │
│  data/ Dexie: profile · progress · events ──(opsional)── sync.js ──┐        │
└────────────────────────────────────────────────────────────────────┼────────┘
                                                                     │ HTTPS
┌──────────────────────── Server / laptop peneliti ──────────────────▼────────┐
│ FastAPI  /api/v1/sync/events · /research/summary · /research/export.csv     │
│ domain/ (Python): discount · problems · analytics       SQLite/PostgreSQL   │
└─────────────────────────────────────────────────────────────────────────────┘
                 ▲ keduanya membaca shared/content/*.json
```

## 3. Struktur Folder

```
APK/
├─ shared/
│  ├─ content/curriculum.json   modul M1–M7, template soal, petunjuk H1–H3, kartu jelaskan
│  ├─ content/glossary.json     kartu istilah (rabat, potongan kotor, …)
│  ├─ content/diagnostic.json   cek kesiapan + kartu bekal
│  ├─ content/assessment.json   pre/post-test literasi (tag proses PISA)
│  ├─ content/literacy.json     Tes Literasi Matematis 4 soal bertahap (maks. 24) + 4 soal latihan
│  ├─ content/material.json     materi 5 bab (kartu) + rangkuman rumus R1–R3
│  ├─ content/journey.json      perjalanan belajar "Jalan Ruko Hemat" J1–J6
│  ├─ content/shop.json         barang Simulasi Belanja
│  └─ test-vectors.json         dibuat otomatis oleh Python
├─ backend/                     Python
│  ├─ app/domain/               money · discount · rng · problems · analytics
│  ├─ app/tools/                validate_content · gen_vectors
│  ├─ app/main.py               FastAPI
│  └─ tests/                    pytest
└─ frontend/                    JavaScript
   ├─ src/domain/               money · discount · rng · problems · text · misconceptions · scaffold
   ├─ src/data/                 db (Dexie) · events · sync · export
   ├─ src/three/                SceneHost · segments · Fallback2D · scenes/{base,bars,hundredCubes}
   ├─ src/features/             ProblemSolver · Learning · ModuleRunner · Screens · sceneParams
   ├─ src/ui/components.jsx     Header · RichText · BoxDiagram · NumberPad · FormulaDock · Sheet
   ├─ tests/domain.test.js      Vitest (termasuk paritas Python)
   └─ capacitor.config.json
```

## 4. Format Template Soal

Template ditulis di `curriculum.json` tanpa kode yang dieksekusi. Fungsi hitung dipanggil lewat nama dari registri `FN` (whitelist), bukan `eval`.

```json
"vars":    { "price": { "range": [50000, 400000, 10000] }, "pct": { "choices": [1000, 2500] } },
"derived": { "final": { "fn": "finalPrice", "args": ["price", "pct"] } },
"steps":   [{ "compute": { "fn": "discountAmount", "args": ["price", "pct"] }, "saveAs": "disc", ... }]
```

Fungsi hitung bersifat **eksak**: mengembalikan bilangan bulat atau `null`. Generator menolak undian yang menghasilkan `null`, sehingga semua soal berangka bulat. Pemeriksa konten mengujinya pada 300 seed per template.

## 5. Mesin Petunjuk & Penguasaan (`domain/scaffold.js`)

- Setiap langkah punya **H1** (pemantik), **H2** (urutan), dan **H3** (langkah sebagian) dari konten. **H4** berupa contoh serupa: soal lain dengan seed berbeda, yang langkahnya diperlihatkan sampai langkah yang sedang dikerjakan. Jawaban soal yang sedang dikerjakan tidak pernah ditampilkan.
- `AUTO_HINT_AFTER = 2`: setelah 2 kali salah pada satu langkah, aplikasi menawarkan petunjuk sekali.
- Fading menurut `level` modul (0–3):

| Level | Warna angka | Mode Tandai | Kartu rumus | Tombol petunjuk aktif setelah |
|---|---|---|---|---|
| 0 | ya | tidak | terbuka | 0 salah |
| 1 | ya | tidak | terlipat | 1 salah |
| 2–3 | tidak | **ya** | terlipat | 2 salah |
| Tantangan (transfer) | tidak | **ya** + kalimat pengecoh | terlipat | 2 salah |

- Modul dianggap **dikuasai** bila ≥ 3 dari 4 latihan terakhir benar tanpa petunjuk ≥ H3, ditambah tantangan benar.

## 6. Ilustrasi 3D

- `SceneHost` memuat modul scene secara malas (`import()`), sehingga Three.js tidak memperlambat layar pertama.
- Ada dua scene generik: **bars** (label harga, diskon bertingkat, model batang) dan **hundredCubes** (100 kubus = 100%, memakai 1 draw call InstancedMesh, mendukung 12,5%).
- Isi ilustrasi dihitung oleh `segments.js` dan dipakai bersama oleh versi 3D maupun SVG, sehingga informasinya selalu sama.
- Render hanya saat ada animasi. `pixelRatio ≤ 1,5`. Putaran dibatasi ±25°.
- Ilustrasi otomatis beralih ke 2D bila WebGL tidak ada, fps < 24, atau pengguna mengaktifkan *reduce motion*.
- Angka ilustrasi hanya diambil dari besaran yang sudah diketahui siswa (`sceneParams.js`), sehingga ilustrasi tidak membocorkan jawaban.

## 7. Data & Privasi

| Tabel (Dexie) | Isi |
|---|---|
| `profile` | studentCode, consentAt, status tes |
| `progress` | per modul: level, bintang, riwayat 40 soal terakhir |
| `events` | event penelitian (api.md §6), `synced` 0/1 |

- Tidak ada nama, email, atau nomor HP. Backend menolak kode siswa yang tidak sesuai pola `^[A-Za-z0-9_-]{2,16}$`.
- Endpoint peneliti dilindungi header `X-Research-Token` (`HH_RESEARCH_TOKEN`). Panel peneliti di aplikasi dilindungi PIN (`VITE_RESEARCH_PIN`).
- Sinkronisasi bersifat idempoten: pasangan unik (`student_code`, `client_id`) mencegah event ganda.

## 8. Build & Rilis

| Tujuan | Perintah |
|---|---|
| Uji di browser | `cd frontend && npm run dev` |
| Pertama kali buat proyek Android | `npm run android:init` |
| Perbarui APK setelah ubah kode | `npm run android:sync` lalu Run di Android Studio |
| APK debug | `cd frontend/android && ./gradlew assembleDebug` |
| Backend | `cd backend && .venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000` |

## 9. Anggaran Kinerja

| Item | Batas |
|---|---|
| Ukuran APK | ≤ 30 MB |
| Bundle JS awal (tanpa Three.js) | ≤ 250 KB gzip |
| Chunk Three.js | ≤ 200 KB gzip |
| FPS ilustrasi | ≥ 30 (di bawah 24 otomatis beralih ke 2D) |
