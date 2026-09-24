from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str

    model_config = {"from_attributes": True}


class ProductCategoryOut(BaseModel):
    id: int
    shop_id: int
    name: str
    sort_order: int

    model_config = {"from_attributes": True}


class ProductCategoryCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise ValueError("Enter a section name")
        return v


class ProductCategoryUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    sort_order: int | None = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = " ".join(v.split())
        if not v:
            raise ValueError("Enter a section name")
        return v


class ProductCreateIn(BaseModel):
    category_id: int
    name: str
    price: Decimal
    image_url: str | None = None
    in_stock: bool = True


class ProductUpdateIn(BaseModel):
    category_id: int | None = None
    name: str | None = None
    price: Decimal | None = None
    image_url: str | None = None
    in_stock: bool | None = None


class ProductOut(BaseModel):
    id: int
    shop_id: int
    category_id: int
    name: str
    price: Decimal
    image_url: str | None
    in_stock: bool
    created_at: datetime

    model_config = {"from_attributes": True}
