from app.schemas.payments import CreatePaymentRequest, GetPaymentsRequest
from app.services.payment_creation import PaymentCreationService
from app.services.payment_query import PaymentQueryService
from app.services.provider_callback import ProviderCallbackService


class Payment:
    """
    Thin orchestrator that delegates to focused service classes.

    Responsibilities:
    - Preserve the public interface expected by routes.py
    - Delegate all logic to PaymentCreationService, PaymentQueryService,
      and ProviderCallbackService
    """

    def __init__(self):
        self._creation = PaymentCreationService()
        self._query = PaymentQueryService()
        self._callback = ProviderCallbackService()

    async def create_payment(self, request: CreatePaymentRequest, merchant_id: str):
        return await self._creation.create(request, merchant_id)

    async def tracking(self, payment_id: str):
        return await self._query.tracking(payment_id)

    async def show(self, payment_id: str):
        return await self._query.show(payment_id)

    async def get(self, request: GetPaymentsRequest, merchant_id: str):
        return await self._query.get_paginated(merchant_id, request.page, request.limit)

    async def stripe_return(self, payment_id: str, session_id: str):
        return await self._callback.handle_stripe_return(payment_id, session_id)

    async def stripe_cancel(self, payment_id: str, session_id: str | None = None):
        return await self._callback.handle_stripe_cancel(payment_id, session_id)

    async def paypal_return(self, payment_id: str, token: str):
        return await self._callback.handle_paypal_return(payment_id, token)

    async def paypal_cancel(self, payment_id: str):
        return await self._callback.handle_paypal_cancel(payment_id)
