import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # folder APK/
BACKEND_DIR = ROOT / "backend"


def load_dotenv(path: Path) -> dict[str, str]:
    """Pemuat .env sederhana (tanpa dependensi). Variabel lingkungan yang sudah ada TIDAK ditimpa.

    Mengembalikan isi berkas (untuk HH_CORS_ORIGINS, yang digabung — lihat di bawah).
    Nilai tidak pernah dicetak. Uji otomatis mematikan pemuat ini lewat HH_SKIP_DOTENV=1
    agar tidak pernah memakai API key sungguhan.
    """
    if os.getenv("HH_SKIP_DOTENV") == "1" or not path.is_file():
        return {}
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        if not key:
            continue
        values[key] = value
        if key not in os.environ:
            os.environ[key] = value
    return values


DOTENV = load_dotenv(BACKEND_DIR / ".env")

SHARED_DIR = Path(os.getenv("HH_SHARED_DIR", ROOT / "shared"))
CONTENT_DIR = SHARED_DIR / "content"

DATABASE_URL = os.getenv("HH_DATABASE_URL", f"sqlite:///{(ROOT / 'backend' / 'hitunghemat.db').as_posix()}")

# Token untuk endpoint peneliti. WAJIB diganti di server sungguhan.
RESEARCH_TOKEN = os.getenv("HH_RESEARCH_TOKEN", "ganti-token-ini")

DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,https://localhost,capacitor://localhost,http://localhost"


def _origins(*raw: str | None) -> list[str]:
    out: list[str] = []
    for r in raw:
        for o in (r or "").split(","):
            o = o.strip().rstrip("/")
            if o and o not in out:
                out.append(o)
    return out


# Origin yang diizinkan = bawaan ∪ variabel lingkungan proses ∪ backend/.env.
# Digabung (bukan saling menimpa) agar HH_CORS_ORIGINS lama yang tertinggal di terminal
# ($env:HH_CORS_ORIGINS) tidak lagi membuat origin di backend/.env diabaikan diam-diam.
# Penggabungan hanya MENAMBAH origin, tidak pernah menghapus.
CORS_ORIGINS = _origins(DEFAULT_CORS_ORIGINS, os.getenv("HH_CORS_ORIGINS"), DOTENV.get("HH_CORS_ORIGINS"))

# Mode pengembangan: semua port di localhost/127.0.0.1 diizinkan (Vite bisa pindah ke 5174, 5175, …).
# Matikan untuk server produksi dengan HH_CORS_ALLOW_LOCALHOST=0.
CORS_ALLOW_LOCALHOST = os.getenv("HH_CORS_ALLOW_LOCALHOST", "1") != "0"
CORS_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$" if CORS_ALLOW_LOCALHOST else None

MAX_EVENTS_PER_REQUEST = 500


def _int_env(name: str, default: int) -> int:
    try:
        return max(0, int(os.getenv(name, default)))
    except ValueError:
        return default


# ---------- Teman Mikir (Gemini) ----------
# Dibaca dari backend/.env. Kunci tidak pernah dikirim ke frontend dan tidak pernah dicatat di log.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "").strip()
GEMINI_TIMEOUT = float(os.getenv("GEMINI_TIMEOUT", "8") or 8)
TUTOR_DAILY_LIMIT = _int_env("TUTOR_DAILY_LIMIT", 500)  # panggilan Gemini per hari (seluruh server)
TUTOR_SESSION_LIMIT = _int_env("TUTOR_SESSION_LIMIT", 40)  # giliran Teman Mikir per sesi aplikasi
# Chat bebas: batas pesan per alamat IP per hari (satu sekolah sering berbagi satu IP → dibuat longgar).
CHAT_CLIENT_LIMIT = _int_env("CHAT_CLIENT_LIMIT", 200)
