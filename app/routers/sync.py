"""Elexon data synchronization endpoint."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api_utils import JAN_END, JAN_START, elexon_get, iso_date
from app.database import ActualGeneration, WindForecast, get_db


router = APIRouter()


@router.post(
    "/api/sync",
    tags=["data"],
    summary="Synchronize January 2026 Elexon data",
)
def sync_january(db: Session = Depends(get_db)) -> dict[str, int | str]:
    """Download and persist January 2026 wind actuals and forecasts.

    Actuals are read from FUELHH filtered to ``fuelType=WIND``. Forecasts are
    read from WINDFOR using delivery-day and approximate day-ahead publication
    windows. Existing primary-key rows are updated with ``merge``.

    Args:
        db: Request-scoped SQLAlchemy database session.

    Returns:
        Sync status, number of actual records, number of forecast records,
        and the fixed month being synchronized.
    """
    actual_count = 0
    for day in range((JAN_END - JAN_START).days):
        settlement_day = JAN_START + timedelta(days=day)
        rows = elexon_get(
            "FUELHH",
            settlementDateFrom=iso_date(settlement_day),
            settlementDateTo=iso_date(settlement_day),
            fuelType="WIND",
        )
        for row in rows:
            if row.get("fuelType") != "WIND":
                continue
            db.merge(
                ActualGeneration(
                    start_time=str(row["startTime"]),
                    generation=float(row["generation"]),
                    settlement_date=row.get("settlementDate"),
                    settlement_period=row.get("settlementPeriod"),
                    publish_time=row.get("publishTime"),
                )
            )
            actual_count += 1

    forecast_count = 0
    for day in range((JAN_END - JAN_START).days):
        delivery_day = JAN_START + timedelta(days=day)
        # The UK day-ahead market closes around 11:00 the previous day.
        publish_from = datetime.combine(delivery_day - timedelta(days=1), datetime.min.time(), timezone.utc)
        publish_from = publish_from.replace(hour=10, minute=0)
        publish_to = publish_from.replace(hour=12, minute=0)
        start_from = datetime.combine(delivery_day, datetime.min.time(), timezone.utc)
        start_to = start_from + timedelta(days=1)
        rows = elexon_get(
            "WINDFOR",
            stream=True,
            publishDateTimeFrom=publish_from.isoformat().replace("+00:00", "Z"),
            publishDateTimeTo=publish_to.isoformat().replace("+00:00", "Z"),
            startTimeFrom=start_from.isoformat().replace("+00:00", "Z"),
            startTimeTo=start_to.isoformat().replace("+00:00", "Z"),
        )
        for row in rows:
            db.merge(
                WindForecast(
                    start_time=str(row["startTime"]),
                    publish_time=str(row["publishTime"]),
                    generation=float(row["generation"]),
                )
            )
            forecast_count += 1
    db.commit()
    return {
        "status": "synced",
        "actual_rows": actual_count,
        "forecast_rows": forecast_count,
        "month": "2026-01",
    }
