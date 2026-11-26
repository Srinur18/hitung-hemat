"""CORS & koneksi chat Teman Mikir (penyebab 'Failed to fetch')."""
import importlib

from fastapi.testclient import TestClient

from app import config
from app.main import app


def _preflight(c, origin):
    return c.options(
        "/api/v1/chat/turn",
        headers={"Origin": origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"},
    )


def test_semua_port_vite_localhost_diizinkan():
    with TestClient(app) as c:
        for origin in ("http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:5175"):
            r = _preflight(c, origin)
            assert r.status_code == 200, origin
            assert r.headers["access-control-allow-origin"] == origin


def test_origin_asing_tetap_ditolak():
    with TestClient(app) as c:
        r = _preflight(c, "http://evil.example.com")
        assert r.status_code == 400
        assert "access-control-allow-origin" not in r.headers
        r = _preflight(c, "http://localhost.evil.com:5174")
        assert r.status_code == 400


def test_origin_capacitor_tetap_diizinkan():
    with TestClient(app) as c:
        assert _preflight(c, "capacitor://localhost").status_code == 200
        assert _preflight(c, "https://localhost").status_code == 200


def test_origin_env_lama_tidak_mengalahkan_dotenv(tmp_path, monkeypatch):
    """HH_CORS_ORIGINS lama di terminal + origin baru di backend/.env → keduanya dipakai."""
    env = tmp_path / ".env"
    env.write_text("HH_CORS_ORIGINS=http://192.168.1.10:5174\n", encoding="utf-8")
    monkeypatch.setenv("HH_CORS_ORIGINS", "http://192.168.1.10:5173")
    monkeypatch.delenv("HH_SKIP_DOTENV", raising=False)
    monkeypatch.setattr(config, "BACKEND_DIR", tmp_path)
    try:
        values = config.load_dotenv(env)
        merged = config._origins(config.DEFAULT_CORS_ORIGINS, "http://192.168.1.10:5173", values["HH_CORS_ORIGINS"])
        assert "http://192.168.1.10:5173" in merged and "http://192.168.1.10:5174" in merged
        assert "http://localhost:5173" in merged
    finally:
        monkeypatch.setenv("HH_SKIP_DOTENV", "1")
        importlib.reload(config)


def test_regex_localhost_bisa_dimatikan(monkeypatch):
    monkeypatch.setenv("HH_CORS_ALLOW_LOCALHOST", "0")
    try:
        importlib.reload(config)
        assert config.CORS_ORIGIN_REGEX is None
    finally:
        monkeypatch.delenv("HH_CORS_ALLOW_LOCALHOST")
        importlib.reload(config)
        assert config.CORS_ORIGIN_REGEX


def test_chat_tanpa_key_memberi_cadangan_bukan_error():
    with TestClient(app) as c:
        r = c.post("/api/v1/chat/turn", json={"message": "Halo Plum", "history": []}, headers={"Origin": "http://localhost:5174"})
        assert r.status_code == 200
        assert r.json()["source"] == "fallback"
        assert r.headers["access-control-allow-origin"] == "http://localhost:5174"


def test_chat_riwayat_lebih_dari_20_ditolak_backend():
    """Batas backend: frontend wajib memangkas riwayat (data/chat.js trimHistory)."""
    hist = [{"role": "user" if i % 2 == 0 else "assistant", "content": f"pesan {i}"} for i in range(22)]
    with TestClient(app) as c:
        assert c.post("/api/v1/chat/turn", json={"message": "lagi", "history": hist}).status_code == 422
        assert c.post("/api/v1/chat/turn", json={"message": "lagi", "history": hist[-20:]}).status_code == 200


def _fake_gemini(monkeypatch, calls):
    from app.tutor import gemini

    def fake(system, user, **kw):
        calls.append(user)
        return "Halo, aku Plum."

    monkeypatch.setattr(config, "GEMINI_API_KEY", "kunci-uji")
    monkeypatch.setattr(config, "GEMINI_MODEL", "model-uji")
    monkeypatch.setattr(gemini, "generate", fake)


def test_chat_dibatasi_per_ip(monkeypatch):
    """Endpoint publik HTTPS: satu pengirim tidak boleh menghabiskan kuota Gemini."""
    from app.tutor.service import limiter

    calls = []
    _fake_gemini(monkeypatch, calls)
    monkeypatch.setattr(config, "CHAT_CLIENT_LIMIT", 2)
    limiter.reset()
    try:
        with TestClient(app) as c:
            r = [c.post("/api/v1/chat/turn", json={"message": f"tanya {i}", "history": []}).json() for i in range(3)]
        assert [x["source"] for x in r] == ["gemini", "gemini", "fallback"]
        assert "banyak bertanya" in r[2]["reply"]
        assert len(calls) == 2  # pesan ke-3 tidak sampai ke Gemini
    finally:
        limiter.reset()


def test_chat_ikut_kuota_harian_bersama(monkeypatch):
    from app.tutor.service import limiter

    calls = []
    _fake_gemini(monkeypatch, calls)
    monkeypatch.setattr(config, "TUTOR_DAILY_LIMIT", 1)
    limiter.reset()
    try:
        with TestClient(app) as c:
            a = c.post("/api/v1/chat/turn", json={"message": "satu", "history": []}).json()
            b = c.post("/api/v1/chat/turn", json={"message": "dua", "history": []}).json()
        assert a["source"] == "gemini" and b["source"] == "fallback"
        assert "istirahat" in b["reply"]
        assert len(calls) == 1
    finally:
        limiter.reset()
