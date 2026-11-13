from typing import Any, Literal

from pydantic import BaseModel, Field

EventType = Literal[
    "session_start", "session_end", "diagnostic_answer", "assessment_answer",
    "problem_start", "answer_submit", "hint_open", "mark_numbers", "sanity_check",
    "explain_submit", "scene_interact", "effort_rating", "mastery_change",
    "literacy_result", "material_view",
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
