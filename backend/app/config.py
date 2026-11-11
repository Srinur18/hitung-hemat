import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # folder APK/
SHARED_DIR = Path(os.getenv("HH_SHARED_DIR", ROOT / "shared"))
CONTENT_DIR = SHARED_DIR / "content"

DATABASE_URL = os.getenv("HH_DATABASE_URL", f"sqlite:///{(ROOT / 'backend' / 'hitunghemat.db').as_posix()}")

# Token untuk endpoint peneliti. WAJIB diganti di server sungguhan.
RESEARCH_TOKEN = os.getenv("HH_RESEARCH_TOKEN", "ganti-token-ini")

CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "HH_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,https://localhost,capacitor://localhost,http://localhost",
    ).split(",")
    if o.strip()
]

MAX_EVENTS_PER_REQUEST = 500
