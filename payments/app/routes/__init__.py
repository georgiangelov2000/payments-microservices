from fastapi import APIRouter, Header, Depends
from app.schemas.payments import CreatePaymentRequest, GetPaymentsRequest
from app.classes.payments import Payment

router = APIRouter(
    prefix="/api/v1/payments",
    tags=["Payments"],
    redirect_slashes=False,
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


@router.get("/{payment_id}/show")
async def show(payment_id: str):
    return await handler.show(payment_id)


@router.get("")
async def get_payments(
    request: GetPaymentsRequest = Depends(),
    x_merchant_id: str = Header(..., alias="X-Merchant-Id"),
):
    return await handler.get(
        merchant_id=x_merchant_id,
        request=request,
    )


@router.get("/provider-return/stripe")
async def stripe_return(payment_id: str, session_id: str):
    return await handler.stripe_return(payment_id=payment_id, session_id=session_id)


@router.get("/provider-return/stripe/cancel")
async def stripe_cancel(payment_id: str, session_id: str | None = None):
    return await handler.stripe_cancel(payment_id=payment_id, session_id=session_id)


@router.get("/provider-return/paypal")
async def paypal_return(payment_id: str, token: str):
    return await handler.paypal_return(payment_id=payment_id, token=token)


@router.get("/provider-return/paypal/cancel")
async def paypal_cancel(payment_id: str):
    return await handler.paypal_cancel(payment_id=payment_id)
