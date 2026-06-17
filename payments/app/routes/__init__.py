from fastapi import APIRouter, Depends, Header

from app.classes.payments import Payment
from app.schemas.payments import (
    CreatePaymentRequest,
    GetPaymentsRequest,
    PaymentCreateResponse,
    PaymentListResponse,
    PaymentShowResponse,
    PaymentTrackingResponse,
    ProviderReturnResponse,
)

router = APIRouter(
    prefix="/api/v1/payments",
    tags=["Payments"],
    redirect_slashes=False,
)

handler = Payment()


@router.get("/ping")
def ping() -> dict[str, bool]:
    return {"ok": True}


@router.post("", response_model=PaymentCreateResponse)
async def create_payment(
    request: CreatePaymentRequest,
    x_merchant_id: str = Header(..., alias="X-Merchant-Id"),
) -> PaymentCreateResponse:
    return await handler.create_payment(
        request=request,
        merchant_id=x_merchant_id,
    )


@router.get("/{payment_id}/tracking", response_model=PaymentTrackingResponse)
async def tracking(payment_id: str) -> PaymentTrackingResponse:
    return await handler.tracking(payment_id)


@router.get("/{payment_id}/show", response_model=PaymentShowResponse)
async def show(payment_id: str) -> PaymentShowResponse:
    return await handler.show(payment_id)


@router.get("", response_model=PaymentListResponse)
async def get_payments(
    request: GetPaymentsRequest = Depends(),
    x_merchant_id: str = Header(..., alias="X-Merchant-Id"),
) -> PaymentListResponse:
    return await handler.get(
        merchant_id=x_merchant_id,
        request=request,
    )


@router.get("/provider-return/stripe", response_model=ProviderReturnResponse)
async def stripe_return(payment_id: str, session_id: str) -> ProviderReturnResponse:
    return await handler.stripe_return(payment_id=payment_id, session_id=session_id)


@router.get("/provider-return/stripe/cancel", response_model=ProviderReturnResponse)
async def stripe_cancel(payment_id: str, session_id: str | None = None) -> ProviderReturnResponse:
    return await handler.stripe_cancel(payment_id=payment_id, session_id=session_id)


@router.get("/provider-return/paypal", response_model=ProviderReturnResponse)
async def paypal_return(payment_id: str, token: str) -> ProviderReturnResponse:
    return await handler.paypal_return(payment_id=payment_id, token=token)


@router.get("/provider-return/paypal/cancel", response_model=ProviderReturnResponse)
async def paypal_cancel(payment_id: str) -> ProviderReturnResponse:
    return await handler.paypal_cancel(payment_id=payment_id)
