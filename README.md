# PythonProject1

FastAPI backend with a SQLite database and optional static frontend serving.

## Setup

Install dependencies with Poetry:

```bash
poetry install
```

## Run

```bash
poetry run uvicorn app.main:app --reload
```

The API health check is available at `http://127.0.0.1:8000/api/health`, and
the interactive API docs are at `http://127.0.0.1:8000/docs`.

The app serves files from `frontend/build` at `/` when that directory exists.
The directory can be created by building the frontend; until then, the API can
run without it. SQLite data is stored in `app.db` by default. Set the
`DATABASE_URL` environment variable to use a different database URL.
