import hashlib
import time
from datetime import datetime, timedelta
from sqlalchemy import select

from app.db import SessionLocal
from app.models import User, MerchantAPIKey, Provider, Role
from app.helpers.passwords import hash_password


DEFAULT_PASSWORD = "ChangeMe123!"


def seed_providers(db):
    providers = [
        {"name": "Stripe", "alias": "stripe", "url": "https://stripe.com"},
        {"name": "PayPal", "alias": "paypal", "url": "https://paypal.com"},
        {"name": "Adyen", "alias": "adyen", "url": "https://adyen.com"},
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
        merchant = db.execute(
            select(User).where(User.email == m["email"])
        ).scalar_one_or_none()

        if not merchant:
            merchant = User(
                name=m["name"],
                email=m["email"],
                role=Role.merchant,
                password=hash_password(DEFAULT_PASSWORD),
            )
            db.add(merchant)
            db.flush()

        raw_key = f"{merchant.id}:{int(time.time())}"
        key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

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
                {
                    "merchant": merchant.name,
                    "email": merchant.email,
                    "password": DEFAULT_PASSWORD,
                    "api_key": raw_key,
                }
            )

    return generated_keys


def run():
    db = SessionLocal()
    try:
        seed_providers(db)
        api_keys = seed_merchants(db)
        db.commit()

        print("Seed completed\n")
        for k in api_keys:
            print(
                f"Merchant: {k['merchant']} | "
                f"Email: {k['email']} | "
                f"Password: {k['password']} | "
                f"API key: {k['api_key']}"
            )

    finally:
        db.close()


if __name__ == "__main__":
    run()
