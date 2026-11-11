# PRD — HitungHemat (nama kerja)

> Aplikasi Android untuk siswa SMP belajar **Persentase Diskon (Rabat) dan Potongan Harga** (Aritmatika Sosial, Kelas VII). Aplikasi ini dirancang dengan prinsip **Cognitive Load Theory (CLT)** dan bertujuan meningkatkan **Literasi Matematis (Mathematical Literacy)**.

| Atribut | Nilai |
|---|---|
| Versi dokumen | 0.1 (draf, tahap ADDIE: Analysis → Design) |
| Tanggal | 11 November 2026 |
| Pemilik produk | Sri Nur Rahmawati (Pendidikan Matematika) |
| Sumber data | Wawancara mendalam informan S01 (kelas VIII), 9 November 2026, 14.27 menit |
| Status | Menunggu konfirmasi lewat sesi interview lanjutan (lihat §12) |

---

## 1. Latar Belakang

Dari wawancara, siswa **merasa materi diskon mudah** karena sering melihatnya di supermarket, tetapi **gagal saat harus memodelkan soal cerita**. Kesalahan utamanya bukan di perhitungan dasar. Siswa salah menerjemahkan kalimat ke model matematika (IL05: *"salah masukin mana angka yang jadi harga awal produknya"*). Masalah ini adalah inti literasi matematis: kemampuan **merumuskan (formulate)** situasi nyata menjadi masalah matematis.

Pembelajaran yang dialami siswa bersifat konvensional: guru menulis rumus di papan, siswa mencatat, lalu mengerjakan latihan dari buku paket. Pola ini memunculkan beban kognitif ekstrinsik, misalnya karena penjelasan cepat lalu dihapus, rumus dan soal berada di halaman berbeda, serta gambar dekoratif yang mengganggu.

## 2. Peta Temuan Wawancara → Kebutuhan Desain

### 2.1 Intrinsic Load (kerumitan materi)

| Kode | Temuan (kutipan ringkas) | Kebutuhan |
|---|---|---|
| IL01 | Mengubah persen ke desimal/pecahan, terutama 12,5% | Modul prasyarat konversi persen ↔ pecahan ↔ desimal; persen desimal diajarkan terpisah |
| IL02 | *"Udah dapet diskonnya, lupa dikurangin ke harga awal"* | **Wizard langkah**: diskon (Rp) → harga akhir dipisah eksplisit |
| IL01 (G) | Saat mencari persen diskon, bingung membagi dengan harga awal atau harga akhir | Modul **cari persen diskon**; label tetap "pembanding = harga awal" |
| IL02 (G) | Pajak/ongkir ikut dihitung, lalu langkah terakhir terlupa | Biaya tambahan dijadikan **langkah tersendiri** di wizard (M7) |
| IL03 | Perkalian/pembagian desimal & angka besar (ratusan ribu) belum kuat | **Diagnostik awal** + jalur remedial; angka kecil dulu (GL01) |
| IL04 | Soal cerita panjang, membandingkan dua toko, konversi satuan | Tingkat kesulitan berjenjang; perbandingan toko di level akhir |
| IL05 | Mengira diskon 50%+20% = 70% | Modul khusus **diskon bertingkat** + visual 3D sisa harga |
| K03 | Soal dibalik (cari harga awal atau persen diskon), bingung "dikali atau dibagi" | Modul **soal terbalik** dengan model batang (bar model) |

### 2.2 Extraneous Load (beban dari cara penyajian)

| Kode | Temuan | Kebutuhan |
|---|---|---|
| EL01 | Kalimat soal berbelit; istilah "rabat", "potongan kotor" tidak konsisten dengan penjelasan guru | Bahasa ringkas; **kartu istilah** (rabat = diskon = potongan harga) |
| EL02 | Rumus di halaman depan, soal di belakang (split-attention) | Rumus/petunjuk **menempel di layar soal yang sama** |
| EL02 (E) | Tabel rapi (harga awal | diskon) membantu | Tabel/kotak besaran terstruktur |
| EL03 | Gambar kartun & animasi PPT tidak penting | **Tanpa dekorasi**; visual hanya jika memuat angka/relasi |
| EL04 | Guru terlalu cepat, langsung dihapus (transient info) | Penjelasan **bisa di-pause, diulang, dimundurkan** per langkah |
| EL05 | Angka "nyempil" di kalimat; minta angka diberi warna | **Penanda warna (signaling)** untuk angka penting |
| DS03 | Jangan banyak tulisan/tombol | **Satu langkah per layar**, maksimal 3 aksi utama |

### 2.3 Germane Load (aktivitas yang membangun skema)

| Kode | Temuan | Kebutuhan |
|---|---|---|
| GL01 | Paham saat melihat struk asli / simulasi toko dengan angka kecil | **Simulasi struk interaktif**; contoh konkret angka kecil dulu |
| GL02 | Memeriksa kewajaran ("diskon pasti lebih murah") | **Prompt cek kewajaran** setiap akhir soal |
| GL03 | Petunjuk urutan, bukan kunci jawaban | **Petunjuk bertingkat yang memudar (fading hints)** |
| GL04 | Menjelaskan ke teman membuat makin paham | **Prompt "Jelaskan ke teman"** (self-explanation) |
| GL05 | Pola urutan sama walau barang berbeda | **Variasi konteks** (baju, HP, makanan) dengan struktur sama |
| DS01 | Seperti game; tag harga bisa dipencet, angka berkurang; **kotak Harga Awal / Diskon / Harga Akhir** | Objek 3D bertag harga yang interaktif; **diagram kotak besaran** di setiap soal |
| DS02 | Bantuan keluar otomatis setelah **salah 2 kali** | Aturan scaffolding adaptif: bantuan otomatis ditawarkan setelah 2 kali salah |

### 2.4 Catatan Validitas Data
1. ~~Ketidaksesuaian isi E vs G~~ **sudah diperbaiki** pada revisi instrumen: bagian E dan G sekarang sama-sama membahas diskon. Bagian G menambah temuan tentang mencari persen diskon, pajak/ongkir, istilah "potongan kotor", dan diagram kotak.
2. Data baru berasal dari **satu informan**, padahal pedoman meminta minimal 2. Temuan ini perlu ditriangulasi dengan informan kedua sebelum tahap Development dikunci.
3. Pedoman wawancara belum divalidasi ahli (lihat bagian I dokumen sumber).
4. Pertanyaan GL01 pada bagian E masih memuat placeholder "[materi X]" dan perlu diganti dengan nama materi.

## 3. Tujuan Produk

### 3.1 Tujuan Pembelajaran (Literasi Matematis, kerangka PISA 2022)

| Proses PISA | Wujud dalam aplikasi | Indikator keberhasilan |
|---|---|---|
| **Merumuskan (Formulate)** | Menandai informasi penting pada soal cerita, memilih besaran yang dicari, menyusun model | Siswa dapat menandai harga awal & persen dengan benar tanpa petunjuk |
| **Menerapkan (Employ)** | Menghitung diskon, harga akhir, diskon bertingkat, harga awal | Akurasi perhitungan per jenis soal |
| **Menafsirkan & Mengevaluasi (Interpret/Evaluate)** | Cek kewajaran, membandingkan toko, memutuskan pembelian | Siswa memberi alasan keputusan yang benar |
| **Penalaran Matematis** | Menjelaskan mengapa 50%+20% ≠ 70% | Kualitas penjelasan (rubrik 0–3) |

Kategori konten: *Quantity* serta *Change & Relationships*. Konteks: *personal* (belanja) dan *societal* (harga pasar).

### 3.2 Tujuan Pengelolaan Beban Kognitif
- **Mengurangi** beban ekstrinsik melalui penyajian bersih, signaling, integrasi rumus dan soal, serta kendali tempo.
- **Mengelola** beban intrinsik melalui segmentasi langkah, urutan sederhana ke kompleks, dan prasyarat terlebih dulu.
- **Mendorong** pemrosesan germane melalui contoh terselesaikan, self-explanation, variasi konteks, dan cek kewajaran.

## 4. Pengguna

| Persona | Deskripsi | Kebutuhan utama |
|---|---|---|
| **Siswa kelas VII** (utama) | Usia 12–13 tahun, memakai HP Android (sering milik keluarga/kelas bawah–menengah), terbiasa belajar dari papan tulis | Penjelasan pelan, bisa diulang, tampilan simpel, angka besar |
| **Guru Matematika** (sekunder) | Ingin tahu kesalahan umum siswa | Ringkasan miskonsepsi kelas (fase 2) |
| **Peneliti** (Anda) | Mengukur dampak pada literasi & beban kognitif | Log aktivitas anonim, pre/post-test, skala usaha mental |

## 5. Lingkup

### 5.1 MVP (Fase 1)
| ID | Modul | Isi |
|---|---|---|
| M0 | Cek Kesiapan (diagnostik) | Persen ↔ pecahan ↔ desimal, perkalian desimal, angka ribuan |
| M1 | Apa itu Diskon? | Struk belanja interaktif; istilah rabat/diskon/potongan |
| M2 | Menghitung Rupiah Diskon | p% × harga awal (angka bulat, kecil → besar) |
| M3 | Harga Akhir | harga awal − diskon; cara kedua: (100 − p)% × harga awal |
| M4 | Persen Berkoma | 12,5%, 7,5%, dsb. |
| M5 | Diskon Bertingkat | 50% + 20% ≠ 70%; visual 3D |
| M6 | Soal Terbalik | (a) Diketahui harga akhir & persen → cari harga awal; (b) diketahui harga awal & akhir → cari persen diskon |
| M7 | Bandingkan & Putuskan | Dua toko dengan syarat promo berbeda, plus biaya tambahan (pajak/ongkir) → pilihan terbaik + alasan |

### 5.2 Fase 2
- M8 Untung–Rugi (opsional, di luar temuan wawancara; butuh wawancara tersendiri bila dibuat).
- Dashboard guru, sinkronisasi cloud, kode kelas.

### 5.3 Di Luar Lingkup
Bunga tabungan, pajak, bruto–tara–netto; chat/forum; leaderboard publik (berisiko menambah tekanan dan distraksi).

## 6. Kebutuhan Fungsional

| ID | Kebutuhan | Jejak |
|---|---|---|
| FR-01 | Diagnostik 6–8 butir di awal; hasilnya menentukan jalur (remedial M0 atau langsung M1) | IL03 |
| FR-02 | Setiap modul mengikuti urutan: **Contoh Terselesaikan → Soal Melengkapi → Soal Mandiri → Soal Transfer** | IL, GL05, expertise reversal |
| FR-03 | **Wizard langkah**: satu langkah per layar dengan label langkah ("Langkah 1 dari 3: Cari rupiah diskon") | IL02, GL03, DS03 |
| FR-04 | **Penanda warna** angka pada soal cerita: harga = biru, persen = jingga, hasil = hijau, ditambah ikon/garis bawah agar tetap terbaca oleh pengguna buta warna | EL05 |
| FR-05 | **Mode Tandai**: siswa mengetuk angka penting di soal cerita sendiri sebelum menghitung (latihan *formulate*); penanda otomatis memudar di level atas | EL05, IL05, Literasi |
| FR-06 | **Kartu rumus menempel**: rumus/petunjuk yang relevan tampil di layar yang sama dan bisa dilipat | EL02 |
| FR-07 | **Kendali tempo**: setiap penjelasan/animasi bisa diputar ulang, dijeda, dan dimundurkan per langkah; tanpa batas waktu | EL04 |
| FR-08 | **Petunjuk bertingkat** (H1 pertanyaan pemantik → H2 urutan langkah → H3 langkah sebagian → H4 contoh serupa terselesaikan) | GL03, DS01 |
| FR-09 | **Bantuan adaptif**: setelah 2 kali salah pada langkah yang sama, aplikasi menawarkan petunjuk berikutnya secara otomatis | DS02 |
| FR-10 | **Fading**: jumlah petunjuk yang tersedia otomatis dan bantuan visual berkurang seiring penguasaan | GL03 |
| FR-11 | **Umpan balik diagnostik miskonsepsi** (lihat §7) | IL02, IL05, K03 |
| FR-12 | **Cek kewajaran** di akhir soal: "Apakah harga akhir lebih murah dari harga awal?" | GL02 |
| FR-13 | **Jelaskan ke Teman**: siswa menyusun penjelasan dengan memilih/mengurutkan kartu langkah (bukan mengetik panjang) | GL04 |
| FR-14 | **Simulasi Struk**: geser persen diskon → angka di struk berubah langsung | GL01, DS01 |
| FR-15 | **Ilustrasi 3D (Three.js)** pada konsep spasial: tag harga, 100-kubus persen, diskon bertingkat, model batang soal terbalik | DS01, IL05, K03 |
| FR-16 | **Kartu Istilah**: ketuk istilah bergaris bawah → arti singkat (rabat, potongan harga, potongan kotor, harga bandrol, harga bersih) | EL01 |
| FR-17 | **Skala usaha mental** 1–9 (satu butir) setelah tiap set soal (untuk penelitian, opsional) | Evaluasi CLT |
| FR-18 | **Pre-test & post-test literasi matematis** terintegrasi | Evaluasi |
| FR-19 | Progres pribadi sederhana (modul selesai, bintang penguasaan) tanpa peringkat antarsiswa | DS01 (unsur game), DS03 |
| FR-20 | Log aktivitas anonim (kode siswa, bukan nama) dan bisa diekspor CSV oleh peneliti | Etika penelitian |
| FR-21 | **Diagram Kotak** `[Harga Awal] − [Diskon] = [Harga Akhir]` selalu tampil di atas wizard; kotak terisi seiring langkah selesai | DS01 (G), EL02 |

## 7. Miskonsepsi yang Dideteksi

| Kode | Pola jawaban salah | Umpan balik |
|---|---|---|
| MC1 | Jawaban = rupiah diskon, padahal yang ditanya harga akhir | "Itu besar diskonnya. Yang ditanya: harga yang dibayar. Satu langkah lagi!" |
| MC2 | Persen bertingkat dijumlahkan (50%+20% → 70%) | Tampilkan visual 3D: 20% dihitung dari **sisa**, bukan dari harga awal |
| MC3 | Salah geser koma (12,5% → 1,25 atau 0,0125) | Arahkan ke kartu konversi persen → desimal |
| MC4 | Soal terbalik: harga akhir × (100−p)% | Model batang: harga akhir = (100−p)% bagian, cari 100% |
| MC5 | Harga akhir > harga awal | Picu cek kewajaran (GL02) |
| MC6 | Cari persen diskon: membagi dengan **harga akhir**, bukan harga awal | Diagram kotak: "persen diskon selalu dibandingkan dengan Harga Awal (100%)" |

## 8. Kebutuhan Non-Fungsional

| ID | Kebutuhan |
|---|---|
| NFR-01 | Berjalan di Android 8.0+ (API 26), RAM ≥ 2 GB *(dikonfirmasi saat interview)* |
| NFR-02 | **Offline penuh** untuk semua modul; ukuran APK ≤ 30 MB |
| NFR-03 | Scene 3D stabil ≥ 30 fps di perangkat kelas bawah; tersedia **cadangan 2D** jika WebGL tidak didukung |
| NFR-04 | Angka utama ≥ 28sp, teks isi ≥ 16sp; kontras WCAG AA |
| NFR-05 | Teks per kartu ≤ 40 kata; kalimat ≤ 15 kata; Bahasa Indonesia sederhana |
| NFR-06 | Tidak ada iklan, tidak ada data pribadi (nama/email) tersimpan; hanya kode siswa |
| NFR-07 | Perhitungan uang memakai bilangan bulat (Rupiah) agar tidak ada galat pembulatan |
| NFR-08 | Waktu buka aplikasi hingga siap dipakai ≤ 3 detik di perangkat acuan |

## 9. Metrik Keberhasilan

| Metrik | Cara ukur | Target awal |
|---|---|---|
| Peningkatan literasi matematis | Pre/post-test, **N-gain** | N-gain ≥ 0,3 (sedang) |
| Kemampuan merumuskan | Akurasi Mode Tandai pada soal level akhir | ≥ 80% |
| Penurunan miskonsepsi MC1–MC4 | Frekuensi per sesi | Turun ≥ 50% dari sesi 1 ke sesi akhir |
| Kemandirian (fading) | Rata-rata petunjuk per soal | Turun dari waktu ke waktu |
| Beban kognitif yang dirasakan | Skala usaha mental 1–9 | Turun pada soal setara seiring latihan |
| Transfer | Akurasi soal transfer konteks baru | ≥ 70% |
| Kegunaan | SUS (System Usability Scale) | ≥ 70 |

> Skala usaha mental (diadaptasi dari Paas, 1992) belum divalidasi untuk siswa SMP berbahasa Indonesia. Validasi isi & keterbacaan perlu dilakukan sebelum dipakai sebagai data penelitian.

## 10. Alur Pengguna Utama

```
Buka aplikasi → Masukkan kode siswa → Pre-test (sekali)
  → Cek Kesiapan (M0) ──lemah──→ Remedial prasyarat
        │ siap
        ▼
  Peta Belajar (M1…M7, terbuka berurutan)
        ▼
  Modul: Contoh → Lengkapi → Mandiri → Transfer → Jelaskan ke Teman
        ▼
  Skala usaha mental → Bintang penguasaan → modul berikutnya
        ▼
  Post-test (setelah M7)
```

## 11. Risiko

| Risiko | Mitigasi |
|---|---|
| Elemen 3D justru menambah beban ekstrinsik | 3D hanya untuk konsep yang punya makna spasial, tanpa dekorasi; uji A/B 2D vs 3D |
| HP siswa lemah, WebGL lambat | Render on-demand, low-poly, cadangan 2D, batasi pixel ratio |
| Unsur "game" mengalihkan fokus | Gamifikasi minimal: bintang penguasaan saja |
| Data hanya dari 1 informan | Wawancara informan kedua sebelum desain dikunci |

## 12. Pertanyaan Terbuka (untuk sesi interview)
1. ~~Cakupan materi MVP~~ → **Diskon** (diputuskan dari revisi instrumen, 11 Nov 2026).
2. Spesifikasi HP siswa: versi Android, RAM, layar.
3. Butuh dashboard guru/sinkronisasi online di fase 1?
4. Pendekatan teknologi: hybrid (Capacitor + web + Three.js) atau native Kotlin + WebView?
5. Desain penelitian: one-group pre-post atau kelompok kontrol?
6. Nama aplikasi final & identitas visual.
7. Distribusi: APK langsung (sideload), Google Play, atau keduanya?
