"""Analitik penelitian: N-gain literasi, skor Tes Literasi (24 poin), petunjuk, miskonsepsi, usaha mental."""
from collections import Counter, defaultdict
from statistics import mean


def n_gain(pre: float, post: float, max_score: float) -> float | None:
    """Hake (1998): (post - pre) / (max - pre)."""
    if max_score <= pre:
        return None
    return round((post - pre) / (max_score - pre), 3)


def n_gain_category(g: float | None) -> str:
    if g is None:
        return "-"
    if g >= 0.7:
        return "tinggi"
    if g >= 0.3:
        return "sedang"
    return "rendah"


def summarize(events: list[dict], max_score: int) -> dict:
    """events: dict dengan kunci student_code, type, payload, module_id."""
    per = defaultdict(lambda: {
        "pre": 0, "post": 0, "pre_n": 0, "post_n": 0,
        "answers": 0, "correct": 0, "hints": 0, "problems": 0,
        "mc": Counter(), "effort": [],
        "process": defaultdict(lambda: {"pre": 0, "post": 0}),
        "literacy": [],
    })
    for e in events:
        s = per[e["student_code"]]
        p = e.get("payload") or {}
        t = e["type"]
        if t == "assessment_answer":
            kind = p.get("kind")
            if kind in ("pre", "post"):
                s[f"{kind}_n"] += 1
                if p.get("correct"):
                    s[kind] += 1
                    s["process"][p.get("process", "-")][kind] += 1
        elif t == "answer_submit":
            s["answers"] += 1
            s["correct"] += bool(p.get("correct"))
            if p.get("mc"):
                s["mc"][p["mc"]] += 1
        elif t == "hint_open":
            s["hints"] += 1
        elif t == "problem_start":
            s["problems"] += 1
        elif t == "effort_rating" and isinstance(p.get("value"), (int, float)):
            s["effort"].append(p["value"])
        elif t == "literacy_result" and p.get("kind") == "test" and isinstance(p.get("total"), int):
            s["literacy"].append({"total": p["total"], "max": p.get("max", 24), "byProcess": p.get("byProcess", {})})

    students = []
    for code, s in sorted(per.items()):
        g = n_gain(s["pre"], s["post"], max_score) if s["pre_n"] and s["post_n"] else None
        students.append({
            "student_code": code,
            "pre": s["pre"],
            "post": s["post"],
            "n_gain": g,
            "n_gain_category": n_gain_category(g),
            "accuracy": round(s["correct"] / s["answers"], 3) if s["answers"] else None,
            "hints_per_problem": round(s["hints"] / s["problems"], 2) if s["problems"] else None,
            "misconceptions": dict(s["mc"]),
            "mean_effort": round(mean(s["effort"]), 2) if s["effort"] else None,
            "process": {k: dict(v) for k, v in s["process"].items()},
            # Tes Literasi Matematis (4 soal uraian bertahap, maks. 24): percobaan pertama & terakhir
            "literacy_attempts": len(s["literacy"]),
            "literacy_first": s["literacy"][0]["total"] if s["literacy"] else None,
            "literacy_last": s["literacy"][-1]["total"] if s["literacy"] else None,
            "literacy_by_process": s["literacy"][-1]["byProcess"] if s["literacy"] else None,
        })
    gains = [x["n_gain"] for x in students if x["n_gain"] is not None]
    total_mc = Counter()
    for x in students:
        total_mc.update(x["misconceptions"])
    lit = [x["literacy_last"] for x in students if x["literacy_last"] is not None]
    return {
        "students": students,
        "class": {
            "mean_literacy_last": round(mean(lit), 2) if lit else None,
            "n": len(students),
            "mean_n_gain": round(mean(gains), 3) if gains else None,
            "n_gain_category": n_gain_category(mean(gains)) if gains else "-",
            "top_misconceptions": total_mc.most_common(5),
        },
    }
