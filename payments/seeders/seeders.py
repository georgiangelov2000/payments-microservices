from sqlalchemy import select, text

from app.db.sessions import PaymentsSessionLocal
from app.models.payments import Provider, Subscription


# =========================
# Providers
# =========================
def seed_providers(db):
    providers = [
        {"name": "Stripe", "alias": "stripe", "url": "https://stripe.com"},
        {"name": "PayPal", "alias": "paypal", "url": "https://paypal.com"},
        {"name": "Adyen", "alias": "adyen", "url": "https://adyen.com"},
    ]

    for p in providers:
        exists = db.execute(
            select(Provider.id).where(Provider.alias == p["alias"])
        ).scalar_one_or_none()

        if not exists:
            db.add(Provider(**p))


# =========================
# Subscriptions
# =========================
def seed_subscriptions(db):
    subscriptions = [
        {
            "name": "Starter",
            "code": "starter",
            "monthly_fee": 29.00,
            "transaction_fee_percent": 0.90,
            "transaction_fee_fixed": 0.10,
            "included_transactions": 100,
        },
        {
            "name": "Growth",
            "code": "growth",
            "monthly_fee": 99.00,
            "transaction_fee_percent": 0.60,
            "transaction_fee_fixed": 0.08,
            "included_transactions": 1000,
        },
        {
            "name": "Scale",
            "code": "scale",
            "monthly_fee": 299.00,
            "transaction_fee_percent": 0.35,
            "transaction_fee_fixed": 0.05,
            "included_transactions": 5000,
        },
    ]

    for s in subscriptions:
        exists = db.execute(select(Subscription).where(Subscription.code == s["code"])).scalar_one_or_none()

        if exists:
            for key, value in s.items():
                setattr(exists, key, value)
        else:
            db.add(Subscription(**s))

    db.flush()
    starter_id = db.execute(
        select(Subscription.id).where(Subscription.code == "starter")
    ).scalar_one()

    db.execute(
        text("""
            DELETE FROM user_subscriptions legacy_user_subscription
            USING subscriptions legacy_subscription
            WHERE legacy_user_subscription.subscription_id = legacy_subscription.id
              AND legacy_subscription.code IS NULL
              AND EXISTS (
                  SELECT 1
                  FROM user_subscriptions starter_user_subscription
                  WHERE starter_user_subscription.user_id = legacy_user_subscription.user_id
                    AND starter_user_subscription.subscription_id = :starter_id
              )
        """),
        {"starter_id": starter_id},
    )

    db.execute(
        text("""
            UPDATE user_subscriptions
            SET subscription_id = :starter_id,
                current_period_transactions = COALESCE(current_period_transactions, 0),
                current_period_volume = COALESCE(current_period_volume, 0)
            WHERE subscription_id IN (
                SELECT id
                FROM subscriptions
                WHERE code IS NULL
            )
        """),
        {"starter_id": starter_id},
    )

    db.execute(text("DELETE FROM subscriptions WHERE code IS NULL"))


# =========================
# Entrypoint
# =========================
def run():
    db = PaymentsSessionLocal()
    try:
        seed_subscriptions(db)
        seed_providers(db)

        db.commit()

        print("\nSeed completed successfully")
        print("Created reference providers and subscription plans only.\n")

    finally:
        db.close()

if __name__ == "__main__":
    run()
