"""Mesin langkah Teman Mikir: memilih tahap mediasi secara DETERMINISTIK dari tutor.json.

Fungsi di sini murni (tanpa I/O, tanpa Gemini) dan harus identik dengan
frontend/src/domain/tutor.js. Paritas dijaga lewat shared/test-vectors.json ("tutor").

Peristiwa (event):
- open  : siswa membuka Teman Mikir di layar soal (fase solve/sanity).
- wrong : siswa membuka Teman Mikir setelah jawaban salah pada langkah ini (membawa kode MC).
- chip  : siswa mengetuk salah satu pilihan (chip) pada balasan sebelumnya.
- done  : soal selesai dan Teman Mikir dipakai pada soal ini → refleksi.

Tingkat mediasi T1→T4 (levels) hanya naik lewat chip ber-"escalate"; tidak pernah turun dalam satu langkah.
"""

EVENTS = ("open", "wrong", "chip", "done")
PHASES = ("solve", "sanity")
MAX_LEVEL = 4
ROLE_CHIP = "role_"


class TurnError(ValueError):
    pass


def role_chips(tutor: dict, role: str) -> list[dict]:
    """Chip peran untuk tahap transformation: peran benar + satu pengecoh + 'Aku bingung'.

    Urutan menurut label (alfabet) agar posisi tidak membocorkan pilihan yang benar.
    """
    labels = tutor["roleLabels"]
    other = tutor["roleDistractor"].get(role)
    roles = [r for r in dict.fromkeys([role, other]) if r in labels]
    chips = sorted(({"id": ROLE_CHIP + r, "label": labels[r], "role": r} for r in roles), key=lambda c: c["label"])
    chips.append({"id": "tr_help", "label": "Aku bingung", "escalate": True, "difficulty": "memahami_soal"})
    return chips


def chips_for(tutor: dict, move: str, role: str) -> list[dict]:
    spec = tutor["moves"][move]["chips"]
    return role_chips(tutor, role) if spec == "roles" else [dict(c) for c in spec]


def _texts(tutor: dict, move: str, mc: str) -> tuple[str, str]:
    m = tutor["moves"][move]
    info = tutor["mc"][mc]
    goal = {"mc": info["goal"], "mc_why": info["whyGoal"]}.get(m["goal"], m["goal"])
    fallback = {"mc": info["fallback"], "mc_why": info["why"]}.get(m["fallback"], m["fallback"])
    return goal, fallback


def _turn(tutor: dict, move: str, *, role: str, level: int, mc: str | None = None, **extra) -> dict:
    m = tutor["moves"][move]
    goal, fallback = _texts(tutor, move, mc or "NONE")
    chips = chips_for(tutor, move, role)
    out = {
        "move": move,
        "stage": m["stage"],
        "level": level,
        "mc": mc,
        "goal": goal,
        "fallback": fallback,
        "chips": [{"id": c["id"], "label": c["label"]} for c in chips],
        "action": None,
        "difficulty": None,
        "reflect": None,
        "competence": False,
        "close": False,
    }
    if move in ("hint", "example"):
        out["action"] = move
    if move == "error":
        out["difficulty"] = tutor["mc"][mc or "NONE"]["difficulty"]
    out.update(extra)
    return out


def _closed(level: int, **extra) -> dict:
    out = {"move": None, "stage": None, "level": level, "mc": None, "goal": None, "fallback": None, "chips": [],
           "action": None, "difficulty": None, "reflect": None, "competence": False, "close": True}
    out.update(extra)
    return out


def normalize_mc(tutor: dict, mc: str | None) -> str:
    return mc if mc in tutor["mc"] else "NONE"


def plan_turn(tutor: dict, *, role: str, event: str, phase: str = "solve", step_index: int = 0,
              move: str | None = None, chip_id: str | None = None, mc: str | None = None, level: int = 1) -> dict:
    """Satu giliran Teman Mikir → rencana balasan (tanpa teks Gemini)."""
    if event not in EVENTS:
        raise TurnError("event tidak dikenal")
    if phase not in PHASES:
        raise TurnError("fase tidak dikenal")
    level = min(MAX_LEVEL, max(1, int(level)))

    if event == "done":
        return _turn(tutor, "reflection", role=role, level=level, competence=True)
    if event == "wrong":
        return _turn(tutor, "error", role=role, level=level, mc=normalize_mc(tutor, mc))
    if event == "open":
        if phase == "sanity":
            return _turn(tutor, "sanity", role=role, level=level)
        return _turn(tutor, "orientation" if step_index == 0 else "transformation", role=role, level=level)

    # event == "chip"
    if move not in tutor["moves"]:
        raise TurnError("tahap tidak dikenal")
    chip = next((c for c in chips_for(tutor, move, role) if c["id"] == chip_id), None)
    if chip is None:
        raise TurnError("pilihan tidak dikenal")
    keep_mc = normalize_mc(tutor, mc) if move in ("error", "error_why") else None
    extra = {}
    if chip.get("difficulty"):
        extra["difficulty"] = chip["difficulty"]
    if chip.get("reflect"):
        extra["reflect"] = chip["reflect"]
    if chip.get("tool"):
        extra["action"] = chip["tool"]

    if chip.get("role"):
        if chip["role"] == role:
            return _turn(tutor, "planning", role=role, level=level, competence=True)
        if move == "transformation":
            return _turn(tutor, "transformation_retry", role=role, level=level, difficulty="memahami_soal")
        chip = {"escalate": True}
        extra["difficulty"] = "memahami_soal"

    if chip.get("escalate"):
        new_level = min(MAX_LEVEL, level + 1)
        target = tutor["levels"][str(new_level)]["move"]
        turn = _turn(tutor, target, role=role, level=new_level, mc=keep_mc)
        if extra.get("difficulty") or keep_mc:
            turn["difficulty"] = extra.get("difficulty") or tutor["mc"][keep_mc]["difficulty"]
        return turn

    nxt = chip.get("next")
    if nxt in ("close", "end"):
        return _closed(level, **extra)
    turn = _turn(tutor, nxt, role=role, level=level, mc=keep_mc if nxt in ("error", "error_why") else None)
    for k, v in extra.items():
        if v is not None:
            turn[k] = v
    return turn


def validate_tutor(tutor: dict, curriculum: dict) -> list[str]:
    """Pemeriksaan konten tutor.json. Teks cadangan wajib lolos guard yang sama dengan balasan Gemini."""
    from .guard import check  # impor lokal: engine tetap bebas dependensi saat dipakai sendiri

    errs: list[str] = []
    lim = tutor["limits"]
    moves = tutor["moves"]
    prefix_words = len(tutor["competencePrefix"].split())

    def text_ok(where: str, text: str, competence: bool = False):
        ok, why, _ = check(text, forbidden=set(), banned=tutor["bannedTerms"],
                           max_words=lim["maxWords"] - (prefix_words if competence else 0),
                           max_sentence_words=lim["maxSentenceWords"], max_questions=lim["maxQuestions"])
        if not ok or len(text.split()) > lim["maxWords"] - (prefix_words if competence else 0):
            errs.append(f"tutor {where}: teks cadangan melanggar aturan ({why or 'too_long'})")

    for lv, info in tutor["levels"].items():
        if info["move"] not in moves:
            errs.append(f"tutor level {lv}: tahap {info['move']} tidak ada")
    roles = {s.get("role") for t in curriculum["templates"].values() for s in t["steps"]}
    for r in roles:
        if r not in tutor["roleLabels"]:
            errs.append(f"tutor: peran langkah '{r}' tidak punya label")
        elif len(role_chips(tutor, r)) > lim["maxChips"]:
            errs.append(f"tutor: chip peran '{r}' > {lim['maxChips']}")
    for name, m in moves.items():
        competence = name in ("planning", "reflection")
        if m["fallback"] in ("mc", "mc_why"):
            for code, info in tutor["mc"].items():
                text_ok(f"{name}/{code}", info["fallback" if m["fallback"] == "mc" else "why"])
        else:
            text_ok(name, m["fallback"], competence)
        if m["chips"] == "roles":
            continue
        if len(m["chips"]) > lim["maxChips"]:
            errs.append(f"tutor {name}: chip > {lim['maxChips']} (aturan P2)")
        for c in m["chips"]:
            nxt = c.get("next")
            if not c.get("escalate") and nxt not in moves and nxt not in ("close", "end"):
                errs.append(f"tutor {name}/{c['id']}: tujuan '{nxt}' tidak ada")
            if c.get("difficulty") and c["difficulty"] not in tutor["difficulties"]:
                errs.append(f"tutor {name}/{c['id']}: kesulitan '{c['difficulty']}' tidak dikenal")
    used_mc = {code for t in curriculum["templates"].values() for s in t["steps"] for code in s.get("mc", [])}
    used_mc |= {o["mc"] for t in curriculum["templates"].values() for s in t["steps"]
                for o in s.get("options", []) if o.get("mc")}
    for code in sorted(used_mc - set(tutor["mc"])):
        errs.append(f"tutor: miskonsepsi {code} dipakai kurikulum tetapi tidak ada di tutor.json")
    for code, info in tutor["mc"].items():
        if info["difficulty"] not in tutor["difficulties"]:
            errs.append(f"tutor mc {code}: kesulitan '{info['difficulty']}' tidak dikenal")
    return errs
