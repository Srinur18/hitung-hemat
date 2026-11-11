"""Pemeriksa kualitas konten.

    py -m app.tools.validate_content

Memeriksa setiap template: angka selalu bulat, opsi benar tepat satu, cek kewajaran lolos,
petunjuk tidak membocorkan jawaban, teks soal ≤ 40 kata.
"""
import sys

from .. import content
from ..domain.problems import validate_template


def main() -> int:
    cur = content.load("curriculum")
    errs: list[str] = []
    templates = cur["templates"]
    for tid, t in templates.items():
        errs += validate_template(tid, t)
    for m in cur["modules"]:
        for st in m["stages"]:
            for tid in [st.get("template"), *st.get("templates", [])]:
                if tid and tid not in templates:
                    errs.append(f"{m['id']}: template {tid} tidak ada")
            if st.get("cards") and st["cards"] not in cur["explain"]:
                errs.append(f"{m['id']}: kartu jelaskan {st['cards']} tidak ada")
    if errs:
        print("\n".join(errs))
        print(f"\nGAGAL: {len(errs)} masalah")
        return 1
    print(f"OK: {len(templates)} template, {len(cur['modules'])} modul lolos pemeriksaan")
    return 0


if __name__ == "__main__":
    sys.exit(main())
