# Desain — HitungHemat

Dokumen ini menerjemahkan temuan wawancara dan Cognitive Load Theory menjadi keputusan antarmuka. Setiap keputusan bisa dilacak ke kode wawancara (IL/EL/GL/DS).

## 1. Prinsip Desain

| Prinsip CLT | Penerapan | Kode |
|---|---|---|
| **Segmentasi** | Satu langkah per layar, dengan label "Langkah 1 dari 3" | IL02, DS03 |
| **Signaling** | Angka penting diberi warna, ikon, dan garis bawah | EL05 |
| **Kedekatan spasial (anti split-attention)** | Rumus menempel di bawah soal (FormulaDock); label angka 3D menempel pada objeknya | EL02 |
| **Koherensi** | Tanpa dekorasi, maskot, atau latar bergambar | EL03, DS03 |
| **Kendali pelajar (anti transient)** | Penjelasan per langkah dengan tombol ◀ ⏸ ▶ ↻ | EL04 |
| **Worked example → fading** | Contoh selesai → melengkapi → mandiri → transfer | GL03 |
| **Pre-training** | Kartu istilah & cek kesiapan sebelum masuk materi | IL03, EL01 |
| **Konkret → abstrak** | Struk nyata & angka kecil dulu, baru notasi persen | GL01 |
| **Self-explanation** | Jelaskan ke Teman (mengurutkan kartu langkah) | GL04 |
| **Variabilitas** | Konteks berganti (baju, HP, beras), struktur tetap | GL05 |

## 2. Token Warna

Warna semantik **hanya** dipakai untuk peran besaran. Warna lain bersifat netral.

> **Tema aktif: "PLUM ARCADE WORLD — Cute 3D Neon Purple"** (pemilik produk, 14 Nov 2026, menggantikan Candy Shop di bawah).
> Latar `#160D25`/`#24123B`, kartu `#2E1A45`, neon ungu `#8B5CF6`, pink `#F472B6`, cyan `#22D3EE`, lavender `#C084FC`, teks `#F8EEFF`/`#D8C4E8`.
> Penyesuaian kontras: tombol utama diisi `#7C3AED` (teks terang 5,1:1; `#8B5CF6` hanya 3,8:1) dengan cahaya `#8B5CF6`. Teks di atas tombol pink/cyan/lavender/emas memakai `#160D25`.
> Angka berperan di atas kartu gelap: harga awal `#C084FC`, persen `#FCD34D`, potongan `#FB7185`, harga akhir `#4ADE80` (semua ≥ 5,8:1, dijaga `tests/theme.test.js`).
> Maskot utama: **Kucing Plum** (`ui/Mascot.jsx`, SVG bergradien 3D, celemek pink, keranjang mini); Kiko tetap tersedia sebagai `KikoFox`.
> Latar: `ui/Decor.jsx` (mesin arcade neon, lampu pink/cyan, grid neon, partikel). Mesin, partikel, dan grid disembunyikan saat mengerjakan soal. Variasi latar per halaman lewat `.page[data-bg]`.
> Token lama (`--coral`, `--white`, ...) dipertahankan sebagai alias ke palet arcade agar semua komponen ikut berubah.

**Tema "Playful Pastel Candy Shop"** (pemilik produk, 14 Nov 2026, digantikan Plum Arcade) menggantikan tema "Vibe". Semua warna didefinisikan **satu kali** di `:root` (`frontend/src/styles.css`). Tidak ada warna hex di luar blok itu (dijaga `tests/theme.test.js`). Palet ilustrasi SVG (`ui/ShopArt.jsx`, `ui/Decor.jsx`, `ui/Mascot.jsx`) memakai nilai hex yang sama. Mode gelap dinonaktifkan.

| Token palet | Nilai | Peran |
|---|---|---|
| `--coral` | `#FF7F87` pink coral | Warna utama: header, tombol utama, opsi terpilih, tab aktif |
| `--butter` | `#FFD66B` butter yellow | Sekunder: label diskon, tombol angka, kotak rumus, lencana |
| `--mint` | `#8DDCC0` mint green | Pendukung: harga akhir/penghematan, batang progres, keranjang |
| `--lavender` | `#BBA5E8` lavender | Variasi: garis kartu soal, petunjuk, profil, Kuis/Tes |
| `--cream` | `#FFF8ED` warm cream | Latar halaman |
| `--white` | `#FFFFFF` | Kartu (semua angka berwarna diletakkan di sini) |
| `--cocoa` | `#493A40` dark cocoa | Teks utama (10,5:1 di krem) |
| `--muted-brown` | `#82747A` muted brown | Teks sekunder besar & tombol nonaktif |
| `--success` / `--error` | `#66BE91` / `#F17D7D` | Garis & latar lembut jawaban benar / salah |
| `-soft` / `-deep` | turunan tiap warna | latar lembut / bayangan tombol |

**Penyesuaian kontras** (aturan "kontras nyaman dibaca"):

| Token | Nilai | Alasan |
|---|---|---|
| `--c-on-color` | `#3A2D33` | Teks di atas coral/butter/mint/lavender. Putih di atas coral hanya ±2,5:1, cocoa gelap ≥ 5,4:1 |
| `--c-muted` | `#75676D` | Teks kecil sekunder. `#82747A` di krem ±4,2:1 (< 4,5), versi ini ±5,1:1 |
| `--c-price` | `#6A4FB3` (lavender tua) | Harga awal: ikon 🏷 + garis bawah tebal; 6,2:1 di atas putih |
| `--c-percent` | `#9A6200` (butter tua) | Persen diskon: ikon % + garis bawah putus-putus; 5,1:1 |
| `--c-discount` | `#C2454A` (merah lembut tua) | Besar diskon: garis bawah titik-titik; 4,9:1 |
| `--c-result` | `#277A56` (mint tua) | Harga akhir: kotak; 5,3:1 |

**Aturan:** warna pastel dipakai untuk latar, garis, label, dan bayangan. **Teks** selalu cocoa/`--c-on-color` atau versi tua palet. Angka berperan **hanya** tampil di atas putih. Bentuk penanda (garis tebal, putus-putus, titik-titik, kotak) tetap ada, sehingga peran angka tidak bergantung pada warna saja (ramah buta warna).

### 2.1 Hiasan Latar & Maskot (permintaan pemilik produk, 11 Nov 2026)

Pemilik produk meminta tampilan yang lebih ramai dan lucu, dengan referensi UI permainan anak dan karakter rubah. Ini **sengaja menyeimbangkan** daya tarik (motivasi, DS01 "bikin kayak game") dengan temuan EL03/DS03 (hiasan mengganggu fokus):

| Layar | Hiasan | Alasan |
|---|---|---|
| Pembuka, tes (pengantar), peta belajar, ringkasan modul | **Penuh**: matahari, awan, bukit, pohon, semak berbunga, benda melayang (label %, koin Rp, bintang) | Tidak ada tugas hitung; tujuannya motivasi |
| Contoh, eksplorasi struk, jelaskan ke teman | Penuh, tetapi semua isi berada di kartu putih | Beban rendah; siswa tidak sedang menghitung sendiri |
| **Mengerjakan soal** (lengkapi/latihan/tantangan) | **Tenang**: hanya matahari & satu awan, diredupkan; bukit, pohon, semak, dan benda melayang **disembunyikan** | Menjaga beban ekstrinsik rendah saat memori kerja paling sibuk |

- Hiasan memakai tema materi (label %, koin Rp) dan palet yang sama. Hiasan berada di belakang konten, tidak bisa diketuk, dan disembunyikan dari pembaca layar.
- **Kiko si Rubah**: maskot **orisinal**, digambar sebagai SVG (bukan salinan maskot merek lain). Rubah berkacamata ungu, kaus pink berlengan kuning dengan logo label harga %, dan sepatu pink. Ekspresinya ada tiga: melambai, bersorak, dan berpikir.
- Peran Kiko adalah **agen pedagogis**, bukan dekorasi: ia menyapa, menyampaikan instruksi, memberi umpan balik benar/salah (ikon kecil 44px di kotak umpan balik), dan "memberi" petunjuk.
- Animasi (Kiko bergoyang, benda melayang) mati otomatis bila pengguna memilih *kurangi gerakan*.
- **Teks soal menempel di atas layar** saat menggulir, sehingga angka soal selalu terlihat ketika siswa mengetik jawaban (EL02, split-attention).
- Font bulat dibundel offline: **Fredoka** (judul, tombol, angka) dan **Nunito** (isi).

### 2.2 Dunia Toko "Jalan Ruko Hemat" (permintaan pemilik produk, 14 Nov 2026, v0.3)

Pemilik produk meminta tema belajar lewat pengalaman berbelanja di ruko, dengan karakter kartun dan animasi ringan.

| Layar | Isi | Batas CLT yang tetap dijaga |
|---|---|---|
| **Beranda** | Judul HITUNGHEMAT, slogan, ilustrasi 3 ruko (pintu membuka, pelanggan melambai, koin & bintang), 5 menu: Mulai Belajar, Materi, Simulasi Belanja, Kuis/Tes, Profil | Tidak ada tugas hitung. Label ruko memuat persen diskon (P3). |
| **Mulai Belajar** | Identitas → sapaan "Halo, [nama]!" → perjalanan 6 tahap (gerbang, toko baju, alat sekolah, kasir, bandingkan 2 toko, garis finis) | Satu tahap per layar, maju/mundur manual (P7). Kamera bergeser hanya saat siswa menekan Lanjutkan. Rumus di layar yang sama (P5). |
| **Simulasi Belanja** | Rak barang + kasir yang bertanya harga akhir (3 pilihan: benar, MC1, "persen dibaca rupiah") + struk keranjang | Umpan balik spesifik miskonsepsi (P13). Angka dari `domain/shop.js`. |
| **Profil** | Avatar, nama, kelas, kode, nilai tes & kemajuan | — |
| Mengerjakan soal | Tetap **tenang** (§2.1) | Tidak berubah |

- **Karakter orisinal** (SVG, `ui/ShopArt.jsx`): kelinci pelanggan, kucing kasir bertopi, beruang pemilik toko berapron, penguin pelanggan. Kiko si Rubah tetap menjadi agen pedagogis.
- **Ikon**: satu set garis bulat 24px (`ui/Icon.jsx`). Setiap halaman punya tombol **Beranda** (🏠) di header.
- **Animasi** hanya CSS, berhenti bila *kurangi gerakan* aktif. Tidak ada animasi yang memindah tahap otomatis.
- **Privasi**: *nama* dan *kelas* hanya disimpan di perangkat (profil lokal) untuk sapaan dan Profil. Keduanya **tidak** masuk event penelitian, CSV, atau server. Penelitian tetap memakai `studentCode`. Bila kode dikosongkan, aplikasi membuat kode anonim `HHxxxx`.
- Laptop (≥ 960px): beranda dua kolom (ilustrasi kiri, menu kanan).

### 2.3 Materi, Simulasi, Profil, Suara (permintaan pemilik produk, 14 Nov 2026, v0.4)

- **Materi**: 5 bab berisi kartu (satu kartu per layar, ≤ 40 kata). Persen **selalu** diubah ke desimal sebelum dikalikan harga. Ada fitur **Rangkuman Rumus** (3 rumus, simbol, contoh) dan **Kamus Istilah** (dapat dicari). Bab yang sudah dibaca sampai kartu terakhir ditandai ✓.
- **Simulasi Belanja**: kategori barang, rincian otomatis *Harga Awal → Potongan → Harga Akhir*, keranjang (tambah, hapus, total diperbarui), bayar, lalu **struk digital**. Tantangan Kasir (v0.3) tetap ada sebagai pilihan.
- **Profil**: progres (cincin %), pencapaian, 9 lencana, nilai & riwayat, aspirasi/refleksi, pengaturan suara.
- **Animasi**: transisi halaman 0,28 dtk, barang muncul bergantian, pintu toko membuka sekali, bintang memancar saat benar, Kiko berpikir/bergoyang saat salah, hadiah lencana. Semua berbasis `transform/opacity` dan mati pada *kurangi gerakan*.
- **Suara** (`ui/audio.js`), keputusan terhadap P12:
  - Efek suara disintesis Web Audio (tanpa berkas, bebas lisensi). Bunyi **hanya sebagai respons ketukan siswa**, volume 35%, dan bisa dimatikan (🔊 di beranda, atau di Profil).
  - **Musik latar mati bawaan**. Musik hanya menyala bila siswa menyalakannya (🎵) dan **dijeda otomatis saat mengerjakan soal**.
  - Tidak ada suara sebelum interaksi pertama (aturan peramban).
  - Selama Tes Literasi tidak ada bunyi benar/salah, sehingga tes tidak membocorkan kunci.
  - Berkas suara asli dapat dipasang kapan saja: `registerSound('correct', 'sounds/benar.mp3')`.
- **Privasi**: aspirasi/refleksi hanya disimpan di perangkat (profil lokal), tidak masuk event/CSV/server.

## 3. Tipografi & Ukuran

| Elemen | Ukuran | Bobot |
|---|---|---|
| Angka utama (jawaban, harga) | 32sp | 700, angka tabular |
| Judul langkah | 20sp | 600 |
| Teks isi | 16sp | 400 |
| Label kecil | 14sp | 500 |

- Fon: **Inter** atau **Plus Jakarta Sans** (dibundel, tidak dimuat online).
- Format Rupiah: `Rp120.000` (titik ribuan, tanpa desimal).
- Target sentuh ≥ 48dp. Margin samping 16dp.

## 4. Tata Letak Layar Soal (pola baku)

```
┌───────────────────────────────┐
│ ← M3 Harga Akhir   Langkah 1/2│  ← header tipis
├───────────────────────────────┤
│ Baju 🏷[Rp120.000] diskon     │  ← soal (≤ 40 kata)
│ %[25%]. Berapa yang dibayar?  │     angka berwarna
├───────────────────────────────┤
│   [ ilustrasi 3D / 2D ]       │  ← opsional, maks 40% tinggi
├───────────────────────────────┤
│ Langkah 1: Cari besar diskon  │
│ ✂ Diskon = Rp [ ______ ]      │  ← satu input
├───────────────────────────────┤
│ ▸ Rumus: diskon = % × harga   │  ← FormulaDock (bisa dilipat)
├───────────────────────────────┤
│ [💡 Petunjuk]      [Periksa ▶]│  ← maks 3 aksi
│  NumberPad 1 2 3 … 000 ⌫      │
└───────────────────────────────┘
```

**Diagram Kotak (FR-21, DS01):** tepat di bawah header, tampilkan
`[🏷 Harga Awal] − [✂ Diskon] = [✓ Harga Akhir]` dengan warna token. Kotak yang belum diketahui berisi "?" dan terisi saat langkahnya selesai. Pada soal M6 kotak yang "?" berpindah posisi, sehingga siswa melihat besaran mana yang dicari.

Aturan: memakai NumberPad buatan sendiri (tanpa keyboard sistem) supaya tata letak tidak bergeser, dengan tombol `000` untuk mempercepat input angka ribuan.

## 5. Daftar Layar

| ID | Layar | Catatan |
|---|---|---|
| SC01 | Selamat Datang + Kode Siswa | Satu input, satu tombol |
| SC02 | Persetujuan (siswa & ortu/guru) | Bahasa sederhana |
| SC03 | Pre-test | Tanpa umpan balik benar/salah |
| SC04 | Cek Kesiapan (M0) | 6–8 butir; hasil → jalur |
| SC05 | Peta Belajar | Daftar vertikal M0–M7, bintang 0–3, terkunci berurutan |
| SC06 | Contoh Terselesaikan | StepPlayer ◀ ⏸ ▶ ↻, satu langkah tampil per ketukan |
| SC07 | Soal (Lengkapi/Mandiri/Transfer) | Pola §4 |
| SC08 | Mode Tandai | Siswa mengetuk angka di soal → memberi label "harga/persen" |
| SC09 | Cek Kewajaran | "Harga akhir Rp90.000 < Rp120.000? ✓ Masuk akal" |
| SC10 | Jelaskan ke Teman | Seret 3–4 kartu langkah ke urutan benar + pilih alasan |
| SC11 | Simulasi Struk | Struk 2D + slider persen; angka berubah langsung |
| SC12 | Skala Usaha Mental | 9 titik, satu pertanyaan |
| SC13 | Ringkasan Modul | Bintang + 1 kalimat apa yang dikuasai |
| SC14 | Post-test | Sama dengan SC03 |
| SC15 | Panel Peneliti (PIN) | Ekspor CSV |

## 6. Sistem Petunjuk (UI)

```
salah ke-1 ──► umpan balik miskonsepsi (inline, merah lembut)
salah ke-2 ──► HintSheet muncul dari bawah: "Mau petunjuk?" [Ya] [Coba lagi]
                 H1 pertanyaan pemantik   "Apa yang dicari dulu?"
                 H2 urutan langkah        "Langkah 1: cari besar diskon"
                 H3 langkah sebagian      "Diskon = 25/100 × 120.000 = ___"
                 H4 contoh serupa         (soal lain, terselesaikan)
```

- Petunjuk dibuka satu tingkat setiap kali; siswa bisa berhenti kapan saja.
- **Tidak ada** tombol "Lihat Jawaban".

## 7. Ilustrasi 3D (Three.js)

**Aturan:** 3D dipakai hanya bila dimensi ruang membantu makna. Gaya low-poly, warna polos dari token, latar polos, tanpa bayangan berat, kamera tetap (orbit terbatas ±25°).

| Scene | Konsep | Interaksi | Modul | Kode |
|---|---|---|---|---|
| **PriceTagScene** | Harga awal → diskon → harga akhir | Ketuk tag harga → label Rp turun bertahap, potongan "terlepas" dari tag | M1–M3 | DS01 |
| **HundredCubesScene** | Persen = bagian dari 100 | Slider persen → kubus berwarna `--c-discount` terangkat; mendukung 12,5% (kubus terbelah) | M2, M4 | IL01 |
| **StackedDiscountScene** | 50% lalu 20% dari **sisa** | Langkah 1: separuh balok hilang; Langkah 2: 20% dari sisa hilang; label "tersisa 40%, diskon total 60%" | M5 | IL05 |
| **BarModelScene** | Soal terbalik | Batang 100% dibagi segmen; segmen sisa diberi nilai harga akhir; siswa menarik untuk "menemukan 100%" | M6 | K03 |
| **CompareStoresScene** | Bandingkan dua toko | Dua kolom harga akhir berdiri berdampingan; tinggi = harga | M7 | IL04 |

Setiap scene punya versi **2D SVG** dengan informasi yang sama. Label angka memakai HTML overlay, bukan tekstur.

## 8. Penulisan (Copywriting)

- Sapaan "kamu", nada ramah dan tidak menghakimi.
- Kalimat ≤ 15 kata. Satu ide per kalimat.
- Istilah baku dalam aplikasi: **harga awal, persen diskon, besar diskon, harga akhir**. Sinonim (rabat, potongan harga, potongan kotor, bandrol, harga bersih) hanya muncul di Kartu Istilah.
- Contoh umpan balik MC1: *"Itu besar diskonnya. Yang ditanya harga yang dibayar. Satu langkah lagi!"*
- Soal cerita level awal: tanpa informasi pengecoh. Pengecoh (hari, nama toko) baru ditambahkan di level transfer untuk melatih kemampuan *formulate*.

## 9. Checklist CLT per Layar

- [ ] Hanya satu langkah/tugas kognitif di layar ini.
- [ ] ≤ 3 aksi utama.
- [ ] Teks ≤ 40 kata; kalimat ≤ 15 kata.
- [ ] Angka penting memakai token warna + ikon.
- [ ] Rumus/petunjuk yang dibutuhkan ada di layar yang sama.
- [ ] Tidak ada elemen dekoratif.
- [ ] Animasi bisa dijeda/diulang; tidak ada auto-advance.
- [ ] Terbaca di 360×740 tanpa gulir horizontal.
- [ ] Tetap bermakna dalam mode buta warna (cek dengan simulator deuteranopia).

## 10. Aksesibilitas

- Label aksesibilitas untuk semua kontrol (TalkBack).
- Mode gelap mengikuti sistem.
- Opsi "Kurangi gerakan" mematikan animasi 3D (beralih ke 2D statis).
- Ukuran fon mengikuti pengaturan sistem hingga 130% tanpa merusak tata letak.
