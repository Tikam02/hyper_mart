from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ProductRequestCreateIn(BaseModel):
    text: str = Field(min_length=1, max_length=300)
    product_id: int | None = None

    @field_validator("text")
    @classmethod
    def clean_text(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise ValueError("Tell the shop what you're looking for")
        return v


class ProductRequestRespondIn(BaseModel):
    status: Literal["available", "unavailable"]
    owner_note: str | None = Field(default=None, max_length=300)


class ProductRequestOut(BaseModel):
    id: int
    shop_id: int
    product_id: int | None
    text: str
    status: str
    owner_note: str | None
    created_at: datetime
    responded_at: datetime | None

    model_config = {"from_attributes": True}


class ProductRequestOwnerOut(ProductRequestOut):
    """What the shop owner sees — adds who asked, so they can call back."""

    customer_phone: str


class ProductRequestCustomerOut(ProductRequestOut):
    """What the customer sees — adds which shop they asked."""

    shop_name: str
