import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    DateTime,
    Enum,
    Index,
    func,
)
from app.db import Base


# =========================
# Order Status Enum
# =========================

class OrderStatus(enum.Enum):
    pending = "pending"
    finished = "finished"
    failed = "failed"


# =========================
# Products
# =========================

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        Index("ix_products_name", "name"),
    )


# =========================
# Orders
# =========================

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)

    product_id = Column(Integer, nullable=False)
    amount = Column(Integer, nullable=False, default=0)
    price = Column(Numeric(10, 2), nullable=False, default=0.00)

    status = Column(
        Enum(OrderStatus, name="order_status"),
        nullable=False,
        server_default=OrderStatus.pending.value,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_orders_product_id", "product_id"),
        Index("ix_orders_status", "status"),
        Index("ix_orders_created_at", "created_at"),
    )
