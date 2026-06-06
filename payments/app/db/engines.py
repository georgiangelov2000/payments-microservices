import os

from sqlalchemy import create_engine

PAYMENTS_DB_URL = os.getenv("PAYMENTS_DB_URL")
LOGS_DB_URL = os.getenv("LOGS_DB_URL")

if PAYMENTS_DB_URL is None:
    raise RuntimeError("PAYMENTS_DB_URL is required")

if LOGS_DB_URL is None:
    raise RuntimeError("LOGS_DB_URL is required")

payments_engine = create_engine(
    PAYMENTS_DB_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

logs_engine = create_engine(
    LOGS_DB_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)
