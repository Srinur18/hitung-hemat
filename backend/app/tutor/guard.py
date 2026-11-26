"""Penjaga balasan Teman Mikir.

Menolak balasan Gemini yang:
- membocorkan angka kunci (hasil langkah sekarang/berikutnya) dalam bentuk apa pun:
  90000, 90.000, Rp90.000, 90 000, 90 ribu, 0,09 juta, 75%, 75 persen, 0,75;
- memakai istilah tidak baku (aturan P10) atau frasa "jawabannya adalah";
- memuat lebih dari satu pertanyaan, kalimat > 15 kata, atau tautan/email.
Balasan > 40 kata dipangkas per kalimat; bila tidak bisa, ditolak.

Keterbatasan: angka yang ditulis dengan kata ("sembilan puluh ribu") tidak terdeteksi.
Karena itu prompt juga melarang menyebut hasil; guard adalah lapis kedua.
"""
import re
from fractions import Fraction

NUM = re.compile(r"(\d+(?:[.,]\d+)*)\s*(ribu|rb|k|juta|jt|%|persen)?", re.IGNORECASE)
SPACED_THOUSANDS = re.compile(r"(?<=\d)[  ](?=\d{3}\b)")
SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")
URLISH = re.compile(r"(https?://|www\.|@[a-z0-9-]+\.)", re.IGNORECASE)
MARKDOWN = re.compile(r"[*_#`>]+")


def clean(text: str) -> str:
    text = MARKDOWN.sub("", text or "")
    text = text.replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip().strip('"').strip()


def words(text: str) -> list[str]:
    return [w for w in re.split(r"\s+", text.strip()) if w]


def sentences(text: str) -> list[str]:
    return [s for s in SENT_SPLIT.split(text.strip()) if s]


def _parse(token: str) -> set[Fraction]:
    """Satu token angka → kemungkinan nilainya (format Indonesia & Inggris)."""
    out: set[Fraction] = set()
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", token):  # 90.000
        out.add(Fraction(int(token.replace(".", ""))))
    if re.fullmatch(r"\d{1,3}(,\d{3})+", token):  # 90,000 (gaya Inggris)
        out.add(Fraction(int(token.replace(",", ""))))
    t = token.replace(".", "") if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d+)?", token) else token
    if t.count(",") == 1 and "." not in t:  # 12,5 / 0,75
        out.add(Fraction(t.replace(",", ".")))
    elif t.count(".") == 1 and "," not in t:  # 12.5
        out.add(Fraction(t))
    elif t.isdigit():
        out.add(Fraction(int(t)))
    return out


def number_candidates(text: str) -> set[int]:
    """Semua bilangan bulat yang mungkin dimaksud teks: Rupiah, basis point (persen), desimal."""
    text = SPACED_THOUSANDS.sub("", text)
    cands: set[int] = set()
    for m in NUM.finditer(text):
        unit = (m.group(2) or "").lower()
        for v in _parse(m.group(1)):
            forms = {v, v * 100}  # nilai apa adanya; "75" atau "75%" sebagai basis point 7500
            if unit in ("ribu", "rb", "k"):
                forms.add(v * 1000)
            if unit in ("juta", "jt"):
                forms.add(v * 1_000_000)
            if v < 10:  # 0,75 → 7500 bp
                forms.add(v * 10_000)
            cands |= {int(f) for f in forms if f.denominator == 1}
    return cands


def forbidden_values(vars_: dict, known: set[str]) -> set[int]:
    """Nilai variabel yang BELUM diketahui siswa, kecuali yang kebetulan sama dengan nilai yang sudah diketahui."""
    known_vals = {v for k, v in vars_.items() if k in known and isinstance(v, int)}
    return {
        v
        for k, v in vars_.items()
        if k not in known and isinstance(v, int) and not isinstance(v, bool) and v not in known_vals and v > 0
    }


def check(text: str, *, forbidden: set[int], banned: list[str], max_words=40, max_sentence_words=15, max_questions=1):
    """→ (ok, alasan, teks_bersih). alasan None bila ok."""
    t = clean(text)
    if not t:
        return False, "empty", ""
    if URLISH.search(t):
        return False, "url", t
    if forbidden & number_candidates(t):
        return False, "leak", t
    low = t.lower()
    if any(b.lower() in low for b in banned):
        return False, "term", t
    if len(words(t)) > max_words:
        kept: list[str] = []
        for s in sentences(t):
            if len(words(" ".join([*kept, s]))) > max_words:
                break
            kept.append(s)
        if not kept:
            return False, "too_long", t
        t = " ".join(kept)
    if t.count("?") > max_questions:
        return False, "questions", t
    if any(len(words(s)) > max_sentence_words for s in sentences(t)):
        return False, "sentence_long", t
    return True, None, t
