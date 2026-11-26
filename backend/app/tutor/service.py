"""Satu giliran Teman Mikir: mesin langkah → (opsional) Gemini → penjaga → teks cadangan.

Soal dibuat ulang di server dari (template_id, seed) sehingga frontend tidak perlu mengirim kunci jawaban.
Nilai yang belum diketahui siswa (hasil langkah ini dan berikutnya) menjadi daftar angka terlarang bagi guard.
"""
import logging
import threading
from datetime import date

from .. import config, content
from ..domain.money import format_value
from ..domain.problems import PLACEHOLDER, instantiate
from . import gemini, guard
from .engine import plan_turn

log = logging.getLogger("hitunghemat.tutor")


class Limiter:
    """Kuota harian (seluruh server) dan per sesi aplikasi. Disimpan di memori; reset tiap hari."""

    def __init__(self):
        self._lock = threading.Lock()
        self._day = date.today()
        self._daily = 0
        self._sessions: dict[str, int] = {}

    def _roll(self):
        today = date.today()
        if today != self._day:
            self._day, self._daily, self._sessions = today, 0, {}

    def take(self, session_id: str, limit: int | None = None) -> str | None:
        """→ None bila boleh memanggil Gemini, atau alasan penolakan.

        Kuota harian dipakai bersama oleh Teman Mikir di layar soal dan chat bebas.
        `limit` = batas per kunci (bawaan TUTOR_SESSION_LIMIT; chat memakai CHAT_CLIENT_LIMIT per IP).
        """
        with self._lock:
            self._roll()
            if self._daily >= config.TUTOR_DAILY_LIMIT:
                return "daily_limit"
            if self._sessions.get(session_id, 0) >= (config.TUTOR_SESSION_LIMIT if limit is None else limit):
                return "session_limit"
            self._daily += 1
            self._sessions[session_id] = self._sessions.get(session_id, 0) + 1
            return None

    def reset(self):
        with self._lock:
            self._day, self._daily, self._sessions = date.today(), 0, {}


limiter = Limiter()


def enabled() -> bool:
    return bool(config.GEMINI_API_KEY and gemini.MODEL_RE.match(config.GEMINI_MODEL or ""))


def render(text: str, vars_: dict) -> str:
    return PLACEHOLDER.sub(lambda m: format_value(vars_.get(m.group(1)), m.group(2)), text or "")


def problem_context(template_id: str, seed: int, step_id: str, phase: str = "solve") -> dict:
    cur = content.load("curriculum")
    t = cur["templates"].get(template_id)
    if not t:
        raise KeyError("template")
    idx = next((i for i, s in enumerate(t["steps"]) if s["id"] == step_id), None)
    if idx is None:
        raise KeyError("step")
    p = instantiate(t, seed)
    vars_ = dict(p["vars"])
    if phase == "sanity":
        # R1: fase cek kewajaran → semua langkah sudah benar; hasil siswa & angka cek boleh dirujuk.
        known = shown_names(t, len(t["steps"])) | check_names(t)
    else:
        known = shown_names(t, idx)
        # Hasil langkah sekarang & berikutnya selalu terlarang, walau tanpa saveAs.
        for s in t["steps"][idx:]:
            if s["id"] in p["answers"]:
                vars_[f"__ans_{s['id']}"] = p["answers"][s["id"]]
    step = t["steps"][idx]
    return {
        "template": t,
        "step": step,
        "step_index": idx,
        "vars": vars_,
        "known": known,
        "text": render(t["text"], vars_),
        "forbidden": strict_forbidden(vars_, known),
    }


def shown_names(t: dict, step_index: int) -> set[str]:
    """Variabel yang BENAR-BENAR sudah dilihat siswa: yang tampil di teks soal + hasil langkah yang selesai.

    Sengaja tidak memakai semua `vars`: pada soal terbalik (m6-t1) `price` adalah variabel undian
    yang tidak tampil di soal dan nilainya sama dengan jawaban `orig`.
    """
    shown = {m.group(1) for m in PLACEHOLDER.finditer(t["text"])} | {"item"}
    return shown | {s["saveAs"] for s in t["steps"][:step_index] if s.get("saveAs")}


def check_names(t: dict) -> set[str]:
    """Variabel yang tampil di layar cek besar hasil (teks cek + petunjuknya)."""
    chk = (t.get("sanity") or {}).get("check") or {}
    return {m.group(1) for txt in [chk.get("ask", ""), *chk.get("hints", [])] for m in PLACEHOLDER.finditer(txt)}


def strict_forbidden(vars_: dict, known: set[str]) -> set[int]:
    """Semua nilai bulat positif yang belum diketahui. Tidak ada pengecualian bila nilainya kebetulan sama
    dengan angka di soal (mis. 20% dan Rp2.000 sama-sama 2000): lebih baik jatuh ke teks cadangan
    daripada membocorkan jawaban."""
    return {
        v for k, v in vars_.items()
        if k not in known and isinstance(v, int) and not isinstance(v, bool) and v > 0
    }


SYSTEM = """Kamu Plum, teman belajar siswa SMP kelas VII (12-13 tahun) tentang persentase diskon.
Tugasmu memediasi cara berpikir, bukan memberi jawaban.
Aturan wajib:
- Tulis SATU balasan dalam Bahasa Indonesia sederhana, paling banyak {max_words} kata.
- Setiap kalimat paling banyak {max_sentence} kata. Paling banyak satu pertanyaan.
- JANGAN menyebut, menghitung, atau memperkirakan hasil langkah ini maupun langkah berikutnya.
- Jangan menulis angka selain yang ada di soal.
- Pakai istilah baku: harga awal, persen diskon, besar diskon, harga akhir.
- Tidak menghakimi. Tanpa emoji, tanpa markdown, tanpa tautan, tanpa salam pembuka.
- Kerjakan HANYA tujuan tahap yang diberikan."""


ROLE_FMT = {"price": "rupiah", "discount": "rupiah", "result": "rupiah", "percent": "percent"}


def build_prompt(tutor: dict, ctx: dict, plan: dict, chip_label: str | None, max_words: int,
                 answer: int | None = None) -> tuple[str, str]:
    lim = tutor["limits"]
    system = SYSTEM.format(max_words=max_words, max_sentence=lim["maxSentenceWords"])
    lines = [
        f"Soal: {ctx['text']}",
        f"Langkah sekarang: {ctx['step']['label']}",
        f"Tahap mediasi: {plan['stage']}",
        f"Tujuan tahap: {plan['goal']}",
    ]
    if chip_label:
        lines.append(f"Pilihan terakhir siswa: {chip_label}")
    if answer is not None and plan["move"] in ("error", "error_why"):
        # R2: rujuk angka siswa sendiri agar ia menemukan kesalahannya; hasil yang benar tetap terlarang.
        fmt = ROLE_FMT.get(ctx["step"].get("role"), "plain")
        lines.append(f"Jawaban siswa yang belum tepat: {format_value(answer, fmt)}")
    lines.append(f"Contoh balasan yang sesuai aturan: {plan['fallback']}")
    lines.append("Tulis balasanmu sekarang.")
    return system, "\n".join(lines)


def respond(*, template_id: str, seed: int, step_id: str, event: str, phase: str = "solve", move: str | None = None,
            chip_id: str | None = None, chip_label: str | None = None, mc: str | None = None, level: int = 1,
            answer: int | None = None, session_id: str = "-") -> dict:
    tutor = content.load("tutor")
    ctx = problem_context(template_id, seed, step_id, phase)
    plan = plan_turn(tutor, role=ctx["step"].get("role", "result"), event=event, phase=phase,
                     step_index=ctx["step_index"], move=move, chip_id=chip_id, mc=mc, level=level)
    if plan["close"]:
        return {**plan, "text": None, "source": None, "reason": None}

    prefix = tutor["competencePrefix"] if plan["competence"] else ""
    lim = tutor["limits"]
    max_words = lim["maxWords"] - len(guard.words(prefix))
    fallback = plan["fallback"]
    text, source, reason = fallback, "fallback", "disabled"

    if enabled():
        reason = limiter.take(session_id)
        if reason is None:
            system, user = build_prompt(tutor, ctx, plan, chip_label, max_words, answer)
            try:
                raw = gemini.generate(system, user, api_key=config.GEMINI_API_KEY, model=config.GEMINI_MODEL,
                                      timeout=config.GEMINI_TIMEOUT)
                ok, why, cleaned = guard.check(
                    raw, forbidden=ctx["forbidden"], banned=tutor["bannedTerms"], max_words=max_words,
                    max_sentence_words=lim["maxSentenceWords"], max_questions=lim["maxQuestions"],
                )
                if ok:
                    text, source, reason = cleaned, "gemini", None
                else:
                    reason = f"guard_{why}"
            except gemini.GeminiError as e:
                reason = e.reason
                log.warning("Gemini gagal: %s", e)  # hanya kategori + status; tanpa isi/kunci

    if prefix:
        text = f"{prefix} {text}"
    return {**plan, "text": text, "source": source, "reason": reason}
