from typing import Any, Literal

from pydantic import BaseModel, Field

EventType = Literal[
    "session_start", "session_end", "diagnostic_answer", "assessment_answer",
    "problem_start", "answer_submit", "hint_open", "mark_numbers", "sanity_check",
    "explain_submit", "scene_interact", "effort_rating", "mastery_change",
    "literacy_result", "material_view", "tutor_turn",
]


class EventIn(BaseModel):
    client_id: str = Field(min_length=1, max_length=64, description="ID unik dari perangkat (uuid)")
    student_code: str = Field(pattern=r"^[A-Za-z0-9_-]{2,16}$")
    session_id: str = Field(min_length=1, max_length=64)
    ts: str = Field(max_length=40)
    type: EventType
    module_id: str | None = Field(default=None, max_length=8)
    problem_id: str | None = Field(default=None, max_length=64)
    step_id: str | None = Field(default=None, max_length=16)
    payload: dict[str, Any] = Field(default_factory=dict)


class SyncRequest(BaseModel):
    events: list[EventIn]


class SyncResponse(BaseModel):
    accepted: int
    duplicates: int


class TutorTurnIn(BaseModel):
    """Satu giliran Teman Mikir. Sengaja TANPA student_code: tidak ada identitas yang dikirim ke Gemini."""

    template_id: str = Field(pattern=r"^[a-z0-9-]{1,16}$")
    seed: int = Field(ge=0, le=2**32 - 1)
    step_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,16}$")
    event: Literal["open", "wrong", "chip", "done"]
    phase: Literal["solve", "sanity"] = "solve"
    move: str | None = Field(default=None, pattern=r"^[a-z_]{1,32}$")
    chip_id: str | None = Field(default=None, pattern=r"^[a-z_]{1,32}$")
    mc: str | None = Field(default=None, pattern=r"^[A-Z0-9]{1,8}$")
    level: int = Field(default=1, ge=1, le=4)
    # R2: jawaban salah terakhir siswa pada langkah ini (sudah dilihat siswa, jadi bukan bocoran).
    answer: int | None = Field(default=None, ge=0, le=10**12)
    session_id: str = Field(default="-", pattern=r"^[A-Za-z0-9_-]{1,64}$")


class TutorChip(BaseModel):
    id: str
    label: str


class TutorTurnOut(BaseModel):
    move: str | None
    stage: str | None
    level: int
    text: str | None
    source: Literal["gemini", "fallback"] | None
    reason: str | None = Field(description="Alasan memakai teks cadangan (disabled, daily_limit, timeout, guard_leak, …)")
    chips: list[TutorChip]
    action: str | None = Field(description="hint | example | box | formula")
    difficulty: str | None
    reflect: str | None
    mc: str | None
    close: bool

class ChatMessageIn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatTurnIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessageIn] = Field(default_factory=list, max_length=20)


class ChatTurnOut(BaseModel):
    reply: str
    source: Literal["gemini", "fallback"]
