import enum
from sqlalchemy import Column, Integer, String, Numeric, DateTime, func
from app.db import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, nullable=False, default=0)

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, nullable=False)
    amount = Column(Integer, nullable=False, default=0)
    price = Column(Numeric(10, 2), nullable=False, default=0.00)
    status = Column(String(50), nullable=False, default="created")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

# =========================
# Order Status Enum
# =========================
class OrderStatus(enum.Enum):
    pending = "pending"
    finished = "finished"
    failed = "failed"
