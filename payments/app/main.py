from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.classes import rabbitmq
from app.routes import router as payments_router
from app.routes.webhooks import router as webhooks_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await rabbitmq.connect()
    try:
        yield
    finally:
        await rabbitmq.close()


app = FastAPI(lifespan=lifespan)


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "payments"}


# register route groups
app.include_router(payments_router)
app.include_router(webhooks_router)
