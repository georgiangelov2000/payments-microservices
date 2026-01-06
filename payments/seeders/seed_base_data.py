import hashlib
import time
from datetime import datetime, timedelta
from sqlalchemy import select

from app.db import SessionLocal
from app.models import Merchant, MerchantAPIKey, Provider


def seed_providers(db):
    providers = [
        {"name": "Stripe", "alias": "stripe", "url": "https://stripe.com"},
        {"name": "PayPal", "alias": "paypal", "url": "https://paypal.com"},
        {"name": "Adyen", "alias": "adyxen", "url": "https://adyen.com"},
    ]

    for p in providers:
        exists = db.execute(
            select(Provider).where(Provider.alias == p["alias"])
        ).scalar_one_or_none()

        if not exists:
            db.add(Provider(**p))


def seed_merchants(db):
    merchants = [
        {"name": "Demo Merchant", "email": "demo@example.com"},
        {"name": "Test Merchant", "email": "test@example.com"},
        {"name": "Sample Merchant", "email": "sample@example.com"},
    ]

    generated_keys = []

    for m in merchants:
        #1️ Create merchant if not exists
        merchant = db.execute(
            select(Merchant).where(Merchant.name == m["name"])
        ).scalar_one_or_none()

        if not merchant:
            merchant = Merchant(name=m["name"], email=m["email"])
            db.add(merchant)
            db.flush()  # merchant.id now exists

        #2️ Generate API key hash (merchant.id + timestamp)
        raw_key = f"{merchant.id}:{int(time.time())}"
        key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

        #3️ Create API key if not exists
        api_key_exists = db.execute(
            select(MerchantAPIKey).where(MerchantAPIKey.hash == key_hash)
        ).scalar_one_or_none()

        if not api_key_exists:
            db.add(
                MerchantAPIKey(
                    hash=key_hash,
                    merchant_id=merchant.id,
                    start_date=datetime.utcnow(),
                    end_date=datetime.utcnow() + timedelta(days=365),
                )
            )
            generated_keys.append(
                {"merchant": merchant.name, "api_key": raw_key}
            )

    return generated_keys


def run():
    db = SessionLocal()
    try:
        seed_providers(db)
        api_keys = seed_merchants(db)
        db.commit()

        print("Seed completed")
        for k in api_keys:
            print(f"Merchant: {k['merchant']} | API key: {k['api_key']}")

    finally:
        db.close()


if __name__ == "__main__":
    run()
