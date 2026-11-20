"""Shared date and Elexon API helpers for endpoint routers."""

from datetime import date, datetime
import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import HTTPException


ELEXON_API = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
JAN_START = date(2026, 1, 1)
JAN_END = date(2026, 2, 1)


def iso_date(value: date) -> str:
    """Convert a date to the ISO ``YYYY-MM-DD`` representation.

    Args:
        value: Date to format.

    Returns:
        The date as an ISO string.
    """
    return value.isoformat()


def parse_datetime(value: str) -> datetime:
    """Parse an ISO-8601 timestamp returned by Elexon.

    Args:
        value: Timestamp, optionally ending in ``Z``.

    Returns:
        A timezone-aware datetime where supported by the source value.
    """
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def elexon_get(dataset: str, stream: bool = False, **params: Any) -> list[dict[str, Any]]:
    """Fetch JSON records from an Elexon BMRS dataset endpoint.

    Args:
        dataset: Elexon dataset code, such as ``FUELHH`` or ``WINDFOR``.
        stream: Whether to call the dataset's ``/stream`` endpoint.
        **params: Elexon query parameters, for example date and fuel filters.

    Returns:
        A list of records from the stream response or the ``data`` field.

    Raises:
        HTTPException: 502 Bad Gateway when Elexon cannot be reached.
    """
    clean = {key: value for key, value in params.items() if value is not None}
    clean["format"] = "json"
    suffix = "/stream" if stream else ""
    url = f"{ELEXON_API}/{dataset}{suffix}?{urlencode(clean)}"
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "Energy-Company-Assessment/1.0"})
    try:
        with urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as exc:
        raise HTTPException(status_code=502, detail=f"Unable to retrieve Elexon {dataset} data: {exc}") from exc
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        return payload.get("data", [])
    return []


def validate_january(start: date | None, end: date | None) -> tuple[date, date]:
    """Validate a requested date range within January 2026.

    Args:
        start: Inclusive start date, or ``None`` for January 1.
        end: Exclusive end date, or ``None`` for February 1.

    Returns:
        Validated inclusive start and exclusive end dates.

    Raises:
        HTTPException: 400 Bad Request when the range is outside January 2026
            or is empty/reversed.
    """
    start = start or JAN_START
    end = end or JAN_END
    if start < JAN_START or end > JAN_END or start >= end:
        raise HTTPException(status_code=400, detail="Requested range must be within 2026-01-01 to 2026-01-31")
    return start, end
