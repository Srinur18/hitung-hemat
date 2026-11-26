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
    # R3 (25 Nov 2026): ECF bernilai 0,5 poin sesuai rubrik manual (dulu poin penuh → 5).
    assert r["earned"] == 4
    assert [s["earned"] for s in r["steps"]] == [1, 0, 1, 0.5, 0.5, 1]


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


def test_pembahasan_dan_bantuan_tes_divalidasi():
    # setiap tahap tes punya bantuan, setiap soal punya pembahasan lengkap
    for it in TEST:
        assert all(st.get("hints") for st in it["steps"])
        assert {"known", "asked", "formula", "steps", "result", "conclusion"} <= set(it["discussion"])
    # pembahasan yang angkanya tidak cocok dengan kunci ditolak
    bad = copy.deepcopy(LIT)
    bad["test"][2]["discussion"]["derived"]["d"] = {"fn": "discountAmount", "args": ["h", 2000]}
    assert any("tidak sama dengan kunci" in e for e in validate_literacy(bad))
    # bantuan yang membocorkan jawaban ditolak
    bad = copy.deepcopy(LIT)
    bad["test"][2]["steps"][2]["hints"] = ["Jawabannya Rp80.000."]
    assert any("membocorkan" in e for e in validate_literacy(bad))


# ---------- R3: penilaian = rubrik manual hasil uji coba instrumen ----------
UJI_COBA_L4 = {"s1": 1, "s2": 0, "s3": 2, "s4": 110000, "s5": 290000, "s6": 1}


def test_lembar_uji_coba_instrumen_sama_dengan_penilaian_manual():
    """docs/instrumen: L1–L3 6/6; L4 salah kali 0,3 × 400.000 = 110.000 → 4,5/6; total 22,5 → nilai 93,75."""
    r = score_test(TEST, {**FULL, "L4": UJI_COBA_L4})
    l4 = r["items"][3]
    assert [s["earned"] for s in l4["steps"]] == [1, 1, 1, 0.5, 0.5, 0.5]
    assert [s["via"] for s in l4["steps"]] == ["key", "key", "key", "calc", "ecf", "ecf"]
    assert [x["earned"] for x in r["items"]] == [6, 6, 6, 4.5]
    assert r["total"] == 22.5 and r["max"] == 24 and r["total"] / r["max"] * 100 == 93.75
    assert r["byProcess"]["interpret"] == {"earned": 4.5, "max": 6}


def test_salah_hitung_hanya_bila_model_benar_dan_bukan_jebakan():
    item = BY_ID["L4"]
    earned = lambda **kw: [s["earned"] for s in score_item(item, {**FULL["L4"], **kw})["steps"]][3]
    assert earned(s4=110000) == 0.5          # model benar (s3), hitungan meleset
    assert earned(s3=0, s4=110000) == 0      # model salah → bukan sekadar salah hitung
    assert earned(s4=30) == 0                # jebakan cara kasir = miskonsepsi
    assert earned(s4=12000) == 0             # jebakan salah geser koma
    assert earned(s4=400000) == 0            # angka lain dari soal (harga awal), bukan hasil hitung
    assert earned(s4=0) == 0


def test_ecf_langkah5_tidak_berlaku_setelah_cara_kasir():
    r = score_item(BY_ID["L4"], {**FULL["L4"], "s4": 30, "s5": 399970})
    assert [s["earned"] for s in r["steps"]] == [1, 1, 1, 0, 0, 0.5]


def test_kesimpulan_penuh_hanya_bila_hasil_sebelumnya_benar():
    assert score_item(BY_ID["L4"], FULL["L4"])["earned"] == 6
    r = score_item(BY_ID["L4"], {**FULL["L4"], "s5": 290000})
    assert [s["earned"] for s in r["steps"]][4:] == [0, 0.5]


def test_validator_menangkap_penanda_penilaian_salah():
    bad = copy.deepcopy(LIT)
    l4 = next(i for i in bad["test"] if i["id"] == "L4")
    l4["steps"][3]["calcFrom"] = "s6"
    l4["steps"][5]["ecfFrom"] = ["s9"]
    l4["steps"][0]["ecfCalcOnly"] = True
    errs = validate_literacy(bad)
    assert any("calcFrom" in e for e in errs) and any("ecfFrom" in e for e in errs)
    assert any("ecfCalcOnly" in e for e in errs)


def test_analitik_menerima_skor_pecahan():
    """Sebelum R3, total 22,5 (float) diam-diam dibuang dari ringkasan peneliti."""
    ev = [
        {"student_code": "S02", "type": "literacy_result", "payload": {"kind": "test", "total": 22.5, "max": 24}},
        {"student_code": "S02", "type": "literacy_result", "payload": {"kind": "test", "total": True, "max": 24}},
    ]
    st = summarize(ev, max_score=8)["students"][0]
    assert (st["literacy_attempts"], st["literacy_last"]) == (1, 22.5)
