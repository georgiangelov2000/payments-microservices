from sqlalchemy import create_engine
import os

PAYMENTS_DB_URL = os.getenv("PAYMENTS_DB_URL")
LOGS_DB_URL = os.getenv("LOGS_DB_URL")

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
