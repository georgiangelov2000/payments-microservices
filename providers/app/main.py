from fastapi import FastAPI
from app.classes.providers import ProviderService
from app.schemas.providers import GenerateUrlRequest

app = FastAPI()
service = ProviderService()

@app.post("/generate-url")
async def generate_url(req: GenerateUrlRequest):
    return await service.generate_url(req)

@app.post("/accept-payment/{token}")
async def accept_payment(token: str):
    return await service.accept_payment(token)