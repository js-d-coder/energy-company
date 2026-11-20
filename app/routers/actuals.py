"""Actual wind generation endpoints."""

from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api_utils import JAN_START, validate_january
from app.database import ActualGeneration, get_db


router = APIRouter()


@router.get("/api/actual", tags=["data"], summary="List wind actuals by date range")
def actuals(
    start: date = Query(default=JAN_START, description="Inclusive start date in YYYY-MM-DD format"),
    end: date = Query(default=date(2026, 1, 2), description="Exclusive end date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return stored half-hourly national wind generation actuals for a date range.

    Args:
        start: Inclusive range start date in January 2026.
        end: Exclusive range end date in January 2026. Defaults to Jan 2,
            returning the 24 hours of Jan 1.
        db: Request-scoped SQLAlchemy database session.

    Returns:
        A count and list of Elexon WIND records in the requested date range.
        Each day contains up to 48 half-hourly records.
    """
    start, end = validate_january(start, end)
    start_text = datetime.combine(start, datetime.min.time(), timezone.utc).isoformat().replace("+00:00", "Z")
    end_text = datetime.combine(end, datetime.min.time(), timezone.utc).isoformat().replace("+00:00", "Z")
    rows = db.query(ActualGeneration).filter(
        ActualGeneration.start_time >= start_text,
        ActualGeneration.start_time < end_text,
    ).order_by(ActualGeneration.start_time).all()
    return {
        "data": [
            {
                "startTime": row.start_time,
                "generation": row.generation,
                "fuelType": "WIND",
                "settlementDate": row.settlement_date,
                "settlementPeriod": row.settlement_period,
            }
            for row in rows
        ],
        "count": len(rows),
    }
