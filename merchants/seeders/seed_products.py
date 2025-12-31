from sqlalchemy import select
from app.db import SessionLocal
from app.models import Product


def seed_products(db):
    products = [
        {"name": "Basic Subscription", "price": 9.99},
        {"name": "Pro Subscription", "price": 19.99},
        {"name": "Enterprise Subscription", "price": 49.99},
        {"name": "One-time Setup Fee", "price": 99.00},
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
