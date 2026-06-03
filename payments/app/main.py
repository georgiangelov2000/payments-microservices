from fastapi import FastAPI

from app.classes import rabbitmq
from app.routes import router as payments_router
from app.routes.webhooks import router as webhooks_router

app = FastAPI()


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "payments"}


# register route groups
app.include_router(payments_router)
app.include_router(webhooks_router)


# lifecycle hooks (global)
@app.on_event("startup")
async def startup():
    await rabbitmq.connect()


@app.on_event("shutdown")
async def shutdown():
    await rabbitmq.close()
