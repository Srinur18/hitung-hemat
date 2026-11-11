from fastapi.testclient import TestClient

from app.main import app

TOKEN = {"X-Research-Token": "token-uji"}


def _ev(i, **kw):
    base = {
        "client_id": f"c{i}", "student_code": "S01", "session_id": "sess1",
        "ts": f"2026-11-11T08:00:{i:02d}Z", "type": "answer_submit",
        "payload": {"correct": True},
    }
    base.update(kw)
    return base


def test_health_dan_konten():
    with TestClient(app) as c:
        assert c.get("/api/v1/health").json() == {"status": "ok"}
        assert len(c.get("/api/v1/content/version").json()["version"]) == 12
        cur = c.get("/api/v1/content/curriculum").json()
        assert {m["id"] for m in cur["modules"]} >= {"M1", "M3", "M5", "M7"}
        assert c.get("/api/v1/content/rahasia").status_code == 404


def test_preview_soal_deterministik():
    with TestClient(app) as c:
        a = c.get("/api/v1/problems/m5-t1?seed=9").json()
        b = c.get("/api/v1/problems/m5-t1?seed=9").json()
        assert a == b
        assert a["vars"]["eff"] < a["vars"]["sum"]
        assert c.get("/api/v1/problems/tidak-ada").status_code == 404


def test_sync_dedup():
    with TestClient(app) as c:
        r = c.post("/api/v1/sync/events", json={"events": [_ev(1), _ev(2)]}).json()
        assert r == {"accepted": 2, "duplicates": 0}
        r = c.post("/api/v1/sync/events", json={"events": [_ev(2), _ev(3)]}).json()
        assert r == {"accepted": 1, "duplicates": 1}


def test_sync_menolak_data_tidak_sah():
    with TestClient(app) as c:
        bad = _ev(9, student_code="Nama Lengkap Siswa!")
        assert c.post("/api/v1/sync/events", json={"events": [bad]}).status_code == 422
        bad = _ev(9, type="hapus_semua")
        assert c.post("/api/v1/sync/events", json={"events": [bad]}).status_code == 422


def test_endpoint_peneliti_butuh_token():
    with TestClient(app) as c:
        assert c.get("/api/v1/research/summary").status_code == 401
        assert c.get("/api/v1/research/export.csv", headers={"X-Research-Token": "salah"}).status_code == 401
        s = c.get("/api/v1/research/summary", headers=TOKEN).json()
        assert "class" in s
        csv = c.get("/api/v1/research/export.csv", headers=TOKEN)
        assert csv.status_code == 200
        assert csv.text.startswith("student_code,")
