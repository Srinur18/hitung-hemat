"""Membuat shared/test-vectors.json dari implementasi Python (sumber kebenaran).

    py -m app.tools.gen_vectors

Frontend (Vitest) membaca berkas yang sama untuk memastikan JavaScript menghasilkan angka identik.
"""
import json

from .. import content
from ..config import SHARED_DIR
from ..domain import discount as d
from ..domain.literacy import answer_key, score_test
from ..domain.money import format_value
from ..domain.problems import instantiate
from ..domain.rng import mulberry32


# Skenario jawaban tes literasi: benar semua, kosong, salah hitung + error carried forward,
# dan miskonsepsi kasir (Rp30) yang TIDAK boleh mendapat poin konsisten.
LITERACY_SCENARIOS = {
    "kosong": {},
    "ecf": {
        "L1": {"s1": 0, "s2a": 50000, "s2b": 195500, "s3": 0, "s4": 0, "s5": 0},
        "L2": {"s1": 0, "s2": 40000, "s3": 0, "s4": 6000, "s5": 34000, "s6": 1},
        "L3": {"s1": 2, "s2a": 1, "s2b": 8000, "s3a": 2, "s3b": 312000, "s4": 1},
        "L4": {"s1": 2, "s2": 2, "s3": 1, "s4": 30, "s5": 399970, "s6": 0},
    },
}


def literacy_vectors(lit: dict) -> list[dict]:
    out = []
    for kind in ("test", "practice"):
        items = lit[kind]
        scenarios = {"benar": {it["id"]: answer_key(it) for it in items}}
        if kind == "test":
            scenarios.update(LITERACY_SCENARIOS)
        for name, answers in scenarios.items():
            out.append({"set": kind, "scenario": name, "answers": answers, "result": score_test(items, answers)})
    return out


def main() -> None:
    r = mulberry32(42)
    vectors = {
        "rng": {"seed": 42, "first5": [r() for _ in range(5)]},
        "functions": [
            {"fn": "discountAmount", "args": [120000, 2500], "out": d.discount_amount(120000, 2500)},
            {"fn": "discountAmount", "args": [80000, 1250], "out": d.discount_amount(80000, 1250)},
            {"fn": "discountAmount", "args": [10001, 1000], "out": d.discount_amount(10001, 1000)},
            {"fn": "finalPrice", "args": [120000, 2500], "out": d.final_price(120000, 2500)},
            {"fn": "effectiveBp", "args": [5000, 2000], "out": d.effective_bp(5000, 2000)},
            {"fn": "originalFromFinal", "args": [90000, 2500], "out": d.original_from_final(90000, 2500)},
            {"fn": "percentFromPrices", "args": [100000, 80000], "out": d.percent_from_prices(100000, 80000)},
            {"fn": "complementBp", "args": [2500], "out": d.complement_bp(2500)},
            {"fn": "subtract", "args": [5, 9], "out": d.subtract(5, 9)},
            {"fn": "div", "args": [1250, 10], "out": d.div(1250, 10)},
        ],
        "formats": [
            {"value": v, "fmt": f, "out": format_value(v, f)}
            for v, f in [
                (120000, "price"), (1250, "percent"), (2000, "percent"), (1250, "frac"),
                (1250, "dec"), (12500, "dec"), (125, "dec"), (1250, "plainpct"), (1250, "milli"),
            ]
        ],
        "problems": [],
    }
    for tid, t in content.load("curriculum")["templates"].items():
        for seed in (1, 7, 2026):
            vectors["problems"].append({"template": tid, "seed": seed, **instantiate(t, seed)})
    vectors["literacy"] = literacy_vectors(content.load("literacy"))
    out = SHARED_DIR / "test-vectors.json"
    out.write_text(json.dumps(vectors, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Ditulis: {out} ({len(vectors['problems'])} soal)")


if __name__ == "__main__":
    main()
