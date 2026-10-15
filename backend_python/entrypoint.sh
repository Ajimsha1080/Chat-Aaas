#!/bin/sh
set -e

# Run Alembic migrations if enabled (default true for standalone runs, false when separate migration container handles it)
if [ "${RUN_MIGRATIONS_ON_STARTUP:-true}" != "false" ]; then
    if [ "$1" = "uvicorn" ] || [ "$1" = "alembic" ] || [ -z "$1" ]; then
        echo "[STARTUP] Running database migrations with Alembic..."
        alembic upgrade head
        echo "[STARTUP] Database migrations completed successfully."
    fi
else
    echo "[STARTUP] Skipping migrations on startup (managed by dedicated migration job)."
fi

exec "$@"
