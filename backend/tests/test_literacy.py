"""Uji Tes Literasi Matematis: skor maksimum 24, poin per tahap sesuai pedoman, skor parsial."""
import copy

import pytest

from app import content
from app.domain.analytics import summarize
from app.domain.literacy import (
    answer_key, rubric_of, score_item, score_test, validate_glossary, validate_journey, validate_literacy, validate_material, validate_shop,
)

LIT = content.load("literacy")
TEST = LIT["test"]
BY_ID = {it["id"]: it for it in TEST}
FULL = {it["id"]: answer_key(it) for it in TEST}


def test_empat_indikator_terwakili_satu_soal_masing_masing():
    assert [it["process"] for it in TEST] == ["reason", "formulate", "employ", "interpret"]
    assert sorted(it["process"] for it in LIT["practice"]) == sorted(["reason", "formulate", "employ", "interpret"])


@pytest.mark.parametrize("iid,rubric", [
    ("L1", [1, 2, 1, 1, 1]),
    ("L2", [1, 1, 1, 1, 1, 1]),
    ("L3", [1, 2, 2, 1]),
    ("L4", [1, 1, 1, 1, 1, 1]),
])
def test_poin_per_tahap_sesuai_pedoman(iid, rubric):
    assert rubric_of(BY_ID[iid]) == rubric


def test_jawaban_benar_semua_tepat_24():
    r = score_test(TEST, FULL)
    assert r["total"] == r["max"] == 24
    assert r["byProcess"] == {p: {"earned": 6, "max": 6} for p in ("reason", "formulate", "employ", "interpret")}


def test_tanpa_jawaban_nol():
    assert score_test(TEST, {})["total"] == 0


def test_kunci_sesuai_kisi_kisi_peneliti():
    assert FULL["L1"]["s2a"] == 200000 and FULL["L1"]["s2b"] == 195500
    assert FULL["L1"]["s4"] == 1  # Toko B
    assert (FULL["L2"]["s2"], FULL["L2"]["s4"], FULL["L2"]["s5"]) == (200000, 30000, 170000)
    assert (FULL["L3"]["s2b"], FULL["L3"]["s3b"]) == (80000, 240000)
    assert (FULL["L4"]["s4"], FULL["L4"]["s5"]) == (120000, 280000)


def test_skor_parsial_tahap_awal_tetap_dinilai():
    # Contoh pedoman: tahap awal benar, tahap akhir salah → poin tahap awal tetap didapat.
    ans = dict(FULL["L3"], s3b=999, s4=0)
    r = score_item(BY_ID["L3"], ans)
    assert r["earned"] == 4
    assert [s["earned"] for s in r["steps"]] == [1, 1, 1, 1, 0, 0]


def test_error_carried_forward():
    # Salah hitung harga seluruh spidol (Rp40.000), tetapi langkah berikutnya konsisten.
    ans = dict(FULL["L2"], s2=40000, s4=6000, s5=34000)
    r = score_item(BY_ID["L2"], ans)
    vias = {s["id"]: s["via"] for s in r["steps"]}
    assert vias["s2"] is None and vias["s4"] == "ecf" and vias["s5"] == "ecf"
    assert r["earned"] == 5


def test_miskonsepsi_kasir_tidak_mendapat_poin_konsisten():
    ans = dict(FULL["L4"], s4=30, s5=399970)
    r = score_item(BY_ID["L4"], ans)
    assert [s["earned"] for s in r["steps"]][3:5] == [0, 0]


def test_perbandingan_mengikuti_hasil_siswa():
    # Siswa salah menghitung Toko A sebagai Rp50.000 → secara konsisten memilih Toko A.
    ans = dict(FULL["L1"], s2a=50000, s3=0, s4=0)
    r = score_item(BY_ID["L1"], ans)
    assert [s["via"] for s in r["steps"]][1:5] == [None, "key", "ecf", "ecf"]


def test_konten_lolos_validasi():
    assert validate_literacy(LIT) == []
    assert validate_material(content.load("material")) == []
    assert validate_journey(content.load("journey")) == []
    assert validate_shop(content.load("shop")) == []
    assert validate_glossary(content.load("glossary")) == []


def test_validator_menangkap_poin_salah():
    bad = copy.deepcopy(LIT)
    bad["test"][0]["steps"][1]["points"] = 2
    errs = validate_literacy(bad)
    assert any("rubrik" in e for e in errs) and any("24" in e for e in errs)


def test_analitik_mencatat_skor_literasi():
    ev = [
        {"student_code": "S01", "type": "literacy_result", "payload": {"kind": "test", "total": 10, "max": 24, "byProcess": {}}},
        {"student_code": "S01", "type": "literacy_result", "payload": {"kind": "practice", "total": 20, "max": 24}},
        {"student_code": "S01", "type": "literacy_result", "payload": {"kind": "test", "total": 21, "max": 24, "byProcess": {"reason": {"earned": 6, "max": 6}}}},
    ]
    s = summarize(ev, max_score=8)
    st = s["students"][0]
    assert (st["literacy_attempts"], st["literacy_first"], st["literacy_last"]) == (2, 10, 21)
    assert s["class"]["mean_literacy_last"] == 21
