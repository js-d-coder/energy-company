"""Wind forecast listing and day-ahead forecast endpoints."""

from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api_utils import JAN_END, JAN_START, iso_date, parse_datetime, validate_january
from app.database import WindForecast, get_db


router = APIRouter()


@router.get("/api/forecast", tags=["data"], summary="List forecast revisions")
def forecasts(
    start: date = Query(default=JAN_START, description="Inclusive start date in YYYY-MM-DD format"),
    end: date = Query(default=JAN_END, description="Exclusive end date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return stored WINDFOR revisions for January 2026 delivery periods.

    Args:
        start: Inclusive date in January 2026.
        end: Exclusive date in January 2026.
        db: Request-scoped SQLAlchemy database session.

    Returns:
        A count and forecast records containing start time, publish time,
        and generation.
    """
    start, end = validate_january(start, end)
    start_text = datetime.combine(start, datetime.min.time(), timezone.utc).isoformat().replace("+00:00", "Z")
    end_text = datetime.combine(end, datetime.min.time(), timezone.utc).isoformat().replace("+00:00", "Z")
    rows = db.query(WindForecast).filter(
        WindForecast.start_time >= start_text,
        WindForecast.start_time < end_text,
    ).order_by(WindForecast.start_time, WindForecast.publish_time).all()
    return {
        "data": [
            {"startTime": row.start_time, "publishTime": row.publish_time, "generation": row.generation}
            for row in rows
        ],
        "count": len(rows),
    }


@router.get("/api/latest-forecast", tags=["forecast"], summary="Get latest day-ahead forecast")
def latest_forecast(
    delivery_date: date = Query(
        default=JAN_START,
        description="Delivery date in January 2026 (YYYY-MM-DD)",
    ),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return one latest available day-ahead forecast per delivery period.

    A forecast is eligible only when it was published at least 13 hours before
    its delivery hour. For each period, the latest publication satisfying this
    cutoff is returned.

    Args:
        delivery_date: Delivery date in January 2026.
        db: Request-scoped SQLAlchemy database session.

    Returns:
        Delivery date, record count, and latest eligible forecast per period.

    Raises:
        HTTPException: 400 Bad Request when the date is outside January 2026.
    """
    if delivery_date < JAN_START or delivery_date >= JAN_END:
        raise HTTPException(status_code=400, detail="delivery_date must be within January 2026")
    next_day = delivery_date + timedelta(days=1)
    start_text = datetime.combine(delivery_date, datetime.min.time(), timezone.utc).isoformat().replace("+00:00", "Z")
    end_text = datetime.combine(next_day, datetime.min.time(), timezone.utc).isoformat().replace("+00:00", "Z")
    rows = db.query(WindForecast).filter(
        WindForecast.start_time >= start_text,
        WindForecast.start_time < end_text,
    ).order_by(WindForecast.start_time, WindForecast.publish_time.desc()).all()

    latest: dict[str, dict[str, Any]] = {}
    for row in rows:
        delivery_time = parse_datetime(row.start_time)
        cutoff = delivery_time - timedelta(hours=13)
        if parse_datetime(row.publish_time) <= cutoff:
            latest.setdefault(row.start_time, {
                "startTime": row.start_time,
                "publishTime": row.publish_time,
                "generation": row.generation,
            })
    data = list(latest.values())
    data.sort(key=lambda item: item["startTime"])
    return {"deliveryDate": iso_date(delivery_date), "data": data, "count": len(data)}
