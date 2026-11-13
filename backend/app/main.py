"""HitungHemat API.

Jalankan:  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
Dokumentasi interaktif: http://localhost:8000/docs
"""
import csv
import io
import json
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import content
from .config import CORS_ORIGINS, MAX_EVENTS_PER_REQUEST, RESEARCH_TOKEN
from .db import Event, get_session, init_db
from .domain.analytics import summarize
from .domain.problems import GenerationError, instantiate
from .schemas import SyncRequest, SyncResponse


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="HitungHemat API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Research-Token"],
)

SessionDep = Annotated[Session, Depends(get_session)]


def require_researcher(x_research_token: Annotated[str | None, Header()] = None) -> None:
    if x_research_token != RESEARCH_TOKEN:
        raise HTTPException(401, "Token peneliti salah")


# ---------- umum ----------
@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


# ---------- konten ----------
@app.get("/api/v1/content/version")
def content_version():
    return {"version": content.version()}


@app.get("/api/v1/content/{name}")
def get_content(name: str):
    try:
        return content.load(name)
    except (KeyError, FileNotFoundError):
        raise HTTPException(404, "Konten tidak ditemukan")


@app.get("/api/v1/problems/{template_id}")
def preview_problem(template_id: str, seed: int = Query(1, ge=0, le=2**32 - 1)):
    """Pratinjau soal untuk guru/peneliti; seed sama → soal sama dengan di aplikasi."""
    t = content.load("curriculum")["templates"].get(template_id)
    if not t:
        raise HTTPException(404, "Template tidak ditemukan")
    try:
        return {"template": template_id, "seed": seed, **instantiate(t, seed)}
    except GenerationError as e:
        raise HTTPException(422, str(e))


# ---------- sinkronisasi ----------
@app.post("/api/v1/sync/events", response_model=SyncResponse)
def sync_events(body: SyncRequest, db: SessionDep):
    if len(body.events) > MAX_EVENTS_PER_REQUEST:
        raise HTTPException(413, f"Maksimal {MAX_EVENTS_PER_REQUEST} event per kiriman")
    accepted = duplicates = 0
    for e in body.events:
        exists = db.scalar(
            select(Event.id).where(Event.student_code == e.student_code, Event.client_id == e.client_id)
        )
        if exists:
            duplicates += 1
            continue
        db.add(Event(**e.model_dump()))
        try:
            db.commit()
            accepted += 1
        except IntegrityError:
            db.rollback()
            duplicates += 1
    return SyncResponse(accepted=accepted, duplicates=duplicates)


# ---------- peneliti ----------
def _all_events(db: Session) -> list[Event]:
    return list(db.scalars(select(Event).order_by(Event.student_code, Event.ts)))


@app.get("/api/v1/research/summary", dependencies=[Depends(require_researcher)])
def research_summary(db: SessionDep):
    max_score = len(content.load("assessment")["items"])
    rows = [
        {"student_code": e.student_code, "type": e.type, "payload": e.payload, "module_id": e.module_id}
        for e in _all_events(db)
    ]
    return summarize(rows, max_score)


@app.get("/api/v1/research/export.csv", dependencies=[Depends(require_researcher)])
def research_export(db: SessionDep):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["student_code", "session_id", "ts", "type", "module_id", "problem_id", "step_id", "payload"])
    for e in _all_events(db):
        w.writerow([e.student_code, e.session_id, e.ts, e.type, e.module_id, e.problem_id, e.step_id,
                    json.dumps(e.payload, ensure_ascii=False)])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=hitunghemat-events.csv"},
    )
