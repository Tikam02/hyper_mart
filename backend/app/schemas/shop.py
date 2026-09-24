from datetime import datetime, time

from pydantic import BaseModel, Field

from app.schemas.catalog import CategoryOut, ProductCategoryOut, ProductOut
from app.schemas.coupon import CouponOut


class ShopCreateIn(BaseModel):
    name: str
    owner_name: str
    address_text: str
    pincode: str
    contact_number: str
    gst_number: str | None = None


class ShopUpdateIn(BaseModel):
    name: str | None = None
    address_text: str | None = None
    pincode: str | None = None
    contact_number: str | None = None
    gst_number: str | None = None
    # Matches the column width, so an over-long body is a 422 rather than a 500
    # from Postgres truncating.
    description: str | None = Field(default=None, max_length=1000)
    opens_at: time | None = None
    closes_at: time | None = None
    weekly_off: int | None = Field(default=None, ge=0, le=6)
    is_open: bool | None = None


class ShopImageIn(BaseModel):
    url: str
    caption: str | None = Field(default=None, max_length=200)


class ShopImageUpdateIn(BaseModel):
    caption: str | None = Field(default=None, max_length=200)
    sort_order: int | None = None


class ShopCategoriesIn(BaseModel):
    category_ids: list[int]


class ShopOut(BaseModel):
    id: int
    name: str
    owner_name: str
    address_text: str
    pincode: str
    locality: str | None
    contact_number: str
    gst_number: str | None
    description: str | None
    status: str
    opens_at: time | None
    closes_at: time | None
    weekly_off: int | None
    # The owner's raw override flag — what their "temporarily closed" switch is
    # set to, not what customers currently see.
    is_open: bool
    # What customers currently see, after hours and weekly off are applied.
    is_open_now: bool
    # Why they see it as closed: temporarily_closed | weekly_off | outside_hours.
    closed_reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ShopImageOut(BaseModel):
    id: int
    url: str
    sort_order: int
    caption: str | None

    model_config = {"from_attributes": True}


class ShopPublicOut(BaseModel):
    id: int
    name: str
    address_text: str
    pincode: str
    locality: str | None
    contact_number: str
    is_open: bool
    created_at: datetime
    # Cover photo + rating so a listing card can render standalone, without a
    # follow-up request per shop.
    cover_url: str | None
    review_count: int
    avg_rating: float | None

    model_config = {"from_attributes": True}


class ShopDetailOut(ShopPublicOut):
    description: str | None
    opens_at: time | None
    closes_at: time | None
    weekly_off: int | None
    images: list[ShopImageOut]
    # Two different things: `categories` is the global shop-type taxonomy shown
    # in the Details row, `product_categories` are the owner's own catalog
    # sections used for the tabs above the product grid.
    categories: list[CategoryOut]
    product_categories: list[ProductCategoryOut]
    products: list[ProductOut]
    active_coupons: list[CouponOut]
    follower_count: int
    redeemed_count: int

