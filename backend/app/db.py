from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Integer, String, UniqueConstraint, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from .config import DATABASE_URL


class Base(DeclarativeBase):
    pass


class Event(Base):
    """Event penelitian yang dikirim aplikasi. Tidak ada data pribadi: hanya kode siswa."""

    __tablename__ = "events"
    __table_args__ = (UniqueConstraint("student_code", "client_id", name="uq_student_client"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_code: Mapped[str] = mapped_column(String(16), index=True)
    client_id: Mapped[str] = mapped_column(String(64))
    session_id: Mapped[str] = mapped_column(String(64))
    ts: Mapped[str] = mapped_column(String(40))
    type: Mapped[str] = mapped_column(String(40), index=True)
    module_id: Mapped[str | None] = mapped_column(String(8), nullable=True)
    problem_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    step_id: Mapped[str | None] = mapped_column(String(16), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


def make_engine(url: str = DATABASE_URL):
    kwargs = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {}
    return create_engine(url, **kwargs)


engine = make_engine()
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def init_db(eng=None) -> None:
    Base.metadata.create_all(eng or engine)


def get_session():
    with SessionLocal() as s:
        yield s
