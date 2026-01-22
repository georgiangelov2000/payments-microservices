from sqlalchemy.orm import sessionmaker
from app.db.engines import payments_engine, logs_engine

PaymentsSessionLocal = sessionmaker(
    bind=payments_engine,
    autoflush=False,
    autocommit=False,
)

LogsSessionLocal = sessionmaker(
    bind=logs_engine,
    autoflush=False,
    autocommit=False,
)
