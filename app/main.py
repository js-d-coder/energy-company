"""FastAPI application setup for January 2026 UK wind generation analysis."""

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.routers import actuals, analysis, forecasts, sync, system


FRONTEND_BUILD = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Create database tables when the FastAPI application starts.

    Args:
        _: The FastAPI application instance (required by the lifespan protocol).

    Yields:
        Control to the running application.
    """
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Energy Company Wind Forecast API",
    description=(
        "API for synchronizing, querying, and evaluating January 2026 UK "
        "national wind generation forecasts against Elexon actual generation."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router)
app.include_router(sync.router)
app.include_router(actuals.router)
app.include_router(forecasts.router)
app.include_router(analysis.router)

if FRONTEND_BUILD.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_BUILD, html=True), name="frontend")
