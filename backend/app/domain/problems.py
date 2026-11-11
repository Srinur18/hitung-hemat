"""Generator & validator template soal. Algoritma harus sama dengan frontend/src/domain/problems.js."""
import operator
import re

from .discount import FN
from .rng import mulberry32

OPS = {
    "<": operator.lt,
    "<=": operator.le,
    ">": operator.gt,
    ">=": operator.ge,
    "==": operator.eq,
    "!=": operator.ne,
}
PLACEHOLDER = re.compile(r"\{(\w+)(?:\|(\w+))?\}")
MAX_TRIES = 500


class GenerationError(ValueError):
    pass


def draw(spec: dict, rnd) -> int:
    if "choices" in spec:
        c = spec["choices"]
        return c[int(rnd() * len(c))]
    lo, hi, step = spec["range"]
    n = (hi - lo) // step + 1
    return lo + int(rnd() * n) * step


def compute(spec: dict, v: dict):
    args = [a if isinstance(a, (int, float)) else v.get(a) for a in spec["args"]]
    if any(a is None for a in args):
        return None
    return FN[spec["fn"]](*args)


def instantiate(t: dict, seed: int) -> dict:
    """Mengembalikan {'vars': {...}, 'answers': {step_id: int}}."""
    rnd = mulberry32(seed)
    for _ in range(MAX_TRIES):
        v: dict = {}
        if t.get("items"):
            v["item"] = t["items"][int(rnd() * len(t["items"]))]
        for k, s in t["vars"].items():
            v[k] = draw(s, rnd)
        ok = True
        for k, s in (t.get("derived") or {}).items():
            v[k] = compute(s, v)
            if v[k] is None:
                ok = False
                break
        answers: dict = {}
        if ok:
            for st in t["steps"]:
                if "compute" not in st:
                    continue
                val = compute(st["compute"], v)
                if val is None:
                    ok = False
                    break
                answers[st["id"]] = val
                if st.get("saveAs"):
                    v[st["saveAs"]] = val
        if ok and all(OPS[op](v[a], v[b]) for a, op, b in t.get("constraints", [])):
            return {"vars": v, "answers": answers}
    raise GenerationError(f"Tidak bisa membuat soal bulat setelah {MAX_TRIES} percobaan")


def _refs(text: str) -> set[str]:
    return {m.group(1) for m in PLACEHOLDER.finditer(text or "")}


def validate_template(tid: str, t: dict, seeds=range(1, 301)) -> list[str]:
    """Daftar masalah pada template. Kosong = lolos."""
    errs: list[str] = []
    base = set(t["vars"]) | set(t.get("derived") or {}) | ({"item"} if t.get("items") else set())

    missing = _refs(t["text"]) - base
    if missing:
        errs.append(f"{tid}: teks soal memakai variabel tak dikenal {sorted(missing)}")
    if len(t["text"].split()) > 40:
        errs.append(f"{tid}: teks soal > 40 kata (aturan P4)")

    known = set(base)
    for st in t["steps"]:
        sid = f"{tid}/{st['id']}"
        for h in st.get("hints", []):
            leak = _refs(h) - known
            if leak:
                errs.append(f"{sid}: petunjuk membocorkan/merujuk variabel belum diketahui {sorted(leak)}")
        if len(st.get("hints", [])) < 3:
            errs.append(f"{sid}: petunjuk kurang dari 3 tingkat")
        if st["input"] == "choice" and not st.get("options"):
            errs.append(f"{sid}: langkah pilihan tanpa opsi")
        if st["input"] != "choice" and "compute" not in st:
            errs.append(f"{sid}: langkah isian tanpa compute")
        if st.get("saveAs"):
            known.add(st["saveAs"])

    for seed in seeds:
        try:
            p = instantiate(t, seed)
        except GenerationError as e:
            errs.append(f"{tid} seed={seed}: {e}")
            break
        v = p["vars"]
        for st in t["steps"]:
            if st["input"] != "choice":
                continue
            correct = 0
            for o in st["options"]:
                if o.get("correct"):
                    correct += 1
                elif "correctIf" in o:
                    a, op, b = o["correctIf"]
                    correct += OPS[op](v[a], v[b])
            if correct != 1:
                errs.append(f"{tid}/{st['id']} seed={seed}: jumlah opsi benar = {correct}, harus 1")
                break
        s = t.get("sanity")
        if s and not OPS[s["op"]](v[s["left"]], v[s["right"]]):
            errs.append(f"{tid} seed={seed}: cek kewajaran gagal ({s})")
    return errs
