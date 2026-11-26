"""Memeriksa konfigurasi Teman Mikir (Gemini) tanpa pernah mencetak API key.

    .venv\\Scripts\\python -m app.tools.gemini_check          # daftar model yang bisa dipakai key Anda
    .venv\\Scripts\\python -m app.tools.gemini_check --try    # + satu giliran uji (memakai 1 kuota)
"""
import sys

from .. import config
from ..tutor import gemini, service


def main(argv: list[str]) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if not config.GEMINI_API_KEY:
        print("GEMINI_API_KEY kosong → Teman Mikir memakai teks cadangan saja. Isi di backend/.env.")
        return 1
    print(f"API key: terisi ({len(config.GEMINI_API_KEY)} karakter, tidak ditampilkan)")
    try:
        models = gemini.list_models(api_key=config.GEMINI_API_KEY, timeout=config.GEMINI_TIMEOUT)
    except gemini.GeminiError as e:
        print(f"Gagal membaca daftar model: {e}")
        return 1
    usable = sorted(
        m["name"].removeprefix("models/")
        for m in models
        if "generateContent" in (m.get("supportedGenerationMethods") or [])
    )
    print("Model yang mendukung generateContent:")
    for name in usable:
        print(f"  {'*' if name == config.GEMINI_MODEL else ' '} {name}")
    if not config.GEMINI_MODEL:
        print("GEMINI_MODEL kosong. Pilih salah satu nama di atas dan isi di backend/.env.")
        return 1
    if config.GEMINI_MODEL not in usable:
        print(f"PERINGATAN: GEMINI_MODEL={config.GEMINI_MODEL} tidak ada di daftar.")
        return 1
    if "--try" in argv:
        r = service.respond(template_id="m1-t1", seed=1, step_id="s1", event="open", session_id="gemini-check")
        print(f"Uji giliran: sumber={r['source']} alasan={r['reason']}\n  {r['text']}")
        return 0 if r["source"] == "gemini" else 1
    print("OK. Jalankan dengan --try untuk mencoba satu giliran.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
