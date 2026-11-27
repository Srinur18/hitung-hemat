"""Bungkus backend menjadi ZIP mandiri untuk hosting Python (Enzonic Deploy, dsb.).

    backend\\.venv\\Scripts\\python scripts\\package-backend.py [keluaran.zip]

Isi ZIP (akar = akar aplikasi di hosting):
    main.py            -> `from app.main import app` (pola entri FastAPI yang dikenali detektor)
    requirements.txt   -> dependensi runtime saja (tanpa pytest)
    backend/app/...    -> kode backend
    shared/content/... -> konten bersama (config.py mencarinya di ../../shared dari backend/app)

TIDAK ikut: .env (rahasia), *.db (data), tes, __pycache__, .venv.
Rahasia (GEMINI_API_KEY) diatur sebagai variabel lingkungan di hosting, bukan di berkas.
"""
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "backend" / "dist" / "hitunghemat-backend.zip"
SKIP = re.compile(r"(__pycache__|\.pyc$|\.env|\.db$|/tests/)")

MAIN = '''"""Entri hosting: aplikasi FastAPI HitungHemat (kode ada di backend/app)."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
os.environ.setdefault("HH_SKIP_DOTENV", "1")  # di hosting, rahasia datang dari variabel lingkungan

from fastapi import FastAPI  # noqa: E402

from app.main import app as hitunghemat  # noqa: E402

# Detektor hosting mencari `app = FastAPI()`. Aplikasi HitungHemat dipasang utuh di "/",
# sehingga semua endpoint, CORS, dan pembatas tetap sama persis.
app = FastAPI(title="HitungHemat API (hosting)", docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/", hitunghemat)

if __name__ == "__main__":  # mode server: jalankan langsung
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")), proxy_headers=True, forwarded_allow_ips="*")
'''


def runtime_requirements() -> str:
    lines = (ROOT / "backend" / "requirements.txt").read_text(encoding="utf-8").splitlines()
    keep = [l for l in lines if l.strip() and not l.lstrip().startswith("#") and not re.match(r"\s*pytest", l)]
    return "\n".join(keep) + "\n"


def main() -> int:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    files = 0
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("main.py", MAIN)
        z.writestr("requirements.txt", runtime_requirements())
        for base in (ROOT / "backend" / "app", ROOT / "shared" / "content"):
            for p in sorted(base.rglob("*")):
                rel = p.relative_to(ROOT).as_posix()
                if p.is_file() and not SKIP.search("/" + rel):
                    z.write(p, rel)
                    files += 1
    names = zipfile.ZipFile(OUT).namelist()
    bad = [n for n in names if SKIP.search("/" + n)]
    if bad:
        print("GAGAL: berkas terlarang ikut:", bad)
        return 1
    print(f"OK: {OUT} ({OUT.stat().st_size // 1024} KB, {files + 2} berkas, tanpa .env/.db/tes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
