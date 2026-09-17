#!/bin/sh
set -e

# Run Alembic migrations if starting the primary API backend
if [ "$1" = "uvicorn" ] || [ "$1" = "alembic" ] || [ -z "$1" ]; then
    echo "[STARTUP] Running database migrations with Alembic..."
    alembic upgrade head
    echo "[STARTUP] Database migrations completed successfully."
fi

exec "$@"
