from fastapi import FastAPI
from app.routes import router as payments_router
from app.classes import rabbitmq

app = FastAPI()


# register route groups
app.include_router(payments_router)


# lifecycle hooks (global)
@app.on_event("startup")
async def startup():
    await rabbitmq.connect()


@app.on_event("shutdown")
async def shutdown():
    await rabbitmq.close()
