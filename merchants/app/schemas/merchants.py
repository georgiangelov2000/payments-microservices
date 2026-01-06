from pydantic import BaseModel, Field, field_validator

class CreateOrderRequest(BaseModel):
    product_id: int = Field(..., gt=0, description="product_id must be a positive integer")
    amount: int = Field(..., gt=0, description="amount must be greater than 0")
    alias: str = Field(..., min_length=1, description="alias is required")
    
    @field_validator("amount")
    @classmethod
    def validate_decimal_positive(cls, v):
        if v <= 0:
            raise ValueError("value must be greater than 0")
        return v