"""System health endpoint."""

from fastapi import APIRouter
from sqlalchemy import text

from app.database import engine


router = APIRouter()


@router.get(
    "/api/health",
    tags=["system"],
    summary="Check application and database health",
)
def health() -> dict[str, str]:
    """Verify that the API process and database are reachable.

    Returns:
        A status response containing application and database health values.
    """
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}
