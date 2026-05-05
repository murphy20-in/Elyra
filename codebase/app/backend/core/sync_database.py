from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.backend.core.config import settings

sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://")

sync_engine = create_engine(sync_url, pool_pre_ping=True, pool_size=5)
SyncSession = sessionmaker(bind=sync_engine, expire_on_commit=False)


def get_sync_db() -> Session:
    with SyncSession() as session:
        yield session