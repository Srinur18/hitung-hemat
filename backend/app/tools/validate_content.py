"""Pemeriksa kualitas konten.

    py -m app.tools.validate_content

Memeriksa setiap template: angka selalu bulat, opsi benar tepat satu, cek kewajaran lolos,
petunjuk tidak membocorkan jawaban, teks soal ≤ 40 kata.
Juga memeriksa Tes/Latihan Literasi Matematis (4 indikator, skor maks. 24, poin per tahap
sesuai rubrik) dan ringkasan materi (angka contoh selalu bulat).
"""
import sys

from .. import content
from ..domain.literacy import validate_literacy, validate_material
from ..domain.problems import validate_template


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # konsol Windows (cp1252) tidak bisa mencetak ≠ dan …
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
    lit = content.load("literacy")
    errs += validate_literacy(lit)
    mat = content.load("material")
    errs += validate_material(mat)
    if errs:
        print("\n".join(errs))
        print(f"\nGAGAL: {len(errs)} masalah")
        return 1
    print(
        f"OK: {len(templates)} template, {len(cur['modules'])} modul, "
        f"{len(lit['test'])} soal tes literasi (maks. {lit['maxScore']} poin), "
        f"{len(lit['practice'])} soal latihan, {len(mat['topics'])} topik materi lolos pemeriksaan"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
