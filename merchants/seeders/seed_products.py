from sqlalchemy import select
from app.db import SessionLocal
from app.models import Product


def seed_products(db):
    products = [
        {"name": "Wireless Mouse", "price": 24.99},
        {"name": "Mechanical Keyboard", "price": 89.99},
        {"name": "USB-C Hub", "price": 39.99},
        {"name": "27-inch 4K Monitor", "price": 299.00},
    ]


    for p in products:
        exists = db.execute(
            select(Product).where(Product.name == p["name"])
        ).scalar_one_or_none()

        if not exists:
            db.add(Product(**p))


def run():
    db = SessionLocal()
    try:
        seed_products(db)
        db.commit()
        print("Products seeded successfully")
    finally:
        db.close()


if __name__ == "__main__":
    run()
