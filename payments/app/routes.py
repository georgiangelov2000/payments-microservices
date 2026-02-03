from fastapi import APIRouter, Header, Depends, Query
from app.schemas.payments import CreatePaymentRequest, GetPaymentsRequest
from app.classes.payments import Payment

router = APIRouter(
    prefix="/api/v1/payments",
    tags=["Payments"],
)

handler = Payment()


@router.get("/ping")
def ping():
    return {"ok": True}


# -----------------------------
# Create payment
# -----------------------------
@router.post("")
@router.post("/")
async def create_payment(
    request: CreatePaymentRequest,
    x_merchant_id: str = Header(..., alias="X-Merchant-Id"),
):
    return await handler.create_payment(
        request=request,
        merchant_id=x_merchant_id,
    )


# -----------------------------
# Track payment (timeline)
# -----------------------------
@router.get("/{payment_id}/tracking")
@router.get("/{payment_id}/tracking/")
async def tracking(payment_id: str):
    return await handler.tracking(payment_id)


# -----------------------------
# Show single payment (details)
# -----------------------------
@router.get("/{payment_id}/show")
@router.get("/{payment_id}/show/")
async def show(payment_id: str):
    return await handler.show(payment_id)


# -----------------------------
# Get payments list (paginated)
# -----------------------------
@router.get("")
@router.get("/")
async def get_payments(
    request: GetPaymentsRequest = Depends(),
    x_merchant_id: str = Header(..., alias="X-Merchant-Id"),
):
    return await handler.get(
        merchant_id=x_merchant_id,
        request=request,
    )

