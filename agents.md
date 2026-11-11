# AGENTS.md — Panduan untuk AI Coding Agent

Berkas ini dibaca oleh AI agent (Claude Code, Cursor, Copilot, dll.) sebelum mengubah kode. Proyek ini dibangun dengan cara *vibe coding*, jadi aturan di bawah adalah **pagar pengaman pedagogis**. Kode yang benar secara teknis tetapi menambah beban kognitif siswa dianggap **salah**.

## 1. Konteks Proyek

- **Pengguna:** siswa SMP kelas VII (12–13 tahun) yang memakai HP Android kelas bawah–menengah.
- **Materi:** Persentase Diskon (Rabat) & Potongan Harga.
- **Tujuan:** meningkatkan Literasi Matematis (merumuskan → menerapkan → menafsirkan).
- **Landasan:** Cognitive Load Theory. Dasar empirisnya adalah wawancara siswa (lihat [prd.md](prd.md) §2).
- Baca dulu: [prd.md](prd.md), [design.md](design.md), [architecture.md](architecture.md), [api.md](api.md).

## 2. Aturan Pedagogis (WAJIB)

| # | Aturan | Alasan (kode wawancara) |
|---|---|---|
| P1 | **Satu langkah per layar.** Jangan gabungkan "hitung diskon" dan "hitung harga akhir" dalam satu input. | IL02 |
| P2 | Maksimal **3 tombol aksi utama** per layar. | DS03 |
| P3 | **Tanpa gambar/animasi dekoratif.** Setiap visual harus memuat angka atau relasi matematis. | EL03 |
| P4 | Teks per kartu ≤ **40 kata**, kalimat ≤ **15 kata**. | DS03, EL01 |
| P5 | Rumus/petunjuk yang relevan **tampil di layar yang sama** dengan soal. Jangan pindah halaman. | EL02 |
| P6 | Warna semantik **hanya** dari token di design.md (`--c-price`, `--c-percent`, `--c-result`). Jangan pakai warna lain untuk angka. | EL05 |
| P7 | Semua penjelasan bertahap harus bisa **dijeda, diulang, dan dimundurkan**. Jangan ada auto-advance berbasis waktu. | EL04 |
| P8 | **Jangan pernah menampilkan kunci jawaban langsung.** Ikuti tingkatan petunjuk H1→H4. | GL03 |
| P9 | Bantuan otomatis ditawarkan setelah **2 kali salah** pada langkah yang sama (konstanta `AUTO_HINT_AFTER = 2`). | DS02 |
| P10 | Gunakan istilah yang konsisten: *harga awal, persen diskon, besar diskon, harga akhir*. Istilah lain hanya muncul lewat Kartu Istilah. | EL01 |
| P11 | 3D hanya untuk konsep spasial (persen sebagai bagian, diskon bertingkat, model batang). Selalu sediakan cadangan 2D. | DS01, NFR-03 |
| P12 | Tanpa leaderboard, timer hitung mundur, atau suara yang menyala otomatis. | Beban ekstrinsik |
| P13 | Umpan balik salah harus spesifik pada miskonsepsi (MC1–MC6) dan tidak menghakimi. | Etika, GL |

## 3. Aturan Teknis

- **Hanya dua bahasa: Python (backend) dan JavaScript (frontend).** Jangan menambah TypeScript, Kotlin, atau Dart.
- **Uang = bilangan bulat Rupiah.** Persen disimpan dalam *basis point* (`12,5% = 1250`). Jangan memakai float untuk uang.
- Logika matematika ada di **dua tempat yang harus identik**: `backend/app/domain/` (sumber kebenaran) dan `frontend/src/domain/`. Setiap perubahan pada salah satunya wajib diikuti di yang lain, lalu jalankan `gen_vectors` dan `npm test`.
- Fungsi `domain/` harus murni (tanpa React, tanpa I/O) dan eksak (`null` bila hasil tidak bulat).
- Komponen UI tidak boleh menghitung sendiri. Selalu panggil fungsi `domain/`.
- Konten (soal, teks petunjuk) ditaruh di `shared/content/*.json`, bukan di-*hardcode* di komponen. Template memanggil fungsi lewat nama di registri `FN` (tanpa `eval`).
- Scene Three.js: render *on demand* (lewat `makeStage().tween`), `pixelRatio ≤ 1,5`, geometri low-poly, tanpa tekstur. Panggil `dispose()` saat unmount. Setiap scene wajib punya versi SVG di `Fallback2D.jsx`.
- Ilustrasi hanya boleh menerima angka yang sudah diketahui siswa (`sceneParams.js`).
- Semua teks UI dalam Bahasa Indonesia dan diambil dari `src/i18n/id.js`.
- Jangan menambah dependensi baru tanpa alasan tertulis di PR. Batas APK ≤ 30 MB.
- Jangan simpan nama/email/nomor HP. Hanya `studentCode`.

## 4. Perintah

```bash
# Python (folder backend/)
.venv\Scripts\python -m app.tools.validate_content   # kualitas soal
.venv\Scripts\python -m app.tools.gen_vectors        # perbarui shared/test-vectors.json
.venv\Scripts\python -m pytest
.venv\Scripts\uvicorn app.main:app --reload

# JavaScript (folder frontend/)
npm test             # Vitest + paritas Python
npm run dev          # http://localhost:5173 (viewport 360x740)
npm run android:sync # build + salin ke proyek Android
```

## 5. Definition of Done

- [ ] `validate_content`, `pytest`, dan `npm test` lulus.
- [ ] Bila `domain/` berubah: `gen_vectors` dijalankan ulang dan tes paritas JS lulus.
- [ ] Fungsi baru di `domain/` punya uji, termasuk kasus miskonsepsi.
- [ ] Layar baru lolos **Checklist CLT** di [design.md](design.md) §9.
- [ ] Diuji di viewport 360×740 dan di HP Android nyata (atau emulator API 26).
- [ ] Scene 3D punya cadangan 2D dan tidak turun di bawah 30 fps di perangkat acuan.
- [ ] Event penelitian yang relevan tercatat sesuai [api.md](api.md) §5.

## 6. Kesalahan Umum yang Harus Dihindari Agent

- Menambah ilustrasi maskot, konfeti, atau latar bergambar "agar menarik" (melanggar P3).
- Menampilkan semua langkah sekaligus dalam satu formulir (melanggar P1).
- Memakai `0.1 + 0.2` untuk persen (melanggar aturan uang bulat).
- Membuat soal acak yang hasilnya pecahan Rupiah. Generator harus menjamin hasilnya bulat.
- Menulis penjelasan panjang seperti buku paket (melanggar P4).

## 7. Status Keputusan

Keputusan yang masih menunggu interview dengan pemilik produk ditandai `TBD` di [architecture.md](architecture.md) dan [task.md](task.md). Jangan mengimplementasikan fitur bertanda `TBD` sebelum dikonfirmasi.
