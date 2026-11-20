# Energy Company

FastAPI backend for January 2026 UK wind generation analysis. The API retrieves
national wind actual generation from Elexon's `FUELHH` dataset and wind forecasts
from `WINDFOR`, stores a local snapshot in SQLite, joins forecasts to actual
generation, and exposes quantitative accuracy metrics.

The React dashboard includes a selectable January 2026 date range, headline
forecast accuracy metrics, an actual-versus-forecast generation chart, and a
daily forecast-error chart. An independent delivery-date selector at the top
shows the eligible day-ahead forecast against actual wind generation for that
delivery day. Values and timestamps are shown in MW and UTC.

## Main API endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /api/sync` | Download January 2026 data from Elexon and refresh SQLite |
| `GET /api/health` | Health and database check |
| `GET /api/actual` | Half-hourly wind actual generation for a date range |
| `GET /api/forecast` | Stored wind forecast revisions |
| `GET /api/latest-forecast?delivery_date=2026-01-15` | Day-ahead forecasts for one delivery day |
| `GET /api/forecast-vs-actual` | Hourly actual, forecast, and error values |
| `GET /api/metrics` | MAE, RMSE, MAPE, bias, and maximum absolute error |
| `GET /api/dashboard` | Combined data summary for the frontend |

Date parameters accept `YYYY-MM-DD`. The supported range is January 2026.

### Endpoint details

#### `POST /api/sync`

Downloads one month of data from Elexon and replaces-or-updates matching
database primary keys. It returns:

- `status`: synchronization state
- `actual_rows`: number of wind actual records processed
- `forecast_rows`: number of forecast records processed
- `month`: synchronized month

#### `GET /api/health`

Runs a database connectivity statement and returns `status: ok` plus
`database: ok` when the API and database are healthy.

#### `GET /api/actual`

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `start` | No | `2026-01-01` | Inclusive start date |
| `end` | No | `2026-01-02` | Exclusive end date |

Returns actuals in the requested date range. The default covers the 24 hours
of Jan 1 (up to 48 rows). For example,
`/api/actual?start=2026-01-01&end=2026-02-01` returns all of January. Each
item contains `startTime`, `generation`, `fuelType`, `settlementDate`, and
`settlementPeriod`.

#### `GET /api/forecast`

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `start` | No | `2026-01-01` | Inclusive date |
| `end` | No | `2026-02-01` | Exclusive date |

Returns `count` and every stored `startTime`/`publishTime` forecast revision,
including `generation`.

#### `GET /api/latest-forecast`

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `delivery_date` | No | `2026-01-01` | Delivery date in January 2026 |

Returns the latest eligible forecast for each half-hourly delivery period.
Eligibility requires publication at least 13 hours before delivery.

#### `GET /api/forecast-vs-actual`

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `start` | No | `2026-01-01` | Inclusive date |
| `end` | No | `2026-02-01` | Exclusive date |

Returns hourly `actualGeneration`, `forecastGeneration`, `publishTime`,
signed `error`, and `absoluteError`. Signed error is calculated as
forecast minus actual.

#### `GET /api/metrics` and `GET /api/accuracy`

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `start` | No | `2026-01-01` | Inclusive date |
| `end` | No | `2026-02-01` | Exclusive date |

Returns `count`, `mae`, `rmse`, `mape`, `bias`, and `maxAbsoluteError`.
MAPE excludes delivery periods whose actual generation is zero.

#### `GET /api/dashboard`

Returns `period`, `metrics`, hourly `comparison`, `forecastCount`, and
`actualCount` in one response for frontend consumption.

## File overview

- `app/main.py` - FastAPI application configuration and router registration
- `app/api_utils.py` - Shared Elexon request, date parsing, and validation helpers
- `app/routers/system.py` - Health endpoint
- `app/routers/sync.py` - Elexon data synchronization endpoint
- `app/routers/actuals.py` - Wind actual generation endpoint
- `app/routers/forecasts.py` - Forecast listing and latest day-ahead forecast endpoints
- `app/routers/analysis.py` - Forecast comparison, metrics, and dashboard endpoints
- `app/static_content.py` - Static frontend serving and cache-control policy
- `app/database.py` - SQLAlchemy models and SQLite session configuration
- `frontend/` - React/Vite application
- `frontend/src/App.tsx` - Dashboard data loading and component composition
- `frontend/src/components/` - Sidebar, period banner with date-range controls, metric cards, charts, and dashboard sections
- `frontend/src/components/DayAheadSection.tsx` - Independent daily forecast-versus-actual view
- `frontend/public/icons/` - Standalone SVG icon assets referenced by sized image elements
- `frontend/src/utils/format.ts` - Shared date and numeric formatting helpers
- `frontend/src/types.ts` - Shared frontend API response and chart types
- `Dockerfile` - Container startup for the API and built frontend
- `start-local-server.sh` - Convenience script for local startup
- `data/app.db` - SQLite snapshot shared by local development and Docker Compose

## Setup and run

Install dependencies:

```bash
poetry install
```

Start the API:

```bash
poetry run uvicorn app.main:app --reload
```

Load the January 2026 Elexon snapshot:

```bash
curl -X POST http://127.0.0.1:8000/api/sync
```

The API health check is available at `http://127.0.0.1:8000/api/health`, and
the interactive API docs are at `http://127.0.0.1:8000/docs`.

The app serves files from `frontend/dist` at `/` when that directory exists.
The directory can be created by building the frontend; until then, the API can
run without it. SQLite data is stored in `data/app.db` by default. Local
development creates the `data/` directory automatically if it does not exist.
Set `APP_DATA_DIR` to use another directory. `DATABASE_URL` can still be set
to provide a complete SQLAlchemy connection URL.

Static cache policy: the HTML entry point is revalidated on each use,
fingerprinted files under `frontend/dist/assets/` are cached for one year as
immutable, and other static files (such as public icons) are cached for one
day with stale-while-revalidate.

For frontend development with hot reload, run the API on port `8765`, then in
a second terminal run:

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` requests to `http://127.0.0.1:8765`. To build the React
dashboard for serving from FastAPI, run `cd frontend && npm run build`.

## Docker

Build and start the full application (React assets are built into the backend
image and served by FastAPI):

```bash
docker compose up --build -d
```

Open `http://localhost:8000`. Load the Elexon dataset once using
`curl -X POST http://localhost:8000/api/sync`.

In local development the database is `<project-root>/data/app.db`. Compose
bind-mounts the same host `data/` directory at `/app/data` in the container,
where SQLite is also stored as `/app/data/app.db`. The database therefore
survives container recreation and is shared with local development:

```bash
docker compose down
docker compose up -d
```

To reset the database, stop the application and remove `data/app.db` explicitly.
Set `PORT` to change the host port, for example
`PORT=8080 docker compose up --build -d`.

## Accuracy methodology

For each delivery hour, the app averages the two matching half-hour actual
wind values and compares them with the latest forecast published no later than
13 hours before delivery. That represents the latest forecast available around
the day-ahead purchase cutoff. It reports MAE, RMSE, MAPE, bias
(forecast minus actual), and maximum absolute error.

## AI assistance

AI-assisted coding tools were used to implement the backend, API contracts,
database integration, Docker setup, and documentation.
