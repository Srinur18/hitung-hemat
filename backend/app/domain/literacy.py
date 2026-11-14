"""Penilaian Tes Literasi Matematis bertahap (4 indikator, maks. 24 poin).

Identik dengan frontend/src/domain/literacy.js (dicek lewat shared/test-vectors.json).

Aturan penilaian (pedoman penskoran peneliti):
- Setiap tahap dinilai sendiri, jadi siswa tetap mendapat skor parsial untuk tahap yang benar.
- Langkah bertanda ``ecf`` (error carried forward) juga dinilai benar bila konsisten dengan
  jawaban siswa sendiri di tahap sebelumnya. Contoh: salah hitung di tahap 2, tetapi tahap 3
  dikerjakan dengan cara benar dari hasil tahap 2 itu → tahap 3 tetap mendapat poin.
- Kunci angka TIDAK ditulis manual: dihitung dari registri fungsi domain (tanpa eval).
"""
import re

from .discount import FN
from .money import format_rp

PROCESSES = ("reason", "formulate", "employ", "interpret")
MAX_WORDS = 40  # aturan P4
MAX_SENTENCE_WORDS = 15  # aturan P4


def compare_index(a: int, b: int) -> int:
    """0 bila a < b, 1 bila a > b, 2 bila sama (indeks opsi perbandingan)."""
    return 0 if a < b else 1 if a > b else 2


LFN = {**FN, "compareIndex": compare_index}


def evaluate(spec, v: dict):
    """spec = bilangan bulat (kunci tetap) atau {"fn", "args"}; nama argumen diambil dari v."""
    if isinstance(spec, bool):
        return None
    if isinstance(spec, int):
        return spec
    if not isinstance(spec, dict):
        return None
    args = [a if isinstance(a, int) else v.get(a) for a in spec["args"]]
    if any(a is None for a in args):
        return None
    return LFN[spec["fn"]](*args)


def answer_key(item: dict) -> dict:
    """Kunci tiap langkah, dihitung berurutan dari data soal."""
    v = dict(item["vars"])
    key = {}
    for st in item["steps"]:
        k = evaluate(st["key"], v)
        key[st["id"]] = k
        v[st["id"]] = k
    return key


def score_item(item: dict, answers: dict) -> dict:
    key = answer_key(item)
    student = dict(item["vars"])
    steps = []
    for st in item["steps"]:
        a = answers.get(st["id"])
        via = None
        if isinstance(a, int) and not isinstance(a, bool):
            if a == key[st["id"]]:
                via = "key"
            elif st.get("ecf") and evaluate(st["key"], student) == a:
                via = "ecf"
        steps.append({
            "id": st["id"], "tahap": st["tahap"], "points": st["points"],
            "earned": st["points"] if via else 0, "answer": a, "via": via,
        })
        student[st["id"]] = a
    return {
        "id": item["id"], "process": item["process"],
        "earned": sum(s["earned"] for s in steps), "max": sum(s["points"] for s in steps),
        "steps": steps,
    }


def score_test(items: list[dict], answers_by_item: dict) -> dict:
    results = [score_item(it, answers_by_item.get(it["id"], {})) for it in items]
    by_process = {}
    for r in results:
        b = by_process.setdefault(r["process"], {"earned": 0, "max": 0})
        b["earned"] += r["earned"]
        b["max"] += r["max"]
    return {
        "total": sum(r["earned"] for r in results),
        "max": sum(r["max"] for r in results),
        "byProcess": by_process,
        "items": results,
    }


def rubric_of(item: dict) -> list[int]:
    """Poin per tahap (sub-langkah 2a/2b dijumlahkan ke tahap 2)."""
    n = max(st["tahap"] for st in item["steps"])
    out = [0] * n
    for st in item["steps"]:
        out[st["tahap"] - 1] += st["points"]
    return out


# ---------- validasi konten ----------
_PH = re.compile(r"\{\w+(?:\|\w+)?\}|\[\[[\w-]+\]\]")


def text_problems(where: str, text: str, max_words: int = MAX_WORDS) -> list[str]:
    errs = []
    words = text.split()
    if len(words) > max_words:
        errs.append(f"{where}: {len(words)} kata (> {max_words}, aturan P4)")
    for sentence in re.split(r"[.?!:](?:\s|$)", _PH.sub("X", text)):
        n = len(sentence.split())
        if n > MAX_SENTENCE_WORDS:
            errs.append(f"{where}: kalimat {n} kata (> {MAX_SENTENCE_WORDS}): {sentence.strip()[:40]}…")
    return errs


def validate_item(item: dict, *, practice: bool) -> list[str]:
    iid = item["id"]
    errs = text_problems(f"{iid}.text", item["text"])
    if item["process"] not in PROCESSES:
        errs.append(f"{iid}: proses {item['process']} tidak dikenal")
    if rubric_of(item) != item["rubric"]:
        errs.append(f"{iid}: poin per tahap {rubric_of(item)} ≠ rubrik {item['rubric']}")
    if sum(rubric_of(item)) != 6:
        errs.append(f"{iid}: skor maksimum {sum(rubric_of(item))} ≠ 6")
    ids = [st["id"] for st in item["steps"]]
    if len(set(ids)) != len(ids) or set(ids) & set(item["vars"]):
        errs.append(f"{iid}: id langkah ganda / bentrok dengan nama variabel")
    key = answer_key(item)
    v = {**item["vars"], **key}
    for st in item["steps"]:
        sid = f"{iid}.{st['id']}"
        k = key[st["id"]]
        errs += text_problems(f"{sid}.ask", st["ask"])
        if k is None:
            errs.append(f"{sid}: kunci tidak dapat dihitung / tidak bulat")
            continue
        if st["input"] == "choice":
            opts = st.get("options", [])
            if not 0 <= k < len(opts):
                errs.append(f"{sid}: kunci {k} di luar opsi")
            for o in opts:
                errs += text_problems(f"{sid}.option", o)
            for idx in st.get("optionFeedback", {}):
                if int(idx) == k:
                    errs.append(f"{sid}: umpan balik salah ditulis untuk opsi yang benar")
        elif st["input"] == "rupiah":
            if k <= 0:
                errs.append(f"{sid}: kunci harus positif")
            for tr in st.get("traps", []):
                tv = evaluate(tr["value"], v)
                if tv is None or tv == k:
                    errs.append(f"{sid}: jebakan tidak sah / sama dengan kunci")
        else:
            errs.append(f"{sid}: input {st['input']} tidak dikenal")
        texts = [st.get("fb", ""), st.get("good", ""), *st.get("hints", []), *st.get("optionFeedback", {}).values()]
        for t in filter(None, texts):
            errs += text_problems(sid, t)
            if st["input"] == "rupiah" and format_rp(k) in t:
                errs.append(f"{sid}: petunjuk/umpan balik membocorkan jawaban (aturan P8)")
        if not st.get("hints"):
            errs.append(f"{sid}: setiap tahap wajib punya petunjuk (Bantuan)")
        if not practice and not st.get("rubricText"):
            errs.append(f"{sid}: soal tes wajib punya kisi-kisi (rubricText)")
    return errs


# Pembahasan harus memuat angka kunci: nilai turunan → kunci tahap yang wajib sama.
DISCUSSION_MATCH = {
    "L1": {"fA": "s2a", "fB": "s2b"},
    "L2": {"tot": "s2", "d": "s4", "f": "s5"},
    "L3": {"d": "s2b", "f": "s3b"},
    "L4": {"d": "s4", "f": "s5"},
    "P1": {"fA": "s2a", "fB": "s2b"},
    "P2": {"tot": "s2", "d": "s4", "f": "s5"},
    "P3": {"d": "s2b", "f": "s3b"},
    "P4": {"d": "s4", "f": "s5"},
}


def validate_discussion(item: dict) -> list[str]:
    """Pembahasan per soal: Diketahui, Ditanyakan, Rumus, Langkah, Hasil, Kesimpulan — angkanya dari domain."""
    iid = item["id"]
    d = item.get("discussion")
    if not d:
        return [f"{iid}: soal wajib punya pembahasan"]
    errs = []
    for k in ("known", "asked", "formula", "steps", "result", "conclusion"):
        if not d.get(k):
            errs.append(f"{iid}.pembahasan: bagian {k} kosong")
    v = dict(item["vars"])
    for name, spec in d.get("derived", {}).items():
        v[name] = evaluate(spec, v)
        if v[name] is None:
            errs.append(f"{iid}.pembahasan: nilai {name} tidak bulat / tidak sah")
    key = answer_key(item)
    for name, sid in DISCUSSION_MATCH.get(iid, {}).items():
        if v.get(name) != key[sid]:
            errs.append(f"{iid}.pembahasan: {name}={v.get(name)} tidak sama dengan kunci {sid}={key[sid]}")
    texts = [*d.get("known", []), d.get("asked", ""), *d.get("steps", []), d.get("result", ""), d.get("conclusion", "")]
    for i, text in enumerate(texts):
        errs += text_problems(f"{iid}.pembahasan{i}", text)
        for m in re.finditer(r"\{(\w+)", text):
            if m.group(1) not in v:
                errs.append(f"{iid}.pembahasan: placeholder {{{m.group(1)}}} tidak punya nilai")
    return errs


def validate_literacy(lit: dict) -> list[str]:
    errs = []
    for kind in ("test", "practice"):
        items = lit[kind]
        procs = sorted(it["process"] for it in items)
        if procs != sorted(PROCESSES):
            errs.append(f"{kind}: harus tepat satu soal untuk tiap indikator, ditemukan {procs}")
        for it in items:
            errs += validate_item(it, practice=kind == "practice")
            errs += validate_discussion(it)  # tes & latihan wajib punya pembahasan
    total = sum(sum(rubric_of(it)) for it in lit["test"])
    if total != lit["maxScore"] or total != 24:
        errs.append(f"test: skor maksimum {total} ≠ 24")
    return errs


def validate_journey(jr: dict) -> list[str]:
    """Perjalanan belajar: struktur sama dengan materi; {name} diisi nama siswa saat tampil."""
    errs = []
    for st in jr["stages"]:
        sid = st["id"]
        v = {"name": "X", **st.get("vars", {})}
        for name, spec in st.get("derived", {}).items():
            v[name] = evaluate(spec, v)
            if v[name] is None:
                errs.append(f"{sid}: nilai turunan {name} tidak bulat / tidak sah")
        for i, text in enumerate([st["title"], st["body"], *st.get("lines", [])]):
            errs += text_problems(f"{sid}.teks{i}", text)
            for m in re.finditer(r"\{(\w+)", text):
                if m.group(1) not in v:
                    errs.append(f"{sid}: placeholder {{{m.group(1)}}} tidak punya nilai")
    return errs


def validate_shop(shop: dict) -> list[str]:
    errs = []
    cats = {c["id"] for c in shop.get("categories", [])}
    for p in shop["products"]:
        if cats and p.get("category") not in cats:
            errs.append(f"shop.{p['id']}: kategori {p.get('category')} tidak dikenal")
        d = LFN["discountAmount"](p["price"], p["pct"])
        if d is None or LFN["finalPrice"](p["price"], p["pct"]) is None:
            errs.append(f"shop.{p['id']}: diskon tidak menghasilkan Rupiah bulat")
        if p["pct"] % 100:
            errs.append(f"shop.{p['id']}: persen simulasi harus bulat (tanpa koma)")
    return errs


def _derive(where: str, block: dict, errs: list[str]) -> dict:
    v = dict(block.get("vars", {}))
    for name, spec in block.get("derived", {}).items():
        v[name] = evaluate(spec, v)
        if v[name] is None:
            errs.append(f"{where}: nilai turunan {name} tidak bulat / tidak sah")
    return v


def _check_texts(where: str, texts: list[str], v: dict, errs: list[str]) -> None:
    for i, text in enumerate(texts):
        errs += text_problems(f"{where}.teks{i}", text)
        for m in re.finditer(r"\{(\w+)", text):
            if m.group(1) not in v:
                errs.append(f"{where}: placeholder {{{m.group(1)}}} tidak punya nilai")


def validate_material(mat: dict) -> list[str]:
    """Materi v2: bab → kartu (badan, poin, contoh bertahap, tabel persen) + rangkuman rumus."""
    errs: list[str] = []
    ids = set()
    for ch in mat["chapters"]:
        if not ch.get("cards"):
            errs.append(f"{ch['id']}: bab tanpa kartu")
        for card in ch["cards"]:
            cid = card["id"]
            if cid in ids:
                errs.append(f"{cid}: id kartu ganda")
            ids.add(cid)
            v = _derive(cid, card, errs)
            ex = card.get("example") or {}
            _check_texts(cid, [card["body"], *card.get("points", []), *([ex["text"]] if ex else []), *ex.get("steps", [])], v, errs)
            tb = card.get("table")
            if tb:
                price = v.get(tb["price"])
                for bp in tb["pcts"]:
                    if price is None or LFN["finalPrice"](price, bp) is None:
                        errs.append(f"{cid}: tabel persen {bp} tidak bulat")
    for f in mat.get("formulas", []):
        v = _derive(f["id"], f, errs)
        _check_texts(f["id"], f["example"], v, errs)
        if len(f.get("symbols", [])) < 2:
            errs.append(f"{f['id']}: keterangan simbol kurang")
    return errs


def validate_glossary(gl: dict) -> list[str]:
    errs = []
    required = ["diskon", "rabat", "persen", "harga-awal", "potongan-harga", "harga-akhir",
                "harga-setelah-diskon", "penghematan", "perbandingan-harga"]
    for k in required:
        if k not in gl:
            errs.append(f"kamus: istilah {k} belum ada")
    for k, g in gl.items():
        if not g.get("meaning") or not g.get("example"):
            errs.append(f"kamus.{k}: wajib punya pengertian dan contoh")
        errs += text_problems(f"kamus.{k}", g.get("meaning", "")) + text_problems(f"kamus.{k}.contoh", g.get("example", ""))
    return errs
