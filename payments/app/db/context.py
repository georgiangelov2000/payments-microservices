from collections.abc import Generator
from contextlib import contextmanager

from sqlalchemy.orm import Session

from app.db.sessions import LogsSessionLocal, PaymentsSessionLocal


@contextmanager
def payments_session() -> Generator[Session]:
    db = PaymentsSessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def logs_session() -> Generator[Session]:
    db = LogsSessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
