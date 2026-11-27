# Backend HTTPS untuk APK (Teman Mikir dari HP)

APK HitungHemat memakai `androidScheme: "https"` (halaman aplikasi = `https://localhost`).
WebView Android memblokir panggilan dari halaman https ke backend `http://`, dan `127.0.0.1` di HP
berarti HP itu sendiri. Karena itu Teman Mikir di HP butuh **backend HTTPS yang bisa dijangkau lewat internet**.
Pengaturan keamanan Capacitor **tidak** diturunkan.

Tanpa backend HTTPS, APK tetap berjalan penuh secara offline (materi, latihan, tes, simulasi, petunjuk H1–H4);
halaman Teman Mikir hanya menampilkan pesan bahwa server belum diatur.

## Yang dipakai sekarang — Enzonic Deploy (gratis, tanpa kartu) ✅

Backend produksi: **https://hitunghemat-api.enzonic.dev** (paket Free, mode *serverless function*, Python 3.12).
Render tidak dipakai karena meminta kartu pembayaran.

| Perintah (dari folder APK) | Fungsi |
|---|---|
| `backend\.venv\Scripts\python scripts\deploy-enzonic.py check` | cek token & paket akun |
| `… deploy-enzonic.py deploy` | bungkus backend (ZIP), atur env, unggah, deploy, tampilkan log build |
| `… deploy-enzonic.py test` | uji HTTPS, CORS APK, chat & tutor ke Gemini, rumus LaTeX |
| `… deploy-enzonic.py logs` | log runtime terbaru |

- Token API Enzonic (scope *deploy*) disimpan di `%USERPROFILE%\.enzonic-token` (atau `.enzonic-token.txt`),
  di luar repo. Token tidak pernah dicetak.
- `GEMINI_API_KEY` dan `GEMINI_MODEL` diambil dari `backend/.env` dan disimpan di Enzonic sebagai variabel
  (*API key* bertanda **sensitive**). `HH_RESEARCH_TOKEN` dibuat acak sekali dan disimpan di
  `%USERPROFILE%\.hitunghemat-research-token` (untuk header `X-Research-Token` saat ekspor CSV).
- Paket ZIP dibuat oleh `scripts/package-backend.py` (`main.py` memasang aplikasi utuh di `/`;
  tanpa `.env`, `.db`, dan tes). Hasilnya di `backend/dist/` (diabaikan Git).
- Perilaku paket gratis: fungsi "dingin" setelah tidak dipakai → permintaan pertama ±10 detik
  (batas waktu chat aplikasi 60 detik). Kuota pembatas disimpan di memori tiap instance.
- **Data penelitian:** `HH_DATABASE_URL=sqlite:////tmp/hitunghemat.db` bersifat sementara (hilang saat
  instance diganti). Data di HP siswa tetap aman & bisa diekspor CSV. Paket Free Enzonic juga menyediakan
  database gratis; memakainya perlu driver baru (persetujuan pemilik produk, agents.md).

## Pilihan A — Render (butuh kartu; tidak dipakai)

Berkas yang sudah disiapkan: `render.yaml` (akar repo), `backend/Dockerfile`, `.dockerignore`.

1. Push repo ke GitHub (berkas `.env` sudah diabaikan Git — periksa dulu `git status`).
2. Di https://dashboard.render.com → **New → Blueprint** → pilih repo → Render membaca `render.yaml`.
3. Isi variabel bertanda *sync: false* di dasbor (JANGAN ditulis di repo/chat):
   - `GEMINI_API_KEY` — key dari Google AI Studio (tingkat gratis; jangan aktifkan billing).
   - `GEMINI_MODEL` — model yang tersedia untuk key Anda (cek di laptop: `.venv\Scripts\python -m app.tools.gemini_check`).
4. Deploy. Alamatnya menjadi `https://<nama-layanan>.onrender.com`. Uji di browser:
   `https://<nama-layanan>.onrender.com/api/v1/health` → `{"status":"ok"}`.
5. Token peneliti (`HH_RESEARCH_TOKEN`) dibuat otomatis; lihat nilainya di dasbor Render bila perlu ekspor CSV.

### Catatan paket gratis Render
- Server **tidur** setelah ±15 menit tanpa akses; pesan pertama butuh ±30–60 detik (batas waktu chat di aplikasi = 60 detik).
- **Tidak ada disk tetap**: database SQLite (event penelitian yang disinkronkan) **hilang saat server restart/deploy**.
  Data di HP siswa (Dexie) tetap aman dan bisa diekspor CSV dari Panel Peneliti, tetapi untuk penelitian sungguhan:
  - tambahkan *Persistent Disk* (berbayar) di `/srv/data`, atau
  - gunakan PostgreSQL: isi `HH_DATABASE_URL=postgresql+psycopg://…` dan tambahkan `psycopg[binary]` ke
    `backend/requirements.txt` (dependensi baru — perlu persetujuan sesuai agents.md).
  Keputusan ini perlu persetujuan pemilik produk sebelum pengumpulan data.

## Pilihan B — Cloudflare Tunnel dari laptop (uji cepat, tanpa hosting)

1. Jalankan backend di laptop: `cd backend && .venv\Scripts\uvicorn app.main:app --port 8000`.
2. Pasang `cloudflared`, lalu: `cloudflared tunnel --url http://localhost:8000`.
3. Pakai alamat `https://….trycloudflare.com` yang muncul sebagai `VITE_API_URL` (lihat di bawah).
4. Laptop harus tetap menyala; alamat berubah setiap kali tunnel dijalankan ulang → APK harus dibangun ulang.
5. Tambahkan alamat itu tidak perlu ke CORS: origin yang memanggil adalah aplikasi (`https://localhost`), bukan tunnel.

## Membangun APK dengan alamat backend

```bash
# Git Bash, dari folder APK
source ~/hh-tools/env.sh
VITE_API_URL=https://<nama-layanan>.onrender.com bash scripts/build-apk.sh
```

atau salin `frontend/.env.production.example` → `frontend/.env.production`, isi `VITE_API_URL`, lalu
`bash scripts/build-apk.sh`. Skrip **menolak** alamat `http://`, `localhost`, `127.*`, `10.*`, `192.168.*`
(tidak bisa dipakai dari HP) dan memeriksa bahwa bundle tidak lagi memuat `http://127.0.0.1:8000`.
Hasil: `release/HitungHemat-v<versi>-debug.apk`.

## Keamanan
- API key hanya di variabel lingkungan server (dasbor hosting atau `backend/.env` di laptop). Image Docker
  tidak memuat berkas `.env` (`.dockerignore`) dan menjalankan backend dengan `HH_SKIP_DOTENV=1`.
- CORS produksi: hanya `https://localhost` dan `capacitor://localhost` (+ origin pengembangan bawaan);
  `HH_CORS_ALLOW_LOCALHOST=0` mematikan izin semua port localhost.
- Kuota Gemini: `TUTOR_DAILY_LIMIT` (bersama untuk Teman Mikir di soal & chat bebas, bawaan 500/hari),
  `TUTOR_SESSION_LIMIT` (per sesi tutor), `CHAT_CLIENT_LIMIT` (chat bebas per IP per hari, bawaan 200).
  Kuota disimpan di memori server (reset saat restart).
- Chat bebas mengirim hingga 20 pesan riwayat ke Gemini (bukan identitas siswa). Kebijakan data tingkat gratis
  Gemini perlu dicantumkan dalam izin/informed consent penelitian.
