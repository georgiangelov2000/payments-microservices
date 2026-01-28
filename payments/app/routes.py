from fastapi import APIRouter, Header
from app.schemas.payments import CreatePaymentRequest
from app.classes.payments import Payment

router = APIRouter(
    prefix="/api/v1/payments",
    tags=["Payments"],
)

handler = Payment()


@router.get("/ping")
def ping():
    return {"ok": True}


@router.post("")
async def create_payment(
    request: CreatePaymentRequest,
    x_merchant_id: str = Header(..., alias="X-Merchant-Id"),
):
    return await handler.create_payment(
        request=request,
        merchant_id=x_merchant_id,
    )

@router.get("/{payment_id}/tracking")
async def tracking(payment_id: str):
    return await handler.tracking(payment_id)
