"""Forecast comparison and accuracy analysis endpoints."""

from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api_utils import JAN_END, JAN_START, iso_date, parse_datetime, validate_january
from app.database import ActualGeneration, WindForecast, get_db


router = APIRouter()


def build_comparison(db: Session, start: date, end: date) -> list[dict[str, Any]]:
    """Join wind forecasts to hourly actual generation.

    Each two half-hour actual values are averaged to an hourly actual. The
    latest forecast published at least 13 hours before the delivery hour is
    selected, then forecast-minus-actual error fields are calculated.

    Args:
        db: SQLAlchemy database session.
        start: Inclusive range start date.
        end: Exclusive range end date.

    Returns:
        Hourly records containing actual generation, forecast generation,
        forecast publish time, signed error, and absolute error.
    """
    start_text = datetime.combine(start, datetime.min.time(), timezone.utc).isoformat().replace("+00:00", "Z")
    end_text = datetime.combine(end, datetime.min.time(), timezone.utc).isoformat().replace("+00:00", "Z")
    actual_rows = db.query(ActualGeneration).filter(
        ActualGeneration.start_time >= start_text,
        ActualGeneration.start_time < end_text,
    ).all()

    hourly_actual: dict[str, list[float]] = {}
    for row in actual_rows:
        parsed = parse_datetime(row.start_time)
        hour = parsed.replace(minute=0, second=0, microsecond=0).isoformat().replace("+00:00", "Z")
        hourly_actual.setdefault(hour, []).append(row.generation)

    comparison: list[dict[str, Any]] = []
    for hour, values in sorted(hourly_actual.items()):
        hour_dt = parse_datetime(hour)
        cutoff = hour_dt - timedelta(hours=13)
        forecast_rows = db.query(WindForecast).filter(
            WindForecast.start_time >= hour,
            WindForecast.start_time < (hour_dt + timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
            WindForecast.publish_time <= cutoff.isoformat().replace("+00:00", "Z"),
        ).order_by(WindForecast.publish_time.desc()).all()
        if not forecast_rows:
            continue
        forecast = forecast_rows[0].generation
        actual = sum(values) / len(values)
        error = forecast - actual
        comparison.append({
            "startTime": hour,
            "actualGeneration": actual,
            "forecastGeneration": forecast,
            "publishTime": forecast_rows[0].publish_time,
            "error": error,
            "absoluteError": abs(error),
        })
    return comparison


def calculate_metrics(comparison: list[dict[str, Any]]) -> dict[str, float | int]:
    """Calculate aggregate forecast accuracy metrics.

    The metrics use forecast-minus-actual signed errors:

    - MAE: mean absolute error
    - RMSE: square root of mean squared error
    - MAPE: mean absolute percentage error where actual generation is non-zero
    - bias: mean signed error (positive means forecasts overestimated actuals)

    Args:
        comparison: Hourly actual/forecast records produced by
            :func:`build_comparison`.

    Returns:
        Count, MAE, RMSE, MAPE, bias, and maximum absolute error.
        Numeric metrics are rounded to three decimal places.
    """
    if not comparison:
        return {"count": 0, "mae": 0.0, "rmse": 0.0, "mape": 0.0, "bias": 0.0, "maxAbsoluteError": 0.0}
    errors = [row["error"] for row in comparison]
    absolute_errors = [row["absoluteError"] for row in comparison]
    count = len(comparison)
    mae = sum(absolute_errors) / count
    rmse = (sum(error * error for error in errors) / count) ** 0.5
    mape_points = [
        abs(row["error"]) / abs(row["actualGeneration"]) * 100
        for row in comparison
        if row["actualGeneration"] != 0
    ]
    mape = sum(mape_points) / len(mape_points) if mape_points else 0.0
    bias = sum(errors) / count
    return {
        "count": count,
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "mape": round(mape, 3),
        "bias": round(bias, 3),
        "maxAbsoluteError": round(max(absolute_errors), 3),
    }


@router.get("/api/forecast-vs-actual", tags=["analysis"], summary="Compare forecasts and actuals")
def comparison(
    start: date = Query(default=JAN_START, description="Inclusive start date in YYYY-MM-DD format"),
    end: date = Query(default=JAN_END, description="Exclusive end date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return hourly forecast-versus-actual comparison records.

    Args:
        start: Inclusive date in January 2026.
        end: Exclusive date in January 2026.
        db: Request-scoped SQLAlchemy database session.

    Returns:
        A count and list of joined hourly comparison records.
    """
    start, end = validate_january(start, end)
    data = build_comparison(db, start, end)
    return {"data": data, "count": len(data)}


@router.get("/api/metrics", tags=["analysis"], summary="Get forecast accuracy metrics")
@router.get("/api/accuracy", tags=["analysis"], summary="Get accuracy metrics (alias)")
def metrics(
    start: date = Query(default=JAN_START, description="Inclusive start date in YYYY-MM-DD format"),
    end: date = Query(default=JAN_END, description="Exclusive end date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Calculate MAE, RMSE, MAPE, bias, and maximum absolute error.

    Args:
        start: Inclusive date in January 2026.
        end: Exclusive date in January 2026.
        db: Request-scoped SQLAlchemy database session.

    Returns:
        Aggregate accuracy metrics for the requested range.
    """
    start, end = validate_january(start, end)
    return calculate_metrics(build_comparison(db, start, end))


@router.get("/api/dashboard", tags=["analysis"], summary="Get complete dashboard payload")
def dashboard(
    start: date = Query(default=JAN_START, description="Inclusive start date in YYYY-MM-DD format"),
    end: date = Query(default=JAN_END, description="Exclusive end date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return a consolidated payload for dashboard visualization.

    Args:
        start: Inclusive date in January 2026.
        end: Exclusive date in January 2026.
        db: Request-scoped SQLAlchemy database session.

    Returns:
        Requested period, aggregate metrics, hourly comparison records,
        and the total number of stored forecast and actual rows.
    """
    start, end = validate_january(start, end)
    comparison_data = build_comparison(db, start, end)
    return {
        "period": {"start": iso_date(start), "end": iso_date(end)},
        "metrics": calculate_metrics(comparison_data),
        "comparison": comparison_data,
        "forecastCount": db.query(WindForecast).count(),
        "actualCount": db.query(ActualGeneration).count(),
    }
