import pytest

from app import content
from app.domain import discount as d
from app.domain.analytics import n_gain, summarize
from app.domain.money import format_bp, format_rp, format_value, pct_to_bp
from app.domain.problems import instantiate, validate_template
from app.domain.rng import mulberry32


@pytest.mark.parametrize(
    "fn,args,out",
    [
        (d.discount_amount, (120000, 2500), 30000),
        (d.final_price, (120000, 2500), 90000),
        (d.discount_amount, (80000, 1250), 10000),
        (d.effective_bp, (5000, 2000), 6000),  # 50% + 20% = 60%, BUKAN 70% (MC2)
        (d.original_from_final, (90000, 2500), 120000),
        (d.percent_from_prices, (100000, 80000), 2000),
        (d.complement_bp, (2500,), 7500),
    ],
)
def test_tabel_api_md(fn, args, out):
    assert fn(*args) == out


def test_stacked_dan_extras():
    assert d.stacked_final_price(200000, [5000, 2000]) == 80000
    assert d.with_extras(80000, tax_bp=1100, shipping=10000) == 98800


def test_hasil_tidak_bulat_ditolak():
    assert d.discount_amount(10001, 1000) is None
    assert d.subtract(5, 9) is None
    assert d.original_from_final(1000, 10000) is None


def test_format():
    assert format_rp(120000) == "Rp120.000"
    assert format_bp(1250) == "12,5%"
    assert format_bp(2000) == "20%"
    assert pct_to_bp("12,5") == 1250
    assert format_value(1250, "dec") == "0,125"
    assert format_value(12500, "dec") == "1,25"
    assert format_value(125, "dec") == "0,0125"
    assert format_value(2500, "frac") == "25/100"


def test_rng_deterministik():
    a, b = mulberry32(42), mulberry32(42)
    assert [a() for _ in range(10)] == [b() for _ in range(10)]
    assert all(0 <= x < 1 for x in (mulberry32(7)() for _ in range(5)))


def test_instantiate_deterministik_dan_bulat():
    t = content.load("curriculum")["templates"]["m3-t1"]
    p1, p2 = instantiate(t, 123), instantiate(t, 123)
    assert p1 == p2
    v = p1["vars"]
    assert v["disc"] + v["final"] == v["price"]
    assert v["final"] < v["price"]


def test_seluruh_konten_lolos_validasi():
    cur = content.load("curriculum")
    errs = []
    for tid, t in cur["templates"].items():
        errs += validate_template(tid, t, seeds=range(1, 101))
    assert errs == []


def test_validator_menangkap_petunjuk_bocor():
    t = {
        "vars": {"price": {"range": [10000, 10000, 1]}, "pct": {"choices": [1000]}},
        "text": "Harga {price|price}",
        "steps": [{
            "id": "s1", "input": "rupiah",
            "compute": {"fn": "discountAmount", "args": ["price", "pct"]}, "saveAs": "disc",
            "hints": ["a", "b", "jawabannya {disc|discount}"],
        }],
    }
    errs = validate_template("x", t, seeds=[1])
    assert any("membocorkan" in e for e in errs)


def test_n_gain():
    assert n_gain(4, 7, 8) == 0.75
    assert n_gain(8, 8, 8) is None


def test_summarize():
    ev = [
        {"student_code": "S01", "type": "assessment_answer", "payload": {"kind": "pre", "correct": True, "process": "employ"}},
        {"student_code": "S01", "type": "assessment_answer", "payload": {"kind": "pre", "correct": False}},
        {"student_code": "S01", "type": "assessment_answer", "payload": {"kind": "post", "correct": True, "process": "employ"}},
        {"student_code": "S01", "type": "assessment_answer", "payload": {"kind": "post", "correct": True, "process": "reason"}},
        {"student_code": "S01", "type": "problem_start", "payload": {}},
        {"student_code": "S01", "type": "answer_submit", "payload": {"correct": False, "mc": "MC1"}},
        {"student_code": "S01", "type": "hint_open", "payload": {"level": 1}},
        {"student_code": "S01", "type": "effort_rating", "payload": {"value": 5}},
    ]
    s = summarize(ev, max_score=2)["students"][0]
    assert s["pre"] == 1 and s["post"] == 2 and s["n_gain"] == 1.0
    assert s["misconceptions"] == {"MC1": 1}
    assert s["hints_per_problem"] == 1.0
    assert s["mean_effort"] == 5
