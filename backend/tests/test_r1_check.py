"""R1 (25 Nov 2026): cek kewajaran memeriksa BESAR hasil lewat jalan lain, bukan hanya arah.

Dasar: uji coba instrumen Soal 4 Tahap 6 — siswa hanya menulis "harga akhir lebih rendah daripada awal",
sehingga salah hitung (Rp290.000, seharusnya Rp280.000) tidak tertangkap.
"""
import copy

import pytest

from app import content
from app.domain import discount as d
from app.domain.problems import instantiate, validate_template
from app.tutor import engine, service

CUR = content.load("curriculum")
TUTOR = content.load("tutor")
WITH_CHECK = ("m1-t1", "m3-t1", "m4-t1", "m6-t1")


def test_cek_jalan_lain_menangkap_kesalahan_dokumen_sedangkan_cek_lama_tidak():
    price, pct, siswa_diskon, siswa_akhir = 400000, 3000, 110000, 290000
    assert siswa_akhir < price                      # cek lama (arah) → lolos, padahal salah
    assert siswa_diskon + siswa_akhir == price      # cek jumlah juga lolos (turunan dari angka salah)
    jalan_lain = d.discount_amount(price, d.complement_bp(pct))  # 70% × 400.000
    assert jalan_lain == 280000 != siswa_akhir      # cek baru → ketahuan


@pytest.mark.parametrize("tid", WITH_CHECK)
def test_kunci_cek_selalu_sama_dengan_target(tid):
    t = CUR["templates"][tid]
    for seed in (1, 7, 2026, 99):
        p = instantiate(t, seed)
        assert p["answers"]["sanity"] == p["vars"][t["sanity"]["check"]["target"]]


def test_soal_lama_tidak_berubah():
    p = instantiate(CUR["templates"]["m1-t1"], 1)
    assert {k: p["vars"][k] for k in ("price", "pct", "disc", "final")} == {"price": 10000, "pct": 2000, "disc": 2000, "final": 8000}
    assert p["vars"]["rest"] == 8000 and p["answers"] == {"s1": 2000, "s2": 8000, "sanity": 8000}


def test_template_tanpa_cek_tetap_seperti_semula():
    for tid in ("m5-t1", "m7-t2"):
        assert "sanity" not in instantiate(CUR["templates"][tid], 1)["answers"]


def test_validator_menolak_cek_yang_tidak_cocok():
    t = copy.deepcopy(CUR["templates"]["m3-t1"])
    t["sanity"]["check"]["compute"] = {"fn": "discountAmount", "args": ["price", "pct"]}  # = besar diskon, bukan harga akhir
    assert any("jalan lain harus cocok" in e for e in validate_template("m3-t1", t, seeds=range(1, 5)))
    t = copy.deepcopy(CUR["templates"]["m3-t1"])
    t["sanity"]["check"]["hints"] = ["satu saja"]
    assert any("petunjuk cek" in e for e in validate_template("m3-t1", t, seeds=range(1, 3)))


def test_tutor_sanity_mengajak_cek_besar_bukan_arah():
    p = engine.plan_turn(TUTOR, role="result", event="open", phase="sanity", step_index=1)
    assert p["move"] == "sanity" and "100% − persen diskon" in p["fallback"] and "belum cukup" in p["fallback"]
    p = engine.plan_turn(TUTOR, role="result", event="chip", move="sanity", chip_id="sa_unsure")
    assert p["move"] == "sanity_help" and "10%" in p["fallback"]


def test_fase_cek_hasil_siswa_boleh_dirujuk_tetapi_tidak_di_fase_soal():
    solve = service.problem_context("m1-t1", 1, "s2", "solve")
    sanity = service.problem_context("m1-t1", 1, "s2", "sanity")
    assert 8000 in solve["forbidden"]           # harga akhir belum ditemukan → terlarang
    assert 8000 not in sanity["forbidden"]      # sudah ditemukan siswa → boleh dibahas
    assert {"final", "rest"} <= sanity["known"]
