"""Deploy backend HitungHemat ke Enzonic Deploy (gratis, tanpa kartu) lewat REST API resmi.

    backend\\.venv\\Scripts\\python scripts\\deploy-enzonic.py check    # token & paket akun
    backend\\.venv\\Scripts\\python scripts\\deploy-enzonic.py detect   # framework/mode yang akan dipakai
    backend\\.venv\\Scripts\\python scripts\\deploy-enzonic.py deploy   # buat/pakai proyek, env, unggah, deploy
    backend\\.venv\\Scripts\\python scripts\\deploy-enzonic.py logs     # log runtime terbaru
    backend\\.venv\\Scripts\\python scripts\\deploy-enzonic.py test [URL]  # uji health, chat, tutor, CORS

Token API (Console → Account → API tokens, scope deploy) dibaca dari berkas %USERPROFILE%\\.enzonic-token
atau variabel ENZONIC_TOKEN. Token, GEMINI_API_KEY, dan token peneliti TIDAK PERNAH dicetak.
GEMINI_API_KEY/GEMINI_MODEL diambil dari backend/.env dan disimpan di Enzonic sebagai variabel *sensitive*.
"""
import io
import json
import os
import secrets
import subprocess
import sys
import time
import zipfile
from pathlib import Path

import httpx

# Log build memuat karakter seperti "│"; konsol Windows (cp1252) gagal mencetaknya saat output di-pipe.
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

ROOT = Path(__file__).resolve().parents[1]
API = "https://panel.enzonic.com/api/cloud"
PROJECT = os.getenv("ENZONIC_PROJECT", "hitunghemat-api")
WEB_PROJECT = os.getenv("ENZONIC_WEB_PROJECT", "hitunghemat")
WEB_ORIGIN = f"https://{WEB_PROJECT}.enzonic.dev"  # versi web untuk dicek di browser
HOME = Path.home()
TOKEN_FILE = HOME / ".enzonic-token"
RESEARCH_TOKEN_FILE = HOME / ".hitunghemat-research-token"
ZIP = ROOT / "backend" / "dist" / "hitunghemat-backend.zip"
STATE = ROOT / "backend" / "dist" / "enzonic.json"  # id proyek & URL (bukan rahasia)


def token() -> str:
    # Notepad sering menambahkan .txt → terima keduanya. utf-8-sig membuang BOM bila ada.
    f = next((p for p in (TOKEN_FILE, TOKEN_FILE.with_name(TOKEN_FILE.name + ".txt")) if p.is_file()), None)
    t = os.getenv("ENZONIC_TOKEN") or (f.read_text(encoding="utf-8-sig").strip() if f else "")
    if not t:
        sys.exit(f"Token Enzonic belum ada. Simpan token (satu baris) di {TOKEN_FILE}")
    return t


def client() -> httpx.Client:
    return httpx.Client(base_url=API, headers={"Authorization": f"Bearer {token()}"}, timeout=60)


def call(c: httpx.Client, method: str, path: str, **kw):
    r = c.request(method, path, **kw)
    if r.status_code >= 400:
        try:
            err = r.json().get("error", {})
        except ValueError:
            err = {"code": "http", "message": r.text[:300]}
        sys.exit(f"GAGAL {method} {path}: HTTP {r.status_code} {err.get('code')}: {err.get('message')} {err.get('fields') or ''}")
    return r.json() if r.content else {}


def dotenv(path: Path) -> dict:
    out = {}
    if path.is_file():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def package() -> None:
    subprocess.run([sys.executable, str(ROOT / "scripts" / "package-backend.py"), str(ZIP)], check=True)


def zip_listing() -> tuple[list[str], dict]:
    z = zipfile.ZipFile(ZIP)
    names = [n for n in z.namelist() if not n.endswith("/")]
    contents = {n: z.read(n).decode("utf-8") for n in ("requirements.txt", "main.py")}
    return names, contents


def cmd_check() -> None:
    with client() as c:
        me = call(c, "GET", "/v1/me")
    plan = {k: me.get(k) for k in ("plan", "plans", "subscriptions", "usage") if k in me}
    print("Token OK. Ringkasan akun (tanpa data pribadi):")
    print(json.dumps(plan, indent=1, ensure_ascii=False)[:1500] or "(tidak ada info paket)")


def cmd_detect() -> dict:
    package()
    files, contents = zip_listing()
    with client() as c:
        d = call(c, "POST", "/v1/detect", json={"files": files, "contents": contents})
    keys = ("framework", "mode", "runtime", "supported", "confidence", "install_command", "build_command", "reasons", "notes")
    print(json.dumps({k: d.get(k) for k in keys}, indent=1, ensure_ascii=False))
    return d


def find_project(c) -> dict | None:
    if STATE.is_file():
        pid = json.loads(STATE.read_text())["id"]
        r = c.get(f"/v1/projects/{pid}")
        if r.status_code == 200:
            return r.json()
    for p in call(c, "GET", "/v1/projects", params={"q": PROJECT}).get("data", []):
        if p.get("name") == PROJECT:
            return p
    return None


def env_vars() -> list[dict]:
    local = dotenv(ROOT / "backend" / ".env")
    if not local.get("GEMINI_API_KEY") or not local.get("GEMINI_MODEL"):
        sys.exit("GEMINI_API_KEY/GEMINI_MODEL kosong di backend/.env")
    if not RESEARCH_TOKEN_FILE.is_file():
        RESEARCH_TOKEN_FILE.write_text(secrets.token_urlsafe(24), encoding="utf-8")
    research = RESEARCH_TOKEN_FILE.read_text(encoding="utf-8").strip()
    plain = {
        "GEMINI_MODEL": local["GEMINI_MODEL"],
        "HH_CORS_ORIGINS": f"https://localhost,capacitor://localhost,{WEB_ORIGIN}",
        "HH_CORS_ALLOW_LOCALHOST": "0",
        "HH_SKIP_DOTENV": "1",
        "HH_DATABASE_URL": "sqlite:////tmp/hitunghemat.db",
        "TUTOR_DAILY_LIMIT": local.get("TUTOR_DAILY_LIMIT", "500"),
        "TUTOR_SESSION_LIMIT": local.get("TUTOR_SESSION_LIMIT", "40"),
        "CHAT_CLIENT_LIMIT": local.get("CHAT_CLIENT_LIMIT", "200"),
        "GEMINI_TIMEOUT": local.get("GEMINI_TIMEOUT", "8"),
    }
    out = [{"key": k, "value": v, "sensitive": False} for k, v in plain.items()]
    out += [{"key": "GEMINI_API_KEY", "value": local["GEMINI_API_KEY"], "sensitive": True},
            {"key": "HH_RESEARCH_TOKEN", "value": research, "sensitive": True}]
    return out


def cmd_deploy() -> None:
    d = cmd_detect()
    if d.get("supported") is False:
        sys.exit("Enzonic menolak deteksi proyek ini (supported=false).")
    with client() as c:
        p = find_project(c)
        if not p:
            p = call(c, "POST", "/v1/projects", json={"name": PROJECT, "source_type": "upload", "framework": d.get("framework") or "fastapi"})
            print(f"Proyek dibuat: {p.get('name')} (mode {p.get('mode')})")
        else:
            print(f"Memakai proyek yang ada: {p.get('name')} (mode {p.get('mode')})")
        STATE.write_text(json.dumps({"id": p["id"], "name": p.get("name"), "production_url": p.get("production_url")}, indent=1))

        res = call(c, "PUT", f"/v1/projects/{p['id']}/env", json={"vars": env_vars(), "targets": ["production", "preview"]})
        print(f"Variabel lingkungan: {res.get('created', 0)} baru, {res.get('updated', 0)} diperbarui (nilai rahasia tidak ditampilkan)")

        data = ZIP.read_bytes()
        up = call(c, "POST", "/v1/uploads", json={"size_bytes": len(data), "filename": ZIP.name})
        r = httpx.put(up["put_url"], content=data, headers={"Content-Type": up.get("content_type") or "application/zip"}, timeout=120)
        if r.status_code >= 300:
            sys.exit(f"Unggah ZIP gagal: HTTP {r.status_code}")
        # --preview: uji paket baru di URL preview tanpa menyentuh produksi.
        target = "preview" if "--preview" in sys.argv else "production"
        dep = call(c, "POST", f"/v1/projects/{p['id']}/deployments", json={"upload_id": up["upload_id"], "target": target})
        print(f"Deployment #{dep.get('number')} ({target}) dimulai: {dep.get('state')}")

        seq = 0
        for _ in range(300):
            logs = call(c, "GET", f"/v1/deployments/{dep['id']}/logs", params={"after_seq": seq})
            for ch in logs.get("chunks", []):
                print("  │ " + ch.get("text", "").rstrip().replace("\n", "\n  │ "))
            seq = logs.get("next_seq", seq)
            if logs.get("done"):
                break
            time.sleep(2)
        dep = call(c, "GET", f"/v1/deployments/{dep['id']}")
        p = call(c, "GET", f"/v1/projects/{p['id']}")
        STATE.write_text(json.dumps({"id": p["id"], "name": p.get("name"), "production_url": p.get("production_url"), "mode": p.get("mode")}, indent=1))
        print(f"Status: {dep.get('state')} {dep.get('error_code') or ''} {dep.get('error_message') or ''}")
        print(f"Mode: {p.get('mode')} | URL produksi: {p.get('production_url')} | URL deployment ini: {dep.get('url')}")
        if dep.get("state") != "ready":
            sys.exit(1)


def cmd_logs() -> None:
    with client() as c:
        p = find_project(c) or sys.exit("Proyek belum ada")
        for e in call(c, "GET", f"/v1/projects/{p['id']}/runtime-logs").get("data", [])[-60:]:
            print(f"{e.get('ts')} {e.get('level'):5} {e.get('source')}: {e.get('message')}")


def prod_url() -> str:
    if len(sys.argv) > 2:
        return sys.argv[2].rstrip("/")
    if STATE.is_file():
        u = json.loads(STATE.read_text()).get("production_url")
        if u:
            return (u if u.startswith("http") else f"https://{u}").rstrip("/")
    sys.exit("URL produksi belum diketahui; jalankan deploy dulu atau beri URL")


def cmd_test() -> None:
    url = prod_url()
    ok = True
    with httpx.Client(timeout=90, follow_redirects=False) as c:
        def check(name, cond, info=""):
            nonlocal ok
            ok &= bool(cond)
            print(f"{'✓' if cond else '✗'} {name} {info}")

        t = time.time()
        r = c.get(f"{url}/api/v1/health")
        check("HTTPS health", url.startswith("https://") and r.status_code == 200 and r.json().get("status") == "ok", f"({r.status_code}, {time.time()-t:.1f} dtk)")
        r = c.options(f"{url}/api/v1/chat/turn", headers={"Origin": "https://localhost", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
        check("CORS origin APK (https://localhost)", r.status_code == 200 and r.headers.get("access-control-allow-origin") == "https://localhost")
        r = c.options(f"{url}/api/v1/chat/turn", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
        check("CORS origin asing ditolak", r.status_code == 400)
        check("Tutor aktif (key & model terbaca di server)", c.get(f"{url}/api/v1/tutor/status").json().get("enabled") is True)
        for msg in ["Halo Plum, apa itu diskon? Jawab singkat.", "Tuliskan rumus persentase untung memakai LaTeX $$...$$."]:
            t = time.time()
            r = c.post(f"{url}/api/v1/chat/turn", json={"message": msg, "history": []}, headers={"Origin": "https://localhost"})
            d = r.json() if r.status_code == 200 else {}
            check(f"Chat → Gemini: {msg[:28]}…", d.get("source") == "gemini" and len(d.get("reply", "")) > 20,
                  f"({r.status_code}, {time.time()-t:.1f} dtk, {d.get('source')}) {d.get('reply', '')[:90]!r}")
            if "LaTeX" in msg:
                check("Balasan memuat rumus LaTeX", any(s in d.get("reply", "") for s in ("$$", "\\(", "\\frac")))
        body = {"template_id": "m3-t1", "seed": 5, "step_id": "s1", "event": "open", "phase": "solve", "session_id": "uji-deploy"}
        r = c.post(f"{url}/api/v1/tutor/turn", json=body, headers={"Origin": "https://localhost"})
        d = r.json() if r.status_code == 200 else {}
        check("Tutor → Gemini", d.get("source") == "gemini", f"({r.status_code}, {d.get('source')}, {d.get('reason')}) {str(d.get('text'))[:80]!r}")
    print("SEMUA LULUS" if ok else "ADA YANG GAGAL")
    sys.exit(0 if ok else 1)


def cmd_web() -> None:
    """Terbitkan frontend (frontend/dist, dibangun dengan VITE_API_URL backend produksi) sebagai situs statis."""
    dist = ROOT / "frontend" / "dist"
    if not (dist / "index.html").is_file():
        sys.exit("frontend/dist belum ada: bangun dulu dengan VITE_API_URL=https://… npx vite build")
    js = "".join(p.read_text(encoding="utf-8", errors="ignore") for p in (dist / "assets").glob("*.js"))
    if "127.0.0.1:8000" in js or "localhost:8000" in js:
        sys.exit("GAGAL: bundle web masih memuat alamat backend lokal")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(dist.rglob("*")):
            if p.is_file():
                z.write(p, p.relative_to(dist).as_posix())
    data = buf.getvalue()
    names = zipfile.ZipFile(io.BytesIO(data)).namelist()
    with client() as c:
        d = call(c, "POST", "/v1/detect", json={"files": names, "contents": {}})
        print(f"Deteksi: {d.get('framework')} / mode {d.get('mode')}")
        p = next((x for x in call(c, "GET", "/v1/projects", params={"q": WEB_PROJECT}).get("data", []) if x.get("name") == WEB_PROJECT), None)
        if not p:
            p = call(c, "POST", "/v1/projects", json={"name": WEB_PROJECT, "source_type": "upload", "framework": "static"})
            print(f"Proyek web dibuat: {p.get('name')}")
        up = call(c, "POST", "/v1/uploads", json={"size_bytes": len(data), "filename": "web.zip"})
        r = httpx.put(up["put_url"], content=data, headers={"Content-Type": up.get("content_type") or "application/zip"}, timeout=120)
        if r.status_code >= 300:
            sys.exit(f"Unggah gagal: HTTP {r.status_code}")
        dep = call(c, "POST", f"/v1/projects/{p['id']}/deployments", json={"upload_id": up["upload_id"], "target": "production"})
        seq = 0
        for _ in range(300):
            logs = call(c, "GET", f"/v1/deployments/{dep['id']}/logs", params={"after_seq": seq})
            for ch in logs.get("chunks", []):
                print("  │ " + ch.get("text", "").rstrip().replace("\n", "\n  │ "))
            seq = logs.get("next_seq", seq)
            if logs.get("done"):
                break
            time.sleep(2)
        dep = call(c, "GET", f"/v1/deployments/{dep['id']}")
        p = call(c, "GET", f"/v1/projects/{p['id']}")
        print(f"Status: {dep.get('state')} {dep.get('error_message') or ''} | URL web: {p.get('production_url')}")
        if dep.get("state") != "ready":
            sys.exit(1)


if __name__ == "__main__":
    {"check": cmd_check, "detect": cmd_detect, "deploy": cmd_deploy, "logs": cmd_logs, "test": cmd_test, "web": cmd_web}.get(
        sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
