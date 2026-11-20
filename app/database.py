"""Database configuration and ORM models for Elexon wind data."""

import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column


DEFAULT_DATABASE_URL = f"sqlite:///{Path(__file__).resolve().parent.parent / 'app.db'}"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Base class for SQLAlchemy ORM models."""

    pass


class ActualGeneration(Base):
    """Half-hourly national wind generation published by Elexon.

    ``start_time`` is the primary key because FUELHH contains one wind value
    per delivery period. Settlement metadata is retained for traceability.
    """

    __tablename__ = "actual_generation"

    start_time: Mapped[str] = mapped_column(String(32), primary_key=True)
    generation: Mapped[float] = mapped_column(Float, nullable=False)
    settlement_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    settlement_period: Mapped[int | None] = mapped_column(nullable=True)
    publish_time: Mapped[str | None] = mapped_column(String(32), nullable=True)


class WindForecast(Base):
    """A WINDFOR generation forecast for a delivery period.

    The composite primary key is the delivery ``start_time`` plus the
    ``publish_time``; this preserves forecast revisions rather than overwriting
    previous forecasts for the same period.
    """

    __tablename__ = "wind_forecast"

    start_time: Mapped[str] = mapped_column(String(32), primary_key=True)
    publish_time: Mapped[str] = mapped_column(String(32), primary_key=True)
    generation: Mapped[float] = mapped_column(Float, nullable=False)


def get_db() -> Generator[Session, None, None]:
    """Yield a SQLAlchemy session and close it after the request completes.

    Yields:
        A transaction-scoped database session from ``SessionLocal``.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
