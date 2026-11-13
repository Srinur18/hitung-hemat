# Rencana Kerja — HitungHemat (ADDIE)

Legenda: `[x]` selesai · `[ ]` belum · **TBD** = menunggu keputusan lewat interview.

## A — Analysis

- [x] A1 Susun kisi-kisi & pedoman wawancara CLT (KO, IL, EL, GL, DS)
- [x] A2 Wawancara informan S01 (9 Nov 2026, 14.27 menit)
- [x] A3 Matriks temuan → kebutuhan aplikasi
- [x] A4 Ketidaksesuaian transkrip E vs G diperbaiki (G kini membahas diskon)
- [ ] A4b Ganti placeholder "[materi X]" pada pertanyaan GL01
- [ ] A5 Wawancara informan kedua (S02) dengan kemampuan berbeda
- [ ] A6 Validasi pedoman oleh 2–3 ahli + uji keterbacaan
- [ ] A7 Analisis kurikulum (CP Fase D Kurikulum Merdeka) & buku paket kelas VII
- [ ] A8 Sesi interview pemilik produk: perangkat, cakupan, teknologi (lihat prd.md §12)

## D — Design

- [x] D1 Draf PRD, desain, arsitektur, API
- [ ] D2 Finalisasi keputusan TBD setelah A8
- [ ] D3 Peta konsep & urutan modul M0–M7 (+ M8 jika disetujui)
- [ ] D4 Tulis konten: 1 contoh terselesaikan, 2 soal melengkapi, 2 template mandiri, 1 template transfer per modul
- [ ] D5 Tulis petunjuk H1–H4 dan umpan balik MC1–MC6
- [ ] D6 Susun instrumen pre/post-test literasi matematis (8–10 butir, tag proses PISA) + kisi-kisi
- [ ] D7 Adaptasi skala usaha mental 1–9 (Bahasa Indonesia) + validasi isi
- [ ] D8 Wireframe low-fi SC01–SC15 (Figma/kertas)
- [ ] D9 Storyboard 5 scene 3D + versi 2D
- [ ] D10 Validasi desain oleh ahli materi & ahli media (lembar validasi)

## D — Development

> Stack ditetapkan 11 Nov 2026: **Python (FastAPI)** + **JavaScript (React + Vite + Three.js)**.
> Status 11 Nov 2026: 21 tes pytest + 73 tes Vitest (61 domain/paritas + 12 UI) lulus. Tes UI menemukan & memperbaiki 1 bug (layar kosong setelah Tes Awal).

### Sprint 0 — Fondasi
- [x] DV1 Proyek Vite + React (JavaScript) + Vitest — `frontend/`
- [x] DV2 Proyek Android dibuat; APK debug v0.1.0 (4 MB) berhasil di-build — uji di HP nyata menyusul
- [x] DV3 Token desain (CSS variables) + komponen dasar (`ui/components.jsx`)
- [x] DV4 Dexie schema + `logEvent()` + sinkron + ekspor CSV
- [x] DV4b Backend FastAPI + SQLite + endpoint sinkron/peneliti (21 tes pytest lulus)

### Sprint 1 — Inti Matematika
- [x] DV5 `domain/money` + `domain/discount` (Python ✅ + JS ✅; 61 tes domain + paritas lulus)
- [x] DV6 Generator & validator template soal; 9 template lolos 300 seed
- [x] DV6b PRNG identik + `shared/test-vectors.json` untuk paritas Python↔JS
- [x] DV7 `misconceptions.classify` (MC1–MC6) + uji
- [x] DV8 Mesin petunjuk + fading + penguasaan + uji

### Sprint 2 — Alur Belajar
- [x] DV9 Onboarding (kode siswa, persetujuan)
- [x] DV10 Peta Belajar
- [x] DV11 `ModuleRunner` (explore → worked → completion → independent → transfer → explain)
- [x] DV12 `RichText` (signaling) + Mode Tandai
- [x] DV13 `FormulaDock`, `HintSheet` (H1–H4), Kartu Istilah, Diagram Kotak
- [x] DV14 Cek Kewajaran & Jelaskan ke Teman

### Sprint 3 — Visual & 3D
- [x] DV15 `SceneHost` (lazy, deteksi WebGL, pemantau fps, fallback 2D)
- [x] DV16 Label harga 3D yang bisa diketuk (scene `bars` + produk)
- [x] DV17 100 kubus (InstancedMesh, mendukung 12,5%)
- [x] DV18 Diskon bertingkat (scene `bars`)
- [x] DV19 Model batang soal terbalik (scene `bars`)
- [x] DV20 Perbandingan toko (SVG 2D)
- [x] DV21 Simulasi Struk

### Sprint 4 — Penelitian & Rilis
- [x] DV22 Pre/post-test (8 butir, tag PISA), skala usaha mental
- [x] DV23 Panel peneliti (PIN) + ekspor CSV; analitik N-gain di backend ✅
- [x] DV23b Tes Literasi Matematis 4 indikator (soal Tabel 2, skor bertahap maks. 24, skor parsial + ECF), Latihan Literasi per indikator, tab Materi | Latihan | Tes, kisi-kisi di Panel Peneliti (14 Nov 2026)
- [x] DV23d Redesain v0.3 "Jalan Ruko Hemat": beranda 5 menu, identitas + sapaan, perjalanan 6 tahap, Simulasi Belanja, Profil, tombol Beranda di semua halaman (14 Nov 2026)
- [ ] DV23c Validasi ahli untuk soal latihan literasi P1–P4 & ringkasan materi T1–T7
- [ ] DV24 Uji kinerja di perangkat acuan (fps, ukuran APK, waktu buka)
- [ ] DV25 Build APK rilis + panduan instalasi untuk sekolah
- [ ] DV26 (Fase 2, **TBD**) sinkronisasi Supabase, dashboard guru, M8 Untung–Rugi (opsional)

## I — Implementation

- [ ] I1 Uji coba perorangan (one-to-one) 2–3 siswa; *think-aloud*; revisi
- [ ] I2 Uji coba kelompok kecil (6–9 siswa); SUS + wawancara singkat; revisi
- [ ] I3 Uji lapangan satu kelas: pre-test → 4–6 sesi aplikasi → post-test
- [ ] I4 Panduan guru (1 halaman) & sesi pengenalan

## E — Evaluation

- [ ] E1 Formatif: catatan revisi tiap tahap (I1, I2)
- [ ] E2 Kevalidan: rekap lembar validasi ahli
- [ ] E3 Kepraktisan: SUS + respons siswa/guru
- [ ] E4 Keefektifan: N-gain literasi matematis, per proses PISA
- [ ] E5 Beban kognitif: tren skala usaha mental, petunjuk per soal, frekuensi MC
- [ ] E6 Laporan & jejak keputusan ADDIE

## Ketergantungan Utama

```
A4,A5,A8 ──► D2 ──► D3..D9 ──► D10 ──► Sprint 2..4 ──► I1 ──► I2 ──► I3 ──► E
DV5..DV8 (domain) ──► DV11..DV14 (alur)
DV15 ──► DV16..DV20 (scene)
```
