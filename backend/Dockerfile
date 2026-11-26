# Backend HitungHemat (FastAPI) untuk hosting HTTPS (Render, Railway, Fly.io, dsb.).
# Bangun dari folder APK (konteks = akar repo, karena butuh shared/content):
#   docker build -f backend/Dockerfile -t hitunghemat-api .
# Rahasia (GEMINI_API_KEY, HH_RESEARCH_TOKEN) diisi sebagai variabel lingkungan di platform hosting,
# BUKAN lewat berkas .env (berkas .env tidak ikut ke image — lihat .dockerignore).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HH_SKIP_DOTENV=1 \
    PORT=8000

WORKDIR /srv
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# config.py mencari shared/ di dua tingkat di atas backend/app → /srv/shared
COPY shared/ shared/
COPY backend/app/ backend/app/

RUN useradd --create-home app && mkdir -p /srv/data && chown -R app /srv
USER app
WORKDIR /srv/backend

EXPOSE 8000
# --proxy-headers: IP asli pengguna dibaca dari proxy HTTPS (dipakai untuk kuota chat per IP).
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
