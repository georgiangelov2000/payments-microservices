from contextlib import contextmanager

from app.db.sessions import LogsSessionLocal, PaymentsSessionLocal


@contextmanager
def payments_session():
    db = PaymentsSessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def logs_session():
    db = LogsSessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
