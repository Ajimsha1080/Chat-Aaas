import os
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

# Determine database URL for async operations
db_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))
os.makedirs(db_dir, exist_ok=True)
sqlite_path = os.path.join(db_dir, "chat_aaas.db")

raw_db_url = settings.DATABASE_URL
if not raw_db_url or "localhost" in raw_db_url or "127.0.0.1" in raw_db_url:
    async_db_url = f"sqlite+aiosqlite:///{sqlite_path}"
elif raw_db_url.startswith("postgresql://"):
    async_db_url = raw_db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif raw_db_url.startswith("sqlite://"):
    async_db_url = raw_db_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
else:
    async_db_url = raw_db_url

engine_kwargs = {}
if "sqlite" in async_db_url:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs = {
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_timeout": settings.DB_POOL_TIMEOUT,
        "pool_recycle": settings.DB_POOL_RECYCLE,
        "pool_pre_ping": True
    }

async_engine = create_async_engine(async_db_url, **engine_kwargs)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for injecting async SQLAlchemy sessions into route handlers."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Async context manager for background jobs and non-FastAPI request contexts."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
