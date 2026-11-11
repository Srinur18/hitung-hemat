"""Membuat shared/test-vectors.json dari implementasi Python (sumber kebenaran).

    py -m app.tools.gen_vectors

Frontend (Vitest) membaca berkas yang sama untuk memastikan JavaScript menghasilkan angka identik.
"""
import json

from .. import content
from ..config import SHARED_DIR
from ..domain import discount as d
from ..domain.money import format_value
from ..domain.problems import instantiate
from ..domain.rng import mulberry32


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
    out = SHARED_DIR / "test-vectors.json"
    out.write_text(json.dumps(vectors, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Ditulis: {out} ({len(vectors['problems'])} soal)")


if __name__ == "__main__":
    main()
